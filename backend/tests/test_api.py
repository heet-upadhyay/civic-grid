"""
API endpoint tests — credential-free using MockClassifier.

These tests exercise the FastAPI routes, database layer, and request
validation. No Gemini API key is required.
"""
from __future__ import annotations

import os
import tempfile

import pytest
from fastapi.testclient import TestClient

# Force MockClassifier and local isolated SQLite for all tests in this module
os.environ["USE_MOCK_CLASSIFIER"] = "true"
os.environ["DATABASE_URL"] = ""

# Use an isolated temp database so tests don't pollute production data
_tmpdir = tempfile.mkdtemp()
os.environ["CIVICGRID_DB_PATH"] = os.path.join(_tmpdir, "test.db")

from civicgrid.api import app  # noqa: E402 — env must be set before import
from civicgrid import database as db  # noqa: E402


@pytest.fixture(autouse=True)
def fresh_db():
    """Re-initialise the database before every test."""
    db.init_db()
    yield
    # Teardown: delete all rows so tests are isolated
    import sqlite3
    conn = sqlite3.connect(os.environ["CIVICGRID_DB_PATH"])
    try:
        conn.execute("DELETE FROM complaint_events")
        conn.execute("DELETE FROM resolutions")
        conn.execute("DELETE FROM citizen_verifications")
        conn.execute("DELETE FROM complaints")
        conn.commit()
    except sqlite3.OperationalError:
        pass
    finally:
        conn.close()


client = TestClient(app)


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

def test_health():
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


# ---------------------------------------------------------------------------
# Submit complaint
# ---------------------------------------------------------------------------

def test_submit_complaint_returns_201():
    r = client.post("/api/complaints", json={"text": "The road near the school has a deep pothole.", "location": "Ward 7"})
    assert r.status_code == 201
    body = r.json()
    assert body["success"] is True
    complaint = body["complaint"]
    assert complaint["id"].startswith("COMP-")
    assert complaint["raw_text"] == "The road near the school has a deep pothole."
    assert complaint["status"] == "New"
    assert "created_at" in complaint
    assert "updated_at" in complaint


def test_submit_complaint_text_too_short_returns_422():
    r = client.post("/api/complaints", json={"text": "short", "location": "Ward 1"})
    assert r.status_code == 422


def test_submit_complaint_missing_location_returns_422():
    r = client.post("/api/complaints", json={"text": "The road near the school has a deep pothole."})
    assert r.status_code == 422


def test_submit_complaint_persists_in_database():
    client.post("/api/complaints", json={"text": "Garbage not collected for 5 days in our area.", "location": "Ward 3"})
    complaints, total = db.list_complaints()
    assert total == 1
    assert complaints[0]["raw_text"] == "Garbage not collected for 5 days in our area."


# ---------------------------------------------------------------------------
# List complaints
# ---------------------------------------------------------------------------

def test_list_complaints_empty():
    r = client.get("/api/complaints")
    assert r.status_code == 200
    body = r.json()
    assert body["complaints"] == []
    assert body["total"] == 0


def test_list_complaints_returns_submitted():
    client.post("/api/complaints", json={"text": "Streetlight broken near the market for a week.", "location": "Ward 5"})
    r = client.get("/api/complaints")
    assert r.status_code == 200
    assert r.json()["total"] == 1


def test_list_complaints_search_filter():
    client.post("/api/complaints", json={"text": "Pothole on the main road near the hospital gate.", "location": "Ward 2"})
    client.post("/api/complaints", json={"text": "Electricity outage every evening for three hours.", "location": "Ward 4"})

    r = client.get("/api/complaints", params={"search": "pothole"})
    assert r.status_code == 200
    assert r.json()["total"] == 1


# ---------------------------------------------------------------------------
# Get complaint by ID
# ---------------------------------------------------------------------------

def test_get_complaint_by_id():
    submit = client.post("/api/complaints", json={"text": "Water pipe burst on the main road near Ward 9 junction.", "location": "Ward 9"})
    complaint_id = submit.json()["complaint"]["id"]

    r = client.get(f"/api/complaints/{complaint_id}")
    assert r.status_code == 200
    assert r.json()["id"] == complaint_id


def test_get_complaint_not_found_returns_404():
    r = client.get("/api/complaints/DOES-NOT-EXIST")
    assert r.status_code == 404


# ---------------------------------------------------------------------------
# Update status
# ---------------------------------------------------------------------------

