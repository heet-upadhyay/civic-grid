import type { Severity, Urgency, ComplaintStatus, ComplaintCategory } from '../types/complaint';

// Matches backend ComplaintCategory enum
export const CATEGORIES: ComplaintCategory[] = [
  "Roads",
  "Water",
  "Electricity",
  "Waste Management",
  "Public Transport",
  "Healthcare",
  "Education",
  "Street Lighting",
  "Drainage",
  "Public Safety",
  "Spam / Invalid",
  "Other",
];

export const SEVERITY_LEVELS: Severity[] = ["Low", "Medium", "High", "Critical"];
export const URGENCY_LEVELS: Urgency[] = ["Routine", "Soon", "Urgent", "Emergency"];
export const STATUS_OPTIONS: ComplaintStatus[] = ["New", "Under Review", "Assigned", "In Progress", "Resolved", "Rejected / Spam"];

// Google Maps defaults — centered on India
export const INDIA_CENTER = { lat: 20.5937, lng: 78.9629 };
export const INDIA_ZOOM = 5;
export const LOCATION_PICKER_ZOOM = 15;

// Severity → marker color mapping
export const SEVERITY_COLORS: Record<Severity, string> = {
  Low: '#22c55e',      // green
  Medium: '#f59e0b',   // amber
  High: '#f97316',     // orange
  Critical: '#ef4444', // red
};
