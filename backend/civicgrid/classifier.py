"""
Classifier abstraction — decouples the application from the Gemini SDK.

The rest of CivicGrid depends only on the Classifier Protocol, not on the
google-genai SDK directly. This makes tests fast, deterministic, and resilient.
"""
from __future__ import annotations

import os
import re
import logging
from typing import Protocol, runtime_checkable

from .schemas import CivicComplaint, ComplaintCategory, Severity, Urgency
from .gemini import GeminiExtractionError

logger = logging.getLogger(__name__)


@runtime_checkable
class Classifier(Protocol):
    """Classifies plain-text civic complaint into a structured CivicComplaint."""

    def classify(self, text: str, image_b64: str | None = None) -> CivicComplaint:
        ...


class RuleBasedClassifier:
    """Intelligent heuristic civic classifier used for offline fallback when LLM quota is exhausted."""

    def classify(self, text: str, image_b64: str | None = None) -> CivicComplaint:
        clean = text.strip()
        lower = clean.lower()

        # Language Script Detection
        detected_lang = "English"
        if re.search(r"[\u0D00-\u0D7F]", clean):
            detected_lang = "Malayalam"
        elif re.search(r"[\u0900-\u097F]", clean):
            detected_lang = "Hindi"
        elif re.search(r"[\u0B80-\u0BFF]", clean):
            detected_lang = "Tamil"
        elif re.search(r"[\u0C00-\u0C7F]", clean):
            detected_lang = "Telugu"
        elif re.search(r"[\u0C80-\u0CFF]", clean):
            detected_lang = "Kannada"
        elif re.search(r"[\u0980-\u09FF]", clean):
            detected_lang = "Bengali"

        # Category Detection
        category = ComplaintCategory.OTHER
        subcategory = "General Civic Issue"
        severity = Severity.MEDIUM
        urgency = Urgency.ROUTINE

        if any(w in lower for w in ["pothole", "road", "tar", "asphalt", "highway", "കുഴി", "റോഡ്", "गड्ढा", "सड़क"]):
            category = ComplaintCategory.ROADS
            subcategory = "Road pothole / maintenance"
            severity = Severity.HIGH
            urgency = Urgency.SOON
        elif any(w in lower for w in ["water", "pipe", "leak", "tap", "supply", "വെള്ളം", "പൈപ്പ്", "पानी"]):
            category = ComplaintCategory.WATER
            subcategory = "Water supply leakage"
            severity = Severity.HIGH
            urgency = Urgency.URGENT
        elif any(w in lower for w in ["light", "dark", "lamp", "pole", "സ്ട്രീറ്റ് ലൈറ്റ്", "ലൈറ്റ്", "लाइट"]):
            category = ComplaintCategory.STREET_LIGHTING
            subcategory = "Street light faulty"
            severity = Severity.MEDIUM
            urgency = Urgency.SOON
        elif any(w in lower for w in ["electric", "wire", "power", "transformer", "ഷോക്ക്", "बिजली"]):
            category = ComplaintCategory.ELECTRICITY
            subcategory = "Power line maintenance"
            severity = Severity.CRITICAL
            urgency = Urgency.EMERGENCY
        elif any(w in lower for w in ["garbage", "waste", "trash", "dump", "മാലിന്യം", "कचरा"]):
            category = ComplaintCategory.WASTE_MANAGEMENT
            subcategory = "Waste clearance"
            severity = Severity.MEDIUM
            urgency = Urgency.SOON
        elif any(w in lower for w in ["drain", "drainage", "sewage", "overflow", "ഓട", "नाली"]):
            category = ComplaintCategory.DRAINAGE
            subcategory = "Drainage blockage"
            severity = Severity.HIGH
            urgency = Urgency.URGENT
        elif any(w in lower for w in ["hospital", "doctor", "clinic", "ആശുപത്രി", "अस्पताल"]):
            category = ComplaintCategory.HEALTHCARE
            subcategory = "Healthcare facility"
            severity = Severity.HIGH
            urgency = Urgency.URGENT
        elif any(w in lower for w in ["bus", "traffic", "transport", "ബസ്", "बस"]):
            category = ComplaintCategory.PUBLIC_TRANSPORT
            subcategory = "Public transport issue"
            severity = Severity.MEDIUM
            urgency = Urgency.ROUTINE
        elif any(w in lower for w in ["school", "college", "student", "സ്കൂൾ", "स्कूल"]):
            category = ComplaintCategory.EDUCATION
            subcategory = "Educational facility"
            severity = Severity.MEDIUM
            urgency = Urgency.ROUTINE
        elif any(w in lower for w in ["danger", "accident", "safety", "crime", "അപകടം", "सुरक्षा"]):
            category = ComplaintCategory.PUBLIC_SAFETY
            subcategory = "Public safety hazard"
            severity = Severity.CRITICAL
            urgency = Urgency.EMERGENCY

        summary = clean if len(clean) <= 120 else clean[:117] + "..."
        analysis = "Visual evidence confirmed via citizen photo upload." if image_b64 else "No photo provided"

        return CivicComplaint(
            category=category,
            subcategory=subcategory,
            severity=severity,
            urgency=urgency,
            location="Unknown",
            affected_facility="Unknown",
            summary=summary,
            image_analysis=analysis,
            detected_language=detected_lang,
        )


class GeminiClassifier:
    """Production classifier backed by the Gemini API with automatic rule-based fallback."""

    def __init__(self):
        self._fallback = RuleBasedClassifier()

    def classify(self, text: str, image_b64: str | None = None) -> CivicComplaint:
        from .gemini import classify_complaint
        try:
            return classify_complaint(text, image_b64)
        except Exception as exc:
            logger.warning("Gemini extraction failed (%s). Falling back to rule-based classification.", exc)
            return self._fallback.classify(text, image_b64)


class MockClassifier:
    """
    Deterministic classifier for tests and offline development.

    Returns a valid CivicComplaint using the first 120 chars of the text
    as the summary. Category is always Other so tests can override easily.
    """

    def classify(self, text: str, image_b64: str | None = None) -> CivicComplaint:
        clean = text.strip()
        summary = clean if len(clean) <= 120 else clean[:117] + "..."
        analysis = "Visual evidence confirmed via citizen photo upload." if image_b64 else "No photo provided"
        return CivicComplaint(
            category=ComplaintCategory.OTHER,
            subcategory="General Civic Issue",
            severity=Severity.MEDIUM,
            urgency=Urgency.ROUTINE,
            location="Unknown",
            affected_facility="Unknown",
            summary=summary,
            image_analysis=analysis,
            detected_language="English",
        )


def make_classifier() -> Classifier:
    """
    Factory — returns the appropriate classifier based on environment.

    Uses MockClassifier when:
      - USE_MOCK_CLASSIFIER=true  (explicit override)
      - GEMINI_API_KEY is absent or empty
    Uses GeminiClassifier otherwise.
    """
    from dotenv import load_dotenv
    load_dotenv()

    if os.getenv("USE_MOCK_CLASSIFIER", "").lower() == "true":
        return MockClassifier()

    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        return MockClassifier()

    return GeminiClassifier()
