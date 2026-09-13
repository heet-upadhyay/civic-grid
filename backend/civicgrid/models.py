"""Pydantic models for the CivicGrid REST API (separate from AI extraction schemas)."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator

# Match the frontend ComplaintStatus type
ComplaintStatusLiteral = Literal["New", "Under Review", "Assigned", "In Progress", "Resolved", "Rejected / Spam"]


class SubmitComplaintIn(BaseModel):
    text: str = Field(min_length=10, max_length=2000, description="Complaint description in plain language")
    location: str = Field(min_length=1, max_length=100, description="Ward or location name")
    latitude: float | None = Field(default=None, description="Optional geographic latitude")
    longitude: float | None = Field(default=None, description="Optional geographic longitude")
    image_b64: str | None = Field(default=None, description="Optional base64 image data for multimodal vision")


class UpdateStatusIn(BaseModel):
    status: ComplaintStatusLiteral = Field(description="New complaint status")


RoleLiteral = Literal["CITIZEN", "OFFICER", "ADMIN"]


class UserRegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=100, description="Full Name")
    email: str = Field(min_length=5, max_length=150, description="Email address")
    password: str = Field(min_length=6, max_length=100, description="Password")


class UserLoginIn(BaseModel):
    email: str = Field(min_length=1, description="Email address or Officer ID")
    password: str = Field(min_length=1, description="Password")


class UserProfileOut(BaseModel):
    id: str
    name: str
    email: str
    role: str
    department: str | None = None
    ward: str | None = None
    status: str = "ACTIVE"
    created_at: str = ""


class AuthTokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserProfileOut


class UserAdminCreateIn(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: str = Field(min_length=5, max_length=150)
    password: str = Field(min_length=6, max_length=100)
    role: RoleLiteral = Field(default="OFFICER")
    department: str | None = Field(default=None)
    ward: str | None = Field(default=None)


class UserAdminUpdateIn(BaseModel):
    name: str | None = Field(default=None)
    role: RoleLiteral | None = Field(default=None)
    department: str | None = Field(default=None)
    ward: str | None = Field(default=None)
    status: str | None = Field(default=None)


class ComplaintOut(BaseModel):
    id: str
    citizen_id: str | None = None
    raw_text: str = ""
    category: str = "Other"
    subcategory: str = "General Civic Issue"
    severity: str = "Medium"
    urgency: str = "Routine"
    location: str = "Unknown"
    affected_facility: str = "Unknown"
    summary: str = ""
    status: str = "New"
    created_at: str = ""
    updated_at: str = ""
    latitude: float | None = None
    longitude: float | None = None
    image_url: str | None = None
    image_analysis: str | None = None
    is_duplicate: bool = False
    duplicate_of_id: str | None = None
    citizen_reports_count: int = 1
    additional_updates: str = "[]"
    detected_language: str = "English"
    department: str | None = None
    ward: str | None = None
    assigned_to: str | None = None
    sla_deadline: str | None = None
    resolved_at: str | None = None
    tracking_token: str | None = None


class AssignComplaintIn(BaseModel):
    department: str | None = Field(default=None, description="Department name (e.g. Municipal Public Works)")
    ward: str | None = Field(default=None, description="Municipal ward or zone")
    assigned_to: str | None = Field(default=None, description="Assigned officer name or ID")
    sla_hours: int | None = Field(default=None, ge=1, le=720, description="Optional custom SLA resolution window in hours")


class ResolveComplaintIn(BaseModel):
    note: str = Field(min_length=5, max_length=1000, description="Proof of work resolution note")
    evidence_image: str | None = Field(default=None, description="Optional photo URL or base64 proof of completion")

    @field_validator("evidence_image")
    @classmethod
    def validate_evidence_image(cls, v: str | None) -> str | None:
        if v is None or not v.strip():
            return None
        val = v.strip()
        if val.startswith("data:"):
            allowed_prefixes = (
                "data:image/jpeg;base64,",
                "data:image/jpg;base64,",
                "data:image/png;base64,",
                "data:image/webp;base64,",
                "data:image/gif;base64,",
            )
            if not any(val.lower().startswith(p) for p in allowed_prefixes):
                raise ValueError("Invalid evidence image format. Must be JPEG, PNG, WEBP, or GIF image.")
            if len(val) > 7_000_000:  # ~5MB base64 limit
                raise ValueError("Evidence image payload exceeds maximum allowed size of 5MB.")
        elif not (val.startswith("http://") or val.startswith("https://")):
            raise ValueError("Evidence image must be a valid HTTP(S) URL or base64 data URI.")
        return val


class VerifyComplaintIn(BaseModel):
    result: Literal["Verified", "Reopened"] = Field(description="Citizen satisfaction verification result")
    feedback: str | None = Field(default=None, max_length=500, description="Optional feedback text")


class TimelineEventOut(BaseModel):
    id: str
    complaint_id: str
    event_type: str
    actor: str
    timestamp: str
    metadata: str = ""


class ResolutionOut(BaseModel):
    complaint_id: str
    note: str
    evidence_image: str | None = None
    submitted_at: str


class VerificationOut(BaseModel):
    complaint_id: str
    result: str
    feedback: str | None = None
    timestamp: str


class SubmitComplaintResponse(BaseModel):
    success: bool = True
    complaint: ComplaintOut


class ListComplaintsResponse(BaseModel):
    complaints: list[ComplaintOut]
    total: int


class StatsResponse(BaseModel):
    total: int
    by_status: dict[str, int]
    by_category: dict[str, int]
    by_severity: dict[str, int]


class OfficerLoginIn(BaseModel):
    officer_id: str = Field(min_length=1, description="Unique Officer Identification Code")
    password: str = Field(min_length=1, description="Officer Password")


class OfficerLoginOut(BaseModel):
    success: bool
    officer_id: str
    name: str
    department: str
    token: str


class ChangePasswordIn(BaseModel):
    officer_id: str = Field(min_length=1, description="Unique Officer Identification Code")
    old_password: str = Field(min_length=1, description="Current Officer Password")
    new_password: str = Field(min_length=6, description="New Officer Password")


class ChangePasswordOut(BaseModel):
    success: bool
    message: str


class UserChangePasswordIn(BaseModel):
    old_password: str = Field(min_length=1, description="Current password")
    new_password: str = Field(min_length=6, description="New password (min 6 characters)")



class TranslateTextIn(BaseModel):
    text: str = Field(min_length=1, max_length=3000, description="Source text to translate")
    target_language: str = Field(min_length=2, max_length=20, description="Target language code (e.g., hi, ml, ta, te, kn, bn, mr, en)")
    source_language: str | None = Field(default=None, description="Optional stored source language of the complaint")


class TranslateTextOut(BaseModel):
    original_text: str
    translated_text: str
    target_language: str
    detected_language: str = "auto"