from civicgrid.auth import create_access_token


def _off_headers():
    token = create_access_token("OFFICER-2026", "officer1@civicgrid.gov.in", "OFFICER", "Municipal Public Works", "Ward 12")
    return {"Authorization": f"Bearer {token}"}


def _cit_headers(user_id="USER-CITIZEN-001"):
    token = create_access_token(user_id, "citizen.a@example.com", "CITIZEN")
    return {"Authorization": f"Bearer {token}"}


def test_update_status():
    submit = client.post("/api/complaints", json={"text": "Broken drain cover flooding our street every time it rains.", "location": "Ward 6"})
    complaint_id = submit.json()["complaint"]["id"]

    r1 = client.patch(f"/api/complaints/{complaint_id}", json={"status": "Under Review"}, headers=_off_headers())
    assert r1.status_code == 200
    assert r1.json()["status"] == "Under Review"

    r2 = client.patch(f"/api/complaints/{complaint_id}", json={"status": "Assigned"}, headers=_off_headers())
    assert r2.status_code == 200
    assert r2.json()["status"] == "Assigned"

    r3 = client.patch(f"/api/complaints/{complaint_id}", json={"status": "In Progress"}, headers=_off_headers())
    assert r3.status_code == 200
    assert r3.json()["status"] == "In Progress"


def test_update_status_invalid_returns_422():
    submit = client.post("/api/complaints", json={"text": "No water supply in our area for the last two days.", "location": "Ward 10"})
    complaint_id = submit.json()["complaint"]["id"]

    r = client.patch(f"/api/complaints/{complaint_id}", json={"status": "InvalidStatus"}, headers=_off_headers())
    assert r.status_code == 422


def test_update_status_not_found_returns_404():
    r = client.patch("/api/complaints/DOES-NOT-EXIST", json={"status": "Resolved"}, headers=_off_headers())
    assert r.status_code == 404


# ---------------------------------------------------------------------------
# Complaint deletion
# ---------------------------------------------------------------------------

def test_citizen_can_delete_own_new_complaint():
    r = client.post(
        "/api/complaints",
        json={"text": "The streetlight outside my home is not working.", "location": "Ward 3"},
        headers=_cit_headers(),
    )
    complaint_id = r.json()["complaint"]["id"]

    delete_res = client.delete(f"/api/complaints/{complaint_id}", headers=_cit_headers())

    assert delete_res.status_code == 200
    assert client.get(f"/api/complaints/{complaint_id}").status_code == 404


def test_citizen_cannot_delete_complaint_after_new_stage():
    r = client.post(
        "/api/complaints",
        json={"text": "The streetlight outside my home is not working.", "location": "Ward 3"},
        headers=_cit_headers(),
    )
    complaint_id = r.json()["complaint"]["id"]
    assert client.patch(
        f"/api/complaints/{complaint_id}",
        json={"status": "Under Review"},
        headers=_off_headers(),
    ).status_code == 200

    delete_res = client.delete(f"/api/complaints/{complaint_id}", headers=_cit_headers())

    assert delete_res.status_code == 403
    assert client.get(f"/api/complaints/{complaint_id}", headers=_cit_headers()).status_code == 200


def test_citizen_cannot_delete_another_citizens_complaint():
    r = client.post(
        "/api/complaints",
        json={"text": "The streetlight outside my home is not working.", "location": "Ward 3"},
        headers=_cit_headers(),
    )
    complaint_id = r.json()["complaint"]["id"]

    delete_res = client.delete(
        f"/api/complaints/{complaint_id}",
        headers=_cit_headers("USER-CITIZEN-002"),
    )

    assert delete_res.status_code == 403


def test_public_tracking_is_unchanged_for_new_complaint():
    r = client.post(
        "/api/complaints",
        json={"text": "The streetlight outside my home is not working.", "location": "Ward 3"},
    )
    complaint = r.json()["complaint"]

    track_res = client.get(f"/api/complaints/track/{complaint['tracking_token']}")

    assert track_res.status_code == 200
    assert track_res.json()["complaint"]["id"] == complaint["id"]


# ---------------------------------------------------------------------------
# Stats
# ---------------------------------------------------------------------------

def test_stats_empty():
    r = client.get("/api/complaints/stats")
    assert r.status_code == 200
    body = r.json()
    assert body["total"] == 0
    assert body["by_status"] == {}


