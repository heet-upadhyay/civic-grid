from __future__ import annotations

import os
import time
from typing import Any

from dotenv import load_dotenv
from google import genai
from google.genai import errors
from google.genai import types
from pydantic import ValidationError

from .prompts import build_extraction_prompt
from .schemas import CivicComplaint

DEFAULT_MODEL = "gemini-3.6-flash"
RATE_LIMIT_FALLBACK_DELAY_SECONDS = 61.0
RATE_LIMIT_RETRY_BUFFER_SECONDS = 1.0


class ComplaintInputError(ValueError):
    """Raised when the complaint input is not usable."""


class GeminiConfigurationError(RuntimeError):
    """Raised when Gemini configuration is missing or invalid."""


class GeminiExtractionError(RuntimeError):
    """Raised when Gemini cannot produce a valid structured complaint."""


def _validate_input(text: str) -> str:
    if not isinstance(text, str):
        raise ComplaintInputError("Complaint text must be a string.")
    if not text.strip():
        raise ComplaintInputError("Complaint text must not be empty or whitespace-only.")
    return text.strip()


def _create_client() -> genai.Client:
    load_dotenv()
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise GeminiConfigurationError(
            "GEMINI_API_KEY is not set. Configure it in the environment or a local .env file."
        )
    return genai.Client(api_key=api_key)


def _get_model_name() -> str:
    return os.getenv("GEMINI_MODEL") or DEFAULT_MODEL


def _gemini_response_schema() -> dict[str, Any]:
    schema = CivicComplaint.model_json_schema()
    schema.pop("additionalProperties", None)
    return schema


def _parse_structured_response(response: Any) -> CivicComplaint:
    parsed = getattr(response, "parsed", None)
    if parsed is None:
        raise GeminiExtractionError(
            "Gemini returned no parsed structured complaint."
        )
    try:
        if isinstance(parsed, CivicComplaint):
            return parsed
        return CivicComplaint.model_validate(parsed)
    except ValidationError as exc:
        raise GeminiExtractionError(
            "Gemini returned a structured complaint that failed validation."
        ) from exc


def _rate_limit_retry_delay_seconds(exc: errors.ClientError) -> float | None:
    if exc.code != 429 or exc.status != "RESOURCE_EXHAUSTED":
        return None

    details = exc.details
    if isinstance(details, dict):
        error_details = details.get("error", details).get("details", [])
        if isinstance(error_details, list):
            for detail in error_details:
                if not isinstance(detail, dict):
                    continue
                retry_delay = detail.get("retryDelay")
                if isinstance(retry_delay, str) and retry_delay.endswith("s"):
                    try:
                        return float(retry_delay[:-1]) + RATE_LIMIT_RETRY_BUFFER_SECONDS
                    except ValueError:
                        break

    return RATE_LIMIT_FALLBACK_DELAY_SECONDS


def _generate_structured_content(
    client: genai.Client,
    complaint_text: str,
    image_b64: str | None = None,
) -> Any:
    contents: list[Any] = []
    if image_b64:
        import base64
        b64_data = image_b64.split(",", 1)[1] if "," in image_b64 else image_b64
        try:
            image_bytes = base64.b64decode(b64_data)
            contents.append(
                types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg")
            )
        except Exception:
            pass  # Fall back to text if b64 is malformed

    contents.append(build_extraction_prompt(complaint_text))

    for attempt in range(3):
        try:
            return client.models.generate_content(
                model=_get_model_name(),
                contents=contents,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=_gemini_response_schema(),
                ),
            )
        except errors.APIError as exc:
            if attempt == 2:
                raise

            if isinstance(exc, errors.ClientError):
                retry_delay = _rate_limit_retry_delay_seconds(exc)
                if retry_delay is None or retry_delay > 10.0:
                    raise
                time.sleep(retry_delay)
            elif isinstance(exc, errors.ServerError):
                time.sleep(5.0)
            else:
                raise

    raise GeminiExtractionError("Gemini complaint extraction retry did not complete.")


