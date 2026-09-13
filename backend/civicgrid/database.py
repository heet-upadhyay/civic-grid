"""
Persistence layer for CivicGrid complaints.
Supports both SQLite (local/testing default) and PostgreSQL (Supabase, Neon, Render).
Automatically detects DATABASE_URL in environment.
"""
from __future__ import annotations

import os
import sqlite3
import threading
import json
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

_DB_PATH_DEFAULT = os.path.join(os.path.dirname(__file__), "..", "data", "civicgrid.db")
DB_PATH = os.environ.get("CIVICGRID_DB_PATH", _DB_PATH_DEFAULT)

_lock = threading.RLock()

_CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    email         TEXT UNIQUE NOT NULL,
    name          TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'CITIZEN',
    department    TEXT,
    ward          TEXT,
    status        TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS complaints (
    id                TEXT PRIMARY KEY,
    citizen_id        TEXT,
    raw_text          TEXT NOT NULL,
    category          TEXT NOT NULL,
    subcategory       TEXT NOT NULL,
    severity          TEXT NOT NULL,
    urgency           TEXT NOT NULL,
    location          TEXT NOT NULL,
    affected_facility TEXT NOT NULL,
    summary           TEXT NOT NULL,
    status            TEXT NOT NULL DEFAULT 'New',
    created_at        TEXT NOT NULL,
    updated_at        TEXT NOT NULL,
    latitude          REAL,
    longitude         REAL,
    image_url         TEXT,
    image_analysis    TEXT,
    is_duplicate      INTEGER DEFAULT 0,
    duplicate_of_id   TEXT,
    citizen_reports_count INTEGER DEFAULT 1,
    additional_updates TEXT DEFAULT '[]',
    detected_language TEXT DEFAULT 'English',
    department        TEXT,
    ward              TEXT,
    assigned_to       TEXT,
    sla_deadline      TEXT,
    resolved_at       TEXT,
    tracking_token    TEXT
);

