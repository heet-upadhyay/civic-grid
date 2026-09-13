from civicgrid.gemini import classify_complaint


COMPLAINTS = [
    "There is a huge pothole near the bus stop in Ward 7. Two bikes almost fell yesterday.",
    "പഞ്ചായത്ത് റോഡിൽ വലിയ കുഴിയുണ്ട്, വാഹനങ്ങൾ പോകാൻ ബുദ്ധിമുട്ടാണ്.",
]


def main() -> None:
    for text in COMPLAINTS:
        complaint = classify_complaint(text)
        print("=" * 40)
        print("INPUT")
        print("=" * 40)
        print(text)
        print("\n" + "=" * 40)
        print("STRUCTURED OUTPUT")
        print("=" * 40)
        print(f"Category: {complaint.category.value}")
        print(f"Subcategory: {complaint.subcategory}")
        print(f"Severity: {complaint.severity.value}")
        print(f"Urgency: {complaint.urgency.value}")
        print(f"Location: {complaint.location}")
        print(f"Affected Facility: {complaint.affected_facility}")
        print(f"Summary: {complaint.summary}\n")


if __name__ == "__main__":
    main()
