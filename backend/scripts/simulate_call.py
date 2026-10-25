"""Play a synthetic emergency call into the webhook, one update at a time.

Mimics how the ElevenLabs agent calls the upsert-incident tool during a call,
so the dashboard shows a live call filling in. Every run is a new call.

    python scripts/simulate_call.py              # fire at Jackson Square
    python scripts/simulate_call.py flood        # see SCENARIOS for names
    python scripts/simulate_call.py all          # every scenario in turn
    RELAY4_API_URL=https://<tunnel>.trycloudflare.com python scripts/simulate_call.py

The webhook secret is read from backend/.env. Synthetic data only.
"""

import os
import sys
import time
import uuid
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.config import Settings  # noqa: E402

SECONDS_BETWEEN_UPDATES = 4

# Each scenario is the sequence of tool calls an agent would make as the caller talks.
SCENARIOS = {
    "fire": [
        {"incident_type": "structure_fire", "location": "Jackson Square, New Orleans",
         "source_quote": "There's smoke coming out of a building at Jackson Square!"},
        {"landmark": "Balcony facing St. Louis Cathedral", "hazard": "smoke", "people_count": 2,
         "source_quote": "It's the balcony across from the cathedral. I think two people are still up there."},
        {"location_confirmed": True, "injuries": "None reported yet",
         "description": "Smoke from a second-floor balcony facing St. Louis Cathedral. Two residents may still be inside; no injuries reported yet.",
         "source_quote": "Yes, that's right, Jackson Square. Nobody's hurt that I can see."},
    ],
    "flood": [
        {"incident_type": "stranded_vehicle", "location": "Louisiana State Capitol, Baton Rouge",
         "source_quote": "Our car stalled out and the water keeps rising, we're near the Capitol."},
        {"hazard": "rising_water", "people_count": 3,
         "source_quote": "It's me, my mom and my little brother. Water's up to the doors."},
        {"location_confirmed": True, "injuries": "none",
         "description": "Vehicle stalled in rising floodwater near the State Capitol with three occupants. Water at door level; no injuries.",
         "source_quote": "Yes, by the State Capitol. We're okay, just scared."},
    ],
    "medical": [
        {"incident_type": "medical", "location": "Lafayette Regional Airport",
         "source_quote": "A man just collapsed at the airport terminal."},
        {"people_count": 1, "injuries": "Collapsed, breathing, not responding",
         "source_quote": "He's breathing but he won't answer me."},
        {"landmark": "Baggage claim", "location_confirmed": True,
         "description": "Adult male collapsed at baggage claim; breathing but unresponsive.",
         "source_quote": "We're at baggage claim, yes."},
    ],
    "crash": [
        {"incident_type": "vehicle_collision", "location": "Texas Street Bridge, Shreveport",
         "source_quote": "Two cars just crashed on the Texas Street bridge."},
        {"people_count": 4, "hazard": "fuel_leak",
         "source_quote": "There's four people and I can smell gas leaking."},
        {"injuries": "One driver bleeding from the head", "location_confirmed": True,
         "description": "Two-vehicle collision on the Texas Street Bridge; four people involved, fuel leak, one driver with a head wound.",
         "source_quote": "One of the drivers is bleeding from his head."},
    ],
}


def play(name: str, base_url: str, header: str, secret: str) -> None:
    conversation_id = f"sim-{name}-{uuid.uuid4().hex[:8]}"
    print(f"\n📞 {name}: {conversation_id}")
    for step, update in enumerate(SCENARIOS[name], start=1):
        payload = {"event_id": f"{conversation_id}-{step}", "conversation_id": conversation_id, **update}
        response = httpx.post(
            f"{base_url}/api/elevenlabs/tools/upsert-incident",
            headers={header: secret},
            json=payload,
            timeout=20,
        )
        if response.status_code != 200:
            sys.exit(f"  update {step} failed: HTTP {response.status_code} {response.text}")
        print(f"  update {step}/{len(SCENARIOS[name])}: {', '.join(k for k in update if k != 'source_quote')} → 200")
        if step < len(SCENARIOS[name]):
            time.sleep(SECONDS_BETWEEN_UPDATES)


def main() -> None:
    choice = sys.argv[1] if len(sys.argv) > 1 else "fire"
    names = list(SCENARIOS) if choice == "all" else [choice]
    if any(name not in SCENARIOS for name in names):
        sys.exit(f"Unknown scenario {choice!r}. Choose from: {', '.join(SCENARIOS)}, all")

    settings = Settings(_env_file=Path(__file__).resolve().parents[1] / ".env")
    if not settings.elevenlabs_webhook_secret:
        sys.exit("ELEVENLABS_WEBHOOK_SECRET is not set in backend/.env")
    base_url = (os.environ.get("RELAY4_API_URL") or "http://127.0.0.1:8000").rstrip("/")

    for name in names:
        play(name, base_url, settings.elevenlabs_webhook_header, settings.elevenlabs_webhook_secret)
    print("\nDone. Open the dashboard to see the call(s).")


if __name__ == "__main__":
    main()