def classify_complaint(text: str, image_b64: str | None = None) -> CivicComplaint:
    """Classify complaint text and optional image with Gemini and return a validated complaint."""
    complaint_text = _validate_input(text)
    client = _create_client()
    try:
        response = _generate_structured_content(client, complaint_text, image_b64)
    except errors.ClientError as exc:
        if exc.code == 429:
            raise GeminiExtractionError(
                f"Gemini quota exhausted (HTTP 429). "
                f"Retry after the daily free-tier limit resets, or add billing."
            ) from exc
        raise GeminiExtractionError(
            f"Gemini API client error (HTTP {exc.code}): {exc.message}"
        ) from exc
    except errors.ServerError as exc:
        raise GeminiExtractionError(
            f"Gemini API server error (HTTP {exc.code}). Try again later."
        ) from exc
    except GeminiExtractionError:
        raise
    except Exception as exc:
        raise GeminiExtractionError(
            f"Gemini complaint extraction failed: {type(exc).__name__}: {exc}"
        ) from exc
    return _parse_structured_response(response)


LANGUAGE_NAMES: dict[str, str] = {
    "en": "English",
    "hi": "Hindi (हिन्दी)",
    "ml": "Malayalam (മലയാളം)",
    "ta": "Tamil (தமிழ்)",
    "te": "Telugu (తెలుగు)",
    "kn": "Kannada (ಕನ್ನಡ)",
    "bn": "Bengali (বাংলা)",
    "mr": "Marathi (मराठी)",
}


LANGUAGE_CODES_BY_NAME: dict[str, str] = {
    "english": "en",
    "en": "en",
    "hindi": "hi",
    "hi": "hi",
    "malayalam": "ml",
    "ml": "ml",
    "tamil": "ta",
    "ta": "ta",
    "telugu": "te",
    "te": "te",
    "kannada": "kn",
    "kn": "kn",
    "bengali": "bn",
    "bangla": "bn",
    "bn": "bn",
    "marathi": "mr",
    "mr": "mr",
}


import logging
import json
import urllib.parse
import httpx

logger = logging.getLogger(__name__)


def _fast_translate_fallback(text: str, target_lang: str, source_lang: str | None = None) -> str | None:
    """Ultra-fast, open translation fallback using MyMemory API and public endpoints."""
    target_code = target_lang.lower().split("-")[0]
    source_code = "en"
    if source_lang:
        source_clean = source_lang.strip().lower()
        source_code = LANGUAGE_CODES_BY_NAME.get(source_clean, "en")

    # 1. Try MyMemory Open Translation API (50,000 words/day, free, reliable)
    try:
        url = "https://api.mymemory.translated.net/get"
        params = {
            "q": text,
            "langpair": f"{source_code}|{target_code}",
        }
        with httpx.Client(timeout=6.0) as client:
            resp = client.get(url, params=params)
            if resp.status_code == 200:
                data = resp.json()
                trans = data.get("responseData", {}).get("translatedText")
                if trans and trans.strip() and not trans.startswith("MYMEMORY WARNING"):
                    return trans.strip()
    except Exception as exc:
        logger.debug("MyMemory fallback failed: %s", exc)

    return None


