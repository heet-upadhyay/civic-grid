import os

import pytest
from dotenv import load_dotenv
from pydantic import ValidationError

from civicgrid.gemini import (
    ComplaintInputError,
    GeminiConfigurationError,
    GeminiExtractionError,
    classify_complaint,
)
from civicgrid.prompts import EXTRACTION_INSTRUCTIONS, build_extraction_prompt
from civicgrid.schemas import CivicComplaint


VALID_COMPLAINT = {
    "category": "Roads",
    "subcategory": "Pothole",
    "severity": "High",
    "urgency": "Urgent",
    "location": "Ward 7",
    "affected_facility": "Bus Stop",
    "summary": "A large pothole near a bus stop creates a road safety risk.",
}


def test_schema_has_required_fields():
    assert {
        "category",
        "subcategory",
        "severity",
        "urgency",
        "location",
        "affected_facility",
        "summary",
        "image_analysis",
        "is_spam",
        "is_duplicate",
        "duplicate_of_id",
        "detected_language",
    } == set(CivicComplaint.model_fields)


def test_translate_text_fast_path_same_language():
    from civicgrid.gemini import translate_text
    result = translate_text("പഞ്ചായത്ത് റോഡിൽ വലിയ കുഴിയുണ്ട്", "ml", source_lang="Malayalam")
    assert result["translated_text"] == "പഞ്ചായത്ത് റോഡിൽ വലിയ കുഴിയുണ്ട്"
    assert result["target_language"] == "ml"


def test_translate_text_cross_language():
    from civicgrid.gemini import translate_text, _fast_translate_fallback
    res_fb = _fast_translate_fallback("There is a large pothole on the road near the school", "ml", "English")
    assert res_fb is not None
    assert len(res_fb) > 0
    result = translate_text("There is a large pothole on the road near the school", "ml", source_lang="English")
    assert result["target_language"] == "ml"
    assert len(result["translated_text"]) > 0





def test_schema_accepts_valid_values():
    complaint = CivicComplaint.model_validate(VALID_COMPLAINT)

    assert complaint.category.value == "Roads"
    assert complaint.severity.value == "High"
    assert complaint.urgency.value == "Urgent"


def test_schema_rejects_arbitrary_taxonomy_values():
    invalid = {**VALID_COMPLAINT, "category": "Housing"}

    with pytest.raises(ValidationError):
        CivicComplaint.model_validate(invalid)


def test_schema_rejects_extra_fields():
    invalid = {**VALID_COMPLAINT, "ward": "7"}

    with pytest.raises(ValidationError):
        CivicComplaint.model_validate(invalid)


def test_prompt_contains_semantic_and_multilingual_guidance():
    prompt = build_extraction_prompt("പഞ്ചായത്ത് റോഡിൽ വലിയ കുഴിയുണ്ട്")

    assert "Malayalam" in prompt
    assert "Severity means" in prompt
    assert "Urgency means" in prompt
    assert '"Unknown"' in prompt
    assert "പഞ്ചായത്ത് റോഡിൽ വലിയ കുഴിയുണ്ട്" in prompt


def test_empty_input_is_rejected_before_client_creation(monkeypatch):
    monkeypatch.setattr(
        "civicgrid.gemini.genai.Client",
        lambda **_: pytest.fail("Gemini client must not be created"),
    )

    with pytest.raises(ComplaintInputError, match="empty or whitespace"):
        classify_complaint("   ")


def test_non_string_input_is_rejected():
    with pytest.raises(ComplaintInputError, match="must be a string"):
        classify_complaint(None)  # type: ignore[arg-type]


def test_missing_api_key_is_actionable(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.setattr("civicgrid.gemini.load_dotenv", lambda: None)

    with pytest.raises(GeminiConfigurationError, match="GEMINI_API_KEY"):
        classify_complaint("The street lights have stopped working.")


def test_invalid_structured_response_is_not_returned(monkeypatch):
    class FakeResponse:
        parsed = {**VALID_COMPLAINT, "category": "Housing"}

    class FakeModels:
        def generate_content(self, **_):
            return FakeResponse()

    class FakeClient:
        models = FakeModels()

    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.setattr("civicgrid.gemini.genai.Client", lambda **_: FakeClient())

    with pytest.raises(GeminiExtractionError, match="failed validation"):
        classify_complaint("A complaint with a malformed model result.")


def test_gemini_request_uses_structured_output(monkeypatch):
    captured = {}

    class FakeResponse:
        parsed = VALID_COMPLAINT

    class FakeModels:
        def generate_content(self, **kwargs):
            captured.update(kwargs)
            return FakeResponse()

    class FakeClient:
        models = FakeModels()

    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.setattr("civicgrid.gemini.genai.Client", lambda **_: FakeClient())

    result = classify_complaint("There is a pothole in Ward 7.")

    assert isinstance(result, CivicComplaint)
    assert captured["config"].response_mime_type == "application/json"
    assert captured["config"].response_schema["title"] == "CivicComplaint"
    assert "additionalProperties" not in captured["config"].response_schema


def test_unparsed_response_is_not_treated_as_json(monkeypatch):
    class FakeResponse:
        parsed = None
        text = '{"category": "Roads"}'

    class FakeModels:
        def generate_content(self, **_):
            return FakeResponse()

    class FakeClient:
        models = FakeModels()

    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.setattr("civicgrid.gemini.genai.Client", lambda **_: FakeClient())

    with pytest.raises(GeminiExtractionError, match="no parsed structured complaint"):
        classify_complaint("A complaint with an unparsed response.")


INTEGRATION_CASES = [
    (
        "road",
        "There is a huge pothole near the bus stop in Ward 7. Two bikes almost fell yesterday.",
        {"category": "Roads", "subcategory": "pothole", "location": "ward 7"},
    ),
    ("water", "We have had no water supply in our area for two days.", {"category": "Water"}),
    (
        "waste",
        "Garbage has not been collected near the market for a week and it smells badly.",
        {"category": "Waste Management"},
    ),
    (
        "electrical emergency",
        "A live electric wire has fallen onto the road outside the school.",
        {"category": "Electricity", "severity": "Critical", "urgency": "Emergency"},
    ),
    (
        "Malayalam road",
        "പഞ്ചായത്ത് റോഡിൽ വലിയ കുഴിയുണ്ട്, വാഹനങ്ങൾ പോകാൻ ബുദ്ധിമുട്ടാണ്.",
        {"category": "Roads", "subcategory": "road"},
    ),
    (
        "missing location",
        "The street lights have stopped working.",
        {"category": "Street Lighting", "location": "Unknown"},
    ),
    (
        "healthcare",
        "The government hospital does not have enough doctors during the night.",
        {"category": "Healthcare"},
    ),
    (
        "drainage",
        "The drain overflows whenever it rains and dirty water enters our street.",
        {"category": "Drainage"},
    ),
]


@pytest.mark.integration
@pytest.mark.parametrize("name,text,expected", INTEGRATION_CASES, ids=lambda value: value if isinstance(value, str) else "case")
def test_gemini_classifies_representative_complaints(name, text, expected):
    load_dotenv()
    if not os.getenv("GEMINI_API_KEY"):
        pytest.skip("GEMINI_API_KEY is not configured")

    result = classify_complaint(text)
    assert result.category.value == expected["category"]
    for field, expected_value in expected.items():
        if field == "category":
            continue
        actual_value = getattr(result, field)
        actual_text = actual_value.value if hasattr(actual_value, "value") else actual_value
        assert expected_value.lower() in actual_text.lower(), name