CREATE TABLE IF NOT EXISTS officers (
    officer_id    TEXT PRIMARY KEY,
    password_hash TEXT NOT NULL,
    name          TEXT NOT NULL,
    department    TEXT NOT NULL,
    created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS complaint_events (
    id            TEXT PRIMARY KEY,
    complaint_id  TEXT NOT NULL,
    event_type    TEXT NOT NULL,
    actor         TEXT NOT NULL,
    timestamp     TEXT NOT NULL,
    metadata      TEXT
);

CREATE TABLE IF NOT EXISTS resolutions (
    complaint_id   TEXT PRIMARY KEY,
    note           TEXT NOT NULL,
    evidence_image TEXT,
    submitted_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS citizen_verifications (
    complaint_id TEXT PRIMARY KEY,
    result       TEXT NOT NULL,
    feedback     TEXT,
    timestamp    TEXT NOT NULL
);
"""

_CREATE_INDEXES_SQL = [
    "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);",
    "CREATE INDEX IF NOT EXISTS idx_users_role  ON users(role);",
    "CREATE INDEX IF NOT EXISTS idx_complaints_status   ON complaints(status);",
    "CREATE INDEX IF NOT EXISTS idx_complaints_category ON complaints(category);",
    "CREATE INDEX IF NOT EXISTS idx_complaints_created  ON complaints(created_at);",
    "CREATE INDEX IF NOT EXISTS idx_complaints_citizen  ON complaints(citizen_id);",
    "CREATE INDEX IF NOT EXISTS idx_complaint_events_cid ON complaint_events(complaint_id);",
]

VALID_STATUSES: frozenset[str] = frozenset(
    {"New", "Under Review", "Assigned", "In Progress", "Resolved", "Rejected / Spam"}
)
_ALLOWED_STATS_COLS: frozenset[str] = frozenset({"status", "category", "severity"})


def _get_database_url() -> str:
    return os.environ.get("DATABASE_URL", "").strip()


def _is_postgres() -> bool:
    url = _get_database_url()
    return url.startswith("postgresql://") or url.startswith("postgres://")


def _get_pg_conn():
    import psycopg
    from psycopg.rows import dict_row
    conn_url = _get_database_url()
    if conn_url.startswith("postgres://"):
        conn_url = "postgresql://" + conn_url[11:]
    return psycopg.connect(conn_url, row_factory=dict_row)


def _get_sqlite_conn() -> sqlite3.Connection:
    db_path = os.environ.get("CIVICGRID_DB_PATH") or DB_PATH
    path = os.path.abspath(db_path)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    conn = sqlite3.connect(path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


import hashlib

_SALT = "civicgrid_salt_2026"


def hash_password(password: str) -> str:
    return hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), _SALT.encode("utf-8"), 100000).hex()


def _seed_initial_users(conn_or_cur, is_pg: bool):
    now = datetime.now(timezone.utc).isoformat()
    default_users = [
        ("USER-ADMIN-001", "admin@civicgrid.gov.in", "System Administrator", hash_password("admin123"), "ADMIN", None, None, "ACTIVE", now),
        ("OFFICER-2026", "officer1@civicgrid.gov.in", "Officer R. Sharma", hash_password("password123"), "OFFICER", "Municipal Public Works", "Ward 12", "ACTIVE", now),
        ("OFFICER-HEALTH", "officer2@civicgrid.gov.in", "Officer S. Gupta", hash_password("password123"), "OFFICER", "Health & Sanitation", "Ward 7", "ACTIVE", now),
        ("USER-CITIZEN-001", "citizen.a@example.com", "Ananya Sharma", hash_password("password123"), "CITIZEN", None, None, "ACTIVE", now),
        ("USER-CITIZEN-002", "citizen.b@example.com", "Bharat Kumar", hash_password("password123"), "CITIZEN", None, None, "ACTIVE", now),
    ]

    for uid, email, name, pw_hash, role, dep, ward, status_val, created in default_users:
        if is_pg:
            conn_or_cur.execute(
                """
                INSERT INTO users (id, email, name, password_hash, role, department, ward, status, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO NOTHING
                """,
                (uid, email, name, pw_hash, role, dep, ward, status_val, created),
            )
            conn_or_cur.execute(
                """
                INSERT INTO officers (officer_id, password_hash, name, department, created_at)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (officer_id) DO NOTHING
                """,
                (uid, pw_hash, name, dep or "General", created),
            )
        else:
            conn_or_cur.execute(
                """
                INSERT OR IGNORE INTO users (id, email, name, password_hash, role, department, ward, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (uid, email, name, pw_hash, role, dep, ward, status_val, created),
            )
            conn_or_cur.execute(
                """
                INSERT OR IGNORE INTO officers (officer_id, password_hash, name, department, created_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (uid, pw_hash, name, dep or "General", created),
            )


def init_db() -> None:
    """Create tables and indexes if they do not already exist."""
    with _lock:
        if _is_postgres():
            with _get_pg_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(_CREATE_TABLE_SQL)
                    cur.execute("ALTER TABLE complaints ADD COLUMN IF NOT EXISTS citizen_id TEXT;")
                    cur.execute("ALTER TABLE complaints ADD COLUMN IF NOT EXISTS latitude REAL;")
                    cur.execute("ALTER TABLE complaints ADD COLUMN IF NOT EXISTS longitude REAL;")
                    cur.execute("ALTER TABLE complaints ADD COLUMN IF NOT EXISTS image_url TEXT;")
                    cur.execute("ALTER TABLE complaints ADD COLUMN IF NOT EXISTS image_analysis TEXT;")
                    cur.execute("ALTER TABLE complaints ADD COLUMN IF NOT EXISTS is_duplicate INTEGER DEFAULT 0;")
                    cur.execute("ALTER TABLE complaints ADD COLUMN IF NOT EXISTS duplicate_of_id TEXT;")
                    cur.execute("ALTER TABLE complaints ADD COLUMN IF NOT EXISTS citizen_reports_count INTEGER DEFAULT 1;")
                    cur.execute("ALTER TABLE complaints ADD COLUMN IF NOT EXISTS additional_updates TEXT DEFAULT '[]';")
                    cur.execute("ALTER TABLE complaints ADD COLUMN IF NOT EXISTS detected_language TEXT DEFAULT 'English';")
                    cur.execute("ALTER TABLE complaints ADD COLUMN IF NOT EXISTS department TEXT;")
                    cur.execute("ALTER TABLE complaints ADD COLUMN IF NOT EXISTS ward TEXT;")
                    cur.execute("ALTER TABLE complaints ADD COLUMN IF NOT EXISTS assigned_to TEXT;")
                    cur.execute("ALTER TABLE complaints ADD COLUMN IF NOT EXISTS sla_deadline TEXT;")
                    cur.execute("ALTER TABLE complaints ADD COLUMN IF NOT EXISTS resolved_at TEXT;")
                    cur.execute("ALTER TABLE complaints ADD COLUMN IF NOT EXISTS tracking_token TEXT;")
                    for idx_sql in _CREATE_INDEXES_SQL:
                        cur.execute(idx_sql)
                    _seed_initial_users(cur, is_pg=True)

                    # Enforce RLS for Postgres, remove permissive policies, and create explicit deny policies to satisfy linters
                    for t in ["users", "complaints", "officers", "complaint_events", "resolutions", "citizen_verifications"]:
                        cur.execute(f"ALTER TABLE {t} ENABLE ROW LEVEL SECURITY;")
                        cur.execute(f"DROP POLICY IF EXISTS \"Enable insert access for all users\" ON {t};")
                        cur.execute(f"DROP POLICY IF EXISTS \"Enable update access for all users\" ON {t};")
                        cur.execute(f"DROP POLICY IF EXISTS \"Deny all public access\" ON {t};")
                        cur.execute(f"CREATE POLICY \"Deny all public access\" ON {t} FOR ALL TO public USING (false);")

                conn.commit()
        else:
            conn = _get_sqlite_conn()
            try:
                conn.executescript(_CREATE_TABLE_SQL)
                # Migration for existing SQLite DBs
                cols = [
                    "citizen_id TEXT", "latitude REAL", "longitude REAL", "image_url TEXT", "image_analysis TEXT", 
                    "is_duplicate INTEGER DEFAULT 0", "duplicate_of_id TEXT", "citizen_reports_count INTEGER DEFAULT 1", 
                    "additional_updates TEXT DEFAULT '[]'", "detected_language TEXT DEFAULT 'English'",
                    "department TEXT", "ward TEXT", "assigned_to TEXT", 
                    "sla_deadline TEXT", "resolved_at TEXT", "tracking_token TEXT"
                ]
                for col in cols:
                    try:
                        conn.execute(f"ALTER TABLE complaints ADD COLUMN {col}")
                    except sqlite3.OperationalError:
                        pass
                for idx_sql in _CREATE_INDEXES_SQL:
                    try:
                        conn.execute(idx_sql)
                    except sqlite3.OperationalError:
                        pass
                _seed_initial_users(conn, is_pg=False)
                conn.commit()
            finally:
                conn.close()


def _next_id_sqlite(conn: sqlite3.Connection) -> str:
    year = datetime.now(timezone.utc).year
    prefix = f"COMP-{year}-"
    row = conn.execute("SELECT MAX(id) FROM complaints WHERE id LIKE ?", (prefix + "%",)).fetchone()
    if row and row[0]:
        try:
            n = int(row[0].split("-")[-1]) + 1
        except (ValueError, IndexError):
            n = 1
    else:
        n = 1
    return f"{prefix}{n:04d}"


def _next_id_pg(conn) -> str:
    year = datetime.now(timezone.utc).year
    prefix = f"COMP-{year}-"
    with conn.cursor() as cur:
        cur.execute("SELECT MAX(id) FROM complaints WHERE id LIKE %s", (prefix + "%",))
        row = cur.fetchone()
        max_id = list(row.values())[0] if isinstance(row, dict) else row[0]
        if max_id:
            try:
                n = int(max_id.split("-")[-1]) + 1
            except (ValueError, IndexError):
                n = 1
        else:
            n = 1
        return f"{prefix}{n:04d}"


def create_user(
    *,
    name: str,
    email: str,
    password: str,
    role: str = "CITIZEN",
    department: str | None = None,
    ward: str | None = None,
) -> dict[str, Any]:
    """Create a new user account."""
    email_clean = email.strip().lower()
    if get_user_by_email(email_clean):
        raise ValueError(f"An account with email {email_clean!r} already exists.")

    pw_hash = hash_password(password)
    now = datetime.now(timezone.utc).isoformat()
    prefix = f"USER-{role.upper()}-"
    token_suffix = secrets.token_hex(3).upper()
    user_id = f"{prefix}{token_suffix}"

    with _lock:
        if _is_postgres():
            with _get_pg_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO users (id, email, name, password_hash, role, department, ward, status, created_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, 'ACTIVE', %s)
                        RETURNING *
                        """,
                        (user_id, email_clean, name, pw_hash, role, department, ward, now),
                    )
                    row = cur.fetchone()
                    if role == "OFFICER":
                        cur.execute(
                            """
                            INSERT INTO officers (officer_id, password_hash, name, department, created_at)
                            VALUES (%s, %s, %s, %s, %s)
                            ON CONFLICT (officer_id) DO NOTHING
                            """,
                            (user_id, pw_hash, name, department or "General", now),
                        )
                conn.commit()
                res = dict(row)
        else:
            conn = _get_sqlite_conn()
            try:
                conn.execute(
                    """
                    INSERT INTO users (id, email, name, password_hash, role, department, ward, status, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?)
                    """,
                    (user_id, email_clean, name, pw_hash, role, department, ward, now),
                )
                if role == "OFFICER":
                    conn.execute(
                        """
                        INSERT OR IGNORE INTO officers (officer_id, password_hash, name, department, created_at)
                        VALUES (?, ?, ?, ?, ?)
                        """,
                        (user_id, pw_hash, name, department or "General", now),
                    )
                conn.commit()
                row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
                res = dict(row)
            finally:
                conn.close()

    res.pop("password_hash", None)
    return res


def get_user_by_id(user_id: str) -> dict[str, Any] | None:
    """Retrieve user record by user_id."""
    with _lock:
        if _is_postgres():
            with _get_pg_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT * FROM users WHERE id = %s", (user_id,))
                    row = cur.fetchone()
                    return dict(row) if row else None
        else:
            conn = _get_sqlite_conn()
            try:
                row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
                return dict(row) if row else None
            finally:
                conn.close()


def get_user_by_email(email: str) -> dict[str, Any] | None:
    """Retrieve user record by email."""
    email_clean = email.strip().lower()
    with _lock:
        if _is_postgres():
            with _get_pg_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT * FROM users WHERE LOWER(email) = %s OR id = %s", (email_clean, email.strip()))
                    row = cur.fetchone()
                    return dict(row) if row else None
        else:
            conn = _get_sqlite_conn()
            try:
                row = conn.execute(
                    "SELECT * FROM users WHERE LOWER(email) = ? OR id = ?",
                    (email_clean, email.strip()),
                ).fetchone()
                return dict(row) if row else None
            finally:
                conn.close()


def verify_user_credentials(email_or_id: str, password: str) -> dict[str, Any] | None:
    """Verify user credentials matching email/ID and hashed password."""
    target_hash = hash_password(password)
    user = get_user_by_email(email_or_id) or get_user_by_id(email_or_id)
    if user and user.get("password_hash") == target_hash:
        u_copy = dict(user)
        u_copy.pop("password_hash", None)
        return u_copy
    return None


def list_users(role: str | None = None) -> list[dict[str, Any]]:
    """List registered users with optional role filtering."""
    with _lock:
        if _is_postgres():
            with _get_pg_conn() as conn:
                with conn.cursor() as cur:
                    if role:
                        cur.execute("SELECT * FROM users WHERE role = %s ORDER BY created_at DESC", (role.upper(),))
                    else:
                        cur.execute("SELECT * FROM users ORDER BY created_at DESC")
                    rows = cur.fetchall()
                    res = [dict(r) for r in rows]
        else:
            conn = _get_sqlite_conn()
            try:
                if role:
                    rows = conn.execute("SELECT * FROM users WHERE role = ? ORDER BY created_at DESC", (role.upper(),)).fetchall()
                else:
                    rows = conn.execute("SELECT * FROM users ORDER BY created_at DESC").fetchall()
                res = [dict(r) for r in rows]
            finally:
                conn.close()

    for u in res:
        u.pop("password_hash", None)
    return res


def update_user(
    user_id: str,
    *,
    name: str | None = None,
    role: str | None = None,
    department: str | None = None,
    ward: str | None = None,
    status: str | None = None,
) -> dict[str, Any] | None:
    """Update user profile/role/department/ward/status attributes."""
    user = get_user_by_id(user_id)
    if not user:
        return None

    new_name = name if name is not None else user.get("name")
    new_role = role.upper() if role is not None else user.get("role")
    new_dep = department if department is not None else user.get("department")
    new_ward = ward if ward is not None else user.get("ward")
    new_status = status if status is not None else user.get("status")

    with _lock:
        if _is_postgres():
            with _get_pg_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        UPDATE users
                        SET name = %s, role = %s, department = %s, ward = %s, status = %s
                        WHERE id = %s
                        RETURNING *
                        """,
                        (new_name, new_role, new_dep, new_ward, new_status, user_id),
                    )
                    row = cur.fetchone()
                conn.commit()
                res = dict(row) if row else None
        else:
            conn = _get_sqlite_conn()
            try:
                conn.execute(
                    """
                    UPDATE users
                    SET name = ?, role = ?, department = ?, ward = ?, status = ?
                    WHERE id = ?
                    """,
                    (new_name, new_role, new_dep, new_ward, new_status, user_id),
                )
                conn.commit()
                r = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
                res = dict(r) if r else None
            finally:
                conn.close()

    if res:
        res.pop("password_hash", None)
    return res


def update_user_password(user_id: str, old_password: str, new_password: str) -> bool:
    """Verify the old password and update to the new password for any user role."""
    user = get_user_by_id(user_id)
    if not user or user.get("password_hash") != hash_password(old_password):
        return False
    new_hash = hash_password(new_password)
    with _lock:
        if _is_postgres():
            with _get_pg_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "UPDATE users SET password_hash = %s WHERE id = %s",
                        (new_hash, user_id),
                    )
                    # Also update officers table if user is an officer
                    cur.execute(
                        "UPDATE officers SET password_hash = %s WHERE officer_id = %s",
                        (new_hash, user_id),
                    )
                conn.commit()
        else:
            conn = _get_sqlite_conn()
            try:
                conn.execute(
                    "UPDATE users SET password_hash = ? WHERE id = ?",
                    (new_hash, user_id),
                )
                conn.execute(
                    "UPDATE officers SET password_hash = ? WHERE officer_id = ?",
                    (new_hash, user_id),
                )
                conn.commit()
            finally:
                conn.close()
    return True


def generate_tracking_token() -> str:
    """Generate a unique 12-character public tracking token."""
    return f"TK-{secrets.token_hex(4).upper()}"



def calculate_default_sla(severity: str, from_time: datetime | None = None) -> str:
    """Calculate target SLA resolution deadline timestamp based on issue severity."""
    base = from_time or datetime.now(timezone.utc)
    hours_map = {"Critical": 24, "High": 48, "Medium": 72, "Low": 120}
    hours = hours_map.get(severity, 72)
    return (base + timedelta(hours=hours)).isoformat()


def insert_complaint(
    *,
    raw_text: str,
    category: str,
    subcategory: str,
    severity: str,
    urgency: str,
    location: str,
    affected_facility: str,
    summary: str,
    status: str = "New",
    citizen_id: str | None = None,
    latitude: float | None = None,
    longitude: float | None = None,
    image_url: str | None = None,
    image_analysis: str | None = None,
    is_duplicate: bool = False,
    duplicate_of_id: str | None = None,
    detected_language: str = "English",
    department: str | None = None,
    ward: str | None = None,
    assigned_to: str | None = None,
    sla_deadline: str | None = None,
    resolved_at: str | None = None,
    tracking_token: str | None = None,
) -> dict[str, Any]:
    """Insert a new complaint and return the full record."""
    now = datetime.now(timezone.utc).isoformat()
    is_dup_int = 1 if is_duplicate else 0
    token = tracking_token or generate_tracking_token()
    sla = sla_deadline or calculate_default_sla(severity)

    with _lock:
        if _is_postgres():
            with _get_pg_conn() as conn:
                complaint_id = _next_id_pg(conn)
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO complaints
                          (id, citizen_id, raw_text, category, subcategory, severity, urgency,
                           location, affected_facility, summary, status, created_at, updated_at,
                           latitude, longitude, image_url, image_analysis, is_duplicate, duplicate_of_id, detected_language,
                           department, ward, assigned_to, sla_deadline, resolved_at, tracking_token)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        RETURNING *
                        """,
                        (
                            complaint_id,
                            citizen_id,
                            raw_text,
                            category,
                            subcategory,
                            severity,
                            urgency,
                            location,
                            affected_facility,
                            summary,
                            status,
                            now,
                            now,
                            latitude,
                            longitude,
                            image_url,
                            image_analysis,
                            is_dup_int,
                            duplicate_of_id,
                            detected_language,
                            department,
                            ward,
                            assigned_to,
                            sla,
                            resolved_at,
                            token,
                        ),
                    )
                    row = cur.fetchone()
                conn.commit()
                res_dict = dict(row)
        else:
            conn = _get_sqlite_conn()
            try:
                complaint_id = _next_id_sqlite(conn)
                conn.execute(
                    """
                    INSERT INTO complaints
                      (id, citizen_id, raw_text, category, subcategory, severity, urgency,
                       location, affected_facility, summary, status, created_at, updated_at,
                       latitude, longitude, image_url, image_analysis, is_duplicate, duplicate_of_id, detected_language,
                       department, ward, assigned_to, sla_deadline, resolved_at, tracking_token)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        complaint_id,
                        citizen_id,
                        raw_text,
                        category,
                        subcategory,
                        severity,
                        urgency,
                        location,
                        affected_facility,
                        summary,
                        status,
                        now,
                        now,
                        latitude,
                        longitude,
                        image_url,
                        image_analysis,
                        is_dup_int,
                        duplicate_of_id,
                        detected_language,
                        department,
                        ward,
                        assigned_to,
                        sla,
                        resolved_at,
                        token,
                    ),
                )
                conn.commit()
                row = conn.execute("SELECT * FROM complaints WHERE id = ?", (complaint_id,)).fetchone()
                res_dict = dict(row)
            finally:
                conn.close()

    # Log initial creation event
    log_complaint_event(
        complaint_id=res_dict["id"],
        event_type="CREATED",
        actor=f"Citizen ({citizen_id})" if citizen_id else "Citizen",
        metadata=json.dumps({"category": category, "severity": severity, "tracking_token": token}),
    )
    return res_dict


def get_complaint(complaint_id: str) -> dict[str, Any] | None:
    """Return a single complaint by ID, or None if not found."""
    with _lock:
        if _is_postgres():
            with _get_pg_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT * FROM complaints WHERE id = %s", (complaint_id,))
                    row = cur.fetchone()
                    return dict(row) if row else None
        else:
            conn = _get_sqlite_conn()
            try:
                row = conn.execute(
                    "SELECT * FROM complaints WHERE id = ?", (complaint_id,)
                ).fetchone()
                return dict(row) if row else None
            finally:
                conn.close()


def list_complaints(
    *,
    status: list[str] | None = None,
    category: list[str] | None = None,
    severity: list[str] | None = None,
    location: list[str] | None = None,
    search: str | None = None,
    sort: str = "newest",
    skip: int = 0,
    limit: int = 100,
    citizen_id: str | None = None,
    officer_department: str | None = None,
    officer_ward: str | None = None,
) -> tuple[list[dict[str, Any]], int]:
    """Return (complaints, total_count) applying RBAC scope, filters, sort, and pagination."""
    process_sla_breaches()
    conditions: list[str] = []
    params: list[Any] = []
    is_pg = _is_postgres()
    ph = "%s" if is_pg else "?"

    def _in(col: str, vals: list[str]) -> None:
        placeholders = ",".join(ph * len(vals))
        conditions.append(f"{col} IN ({placeholders})")
        params.extend(vals)

    if citizen_id:
        conditions.append(f"citizen_id = {ph}")
        params.append(citizen_id)

    if officer_department:
        conditions.append(f"department = {ph}")
        params.append(officer_department)

    if officer_ward and officer_ward not in ("All", ""):
        conditions.append(f"(ward = {ph} OR ward IS NULL OR ward = 'All')")
        params.append(officer_ward)

    if status:
        _in("status", status)
    if category:
        _in("category", category)
    if severity:
        _in("severity", severity)
    if location:
        _in("location", location)
    if search:
        op = "ILIKE" if is_pg else "LIKE"
        conditions.append(f"(summary {op} {ph} OR raw_text {op} {ph} OR subcategory {op} {ph})")
        like = f"%{search}%"
        params.extend([like, like, like])

    # Exclude standalone duplicate entries so only primary unique complaints are listed
    conditions.append("(is_duplicate = 0 OR is_duplicate IS NULL) AND duplicate_of_id IS NULL")

    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""

    _ORDER = {
        "newest": "created_at DESC",
        "oldest": "created_at ASC",
        "highest_severity": (
            "CASE severity WHEN 'Critical' THEN 4 WHEN 'High' THEN 3 "
            "WHEN 'Medium' THEN 2 ELSE 1 END DESC, created_at DESC"
        ),
        "highest_urgency": (
            "CASE urgency WHEN 'Emergency' THEN 4 WHEN 'Urgent' THEN 3 "
            "WHEN 'Soon' THEN 2 ELSE 1 END DESC, created_at DESC"
        ),
    }
    order = _ORDER.get(sort, "created_at DESC")

    with _lock:
        if _is_postgres():
            with _get_pg_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(f"SELECT COUNT(*) FROM complaints {where}", params)
                    count_row = cur.fetchone()
                    if not count_row:
                        total = 0
                    elif isinstance(count_row, dict):
                        total = list(count_row.values())[0]
                    else:
                        total = count_row[0]

                    query_sql = f"SELECT * FROM complaints {where} ORDER BY {order} LIMIT %s OFFSET %s"
                    cur.execute(query_sql, params + [limit, skip])
                    rows = cur.fetchall()
                    return [dict(r) for r in rows], int(total)
        else:
            conn = _get_sqlite_conn()
            try:
                c_row = conn.execute(
                    f"SELECT COUNT(*) FROM complaints {where}", params
                ).fetchone()
                total = c_row[0] if c_row else 0
                rows = conn.execute(
                    f"SELECT * FROM complaints {where} ORDER BY {order} LIMIT ? OFFSET ?",
                    params + [limit, skip],
                ).fetchall()
                return [dict(r) for r in rows], int(total)
            finally:
                conn.close()


ALLOWED_TRANSITIONS: dict[str, set[str]] = {
    "New": {"Under Review", "Assigned", "Rejected / Spam"},
    "Under Review": {"Assigned", "In Progress", "Rejected / Spam"},
    "Assigned": {"In Progress", "Resolved", "Rejected / Spam"},
    "In Progress": {"Resolved", "Rejected / Spam"},
    "Resolved": {"Verified", "Reopened"},
    "Reopened": {"In Progress", "Assigned"},
    "Rejected / Spam": set(),
}


def update_complaint_status(complaint_id: str, new_status: str, actor: str = "Officer") -> dict[str, Any] | None:
    """Update complaint status with strict state machine validation. Returns updated record, or None if not found."""
    if new_status not in VALID_STATUSES:
        raise ValueError(f"Invalid status {new_status!r}. Must be one of: {sorted(VALID_STATUSES)}")

    current_row = get_complaint(complaint_id)
    if not current_row:
        return None

    current_status = current_row.get("status", "New")
    if current_status == new_status:
        return current_row

    allowed_next = ALLOWED_TRANSITIONS.get(current_status, set())
    if new_status not in allowed_next:
        raise ValueError(
            f"Invalid status transition from {current_status!r} to {new_status!r}. "
            f"Allowed next states for {current_status!r}: {sorted(allowed_next)}"
        )

    now = datetime.now(timezone.utc).isoformat()
    with _lock:
        if _is_postgres():
            with _get_pg_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "UPDATE complaints SET status = %s, updated_at = %s WHERE id = %s RETURNING *",
                        (new_status, now, complaint_id),
                    )
                    row = cur.fetchone()
                conn.commit()
                res = dict(row) if row else None
        else:
            conn = _get_sqlite_conn()
            try:
                result = conn.execute(
                    "UPDATE complaints SET status = ?, updated_at = ? WHERE id = ?",
                    (new_status, now, complaint_id),
                )
                conn.commit()
                if result.rowcount == 0:
                    res = None
                else:
                    row = conn.execute("SELECT * FROM complaints WHERE id = ?", (complaint_id,)).fetchone()
                    res = dict(row)
            finally:
                conn.close()

    if res:
        log_complaint_event(
            complaint_id=complaint_id,
            event_type="STATUS_CHANGED",
            actor=actor,
            metadata=json.dumps({"old_status": current_status, "new_status": new_status}),
        )
    return res


def process_sla_breaches() -> int:
    """
    Check all open complaints for SLA deadline breaches.
    If sla_deadline < now and complaint is open, log SLA_BREACHED event
    and escalate severity to Critical / Emergency if not already logged.
    Returns count of newly flagged breaches.
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    breached_count = 0

    with _lock:
        if _is_postgres():
            with _get_pg_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        SELECT id, severity, urgency, sla_deadline FROM complaints
                        WHERE status IN ('New', 'Under Review', 'Assigned', 'In Progress', 'Reopened')
                          AND sla_deadline IS NOT NULL
                          AND sla_deadline < %s
                        """,
                        (now_iso,),
                    )
                    overdue = [dict(r) for r in cur.fetchall()]
        else:
            conn = _get_sqlite_conn()
            try:
                rows = conn.execute(
                    """
                    SELECT id, severity, urgency, sla_deadline FROM complaints
                    WHERE status IN ('New', 'Under Review', 'Assigned', 'In Progress', 'Reopened')
                      AND sla_deadline IS NOT NULL
                      AND sla_deadline < ?
                    """,
                    (now_iso,),
                ).fetchall()
                overdue = [dict(r) for r in rows]
            finally:
                conn.close()

    for item in overdue:
        cid = item["id"]
        events = get_complaint_events(cid)
        if not any(e.get("event_type") == "SLA_BREACHED" for e in events):
            breached_count += 1
            log_complaint_event(
                complaint_id=cid,
                event_type="SLA_BREACHED",
                actor="SLA Monitor",
                metadata=json.dumps({"sla_deadline": item.get("sla_deadline"), "action": "Escalated to Critical/Emergency"}),
            )
            with _lock:
                if _is_postgres():
                    with _get_pg_conn() as conn:
                        with conn.cursor() as cur:
                            cur.execute(
                                "UPDATE complaints SET severity = 'Critical', urgency = 'Emergency', updated_at = %s WHERE id = %s",
                                (now_iso, cid),
                            )
                        conn.commit()
                else:
                    conn = _get_sqlite_conn()
                    try:
                        conn.execute(
                            "UPDATE complaints SET severity = 'Critical', urgency = 'Emergency', updated_at = ? WHERE id = ?",
                            (now_iso, cid),
                        )
                        conn.commit()
                    finally:
                        conn.close()

    return breached_count


def get_stats() -> dict[str, Any]:
    """Return aggregate statistics across all primary non-rejected complaints."""
    process_sla_breaches()
    stat_filter = "WHERE (is_duplicate = 0 OR is_duplicate IS NULL) AND duplicate_of_id IS NULL AND status != 'Rejected / Spam' AND category != 'Spam / Invalid'"
    with _lock:
        if _is_postgres():
            with _get_pg_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(f"SELECT COUNT(*) FROM complaints {stat_filter}")
                    total_row = cur.fetchone()
                    total = list(total_row.values())[0] if isinstance(total_row, dict) else total_row[0]

                    def _group_pg(col: str) -> dict[str, int]:
                        if col not in _ALLOWED_STATS_COLS:
                            raise ValueError(f"Invalid column: {col!r}")
                        cur.execute(f"SELECT {col}, COUNT(*) FROM complaints {stat_filter} GROUP BY {col}")
                        rows = cur.fetchall()
                        res = {}
                        for r in rows:
                            vals = list(r.values()) if isinstance(r, dict) else list(r)
                            res[vals[0]] = vals[1]
                        return res

                    return {
                        "total": int(total),
                        "by_status": _group_pg("status"),
                        "by_category": _group_pg("category"),
                        "by_severity": _group_pg("severity"),
                    }
        else:
            conn = _get_sqlite_conn()
            try:
                total = conn.execute(f"SELECT COUNT(*) FROM complaints {stat_filter}").fetchone()[0]

                def _group_sqlite(col: str) -> dict[str, int]:
                    if col not in _ALLOWED_STATS_COLS:
                        raise ValueError(f"Invalid column: {col!r}")
                    return {
                        row[0]: row[1]
                        for row in conn.execute(
                            f"SELECT {col}, COUNT(*) FROM complaints {stat_filter} GROUP BY {col}"
                        ).fetchall()
                    }

                return {
                    "total": total,
                    "by_status": _group_sqlite("status"),
                    "by_category": _group_sqlite("category"),
                    "by_severity": _group_sqlite("severity"),
                }
            finally:
                conn.close()


def get_critical_hotspots(limit: int = 10) -> list[dict[str, Any]]:
    """Return the most critical, open complaints sorted by urgency, severity, and report count."""
    stat_filter = "WHERE status IN ('New', 'Under Review', 'Assigned', 'In Progress') AND category != 'Spam / Invalid'"
    order_by = "ORDER BY citizen_reports_count DESC, created_at DESC"
    
    with _lock:
        if _is_postgres():
            with _get_pg_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(f"SELECT * FROM complaints {stat_filter} {order_by} LIMIT %s", (limit,))
                    rows = cur.fetchall()
                    return [dict(r) for r in rows]
        else:
            conn = _get_sqlite_conn()
            try:
                rows = conn.execute(f"SELECT * FROM complaints {stat_filter} {order_by} LIMIT ?", (limit,)).fetchall()
                return [dict(r) for r in rows]
            finally:
                conn.close()


def verify_officer_credentials(officer_id: str, password: str) -> dict[str, Any] | None:
    """Verify officer credentials and return officer profile if valid."""
    target_hash = hash_password(password)
    with _lock:
        if _is_postgres():
            with _get_pg_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "SELECT officer_id, name, department, password_hash FROM officers WHERE officer_id = %s",
                        (officer_id,),
                    )
                    row = cur.fetchone()
                    if row and row.get("password_hash") == target_hash:
                        return {
                            "officer_id": row["officer_id"],
                            "name": row["name"],
                            "department": row["department"],
                        }
        else:
            conn = _get_sqlite_conn()
            try:
                row = conn.execute(
                    "SELECT officer_id, name, department, password_hash FROM officers WHERE officer_id = ?",
                    (officer_id,),
                ).fetchone()
                if row and row["password_hash"] == target_hash:
                    return {
                        "officer_id": row["officer_id"],
                        "name": row["name"],
                        "department": row["department"],
                    }
            finally:
                conn.close()
    return None


def update_officer_password(officer_id: str, old_password: str, new_password: str) -> bool:
    """Update officer password if old password matches."""
    old_hash = hash_password(old_password)
    new_hash = hash_password(new_password)
    with _lock:
        if _is_postgres():
            with _get_pg_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "UPDATE officers SET password_hash = %s WHERE officer_id = %s AND password_hash = %s",
                        (new_hash, officer_id, old_hash),
                    )
                    updated = cur.rowcount > 0
                conn.commit()
                return updated
        else:
            conn = _get_sqlite_conn()
            try:
                cur = conn.execute(
                    "UPDATE officers SET password_hash = ? WHERE officer_id = ? AND password_hash = ?",
                    (new_hash, officer_id, old_hash),
                )
                conn.commit()
                return cur.rowcount > 0
            finally:
                conn.close()


import re
from math import radians, sin, cos, sqrt, atan2


def haversine_distance_meters(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate distance in meters between two lat/lng coordinates."""
    R = 6371000.0  # Earth radius in meters
    phi1, phi2 = radians(lat1), radians(lat2)
    dphi = radians(lat2 - lat1)
    dlambda = radians(lng2 - lng1)
    a = sin(dphi / 2.0) ** 2 + cos(phi1) * cos(phi2) * sin(dlambda / 2.0) ** 2
    return R * 2 * atan2(sqrt(a), sqrt(1 - a))


def is_same_location(
    loc1: str,
    loc2: str,
    lat1: float | None = None,
    lng1: float | None = None,
    lat2: float | None = None,
    lng2: float | None = None,
) -> bool:
    """
    Returns True if two locations represent the same civic location:
    1. Coordinates within 500 meters.
    2. Shared 6-digit Pincode + landmark/area token overlap.
    3. Case-insensitive landmark substring match or >40% token overlap.
    """
    if not loc1 or not loc2:
        return False

    # 1. GPS Proximity Check (< 500 meters)
    if lat1 is not None and lng1 is not None and lat2 is not None and lng2 is not None:
        try:
            dist = haversine_distance_meters(float(lat1), float(lng1), float(lat2), float(lng2))
            if dist <= 500.0:  # Within 500 meters
                return True
        except (ValueError, TypeError):
            pass

    # Clean & normalize strings
    s1 = loc1.strip().lower()
    s2 = loc2.strip().lower()

    if s1 == s2:
        return True

    # 2. Extract 6-digit PIN codes
    pincodes1 = set(re.findall(r"\b[1-9]\d{5}\b", s1))
    pincodes2 = set(re.findall(r"\b[1-9]\d{5}\b", s2))

    common_pincodes = pincodes1.intersection(pincodes2)

    # Clean punctuation and tokenize
    tokens1 = set(re.findall(r"\b[a-z0-9]+\b", s1))
    tokens2 = set(re.findall(r"\b[a-z0-9]+\b", s2))

    # Stop words to ignore when comparing token overlap
    stop_words = {
        "near", "opp", "opposite", "behind", "next", "beside", "to", "at", "in", "and", "the", "of",
        "india", "karnataka", "maharashtra", "delhi", "rajasthan", "tamil", "nadu", "kerala",
        "ward", "block", "sector", "phase", "street", "st", "road", "rd", "lane", "area", "colony",
        "nagar", "city", "town", "district", "main", "no", "number"
    }
    meaningful1 = tokens1 - stop_words
    meaningful2 = tokens2 - stop_words

    # If pincode matches, check if any area/landmark token matches
    if common_pincodes:
        overlap = (meaningful1 - pincodes1).intersection(meaningful2 - pincodes2)
        if len(overlap) >= 1 or len(meaningful1 - pincodes1) == 0 or len(meaningful2 - pincodes2) == 0:
            return True

    # 3. Substring matching & token overlap
    s1_nopincode = re.sub(r"\b[1-9]\d{5}\b", "", s1).strip(", ")
    s2_nopincode = re.sub(r"\b[1-9]\d{5}\b", "", s2).strip(", ")

    if len(s1_nopincode) >= 6 and len(s2_nopincode) >= 6:
        if s1_nopincode in s2_nopincode or s2_nopincode in s1_nopincode:
            return True

    # Token Overlap >= 50% of the smaller token set
    overlap = meaningful1.intersection(meaningful2)
    min_len = min(len(meaningful1), len(meaningful2))
    if min_len > 0 and len(overlap) / min_len >= 0.5:
        return True

    return False


def find_matching_duplicate_complaint(
    location: str,
    category: str,
    latitude: float | None = None,
    longitude: float | None = None,
) -> dict[str, Any] | None:
    """Search open complaints in category and return the first matching duplicate by landmark/pincode/GPS."""
    with _lock:
        if _is_postgres():
            with _get_pg_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "SELECT id, summary, raw_text, location, subcategory, latitude, longitude FROM complaints WHERE category = %s AND status != 'Rejected / Spam' AND status != 'Resolved' ORDER BY created_at DESC LIMIT 50",
                        (category,),
                    )
                    candidates = [dict(r) for r in cur.fetchall()]
        else:
            conn = _get_sqlite_conn()
            try:
                rows = conn.execute(
                    "SELECT id, summary, raw_text, location, subcategory, latitude, longitude FROM complaints WHERE category = ? AND status != 'Rejected / Spam' AND status != 'Resolved' ORDER BY created_at DESC LIMIT 50",
                    (category,),
                ).fetchall()
                candidates = [dict(r) for r in rows]
            finally:
                conn.close()

    for cand in candidates:
        cand_loc = cand.get("location") or ""
        cand_lat = cand.get("latitude")
        cand_lng = cand.get("longitude")

        if is_same_location(
            loc1=location,
            loc2=cand_loc,
            lat1=latitude,
            lng1=longitude,
            lat2=cand_lat,
            lng2=cand_lng,
        ):
            return cand

    return None


def delete_complaint(complaint_id: str) -> bool:
    """Physically remove a complaint from the database."""
    with _lock:
        if _is_postgres():
            with _get_pg_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute("DELETE FROM complaints WHERE id = %s", (complaint_id,))
                    deleted = cur.rowcount > 0
                conn.commit()
                return deleted
        else:
            conn = _get_sqlite_conn()
            try:
                cur = conn.execute("DELETE FROM complaints WHERE id = ?", (complaint_id,))
                conn.commit()
                return cur.rowcount > 0
            finally:
                conn.close()


SEVERITY_ORDER = {"Low": 1, "Medium": 2, "High": 3, "Critical": 4}
URGENCY_ORDER = {"Routine": 1, "Soon": 2, "Urgent": 3, "Emergency": 4}
REV_SEVERITY = {1: "Low", 2: "Medium", 3: "High", 4: "Critical"}
REV_URGENCY = {1: "Routine", 2: "Soon", 3: "Urgent", 4: "Emergency"}


def calculate_escalated_priority(
    current_severity: str,
    current_urgency: str,
    new_severity: str | None,
    new_urgency: str | None,
    new_count: int,
) -> tuple[str, str]:
    """Escalate severity and urgency based on citizen report threshold & incoming complaint level."""
    sev_rank = SEVERITY_ORDER.get(current_severity, 2)
    urg_rank = URGENCY_ORDER.get(current_urgency, 1)

    if new_severity:
        sev_rank = max(sev_rank, SEVERITY_ORDER.get(new_severity, 2))
    if new_urgency:
        urg_rank = max(urg_rank, URGENCY_ORDER.get(new_urgency, 1))

    # Support count based automatic escalation thresholds
    if new_count >= 5:
        sev_rank = max(sev_rank, 4)  # Critical
        urg_rank = max(urg_rank, 4)  # Emergency
    elif new_count >= 3:
        sev_rank = max(sev_rank, 3)  # High
        urg_rank = max(urg_rank, 3)  # Urgent
    elif new_count >= 2:
        sev_rank = max(sev_rank, 2)  # Medium
        urg_rank = max(urg_rank, 2)  # Soon

    return REV_SEVERITY.get(sev_rank, "High"), REV_URGENCY.get(urg_rank, "Urgent")


def merge_duplicate_into_original(
    original_id: str,
    new_text: str,
    image_url: str | None = None,
    new_severity: str | None = None,
    new_urgency: str | None = None,
) -> dict[str, Any] | None:
    """Increment citizen_reports_count, escalate severity/urgency, and append text/photo to additional_updates array on original complaint."""
    now = datetime.now(timezone.utc).isoformat()
    update_entry = {"text": new_text, "created_at": now, "image_url": image_url}

    with _lock:
        row = get_complaint(original_id)
        if not row:
            return None

        existing_count = row.get("citizen_reports_count") or 1
        new_count = existing_count + 1

        curr_sev = row.get("severity") or "Medium"
        curr_urg = row.get("urgency") or "Routine"

        escalated_sev, escalated_urg = calculate_escalated_priority(
            curr_sev, curr_urg, new_severity, new_urgency, new_count
        )

        raw_updates = row.get("additional_updates") or "[]"
        try:
            updates_list = json.loads(raw_updates) if isinstance(raw_updates, str) else list(raw_updates)
        except Exception:
            updates_list = []
        updates_list.append(update_entry)
        new_updates_json = json.dumps(updates_list)

        if _is_postgres():
            with _get_pg_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        UPDATE complaints
                        SET citizen_reports_count = %s,
                            severity = %s,
                            urgency = %s,
                            additional_updates = %s,
                            updated_at = %s
                        WHERE id = %s
                        RETURNING *
                        """,
                        (new_count, escalated_sev, escalated_urg, new_updates_json, now, original_id),
                    )
                    updated_row = cur.fetchone()
                conn.commit()
                return dict(updated_row) if updated_row else None
        else:
            conn = _get_sqlite_conn()
            try:
                conn.execute(
                    """
                    UPDATE complaints
                    SET citizen_reports_count = ?,
                        severity = ?,
                        urgency = ?,
                        additional_updates = ?,
                        updated_at = ?
                    WHERE id = ?
                    """,
                    (new_count, escalated_sev, escalated_urg, new_updates_json, now, original_id),
                )
                conn.commit()
                updated_row = conn.execute("SELECT * FROM complaints WHERE id = ?", (original_id,)).fetchone()
                return dict(updated_row) if updated_row else None
            finally:
                conn.close()


def log_complaint_event(
    complaint_id: str,
    event_type: str,
    actor: str = "System",
    metadata: str = "",
) -> dict[str, Any]:
    """Log an immutable event to the audit trail."""
    now = datetime.now(timezone.utc).isoformat()
    event_id = f"EVT-{secrets.token_hex(4).upper()}"
    with _lock:
        if _is_postgres():
            with _get_pg_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO complaint_events (id, complaint_id, event_type, actor, timestamp, metadata)
                        VALUES (%s, %s, %s, %s, %s, %s)
                        RETURNING *
                        """,
                        (event_id, complaint_id, event_type, actor, now, metadata),
                    )
                    row = cur.fetchone()
                conn.commit()
                return dict(row)
        else:
            conn = _get_sqlite_conn()
            try:
                conn.execute(
                    """
                    INSERT INTO complaint_events (id, complaint_id, event_type, actor, timestamp, metadata)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (event_id, complaint_id, event_type, actor, now, metadata),
                )
                conn.commit()
                row = conn.execute("SELECT * FROM complaint_events WHERE id = ?", (event_id,)).fetchone()
                return dict(row)
            finally:
                conn.close()


def get_complaint_events(complaint_id: str) -> list[dict[str, Any]]:
    """Retrieve chronological audit trail events for a complaint."""
    with _lock:
        if _is_postgres():
            with _get_pg_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "SELECT * FROM complaint_events WHERE complaint_id = %s ORDER BY timestamp ASC",
                        (complaint_id,),
                    )
                    rows = cur.fetchall()
                    return [dict(r) for r in rows]
        else:
            conn = _get_sqlite_conn()
            try:
                rows = conn.execute(
                    "SELECT * FROM complaint_events WHERE complaint_id = ? ORDER BY timestamp ASC",
                    (complaint_id,),
                ).fetchall()
                return [dict(r) for r in rows]
            finally:
                conn.close()


def assign_complaint(
    complaint_id: str,
    department: str | None = None,
    ward: str | None = None,
    assigned_to: str | None = None,
    sla_hours: int | None = None,
    actor: str = "Officer",
) -> dict[str, Any] | None:
    """Assign complaint to a department, ward, and officer with updated status and optional custom SLA hours."""
    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()
    row = get_complaint(complaint_id)
    if not row:
        return None

    new_sla = row.get("sla_deadline")
    if sla_hours and sla_hours > 0:
        new_sla = (now + timedelta(hours=sla_hours)).isoformat()

    dep = department or row.get("department")
    w = ward or row.get("ward")
    officer = assigned_to or row.get("assigned_to")

    with _lock:
        if _is_postgres():
            with _get_pg_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        UPDATE complaints
                        SET department = %s, ward = %s, assigned_to = %s, sla_deadline = %s, status = 'Assigned', updated_at = %s
                        WHERE id = %s
                        RETURNING *
                        """,
                        (dep, w, officer, new_sla, now_iso, complaint_id),
                    )
                    updated = cur.fetchone()
                conn.commit()
                res = dict(updated) if updated else None
        else:
            conn = _get_sqlite_conn()
            try:
                conn.execute(
                    """
                    UPDATE complaints
                    SET department = ?, ward = ?, assigned_to = ?, sla_deadline = ?, status = 'Assigned', updated_at = ?
                    WHERE id = ?
                    """,
                    (dep, w, officer, new_sla, now_iso, complaint_id),
                )
                conn.commit()
                r = conn.execute("SELECT * FROM complaints WHERE id = ?", (complaint_id,)).fetchone()
                res = dict(r) if r else None
            finally:
                conn.close()

    if res:
        log_complaint_event(
            complaint_id=complaint_id,
            event_type="ASSIGNED",
            actor=actor,
            metadata=json.dumps({"department": dep, "ward": w, "assigned_to": officer, "sla_deadline": new_sla}),
        )
    return res


def submit_resolution(
    complaint_id: str,
    note: str,
    evidence_image: str | None = None,
    actor: str = "Officer",
) -> dict[str, Any] | None:
    """Submit proof of work resolution notes and mark complaint as Resolved."""
    now = datetime.now(timezone.utc).isoformat()
    row = get_complaint(complaint_id)
    if not row:
        return None

    with _lock:
        if _is_postgres():
            with _get_pg_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO resolutions (complaint_id, note, evidence_image, submitted_at)
                        VALUES (%s, %s, %s, %s)
                        ON CONFLICT (complaint_id) DO UPDATE SET note = EXCLUDED.note, evidence_image = EXCLUDED.evidence_image, submitted_at = EXCLUDED.submitted_at
                        """,
                        (complaint_id, note, evidence_image, now),
                    )
                    cur.execute(
                        "UPDATE complaints SET status = 'Resolved', resolved_at = %s, updated_at = %s WHERE id = %s RETURNING *",
                        (now, now, complaint_id),
                    )
                    updated = cur.fetchone()
                conn.commit()
                res = dict(updated) if updated else None
        else:
            conn = _get_sqlite_conn()
            try:
                conn.execute(
                    """
                    INSERT INTO resolutions (complaint_id, note, evidence_image, submitted_at)
                    VALUES (?, ?, ?, ?)
                    ON CONFLICT(complaint_id) DO UPDATE SET note = excluded.note, evidence_image = excluded.evidence_image, submitted_at = excluded.submitted_at
                    """,
                    (complaint_id, note, evidence_image, now),
                )
                conn.execute(
                    "UPDATE complaints SET status = 'Resolved', resolved_at = ?, updated_at = ? WHERE id = ?",
                    (now, now, complaint_id),
                )
                conn.commit()
                r = conn.execute("SELECT * FROM complaints WHERE id = ?", (complaint_id,)).fetchone()
                res = dict(r) if r else None
            finally:
                conn.close()

    if res:
        log_complaint_event(
            complaint_id=complaint_id,
            event_type="RESOLVED",
            actor=actor,
            metadata=json.dumps({"note": note, "evidence_image": evidence_image}),
        )
    return res


def verify_resolution(
    complaint_id: str,
    result: str,  # "Verified" or "Reopened"
    feedback: str | None = None,
) -> dict[str, Any] | None:
    """Submit citizen satisfaction verification feedback. If Reopened, status updates back to In Progress."""
    now = datetime.now(timezone.utc).isoformat()
    row = get_complaint(complaint_id)
    if not row:
        return None

    if row.get("status") != "Resolved":
        raise ValueError(f"Citizen verification is only allowed when complaint is in 'Resolved' status. Current status: {row.get('status')!r}")

    existing_verif = get_verification(complaint_id)
    if existing_verif and existing_verif.get("result") == "Verified":
        raise ValueError("Citizen resolution verification has already been completed for this complaint.")

    new_status = "Resolved" if result == "Verified" else "In Progress"

    with _lock:
        if _is_postgres():
            with _get_pg_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO citizen_verifications (complaint_id, result, feedback, timestamp)
                        VALUES (%s, %s, %s, %s)
                        ON CONFLICT (complaint_id) DO UPDATE SET result = EXCLUDED.result, feedback = EXCLUDED.feedback, timestamp = EXCLUDED.timestamp
                        """,
                        (complaint_id, result, feedback or "", now),
                    )
                    cur.execute(
                        "UPDATE complaints SET status = %s, updated_at = %s WHERE id = %s RETURNING *",
                        (new_status, now, complaint_id),
                    )
                    updated = cur.fetchone()
                conn.commit()
                res = dict(updated) if updated else None
        else:
            conn = _get_sqlite_conn()
            try:
                conn.execute(
                    """
                    INSERT INTO citizen_verifications (complaint_id, result, feedback, timestamp)
                    VALUES (?, ?, ?, ?)
                    ON CONFLICT(complaint_id) DO UPDATE SET result = excluded.result, feedback = excluded.feedback, timestamp = excluded.timestamp
                    """,
                    (complaint_id, result, feedback or "", now),
                )
                conn.execute(
                    "UPDATE complaints SET status = ?, updated_at = ? WHERE id = ?",
                    (new_status, now, complaint_id),
                )
                conn.commit()
                r = conn.execute("SELECT * FROM complaints WHERE id = ?", (complaint_id,)).fetchone()
                res = dict(r) if r else None
            finally:
                conn.close()

    if res:
        event_type = "VERIFIED_SATISFIED" if result == "Verified" else "REOPENED_UNSATISFIED"
        log_complaint_event(
            complaint_id=complaint_id,
            event_type=event_type,
            actor="Citizen",
            metadata=json.dumps({"result": result, "feedback": feedback}),
        )
    return res