def translate_text(text: str, target_lang: str, source_lang: str | None = None) -> dict[str, str]:
    """Translate civic complaint text into target language using Gemini with automatic Google Translate fallback."""
    cleaned_text = _validate_input(text)
    target_code = target_lang.lower().split("-")[0]
    target_name = LANGUAGE_NAMES.get(target_code, target_lang)

    source_code = None
    if source_lang:
        source_clean = source_lang.strip().lower()
        source_code = LANGUAGE_CODES_BY_NAME.get(source_clean, source_clean.split("-")[0])

    # 1. High Performance Fast Path: If source and target languages match, return immediately (0ms latency, zero API calls)
    if source_code and source_code == target_code:
        return {
            "source_language": source_lang,
            "translated_text": cleaned_text,
            "target_language": target_code,
        }

    load_dotenv()

    # 2. Try Gemini structured translation if key is available
    if os.getenv("GEMINI_API_KEY") and os.getenv("USE_MOCK_CLASSIFIER", "").lower() != "true":
        try:
            client = _create_client()
            source_context = f"from {source_lang} " if source_lang else ""
            prompt = (
                f"You are an expert multilingual civic translator specializing in Indian languages.\n"
                f"Task:\n"
                f"1. Translate the following civic complaint {source_context}into natural, fluent {target_name} in its proper native script.\n"
                f"2. If the text is ALREADY in {target_name}, keep the translated_text identical to the original.\n"
                f"Return ONLY valid JSON matching this schema:\n"
                f'{{"detected_language": "{source_lang or "<Language Name>"}", "translated_text": "<Translated text in {target_name} script>"}}\n\n'
                f"Input text:\n{cleaned_text}"
            )

            response = client.models.generate_content(
                model=_get_model_name(),
                contents=[prompt],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                ),
            )
            raw_output = (response.text or "").strip()
            data = json.loads(raw_output) if raw_output else {}
            translated = (data.get("translated_text") or "").strip()
            detected = (data.get("detected_language") or source_lang or "Auto").strip()
            if translated:
                return {
                    "source_language": detected,
                    "translated_text": translated,
                    "target_language": target_code,
                }
        except Exception as exc:
            logger.warning("Gemini translation unavailable (%s): %s. Using Google Translate fallback.", target_lang, exc)

    # 3. Fallback: Ultra-fast open translation engine
    fallback = _fast_translate_fallback(cleaned_text, target_code, source_lang)
    if fallback:
        return {
            "source_language": source_lang or "Auto",
            "translated_text": fallback,
            "target_language": target_code,
        }

    return {
        "source_language": source_lang or "Auto",
        "translated_text": cleaned_text,
        "target_language": target_code,
    }


def generate_policy_brief(stats: dict[str, Any], hotspots: list[dict[str, Any]]) -> str:
    """Generate an AI-driven policy brief from stats and hotspots."""
    if not os.getenv("GEMINI_API_KEY") or os.getenv("USE_MOCK_CLASSIFIER", "").lower() == "true":
        return "# AI Policy Brief Unavailable\n\nPlease configure a valid Gemini API key to generate infrastructure reports."
    
    try:
        client = _create_client()
        prompt = (
            "You are a senior civic infrastructure analyst advising the municipal commissioner.\n"
            "Analyze the following real-time complaint statistics and top critical hotspots.\n"
            "Write a concise, professional, 1-page executive policy brief in Markdown format.\n\n"
            "Requirements:\n"
            "1. Give it a clear, professional title.\n"
            "2. Highlight the most pressing infrastructure failures.\n"
            "3. Provide 2-3 specific, actionable recommendations for emergency budget allocation based ON THE DATA provided.\n"
            "4. Keep it concise, punchy, and data-driven.\n"
            "5. Do NOT include any markdown code block wrappers (like ```markdown), just return the raw markdown text.\n\n"
            f"Overall System Statistics: {json.dumps(stats)}\n\n"
            f"Top Critical Hotspots (Sorted by Citizen Reports & Urgency): {json.dumps(hotspots)}"
        )

        response = client.models.generate_content(
            model=_get_model_name(),
            contents=[prompt],
            config=types.GenerateContentConfig(
                response_mime_type="text/plain",
            ),
        )
        return (response.text or "").strip()
    except Exception as exc:
        logger.error("Failed to generate policy brief: %s", exc, exc_info=True)
        return f"# Error Generating Brief\n\nAn error occurred while generating the policy brief: {exc}"
