import os

import httpx


payload = {
    "event_id": "demo-event-001",
    "conversation_id": "demo-conversation-001",
    "incident_type": "stranded_vehicle",
    "location": "Cypress Bend Market",
    "landmark": "West service entrance",
    "hazard": "rising_water",
    "people_count": 2,
    "injuries": None,
    "location_confirmed": True,
    "source_quote": "We're stuck near the market and water is rising.",
    "transcript_reference": "demo-transcript-message-001",
}

base_url = os.getenv("RELAY4_API_URL", "http://127.0.0.1:8000")
secret = os.getenv("ELEVENLABS_WEBHOOK_SECRET", "change-me")
response = httpx.post(
    f"{base_url}/api/elevenlabs/tools/upsert-incident",
    headers={"X-ElevenLabs-Webhook-Secret": secret},
    json=payload,
    timeout=10,
)
response.raise_for_status()
print(response.json())
