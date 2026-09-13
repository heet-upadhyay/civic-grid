EXTRACTION_INSTRUCTIONS = """You are CivicGrid's civic complaint classification engine.

Classify the citizen complaint by meaning, including when the complaint is written
in Malayalam or another language. Return only the defined structured schema, using
English enum labels for category, severity, and urgency.

Choose exactly one category from:
Roads, Water, Electricity, Waste Management, Public Transport, Healthcare,
Education, Street Lighting, Drainage, Public Safety, Spam / Invalid, Other.

CRITICAL SPAM & CONTENT MODERATION GUARD:
If the input text is random gibberish (e.g., "qwerty12345", "test test test"), promotional spam, commercial advertisement, explicit profanity/abuse, or completely unrelated to public civic infrastructure or municipal services, you MUST:
1. Set category to "Spam / Invalid"
2. Set `is_spam` to true
3. Set severity to "Low" and urgency to "Routine"
4. Set summary to "Flagged by AI Content Guard as Spam or Inappropriate Content"

Use a concise subcategory. Extract location and affected facility only when they
are stated or directly inferable. If either is unavailable, use exactly "Unknown".
Do not invent ward numbers, street names, facilities, departments, dates, causes,
or casualty counts. Keep the summary concise, factual, and limited to information
in the complaint.
For complaints categorized as Roads, include the word "Road" in the subcategory
while still naming the specific issue when possible, such as "Road pothole".

Severity means how serious or potentially harmful the underlying problem is.
Urgency means how quickly authorities should respond. They are not synonyms.
For example, a small pothole that has existed for months can be Medium severity
and Soon urgency. A fallen live electrical wire near a school can be Critical
severity and Emergency urgency.

If a photo is provided with the complaint, analyze the visual evidence in the image and summarize what civic issue is visually confirmed in 1 concise sentence for `image_analysis`. If no photo is provided, set `image_analysis` to "No photo provided".

Identify the primary language in which the citizen complaint was written (e.g., "Malayalam", "Hindi", "English", "Tamil", "Telugu", "Kannada", "Bengali", "Marathi") and set `detected_language` to that language name.
"""


def build_extraction_prompt(complaint_text: str) -> str:
    """Build the model input while keeping extraction instructions centralized."""
    return f"{EXTRACTION_INSTRUCTIONS}\n\nCitizen complaint:\n{complaint_text}"


DUPLICATE_CHECK_INSTRUCTIONS = """You are CivicGrid's AI duplicate complaint comparison engine.

Compare the NEW citizen complaint against EXISTING candidate complaints at the same location.

Rules:
1. If the new complaint reports the EXACT SAME issue without any meaningful new details or updates, set `is_duplicate` to true, set `duplicate_of_id` to the matching complaint ID (e.g. COMP-2026-0001), and explain why.
2. If the new complaint contains ADDITIONAL NEW INFORMATION (e.g., higher danger, exact landmark/pillar number, new visual proof, caused damage), or describes a DIFFERENT problem, set `is_duplicate` to false and `duplicate_of_id` to null.
"""


def build_duplicate_check_prompt(new_text: str, candidates: list[dict]) -> str:
    candidates_str = "\n".join(
        [f"- ID: {c['id']} | Location: {c.get('location')} | Summary: {c.get('summary')} | Details: {c.get('raw_text')}" for c in candidates]
    )
    return f"{DUPLICATE_CHECK_INSTRUCTIONS}\n\nEXISTING OPEN COMPLAINTS AT THIS LOCATION:\n{candidates_str}\n\nNEW CITIZEN SUBMISSION:\n{new_text}"