def get_complaint_by_tracking_token(tracking_token: str) -> dict[str, Any] | None:
    """Return complaint by secret tracking token or exact ID match."""
    clean_token = tracking_token.strip()
    with _lock:
        if _is_postgres():
            with _get_pg_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "SELECT * FROM complaints WHERE tracking_token = %s OR id = %s",
                        (clean_token, clean_token),
                    )
                    row = cur.fetchone()
                    return dict(row) if row else None
        else:
            conn = _get_sqlite_conn()
            try:
                row = conn.execute(
                    "SELECT * FROM complaints WHERE tracking_token = ? OR id = ?",
                    (clean_token, clean_token),
                ).fetchone()
                return dict(row) if row else None
            finally:
                conn.close()


def get_resolution(complaint_id: str) -> dict[str, Any] | None:
    """Retrieve resolution record for a complaint."""
    with _lock:
        if _is_postgres():
            with _get_pg_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT * FROM resolutions WHERE complaint_id = %s", (complaint_id,))
                    row = cur.fetchone()
                    return dict(row) if row else None
        else:
            conn = _get_sqlite_conn()
            try:
                row = conn.execute("SELECT * FROM resolutions WHERE complaint_id = ?", (complaint_id,)).fetchone()
                return dict(row) if row else None
            finally:
                conn.close()


def get_verification(complaint_id: str) -> dict[str, Any] | None:
    """Retrieve citizen verification record for a complaint."""
    with _lock:
        if _is_postgres():
            with _get_pg_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT * FROM citizen_verifications WHERE complaint_id = %s", (complaint_id,))
                    row = cur.fetchone()
                    return dict(row) if row else None
        else:
            conn = _get_sqlite_conn()
            try:
                row = conn.execute("SELECT * FROM citizen_verifications WHERE complaint_id = ?", (complaint_id,)).fetchone()
                return dict(row) if row else None
            finally:
                conn.close()

