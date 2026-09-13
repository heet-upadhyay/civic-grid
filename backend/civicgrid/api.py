"""CivicGrid FastAPI application."""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from . import database as db
from .auth import create_access_token, get_current_user, get_optional_user, require_roles
from .classifier import make_classifier
from .gemini import ComplaintInputError, GeminiConfigurationError, GeminiExtractionError
from .models import (
    ComplaintOut,
    ListComplaintsResponse,
    StatsResponse,
    SubmitComplaintIn,
    SubmitComplaintResponse,
    UpdateStatusIn,
    OfficerLoginIn,
    OfficerLoginOut,
    ChangePasswordIn,
    ChangePasswordOut,
    UserChangePasswordIn,
    TranslateTextIn,
    TranslateTextOut,
    AssignComplaintIn,
    ResolveComplaintIn,
    VerifyComplaintIn,
    TimelineEventOut,
    ResolutionOut,
    VerificationOut,
    UserRegisterIn,
    UserLoginIn,
    UserProfileOut,
    AuthTokenOut,
    UserAdminCreateIn,
    UserAdminUpdateIn,
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(application: FastAPI):  # noqa: ARG001
    db.init_db()
    yield


app = FastAPI(
    title="CivicGrid API",
    version="1.0.0",
    description="Civic complaint intelligence platform",
    lifespan=lifespan,
)

import os

# Robust CORS middleware configuration supporting Vercel and Render deployments
_cors_env = os.getenv("CORS_ORIGINS", "").strip()
_allowed_origins = [o.strip() for o in _cors_env.split(",") if o.strip()] if _cors_env and _cors_env != "*" else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app|https://.*\.onrender\.com|http://localhost:\d+",
    allow_credentials=True if _allowed_origins != ["*"] else False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.options("/{full_path:path}", include_in_schema=False)
async def options_preflight_handler(full_path: str):  # noqa: ARG001
    """Global OPTIONS preflight handler to prevent 405 CORS issues."""
    return {}


from fastapi.responses import JSONResponse
from fastapi.requests import Request
from starlette.exceptions import HTTPException as StarletteHTTPException

def _add_cors_headers(request: Request, response: JSONResponse) -> JSONResponse:
    origin = request.headers.get("origin")
    if origin:
        response.headers["access-control-allow-origin"] = origin
        response.headers["access-control-allow-credentials"] = "true"
        response.headers["access-control-allow-methods"] = "*"
        response.headers["access-control-allow-headers"] = "*"
    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception: %s", exc, exc_info=True)
    response = JSONResponse(
        status_code=500,
        content={"detail": "An unexpected server error occurred. Please try again later."},
    )
    return _add_cors_headers(request, response)


@app.exception_handler(StarletteHTTPException)
async def custom_http_exception_handler(request: Request, exc: StarletteHTTPException):
    response = JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )
    return _add_cors_headers(request, response)



# ---------------------------------------------------------------------------
# Authentication Endpoints
# ---------------------------------------------------------------------------


@app.post(
    "/api/auth/register",
    response_model=AuthTokenOut,
    status_code=201,
    summary="Register new Citizen account",
    tags=["auth"],
)
def register_user(req: UserRegisterIn) -> AuthTokenOut:
    try:
        user = db.create_user(name=req.name, email=req.email, password=req.password, role="CITIZEN")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    token = create_access_token(
        user_id=user["id"],
        email=user["email"],
        role=user["role"],
        department=user.get("department"),
        ward=user.get("ward"),
    )
    return AuthTokenOut(access_token=token, user=UserProfileOut(**user))