def test_stats_after_submission():
    client.post("/api/complaints", json={"text": "Tree fell on the road blocking traffic for hours.", "location": "Ward 11"})
    client.post("/api/complaints", json={"text": "Public toilet near the bus stand is locked and broken.", "location": "Ward 12"})

    r = client.get("/api/complaints/stats")
    body = r.json()
    assert body["total"] == 2
    assert body["by_status"].get("New", 0) == 2


def test_duplicate_complaint_merges_and_escalates_priority():
    r1 = client.post("/api/complaints", json={"text": "Water pipeline burst on main road causing severe flooding.", "location": "Ward 7"})
    assert r1.status_code == 201
    orig_id = r1.json()["complaint"]["id"]

    r2 = client.post("/api/complaints", json={"text": "Another report of water pipeline burst flooding Ward 7.", "location": "Ward 7"})
    assert r2.status_code == 201
    body2 = r2.json()["complaint"]
    assert body2["is_duplicate"] is True
    assert body2["duplicate_of_id"] == orig_id
    assert body2["citizen_reports_count"] == 2


def test_fuzzy_landmark_pincode_duplicate_matching():
    r1 = client.post("/api/complaints", json={"text": "Garbage dumping near the main market complex.", "location": "MG Road, Indiranagar, Jaipur 302006"})
    assert r1.status_code == 201
    orig_id = r1.json()["complaint"]["id"]

    r2 = client.post("/api/complaints", json={"text": "Overflowing trash bin near MG Road market area.", "location": "Near MG Road, 302006"})
    assert r2.status_code == 201
    body2 = r2.json()["complaint"]
    assert body2["is_duplicate"] is True
    assert body2["duplicate_of_id"] == orig_id
    assert body2["citizen_reports_count"] == 2


def test_translate_endpoint():
    r = client.post("/api/translate", json={"text": "Water leakage on Main Street", "target_language": "hi"})
    assert r.status_code == 200
    body = r.json()
    assert body["original_text"] == "Water leakage on Main Street"
    assert body["target_language"] == "hi"
    assert len(body["translated_text"]) > 0


def test_tracking_token_generated_and_track_endpoint():
    r = client.post("/api/complaints", json={"text": "Large pothole blocking lane 4 near city park.", "location": "Ward 4"})
    assert r.status_code == 201
    complaint = r.json()["complaint"]
    assert "tracking_token" in complaint
    token = complaint["tracking_token"]
    assert token.startswith("TK-")

    track_res = client.get(f"/api/complaints/track/{token}")
    assert track_res.status_code == 200
    track_body = track_res.json()
    assert track_body["complaint"]["id"] == complaint["id"]
    assert len(track_body["events"]) >= 1
    assert track_body["events"][0]["event_type"] == "CREATED"


def test_track_endpoint_accepts_complaint_id():
    r = client.post("/api/complaints", json={"text": "Broken pavement slabs outside the clinic entrance.", "location": "Ward 4"})
    assert r.status_code == 201
    complaint = r.json()["complaint"]

    track_res = client.get(f"/api/complaints/track/{complaint['id']}")
    assert track_res.status_code == 200
    assert track_res.json()["complaint"]["id"] == complaint["id"]


def test_track_endpoint_rejects_under_review_complaint():
    r = client.post("/api/complaints", json={"text": "Loose electric cable hanging near the bus stop.", "location": "Ward 12"})
    assert r.status_code == 201
    complaint_id = r.json()["complaint"]["id"]

    update_res = client.patch(
        f"/api/complaints/{complaint_id}",
        json={"status": "Under Review"},
        headers=_off_headers(),
    )
    assert update_res.status_code == 200

    track_res = client.get(f"/api/complaints/track/{complaint_id}")
    assert track_res.status_code == 403


def test_citizen_can_change_password():
    user = db.create_user(
        name="Password Test Citizen",
        email="password-test-citizen@example.com",
        password="oldpass123",
        role="CITIZEN",
    )
    headers = {
        "Authorization": f"Bearer {create_access_token(user['id'], user['email'], 'CITIZEN')}"
    }

    res = client.post(
        "/api/auth/change-password",
        json={"old_password": "oldpass123", "new_password": "newpass123"},
        headers=headers,
    )
    assert res.status_code == 200
    assert db.verify_user_credentials(user["email"], "newpass123")
    assert not db.verify_user_credentials(user["email"], "oldpass123")


