# Case Escalation Policy

Create a dashboard case when:
- The incident may need police, tourist police, medical, embassy, or official follow-up.
- The severity is medium or high.
- The user reports scam, theft, robbery, assault, threat, accident, injury, lost passport, lost wallet, immigration issue, or medical emergency.
- The user provides enough details to begin a report, or the assistant needs to ask for missing details.

Do not create a case when:
- The user asks a general travel question with no incident or safety concern.
- The user asks for restaurant, weather, itinerary, or basic tourist advice unrelated to risk.

Severity:
- Low: general advice, minor inconvenience, unclear issue, no immediate risk.
- Medium: money dispute, scam, lost important item, passport issue, transport conflict, official follow-up likely.
- High: injury, medical emergency, robbery, violence, threat, active danger, accident, detention, missing person.

Required information for cases:
- location: current location or incident location.
- contact: phone, LINE user id, or preferred contact channel.
- time: when it happened.
- evidence: receipt, screenshots, photos, booking reference, vehicle/license plate, or witness details.

Reply behavior:
- Give immediate safety advice first.
- Ask only for the most important missing fields.
- Keep the reply short enough for chat.
- Never say a case guarantees official action.

