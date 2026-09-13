# CivicGrid — AI-Powered Civic Complaint Intelligence Platform

[![Python 3.11+](https://img.shields.io/badge/Python-3.11%2B-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688.svg)](https://fastapi.tiangolo.com/)
[![React 19](https://img.shields.io/badge/React-19.0-61DAFB.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6.svg)](https://www.typescriptlang.org/)
[![Google Gemini 3.6](https://img.shields.io/badge/AI-Google%20Gemini%203.6%20Flash-4285F4.svg)](https://ai.google.dev/)
[![Tests](https://img.shields.io/badge/Tests-37%20Passing-brightgreen.svg)]()

> **CivicGrid** is a modern civic intelligence and municipal grievance platform designed to bridge the communication gap between citizens and local administrative bodies. Leveraging Google Gemini Multimodal AI, interactive geospatial mapping, and multilingual natural language processing, CivicGrid automatically categorizes, prioritizes, deduplicates, tracks, and manages civic issues through a strict state machine lifecycle and real-time SLA breach detection.

---

## 🌟 Key Features

### 🏛️ For Citizens
- **Multimodal Issue Reporting**: Submit grievances via text, on-site photo upload, or voice dictation (Speech-to-Text).
- **Zero-Touch AI Classification**: Powered by **Google Gemini 3.6 Flash**, automatically extracting:
  - Category & Subcategory across 11 civic domains
  - Severity (`Low`, `Medium`, `High`, `Critical`)
  - Response Urgency (`Routine`, `Soon`, `Urgent`, `Emergency`)
  - Affected Facility identification & 1-sentence Executive Summary
  - Multimodal Vision photo analysis & defect verification
- **Interactive Location Selection**: Google Places Autocomplete search, GPS auto-detect, and interactive map marker pin drop with human-readable reverse-geocoding.
- **Intelligent Fuzzy Duplicate Detection**: Merges identical issues reported within a 500m GPS radius or shared landmark/PIN code, incrementing citizen support counts and escalating severity dynamically.
- **Public Tracking Portal (`/track/:token`)**: High-entropy 12-character secret token (`TK-XXXXXXXX`) allowing citizens to track live resolution progress, SLA countdown timers, and officer updates without needing an account.
- **Citizen Satisfaction & Verification Loop**: Citizens inspect proof-of-work repair photos and either confirm resolution (`👍 Yes, Solved`) or reopen the complaint (`👎 Reopen`) with feedback.
- **Multilingual & Accessible**: Full UI localization across **9 languages** (English, Hindi, Bengali, Tamil, Telugu, Kannada, Malayalam, Marathi) plus built-in Text-to-Speech (TTS) voice readout.

### 🏢 For Municipal Officers & Administrators
- **Centralized Command Dashboard**: Real-time KPI summaries (Active Issues, Resolution Rate, SLA Compliance Rate) and interactive Recharts visualizations (Bar, Pie, Donut charts).
- **Strict State Machine Lifecycle**: Enforced lifecycle state transitions preventing illegal status updates.
- **Dynamic SLA Breach Engine**: Background monitor that calculates resolution target deadlines and automatically flags overdue tickets with red `⚠️ SLA BREACHED` badges.
- **Proof-of-Work Resolution**: Mandatory repair note and after-photo validation before resolving complaints.
- **Immutable Audit History Log**: Append-only activity audit trail tracking every lifecycle event (`CREATED`, `STATUS_CHANGED`, `ASSIGNED`, `SLA_BREACHED`, `RESOLVED`, `VERIFIED_SATISFIED`, `REOPENED_UNSATISFIED`).
- **Role-Based Access Control (RBAC)**: Secure officer portal with PBKDF2-HMAC-SHA256 password hashing.

---

## 📐 Architecture Overview

```
CivicGrid/
├── backend/                  # Asynchronous Python FastAPI Engine
│   ├── civicgrid/
│   │   ├── api.py            # REST API endpoints & CORS setup
│   │   ├── classifier.py    # Classifier abstraction (Gemini / Mock fallback)
│   │   ├── database.py      # SQLite WAL & PostgreSQL persistence layer
│   │   ├── gemini.py        # Gemini GenAI SDK integration & structured schemas
│   │   ├── models.py        # Pydantic request/response validation models
│   │   ├── prompts.py       # Gemini prompt engineering & vision parser
│   │   └── schemas.py       # Core data schemas & enums
│   └── tests/               # 37 Unit & Integration tests
│       ├── test_api.py      # Endpoint & state machine tests
│       └── test_gemini.py   # Gemini AI & fallback integration tests
│
├── frontend/                 # React 19 + TypeScript + Vite Application
│   └── src/
│       ├── pages/           # 7 Pages (Landing, Submit, Track, Detail, Dashboard, Analytics, Login)
│       ├── components/      # Maps, Visualizations, Form Steppers, Timelines, i18n
│       ├── api/             # React Query API clients & mock handlers
│       ├── hooks/           # Custom React hooks (STT, TTS, Geolocation, i18n)
│       ├── types/           # TypeScript interfaces & enums
│       └── utils/           # Helper functions & state machine validators
│
└── DEMO_SCRIPT_NARRATION.txt # Clean text-only 4-5 minute demo video script
```

---

## 🚦 Grievance Lifecycle & State Machine

```
                  ┌────────────┐
                  │    New     │
                  └─────┬──────┘
                        │
         ┌──────────────┴──────────────┐
         ▼                             ▼
┌──────────────────┐         ┌──────────────────┐
│   Under Review   │         │     Assigned     │
└────────┬─────────┘         └─────────┬────────┘
         │                             │
         └──────────────┬──────────────┘
                        ▼
               ┌──────────────────┐
               │   In Progress    │
               └────────┬─────────┘
                        ▼
               ┌──────────────────┐
               │     Resolved     │  (Requires Proof-of-Work Note & Photo)
               └────────┬─────────┘
                        │
         ┌──────────────┴──────────────┐
         ▼                             ▼
┌──────────────────┐         ┌──────────────────┐
│     Verified     │         │     Reopened     │
│   (Issue Closed) │         │ (Sent to Review) │
└──────────────────┘         └──────────────────┘
```

---

## 🛠️ Quick Start & Local Setup

### Prerequisites
- **Python**: 3.11+
- **Node.js**: 18+
- **Google Gemini API Key**: Optional (automatically uses `MockClassifier` if no key is provided).

---

### 1. Backend Setup (FastAPI)

```powershell
# Navigate to backend
cd backend

# Install Python dependencies
py -m pip install -r requirements.txt

# Configure environment variables
Copy-Item .env.example .env

# (Optional) Set your GEMINI_API_KEY in .env
# GEMINI_API_KEY="your_api_key_here"

# Start the API server
py -m uvicorn civicgrid.api:app --reload --port 8000
```
- API Base URL: `http://localhost:8000`
- Interactive OpenAPI Docs: `http://localhost:8000/docs`

---

### 2. Frontend Setup (React 19 + Vite)

```powershell
# Navigate to frontend
cd frontend

# Install Node dependencies
npm install

# Configure frontend environment
Copy-Item .env.example .env.local

# Start Vite dev server
npm run dev
```
- Frontend Web App: `http://localhost:5173`

---

## 🧪 Running Tests & Quality Verification

CivicGrid includes a comprehensive test suite with 37 passing unit and integration tests.

```powershell
# Run backend unit, API & state machine tests (No Gemini key required)
cd backend
py -m pytest -v

# Run live Gemini integration tests
py -m pytest -v -m integration

# Run frontend build check & linting
cd frontend
npm run build
npm run lint
```

---

## 📡 API Reference Summary

| Method | Endpoint | Description | Auth Level |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/complaints` | Submit complaint & trigger Gemini AI classification | Public |
| `GET` | `/api/complaints` | Filter, search & paginate complaints | Public |
| `GET` | `/api/complaints/{id}` | Retrieve full complaint details | Public |
| `GET` | `/api/complaints/track/{token}`| Public secret tracking token lookup (`TK-XXXXXXXX`) | Public |
| `PATCH` | `/api/complaints/{id}` | Update status (with state machine validation) | Officer |
| `POST` | `/api/complaints/{id}/assign` | Assign department, ward, officer & SLA deadline | Officer |
| `POST` | `/api/complaints/{id}/resolve` | Submit proof-of-work notes & image proof | Officer |
| `POST` | `/api/complaints/{id}/verify` | Citizen satisfaction verification (`Verified`/`Reopened`) | Public |
| `GET` | `/api/complaints/{id}/timeline`| Retrieve immutable activity audit log | Public |
| `GET` | `/api/complaints/stats` | Retrieve aggregate KPI & SLA metrics | Public |
| `POST` | `/api/officer/login` | Authenticate municipal officer | Public |
| `GET` | `/api/health` | Health & liveness probe | Public |

---

## 🎥 Demo Video Script & Materials

A complete 4-5 minute demo video script is included in the project:
- **Clean Text-Only Teleprompter Script**: [`DEMO_SCRIPT_NARRATION.txt`](file:///c:/Users/ashik_rqf6ipg/Downloads/CivicGrid/DEMO_SCRIPT_NARRATION.txt)

---

## 🌐 Multilingual i18n Languages Supported

🇬🇧 English | 🇮🇳 Hindi (हिन्दी) | 🇮🇳 Bengali (বাংলা) | 🇮🇳 Tamil (தமிழ்) | 🇮🇳 Telugu (తెలుగు) | 🇮🇳 Kannada (ಕನ್ನಡ) | 🇮🇳 Malayalam (മലയാളം) | 🇮🇳 Marathi (मराठी)