def test_citizen_change_password_rejects_wrong_current_password():
    user = db.create_user(
        name="Password Failure Citizen",
        email="password-failure-citizen@example.com",
        password="oldpass123",
        role="CITIZEN",
    )
    headers = {
        "Authorization": f"Bearer {create_access_token(user['id'], user['email'], 'CITIZEN')}"
    }

    res = client.post(
        "/api/auth/change-password",
        json={"old_password": "wrongpass", "new_password": "newpass123"},
        headers=headers,
    )
    assert res.status_code == 400
    assert db.verify_user_credentials(user["email"], "oldpass123")


def test_auth_change_password_is_citizen_only():
    res = client.post(
        "/api/auth/change-password",
        json={"old_password": "password123", "new_password": "newpass123"},
        headers=_off_headers(),
    )
    assert res.status_code == 403


def test_assign_complaint_endpoint():
    r = client.post("/api/complaints", json={"text": "Water leakage from overhead tank near school.", "location": "Ward 2"})
    cid = r.json()["complaint"]["id"]

    assign_res = client.post(
        f"/api/complaints/{cid}/assign",
        json={"department": "Water Supply", "ward": "Ward 2", "assigned_to": "Officer K. Varma", "sla_hours": 48},
        headers=_off_headers(),
    )
    assert assign_res.status_code == 200
    assigned = assign_res.json()
    assert assigned["status"] == "Assigned"
    assert assigned["department"] == "Water Supply"
    assert assigned["assigned_to"] == "Officer K. Varma"


def test_resolve_and_verify_complaint_flow():
    cit_h = _cit_headers("USER-CITIZEN-001")
    r = client.post("/api/complaints", json={"text": "Garbage dump cleared request in sector 3.", "location": "Ward 3"}, headers=cit_h)
    cid = r.json()["complaint"]["id"]

    # Must be assigned / in progress first before resolving according to state machine rules
    client.post(f"/api/complaints/{cid}/assign", json={"department": "Sanitation", "assigned_to": "Officer A"}, headers=_off_headers())
    client.patch(f"/api/complaints/{cid}", json={"status": "In Progress"}, headers=_off_headers())

    resolve_res = client.post(
        f"/api/complaints/{cid}/resolve",
        json={"note": "Cleaned up garbage using excavator and disinfected area.", "evidence_image": "https://example.com/proof.jpg"},
        headers=_off_headers(),
    )
    assert resolve_res.status_code == 200
    assert resolve_res.json()["status"] == "Resolved"

    verify_res = client.post(
        f"/api/complaints/{cid}/verify",
        json={"result": "Verified", "feedback": "Area is clean now. Great job!"},
        headers=cit_h,
    )
    assert verify_res.status_code == 200
    assert verify_res.json()["status"] == "Resolved"

    timeline_res = client.get(f"/api/complaints/{cid}/timeline")
    assert timeline_res.status_code == 200
    event_types = [e["event_type"] for e in timeline_res.json()]
    assert "CREATED" in event_types
    assert "RESOLVED" in event_types
    assert "VERIFIED_SATISFIED" in event_types


def test_state_machine_invalid_transition_rejected():
    r = client.post("/api/complaints", json={"text": "Road cavity forming on main intersection.", "location": "Ward 8"})
    cid = r.json()["complaint"]["id"]

    # Direct transition from New -> Resolved without assignment or in progress is forbidden
    bad_res = client.patch(f"/api/complaints/{cid}", json={"status": "Resolved"}, headers=_off_headers())
    assert bad_res.status_code == 422


def test_verification_only_allowed_on_resolved():
    cit_h = _cit_headers("USER-CITIZEN-001")
    r = client.post("/api/complaints", json={"text": "Streetlight broken on 4th cross avenue.", "location": "Ward 1"}, headers=cit_h)
    cid = r.json()["complaint"]["id"]

    # Verification on New complaint should fail
    bad_verify = client.post(f"/api/complaints/{cid}/verify", json={"result": "Verified"}, headers=cit_h)
    assert bad_verify.status_code == 422


def test_sla_breach_detection_and_escalation():
    # Insert an overdue complaint directly in database
    db.insert_complaint(
        raw_text="Overdue complaint for SLA testing",
        category="Roads",
        subcategory="Pothole",
        severity="Low",
        urgency="Routine",
        location="Ward 1",
        affected_facility="Street",
        summary="SLA Breach Test",
        status="New",
        sla_deadline="2020-01-01T00:00:00.000000+00:00",  # Far past deadline
    )
    breaches = db.process_sla_breaches()
    assert breaches >= 1






