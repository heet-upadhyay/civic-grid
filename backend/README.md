# CivicGrid Gemini Complaint Extraction

A standalone Python module that converts citizen complaint text into a validated `CivicComplaint` object using Gemini structured output. It has no HTTP, database, authentication, or frontend code.

## Requirements

Python 3.11+ and a Gemini API key.

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Set `GEMINI_API_KEY` in `.env` or the process environment. `GEMINI_MODEL` is optional and defaults to `gemini-3.6-flash`, a Gemini model suitable for structured text classification.

## Usage

```python
from civicgrid.gemini import classify_complaint

complaint = classify_complaint(
    "There is a huge pothole near the bus stop in Ward 7."
)
print(complaint)
print(complaint.model_dump())
```

The model contains exactly these fields: `category`, `subcategory`, `severity`, `urgency`, `location`, `affected_facility`, and `summary`. Category, severity, and urgency are constrained enums. Missing locations or facilities are represented as `Unknown`.

## Tests

Run credential-free unit tests:

```powershell
pytest -m "not integration"
```

Run live Gemini integration tests only when `GEMINI_API_KEY` is configured:

```powershell
pytest -m integration
```

Run the manual examples, including Malayalam:

```powershell
python test_manual.py
```
