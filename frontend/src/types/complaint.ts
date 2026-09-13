// Aligned to backend schemas.py
export type Severity = "Low" | "Medium" | "High" | "Critical";
export type Urgency = "Routine" | "Soon" | "Urgent" | "Emergency";
export type ComplaintStatus = "New" | "Under Review" | "Assigned" | "In Progress" | "Resolved" | "Rejected / Spam";

// Matches backend ComplaintCategory enum exactly
export type ComplaintCategory =
  | "Roads"
  | "Water"
  | "Electricity"
  | "Waste Management"
  | "Public Transport"
  | "Healthcare"
  | "Education"
  | "Street Lighting"
  | "Drainage"
  | "Public Safety"
  | "Spam / Invalid"
  | "Other";

export interface Complaint {
  id: string;
  citizen_id?: string | null;
  raw_text: string;
  category: string;
  subcategory: string;
  severity: Severity;
  urgency: Urgency;
  location: string;
  affected_facility: string;
  summary: string;
  created_at: string;
  updated_at: string;
  status: ComplaintStatus;
  latitude?: number | null;
  longitude?: number | null;
  image_url?: string | null;
  image_analysis?: string | null;
  is_duplicate?: boolean;
  duplicate_of_id?: string | null;
  citizen_reports_count?: number;
  additional_updates?: string | Array<{ text: string; created_at: string; image_url?: string }>;
  detected_language?: string;
  department?: string | null;
  ward?: string | null;
  assigned_to?: string | null;
  sla_deadline?: string | null;
  resolved_at?: string | null;
  tracking_token?: string | null;
}

export interface ComplaintEvent {
  id: string;
  complaint_id: string;
  event_type: string;
  actor: string;
  timestamp: string;
  metadata?: string;
}

export interface ComplaintResolution {
  complaint_id: string;
  note: string;
  evidence_image?: string | null;
  submitted_at: string;
}

export interface CitizenVerification {
  complaint_id: string;
  result: "Verified" | "Reopened";
  feedback?: string | null;
  timestamp: string;
}

export interface TrackingData {
  complaint: Complaint;
  events: ComplaintEvent[];
  resolution?: ComplaintResolution | null;
  verification?: CitizenVerification | null;
}
