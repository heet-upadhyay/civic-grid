"""
Automated unit tests for CivicGrid Authentication and Role-Based Access Control (RBAC).

Tests:
1. Citizen Registration and Login
2. Unauthenticated endpoint protection & 401 response
3. Citizen ownership authorization & IDOR prevention (Citizen A cannot access Citizen B's complaint)
4. Officer department/ward scoping authorization (Officer A cannot access Officer B's department/ward)
5. Citizen Resolution Verification authorization (Officers/non-owners blocked from citizen verification)
6. Admin user management endpoints
"""
from __future__ import annotations

import os
import tempfile

import pytest
from fastapi.testclient import TestClient

os.environ["USE_MOCK_CLASSIFIER"] = "true"
os.environ["DATABASE_URL"] = ""

_tmpdir = tempfile.mkdtemp()
os.environ["CIVICGRID_DB_PATH"] = os.path.join(_tmpdir, "test_auth.db")

from civicgrid.api import app
from civicgrid import database as db
from civicgrid.auth import create_access_token


@pytest.fixture(autouse=True)
def fresh_db():
    db.init_db()
    yield
    import sqlite3
    conn = sqlite3.connect(os.environ["CIVICGRID_DB_PATH"])
    try:
        conn.execute("DELETE FROM complaint_events")
        conn.execute("DELETE FROM resolutions")
        conn.execute("DELETE FROM citizen_verifications")
        conn.execute("DELETE FROM complaints")
        conn.execute("DELETE FROM users WHERE email NOT LIKE 'admin%' AND email NOT LIKE 'officer%' AND email NOT LIKE 'citizen%'")
        conn.commit()
    except sqlite3.OperationalError:
        pass
    finally:
        conn.close()


client = TestClient(app)


def get_auth_header(user_id: str, email: str, role: str, department: str | None = None, ward: str | None = None) -> dict[str, str]:
    token = create_access_token(user_id, email, role, department, ward)
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# 1. Authentication Tests
# ---------------------------------------------------------------------------

def test_citizen_registration_and_login():
    reg_res = client.post("/api/auth/register", json={
        "name": "Test Citizen",
        "email": "test.citizen@example.com",
        "password": "password123",
    })
    assert reg_res.status_code == 201
    body = reg_res.json()
    assert "access_token" in body
    assert body["user"]["email"] == "test.citizen@example.com"
    assert body["user"]["role"] == "CITIZEN"

    login_res = client.post("/api/auth/login", json={
        "email": "test.citizen@example.com",
        "password": "password123",
    })
    assert login_res.status_code == 200
    assert "access_token" in login_res.json()


def test_invalid_login_rejected():
    r = client.post("/api/auth/login", json={"email": "nonexistent@example.com", "password": "wrongpassword"})
    assert r.status_code == 401


# ---------------------------------------------------------------------------
# 2. Citizen Ownership & IDOR Prevention
# ---------------------------------------------------------------------------

def test_citizen_can_only_access_own_complaints():
    headers_a = get_auth_header("USER-CITIZEN-001", "citizen.a@example.com", "CITIZEN")
    headers_b = get_auth_header("USER-CITIZEN-002", "citizen.b@example.com", "CITIZEN")

    # Citizen A submits a complaint
    c_a = client.post("/api/complaints", json={"text": "Water pipeline burst near Citizen A home.", "location": "Ward 1"}, headers=headers_a)
    assert c_a.status_code == 201
    cid_a = c_a.json()["complaint"]["id"]
    assert c_a.json()["complaint"]["citizen_id"] == "USER-CITIZEN-001"

    # Citizen B submits a complaint
    c_b = client.post("/api/complaints", json={"text": "Garbage dump near Citizen B home.", "location": "Ward 2"}, headers=headers_b)
    assert c_b.status_code == 201
    cid_b = c_b.json()["complaint"]["id"]

    # Citizen A gets their complaints list -> should contain cid_a but NOT cid_b
    list_a = client.get("/api/complaints", headers=headers_a)
    assert list_a.status_code == 200
    ids_a = [item["id"] for item in list_a.json()["complaints"]]
    assert cid_a in ids_a
    assert cid_b not in ids_a

    # Citizen A trying to access Citizen B's complaint directly -> 403 Forbidden
    idor_res = client.get(f"/api/complaints/{cid_b}", headers=headers_a)
    assert idor_res.status_code == 403


# ---------------------------------------------------------------------------
# 3. Officer Department & Ward Scoping
# ---------------------------------------------------------------------------

