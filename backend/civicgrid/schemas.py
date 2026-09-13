from enum import Enum

from pydantic import BaseModel, ConfigDict


class ComplaintCategory(str, Enum):
    ROADS = "Roads"
    WATER = "Water"
    ELECTRICITY = "Electricity"
    WASTE_MANAGEMENT = "Waste Management"
    PUBLIC_TRANSPORT = "Public Transport"
    HEALTHCARE = "Healthcare"
    EDUCATION = "Education"
    STREET_LIGHTING = "Street Lighting"
    DRAINAGE = "Drainage"
    PUBLIC_SAFETY = "Public Safety"
    SPAM_INVALID = "Spam / Invalid"
    OTHER = "Other"


class Severity(str, Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    CRITICAL = "Critical"


class Urgency(str, Enum):
    ROUTINE = "Routine"
    SOON = "Soon"
    URGENT = "Urgent"
    EMERGENCY = "Emergency"


class CivicComplaint(BaseModel):
    model_config = ConfigDict(extra="forbid")

    category: ComplaintCategory
    subcategory: str
    severity: Severity
    urgency: Urgency
    location: str
    affected_facility: str
    summary: str
    image_analysis: str = ""
    is_spam: bool = False
    is_duplicate: bool = False
    duplicate_of_id: str | None = None
    detected_language: str = "English"