@app.post(
    "/api/auth/login",
    response_model=AuthTokenOut,
    summary="Authenticate Citizen, Officer, or Admin",
    tags=["auth"],
)
def login_user(req: UserLoginIn) -> AuthTokenOut:
    user = db.verify_user_credentials(req.email, req.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email/ID or password.")

    token = create_access_token(
        user_id=user["id"],
        email=user["email"],
        role=user["role"],
        department=user.get("department"),
        ward=user.get("ward"),
    )
    return AuthTokenOut(access_token=token, user=UserProfileOut(**user))


@app.get(
    "/api/auth/me",
    response_model=UserProfileOut,
    summary="Get current authenticated user profile",
    tags=["auth"],
)
def get_me(current_user: dict = Depends(get_current_user)) -> UserProfileOut:
    return UserProfileOut(**current_user)


@app.post(
    "/api/auth/logout",
    summary="Logout user session",
    tags=["auth"],
)
def logout_user() -> dict:
    return {"success": True, "message": "Logged out successfully."}


@app.post(
    "/api/auth/change-password",
    response_model=ChangePasswordOut,
    summary="Change citizen password",
    tags=["auth"],
)
def change_user_password(
    req: UserChangePasswordIn,
    current_user: dict = Depends(get_current_user),
) -> ChangePasswordOut:
    """Validate old password and set a new password for the authenticated citizen."""
    if current_user.get("role", "").upper() != "CITIZEN":
        raise HTTPException(status_code=403, detail="Only citizens can use this endpoint.")
    success = db.update_user_password(
        user_id=current_user["id"],
        old_password=req.old_password,
        new_password=req.new_password,
    )
    if not success:
        raise HTTPException(status_code=400, detail="Password change failed. Check your current password.")
    return ChangePasswordOut(success=True, message="Password updated successfully.")


# ---------------------------------------------------------------------------
# Complaint Endpoints
# ---------------------------------------------------------------------------


@app.post(
    "/api/complaints",
    response_model=SubmitComplaintResponse,
    status_code=201,
    summary="Submit a new civic complaint",
    tags=["complaints"],
)
def submit_complaint(
    req: SubmitComplaintIn,
    current_user: dict | None = Depends(get_optional_user),
) -> SubmitComplaintResponse:
    """
    Classify complaint text with Gemini and persist the result.
    Automatically assigns ownership to authenticated citizen user.
    """
    classifier = make_classifier()
    try:
        classification = classifier.classify(req.text, image_b64=req.image_b64)
    except ComplaintInputError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except GeminiConfigurationError as exc:
        logger.error("Gemini configuration error: %s", exc)
        raise HTTPException(
            status_code=503,
            detail="Classification service is not configured. Please contact support.",
        ) from exc
    except GeminiExtractionError as exc:
        logger.warning("Gemini extraction error: %s", exc)
        raise HTTPException(
            status_code=503,
            detail="Classification service is temporarily unavailable. Please try again shortly.",
        ) from exc
    except Exception as exc:
        logger.error("Unexpected classifier error: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected error occurred.") from exc

    # ALWAYS prioritize user-input location over AI extraction
    location = req.location.strip() if (req.location and req.location.strip() != "") else classification.location

    # Auto-flag as Rejected / Spam if Gemini detects gibberish or inappropriate content
    is_spam = classification.is_spam or classification.category.value == "Spam / Invalid"
    status = "Rejected / Spam" if is_spam else "New"

    citizen_id = current_user["id"] if current_user else None

    # Check for duplicate open complaints at the same landmark / pincode / location & category
    is_duplicate = False
    duplicate_of_id = None
    if not is_spam and location not in ("", "Unknown"):
        matching_cand = db.find_matching_duplicate_complaint(
            location=location,
            category=classification.category.value,
            latitude=req.latitude,
            longitude=req.longitude,
        )
        if matching_cand:
            cand_sub = (matching_cand.get("subcategory") or "").lower()
            new_sub = (classification.subcategory or "").lower()
            if new_sub in cand_sub or cand_sub in new_sub or classification.category.value != "Other":
                is_duplicate = True
                duplicate_of_id = matching_cand["id"]

    # If duplicate, MERGE into original complaint and escalate support count & priority
    if is_duplicate and duplicate_of_id:
        merged_row = db.merge_duplicate_into_original(
            original_id=duplicate_of_id,
            new_text=req.text,
            image_url=req.image_b64 if req.image_b64 else None,
            new_severity=classification.severity.value,
            new_urgency=classification.urgency.value,
        )
        if merged_row:
            cleaned = _clean_complaint(merged_row)
            cleaned.is_duplicate = True
            cleaned.duplicate_of_id = duplicate_of_id
            return SubmitComplaintResponse(success=True, complaint=cleaned)

    row = db.insert_complaint(
        raw_text=req.text,
        category=classification.category.value,
        subcategory=classification.subcategory,
        severity=classification.severity.value,
        urgency=classification.urgency.value,
        location=location,
        affected_facility=classification.affected_facility,
        summary=classification.summary,
        status=status,
        citizen_id=citizen_id,
        latitude=req.latitude,
        longitude=req.longitude,
        image_url=req.image_b64 if req.image_b64 else None,
        image_analysis=classification.image_analysis,
        is_duplicate=False,
        duplicate_of_id=None,
        detected_language=getattr(classification, "detected_language", "English"),
    )
    return SubmitComplaintResponse(success=True, complaint=_clean_complaint(row))


@app.get(
    "/api/complaints/stats",
    response_model=StatsResponse,
    summary="Aggregate complaint statistics",
    tags=["complaints"],
)
def get_stats() -> StatsResponse:
    """Return total count and breakdowns by status, category, and severity."""
    return StatsResponse(**db.get_stats())


from fastapi.responses import PlainTextResponse

@app.get(
    "/api/reports/policy-brief",
    response_class=PlainTextResponse,
    summary="Generate AI policy brief",
    tags=["reports"],
)
def get_policy_brief() -> str:
    """Generate an AI-driven policy brief from stats and hotspots."""
    stats = db.get_stats()
    hotspots = db.get_critical_hotspots(limit=10)
    
    from .gemini import generate_policy_brief
    return generate_policy_brief(stats, hotspots)


def _clean_complaint(row: dict) -> ComplaintOut:
    """Safely sanitize database row to prevent Pydantic 422 validation errors."""
    try:
        cleaned = dict(row)

        # Safely cast latitude / longitude
        for coord in ("latitude", "longitude"):
            val = cleaned.get(coord)
            if val is not None:
                try:
                    cleaned[coord] = float(val)
                except (ValueError, TypeError):
                    cleaned[coord] = None
            else:
                cleaned[coord] = None

        # Safely cast citizen_reports_count to int
        try:
            cleaned["citizen_reports_count"] = int(cleaned.get("citizen_reports_count") or 1)
        except (ValueError, TypeError):
            cleaned["citizen_reports_count"] = 1

        # Remove None values for string fields so Pydantic schema defaults kick in
        for k in list(cleaned.keys()):
            if cleaned[k] is None and k not in ("citizen_id", "latitude", "longitude", "image_url", "image_analysis", "duplicate_of_id"):
                del cleaned[k]

        return ComplaintOut(**cleaned)
    except Exception as exc:
        logger.warning("Failed to clean complaint row %s: %s", row.get("id"), exc)
        return ComplaintOut(
            id=str(row.get("id", "COMP-2026-0000")),
            citizen_id=row.get("citizen_id"),
            raw_text=str(row.get("raw_text", "")),
            category=str(row.get("category", "Other")),
            subcategory=str(row.get("subcategory", "General Civic Issue")),
            severity="Medium",
            urgency="Routine",
            location=str(row.get("location", "Unknown")),
            affected_facility=str(row.get("affected_facility", "Unknown")),
            summary=str(row.get("summary", "")),
            status=str(row.get("status", "New")),
            created_at=str(row.get("created_at", "")),
            updated_at=str(row.get("updated_at", "")),
        )


def _to_list(val: list[str] | str | None) -> list[str] | None:
    if val is None or val == "":
        return None
    if isinstance(val, str):
        return [s.strip() for s in val.split(",") if s.strip()]
    return val


@app.get(
    "/api/complaints",
    response_model=ListComplaintsResponse,
    summary="List complaints with role-based scoping, filtering, and pagination",
    tags=["complaints"],
)
def list_complaints(
    status: list[str] | str | None = Query(None, description="Filter by status"),
    category: list[str] | str | None = Query(None, description="Filter by category"),
    severity: list[str] | str | None = Query(None, description="Filter by severity"),
    location: list[str] | str | None = Query(None, description="Filter by location"),
    search: str | None = Query(None, description="Full-text search"),
    sort: str = Query("newest", description="newest|oldest|highest_severity|highest_urgency"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    current_user: dict | None = Depends(get_optional_user),
) -> ListComplaintsResponse:
    filter_citizen_id = None
    filter_department = None
    filter_ward = None

    if current_user:
        role = current_user.get("role", "CITIZEN").upper()
        if role == "CITIZEN":
            filter_citizen_id = current_user["id"]
        elif role == "OFFICER":
            filter_department = current_user.get("department")
            filter_ward = current_user.get("ward")

    rows, total = db.list_complaints(
        status=_to_list(status),
        category=_to_list(category),
        severity=_to_list(severity),
        location=_to_list(location),
        search=search,
        sort=sort,
        skip=skip,
        limit=limit,
        citizen_id=filter_citizen_id,
        officer_department=filter_department,
        officer_ward=filter_ward,
    )
    return ListComplaintsResponse(
        complaints=[_clean_complaint(r) for r in rows],
        total=total,
    )


@app.get(
    "/api/complaints/{complaint_id}",
    response_model=ComplaintOut,
    summary="Get complaint by ID with server-side authorization check",
    tags=["complaints"],
)
def get_complaint(
    complaint_id: str,
    current_user: dict | None = Depends(get_optional_user),
) -> ComplaintOut:
    row = db.get_complaint(complaint_id)
    if not row:
        raise HTTPException(status_code=404, detail=f"Complaint '{complaint_id}' not found.")

    if current_user:
        role = current_user.get("role", "CITIZEN").upper()
        if role == "CITIZEN":
            if row.get("citizen_id") and row["citizen_id"] != current_user["id"]:
                raise HTTPException(
                    status_code=403,
                    detail="Access denied. You can only view complaints registered under your account.",
                )
        elif role == "OFFICER":
            off_dep = current_user.get("department")
            off_ward = current_user.get("ward")
            comp_dep = row.get("department")
            comp_ward = row.get("ward")
            if off_dep and comp_dep and off_dep.lower() != comp_dep.lower():
                raise HTTPException(
                    status_code=403,
                    detail=f"Access denied. Complaint department ({comp_dep}) is outside your scope ({off_dep}).",
                )
            if off_ward and off_ward not in ("All", "") and comp_ward and off_ward.lower() != comp_ward.lower():
                raise HTTPException(
                    status_code=403,
                    detail=f"Access denied. Complaint ward ({comp_ward}) is outside your assigned ward ({off_ward}).",
                )

    return _clean_complaint(row)


@app.api_route(
    "/api/complaints/{complaint_id}",
    methods=["PATCH", "PUT"],
    response_model=ComplaintOut,
    summary="Update complaint status (Officer/Admin only)",
    tags=["complaints"],
)
def update_complaint(
    complaint_id: str,
    req: UpdateStatusIn,
    current_user: dict = Depends(require_roles("OFFICER", "ADMIN")),
) -> ComplaintOut:
    """Update the status of an existing complaint with strict server-side state machine validation."""
    row = db.get_complaint(complaint_id)
    if not row:
        raise HTTPException(status_code=404, detail=f"Complaint '{complaint_id}' not found.")

    role = current_user.get("role", "OFFICER").upper()
    if role == "OFFICER":
        off_dep = current_user.get("department")
        comp_dep = row.get("department")
        if off_dep and comp_dep and off_dep.lower() != comp_dep.lower():
            raise HTTPException(
                status_code=403,
                detail=f"Forbidden. You can only modify complaints in your department ({off_dep}).",
            )

    actor_name = f"{current_user.get('role', 'Officer')} ({current_user.get('name', 'User')})"
    try:
        updated_row = db.update_complaint_status(complaint_id, req.status, actor=actor_name)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return _clean_complaint(updated_row)


@app.delete(
    "/api/complaints/{complaint_id}",
    summary="Permanently delete complaint (Admin or owning Citizen before review)",
    tags=["complaints"],
)
def delete_complaint(
    complaint_id: str,
    current_user: dict = Depends(get_current_user),
) -> dict:
    """Physically remove an admin complaint or an owning citizen's new complaint."""
    row = db.get_complaint(complaint_id)
    if not row:
        raise HTTPException(status_code=404, detail=f"Complaint '{complaint_id}' not found.")

    role = current_user.get("role", "CITIZEN").upper()
    if role == "CITIZEN":
        if row.get("citizen_id") != current_user["id"]:
            raise HTTPException(status_code=403, detail="Forbidden. You can only delete your own complaints.")
        if row.get("status") != "New":
            raise HTTPException(status_code=403, detail="Forbidden. Complaints can only be deleted before review.")
    elif role != "ADMIN":
        raise HTTPException(status_code=403, detail="Access denied. Requires an Administrator or Citizen account.")

    success = db.delete_complaint(complaint_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Complaint '{complaint_id}' not found.")
    return {"success": True, "message": f"Complaint '{complaint_id}' deleted."}


@app.post(
    "/api/officer/login",
    response_model=OfficerLoginOut,
    summary="Legacy Municipal Officer login endpoint",
    tags=["officer"],
)
def officer_login(req: OfficerLoginIn) -> OfficerLoginOut:
    user = db.verify_user_credentials(req.officer_id, req.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid Officer ID or Password.")

    token = create_access_token(
        user_id=user["id"],
        email=user["email"],
        role=user["role"],
        department=user.get("department"),
        ward=user.get("ward"),
    )
    return OfficerLoginOut(
        success=True,
        officer_id=user["id"],
        name=user["name"],
        department=user.get("department") or "General",
        token=token,
    )


@app.post(
    "/api/officer/change-password",
    response_model=ChangePasswordOut,
    summary="Change Municipal Officer password",
    tags=["officer"],
)
def change_password(
    req: ChangePasswordIn,
    current_user: dict = Depends(get_current_user),
) -> ChangePasswordOut:
    success = db.update_officer_password(req.officer_id, req.old_password, req.new_password)
    if not success:
        raise HTTPException(status_code=400, detail="Password change failed. Check your current password.")
    return ChangePasswordOut(success=True, message="Officer password successfully updated.")


@app.post(
    "/api/translate",
    response_model=TranslateTextOut,
    summary="Translate text to another language using Gemini AI",
    tags=["translation"],
)
def translate_text_endpoint(req: TranslateTextIn) -> TranslateTextOut:
    """Translate civic complaint text or summary to target language using stored source language or auto-detection."""
    from .gemini import translate_text
    result = translate_text(req.text, req.target_language, req.source_language)
    return TranslateTextOut(
        original_text=req.text,
        translated_text=result["translated_text"],
        target_language=result["target_language"],
        detected_language=result["source_language"],
    )


@app.get(
    "/api/tts",
    summary="Generate high-quality native audio stream for regional languages",
    tags=["translation"],
)
async def tts_endpoint(text: str = Query(..., max_length=1000), lang: str = Query("en", max_length=10)):
    """Return high-quality native MP3 audio stream for Malayalam and Indian regional languages."""
    import urllib.parse
    import httpx
    from fastapi.responses import Response

    lang_code = lang.lower().split("-")[0]
    encoded_text = urllib.parse.quote(text[:500])
    google_tts_url = f"https://translate.google.com/translate_tts?ie=UTF-8&tl={lang_code}&client=tw-ob&q={encoded_text}"

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(google_tts_url, headers=headers)
            if resp.status_code == 200 and resp.content:
                return Response(
                    content=resp.content,
                    media_type="audio/mpeg",
                    headers={
                        "Cache-Control": "public, max-age=86400",
                        "Accept-Ranges": "bytes",
                    },
                )
    except Exception as exc:
        logger.warning("TTS audio fetch failed for %s: %s", lang, exc)

    raise HTTPException(status_code=502, detail="TTS service temporarily unavailable")


# Statuses beyond which public (unauthenticated) tracking is restricted
_RESTRICTED_STATUSES = frozenset(
    {"Under Review", "Assigned", "In Progress", "Resolved", "Verified", "Reopened", "Rejected / Spam"}
)


@app.get(
    "/api/complaints/track/{identifier}",
    summary="Track complaint by public tracking token or complaint ID",
    tags=["tracking"],
)
def track_complaint(identifier: str) -> dict:
    """Look up a complaint by tracking token (TK-...) or complaint ID (COMP-...).
    Public retrieval is restricted once the complaint progresses past 'New' status."""
    row = db.get_complaint_by_tracking_token(identifier)
    if not row:
        raise HTTPException(status_code=404, detail="No complaint found for this token or ID.")

    # Restrict public access once complaint moves past "New"
    status = row.get("status", "New")
    if status in _RESTRICTED_STATUSES:
        raise HTTPException(
            status_code=403,
            detail=f"This complaint is now '{status}' and can no longer be publicly retrieved. "
                   "Please log in to your citizen portal for updates.",
        )

    complaint_id = row["id"]
    events = db.get_complaint_events(complaint_id)
    resolution = db.get_resolution(complaint_id)
    verification = db.get_verification(complaint_id)

    return {
        "complaint": _clean_complaint(row),
        "events": events,
        "resolution": resolution,
        "verification": verification,
    }


@app.post(
    "/api/complaints/{complaint_id}/assign",
    response_model=ComplaintOut,
    summary="Assign complaint to department, ward, and officer (Officer/Admin only)",
    tags=["lifecycle"],
)
def assign_complaint_endpoint(
    complaint_id: str,
    req: AssignComplaintIn,
    current_user: dict = Depends(require_roles("OFFICER", "ADMIN")),
) -> ComplaintOut:
    actor_name = f"{current_user.get('role', 'Officer')} ({current_user.get('name', 'User')})"
    row = db.assign_complaint(
        complaint_id=complaint_id,
        department=req.department,
        ward=req.ward,
        assigned_to=req.assigned_to,
        sla_hours=req.sla_hours,
        actor=actor_name,
    )
    if not row:
        raise HTTPException(status_code=404, detail=f"Complaint '{complaint_id}' not found.")
    return _clean_complaint(row)


@app.post(
    "/api/complaints/{complaint_id}/resolve",
    response_model=ComplaintOut,
    summary="Submit resolution proof and mark as Resolved (Officer/Admin only)",
    tags=["lifecycle"],
)
def resolve_complaint_endpoint(
    complaint_id: str,
    req: ResolveComplaintIn,
    current_user: dict = Depends(require_roles("OFFICER", "ADMIN")),
) -> ComplaintOut:
    actor_name = f"{current_user.get('role', 'Officer')} ({current_user.get('name', 'User')})"
    row = db.submit_resolution(
        complaint_id=complaint_id,
        note=req.note,
        evidence_image=req.evidence_image,
        actor=actor_name,
    )
    if not row:
        raise HTTPException(status_code=404, detail=f"Complaint '{complaint_id}' not found.")
    return _clean_complaint(row)


@app.post(
    "/api/complaints/{complaint_id}/verify",
    response_model=ComplaintOut,
    summary="Submit citizen verification feedback (Original Citizen Owner only)",
    tags=["lifecycle"],
)
def verify_complaint_endpoint(
    complaint_id: str,
    req: VerifyComplaintIn,
    current_user: dict = Depends(get_current_user),
) -> ComplaintOut:
    user_role = current_user.get("role", "CITIZEN").upper()
    if user_role in ("OFFICER", "ADMIN"):
        raise HTTPException(
            status_code=403,
            detail="Forbidden. Officers and Administrators cannot perform citizen resolution verification.",
        )

    row = db.get_complaint(complaint_id)
    if not row:
        raise HTTPException(status_code=404, detail=f"Complaint '{complaint_id}' not found.")

    if row.get("citizen_id") and row["citizen_id"] != current_user["id"]:
        raise HTTPException(
            status_code=403,
            detail="Forbidden. Only the original complaint owner can verify resolution satisfaction.",
        )

    try:
        updated_row = db.verify_resolution(
            complaint_id=complaint_id,
            result=req.result,
            feedback=req.feedback,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return _clean_complaint(updated_row)


@app.get(
    "/api/complaints/{complaint_id}/timeline",
    response_model=list[TimelineEventOut],
    summary="Get chronological timeline events for a complaint",
    tags=["lifecycle"],
)
def get_complaint_timeline_endpoint(complaint_id: str) -> list[TimelineEventOut]:
    events = db.get_complaint_events(complaint_id)
    return [TimelineEventOut(**e) for e in events]


# ---------------------------------------------------------------------------
# Admin User Management Endpoints
# ---------------------------------------------------------------------------


@app.get(
    "/api/admin/users",
    response_model=list[UserProfileOut],
    summary="List all registered system users (Admin only)",
    tags=["admin"],
)
def list_system_users(
    role: str | None = Query(None, description="Optional role filter: CITIZEN|OFFICER|ADMIN"),
    current_user: dict = Depends(require_roles("ADMIN")),
) -> list[UserProfileOut]:
    users = db.list_users(role=role)
    return [UserProfileOut(**u) for u in users]


@app.post(
    "/api/admin/users",
    response_model=UserProfileOut,
    status_code=201,
    summary="Create a new officer or user account (Admin only)",
    tags=["admin"],
)
def admin_create_user(
    req: UserAdminCreateIn,
    current_user: dict = Depends(require_roles("ADMIN")),
) -> UserProfileOut:
    try:
        user = db.create_user(
            name=req.name,
            email=req.email,
            password=req.password,
            role=req.role,
            department=req.department,
            ward=req.ward,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return UserProfileOut(**user)


@app.patch(
    "/api/admin/users/{user_id}",
    response_model=UserProfileOut,
    summary="Update user role, department, or ward assignment (Admin only)",
    tags=["admin"],
)
def admin_update_user(
    user_id: str,
    req: UserAdminUpdateIn,
    current_user: dict = Depends(require_roles("ADMIN")),
) -> UserProfileOut:
    updated = db.update_user(
        user_id=user_id,
        name=req.name,
        role=req.role,
        department=req.department,
        ward=req.ward,
        status=req.status,
    )
    if not updated:
        raise HTTPException(status_code=404, detail=f"User '{user_id}' not found.")
    return UserProfileOut(**updated)


@app.get("/api/health", summary="Health check", tags=["system"])
def health() -> dict:
    return {"status": "ok", "version": "1.0.0"}