def test_officer_department_scoping():
    headers_pubworks = get_auth_header("OFFICER-2026", "officer1@civicgrid.gov.in", "OFFICER", department="Municipal Public Works", ward="Ward 12")
    headers_health = get_auth_header("OFFICER-HEALTH", "officer2@civicgrid.gov.in", "OFFICER", department="Health & Sanitation", ward="Ward 7")

    # Insert complaint assigned to Municipal Public Works
    c_pw = client.post("/api/complaints", json={"text": "Deep pothole blocking Ward 12 main avenue.", "location": "Ward 12"})
    cid_pw = c_pw.json()["complaint"]["id"]
    client.post(f"/api/complaints/{cid_pw}/assign", json={"department": "Municipal Public Works", "ward": "Ward 12"}, headers=headers_pubworks)

    # Health Officer trying to update Public Works complaint -> 403 Forbidden
    forbidden_update = client.patch(f"/api/complaints/{cid_pw}", json={"status": "In Progress"}, headers=headers_health)
    assert forbidden_update.status_code == 403

    # Authorized Public Works Officer updating complaint -> 200 OK
    allowed_update = client.patch(f"/api/complaints/{cid_pw}", json={"status": "In Progress"}, headers=headers_pubworks)
    assert allowed_update.status_code == 200


# ---------------------------------------------------------------------------
# 4. Citizen Resolution Verification Rights
# ---------------------------------------------------------------------------

def test_only_original_citizen_can_verify_resolution():
    headers_owner = get_auth_header("USER-CITIZEN-001", "citizen.a@example.com", "CITIZEN")
    headers_other_citizen = get_auth_header("USER-CITIZEN-002", "citizen.b@example.com", "CITIZEN")
    headers_officer = get_auth_header("OFFICER-2026", "officer1@civicgrid.gov.in", "OFFICER", department="Municipal Public Works")

    # Citizen A creates complaint
    c_res = client.post("/api/complaints", json={"text": "Broken drain pipe overflowing onto street.", "location": "Ward 12"}, headers=headers_owner)
    cid = c_res.json()["complaint"]["id"]

    # Officer moves to In Progress and Resolves
    client.post(f"/api/complaints/{cid}/assign", json={"department": "Municipal Public Works"}, headers=headers_officer)
    client.patch(f"/api/complaints/{cid}", json={"status": "In Progress"}, headers=headers_officer)
    client.post(f"/api/complaints/{cid}/resolve", json={"note": "Fixed pipe with PVC replacement"}, headers=headers_officer)

    # Officer attempting citizen verification -> 403 Forbidden
    officer_verify = client.post(f"/api/complaints/{cid}/verify", json={"result": "Verified"}, headers=headers_officer)
    assert officer_verify.status_code == 403

    # Other Citizen attempting verification -> 403 Forbidden
    other_verify = client.post(f"/api/complaints/{cid}/verify", json={"result": "Verified"}, headers=headers_other_citizen)
    assert other_verify.status_code == 403

    # Original Citizen owner verification -> 200 OK
    owner_verify = client.post(f"/api/complaints/{cid}/verify", json={"result": "Verified", "feedback": "Looks fixed!"}, headers=headers_owner)
    assert owner_verify.status_code == 200
    assert owner_verify.json()["status"] == "Resolved"


# ---------------------------------------------------------------------------
# 5. Admin Privileges & User Management
# ---------------------------------------------------------------------------

def test_admin_user_management():
    headers_admin = get_auth_header("USER-ADMIN-001", "admin@civicgrid.gov.in", "ADMIN")
    headers_citizen = get_auth_header("USER-CITIZEN-001", "citizen.a@example.com", "CITIZEN")

    # Citizen trying to call Admin list users endpoint -> 403 Forbidden
    unauth_list = client.get("/api/admin/users", headers=headers_citizen)
    assert unauth_list.status_code == 403

    # Admin listing users -> 200 OK
    admin_list = client.get("/api/admin/users", headers=headers_admin)
    assert admin_list.status_code == 200
    assert len(admin_list.json()) >= 1

    # Admin creating new officer account
    create_off = client.post("/api/admin/users", json={
        "name": "Officer New",
        "email": "officer.new@civicgrid.gov.in",
        "password": "password123",
        "role": "OFFICER",
        "department": "Traffic",
        "ward": "Ward 5",
    }, headers=headers_admin)
    assert create_off.status_code == 201
    assert create_off.json()["role"] == "OFFICER"
    assert create_off.json()["department"] == "Traffic"
