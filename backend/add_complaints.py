import os
import sys
from datetime import datetime, timezone, timedelta

# Add current dir to sys.path so we can import civicgrid
sys.path.insert(0, os.path.dirname(__file__))

from civicgrid.database import init_db, insert_complaint

init_db()

now = datetime.now(timezone.utc)

complaints = [
    {
        "raw_text": "There is a massive pothole on MG Road near the metro station.",
        "category": "Roads & Transport",
        "subcategory": "Pothole",
        "severity": "High",
        "urgency": "Urgent",
        "location": "MG Road",
        "affected_facility": "Road",
        "summary": "Large pothole on MG Road",
        "status": "New",
        "citizen_id": "USER-CITIZEN-001",
        "latitude": 12.9716,
        "longitude": 77.5946,
        "department": "Municipal Public Works",
        "ward": "Ward 1",
    },
    {
        "raw_text": "Garbage hasn't been collected for 3 days in Indiranagar 100ft road.",
        "category": "Sanitation & Waste",
        "subcategory": "Missed Pickup",
        "severity": "Medium",
        "urgency": "Soon",
        "location": "Indiranagar",
        "affected_facility": "Waste Bin",
        "summary": "Garbage pileup in Indiranagar",
        "status": "In Progress",
        "citizen_id": "USER-CITIZEN-002",
        "latitude": 12.9784,
        "longitude": 77.6408,
        "department": "Health & Sanitation",
        "ward": "Ward 7",
        "assigned_to": "OFFICER-HEALTH",
    },
    {
        "raw_text": "Streetlights are completely dead on Brigade road since last night.",
        "category": "Streetlights & Power",
        "subcategory": "Broken Light",
        "severity": "Critical",
        "urgency": "Emergency",
        "location": "Brigade Road",
        "affected_facility": "Streetlight",
        "summary": "Dead streetlights on Brigade Road",
        "status": "Resolved",
        "citizen_id": "USER-CITIZEN-001",
        "latitude": 12.9738,
        "longitude": 77.6073,
        "department": "Electrical Department",
        "ward": "Ward 1",
        "resolved_at": now.isoformat(),
    }
]

for c in complaints:
    insert_complaint(**c)

print(f"Inserted {len(complaints)} sample complaints using insert_complaint().")
