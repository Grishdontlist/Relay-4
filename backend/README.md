# Relay4 backend

The backend receives structured emergency intake facts, keeps one incident per voice conversation, and preserves the record as facts change. It serves the dispatcher console through a FastAPI read API and protects webhook and manual writes with separate shared secrets.

[Project overview](../README.md) · [Frontend documentation](../frontend/README.md)

## Technical stack

| Component | Dependency | Role |
| --- | --- | --- |
| Runtime | Python 3.11+ | Application and simulation scripts |
| HTTP API | FastAPI 0.115.6 | Routes, dependency injection, OpenAPI documentation |
| Server | Uvicorn >=0.30,<1 | ASGI server |
| Request models | Pydantic >=2.7,<3 | Field types, limits, and response schemas |
| Settings | pydantic-settings >=2.4,<3 | Environment and `.env` loading |
| Persistence | SQLAlchemy >=2.0,<3 with SQLite | ORM models, sessions, and local storage |
| Tests and HTTP client | pytest >=8,<9; HTTPX 0.28.1 | API tests and synthetic webhook requests |

`requirements.txt` defines the dependency ranges. The backend receives ElevenLabs webhook calls without an ElevenLabs SDK or outbound API key.

## Setup and startup

Run from the repository root:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
cp .env.example .env
```

Set distinct random values for `ELEVENLABS_WEBHOOK_SECRET` and `ADMIN_API_KEY` in `.env`. Keep credentials out of version control. Start the application from `backend/`:

```bash
uvicorn app.main:app --reload --port 8000
```

- [Health check](http://127.0.0.1:8000/health)
- [Interactive API documentation](http://127.0.0.1:8000/docs)
- [Runtime OpenAPI schema](http://127.0.0.1:8000/openapi.json)

The application creates missing tables on startup with SQLAlchemy `create_all`. It does not run schema migrations. The default SQLite path is relative to the process working directory, so starting from `backend/` consistently uses `backend/relay4.db`.

## Configuration

| Variable | Default or example | Behavior |
| --- | --- | --- |
| `APP_ENV` | `development` | Enables fallback local CORS origins when no origins are configured |
| `API_PORT` | `8000` | Stored setting; the Uvicorn CLI `--port` controls the actual listening port |
| `DATABASE_URL` | `sqlite:///./relay4.db` | SQLAlchemy connection URL |
| `ELEVENLABS_WEBHOOK_SECRET` | Empty in code | Required shared secret for voice-tool requests |
| `ELEVENLABS_WEBHOOK_HEADER` | `X-ElevenLabs-Webhook-Secret` | Request header carrying the webhook secret |
| `ELEVENLABS_AGENT_ID` | Optional | Stored configuration; the current request handler does not validate agent identity with it |
| `ADMIN_API_KEY` | Empty in code | Required value for the `X-Admin-API-Key` header on manual writes |
| `SIMULATION_MODE` | `true` | Reported by `/health`; it does not enforce synthetic-only payloads |
| `CORS_ORIGINS` | Comma-separated origins | Allows browser requests from the listed origins |

The example file allows localhost and 127.0.0.1 on ports 5173 and 5174. The same origins are the development fallback. Environment variables override values in `.env`.

## Request lifecycle

1. The webhook dependency checks the configured secret using a constant-time comparison.
2. Pydantic validates identifiers and incident fields.
3. The service checks whether `event_id` has already been processed.
4. A conversation binding locates the incident or creates a new one.
5. Changed facts generate history rows. A nonempty source quote generates unverified evidence.
6. The service records the processed event and commits the transaction.
7. The response returns the incident ID, current status, and creation and duplicate flags.

A new conversation starts in `intake`. A later webhook event that changes tracked facts on a `reviewed` incident moves it to `needs_review`. An authenticated manual PATCH sets the review status. The voice-tool schema has no status or assignment approval field.

## API reference

| Method and route | Authentication | Result |
| --- | --- | --- |
| `GET /health` | None | Service name, health status, and simulation setting |
| `GET /api/incidents` | None | Incident list, newest creation first; no pagination |
| `GET /api/incidents/{id}` | None | Incident with evidence and correction history |
| `GET /api/incidents/{id}/history` | None | History ordered by change time |
| `POST /api/incidents` | `X-Admin-API-Key` | Creates a manual incident; HTTP 201 |
| `PATCH /api/incidents/{id}` | `X-Admin-API-Key` | Updates supplied fields and optional review status |
| `POST /api/elevenlabs/tools/upsert-incident` | Configured webhook header | Creates or updates the conversation's incident; HTTP 200 |

Missing or incorrect credentials return `401`. An unconfigured write secret returns `503`. Invalid request data returns `422`; a missing incident returns `404`. Reusing an event ID with a different payload returns `409`.

Read routes are unauthenticated, including quotes and history. CORS controls browser access; it does not authenticate API clients. The application has no user accounts or role-based access layer.

## Voice-tool contract

Configure the voice integration to POST JSON to:

```text
https://YOUR-BACKEND-HOST/api/elevenlabs/tools/upsert-incident
```

Send `X-ElevenLabs-Webhook-Secret` with the exact configured secret, or use the configured alternate header. The value is the raw secret, without a `Bearer` prefix. HTTPS termination belongs to the host or tunnel in front of Uvicorn.

| Field | Contract |
| --- | --- |
| `event_id` | Required nonblank string, up to 255 characters; unique for each new event |
| `conversation_id` | Required nonblank string, up to 255 characters; stable across one conversation |
| `incident_type` | Optional string, up to 100 characters |
| `description` | Optional string, up to 10,000 characters |
| `location` | Optional string, up to 500 characters |
| `landmark`, `hazard` | Optional strings, up to 255 characters each |
| `people_count` | Optional integer, 0–100,000 |
| `injuries` | Optional string, up to 5,000 characters |
| `location_confirmed` | Boolean; send `true` or `false`, or omit it |
| `source_quote` | Optional string, up to 10,000 characters |
| `transcript_reference` | Optional string, up to 500 characters |

Example event:

```json
{
  "event_id": "demo-flood-001",
  "conversation_id": "demo-conversation-001",
  "incident_type": "stranded_vehicle",
  "location": "Louisiana State Capitol, Baton Rouge",
  "hazard": "rising_water",
  "people_count": 3,
  "location_confirmed": true,
  "source_quote": "Our car stalled out and the water keeps rising.",
  "transcript_reference": "demo-message-001"
}
```

The response contains `event_id`, `incident_id`, `status`, `created`, and `duplicate`. Use the returned incident ID for detail and history reads.

### Updates, retries, and unknown values

Omitted fields retain their existing values. Explicit `null` clears nullable facts such as `injuries` or `location`. `location_confirmed` defaults to `false` and is non-nullable in the database: omit it or send a boolean. Although the request model accepts null for this field, persistence does not support it.

Send each correction with a new event ID and the existing conversation ID. Replaying the same validated payload with the same event ID returns `duplicate: true` and adds no changes or evidence. Event IDs are unique across the service, not just within one conversation. A different payload with the same ID is a conflict.

Source quotes are agent-supplied text. They remain `unverified`; the backend does not fetch transcripts or verify quotes automatically. Transcript references are stored as references, not dereferenced. Unknown request properties are ignored by the current Pydantic models.

## Stored records

| Table | Contents |
| --- | --- |
| `incidents` | Current facts, status, conversation ID, creation and update times |
| `incident_history` | Field name, old and new values, source, actor type, event and conversation IDs, change time |
| `incident_evidence` | Caller quote, transcript reference, verification status, and source identifiers |
| `conversation_bindings` | Server-side mapping from a conversation ID to an incident ID |
| `processed_tool_events` | Processed event IDs, incident references, and payload hashes for retries |

Webhook changes and manual PATCH changes create field-level history. Manual incident creation stores the initial record without separate history rows. History identifies an actor type, such as `dispatcher` or `voice_agent`, rather than an authenticated individual.

## Synthetic call scripts

With the API running and the virtual environment active, run from `backend/`:

```bash
python scripts/simulate_call.py fire
python scripts/simulate_call.py flood
python scripts/simulate_call.py medical
python scripts/simulate_call.py crash
python scripts/simulate_call.py all
```

`simulate_call.py` reads `backend/.env`, honors the configured header name, and creates a fresh conversation per scenario. Set `RELAY4_API_URL` to target another backend.

For a single repeatable event:

```bash
ELEVENLABS_WEBHOOK_SECRET="your-value-from-.env" python scripts/simulate_voice_tool.py
```

`simulate_voice_tool.py` reads the secret from the shell environment, uses the default header name, and sends fixed event and conversation IDs. Repeating it demonstrates duplicate handling. Its fictional landmark may not resolve on the map. Neither script requires an ElevenLabs account.

## Source layout

```text
app/api/                 Incident routes and ElevenLabs webhook route
app/models/incident.py   SQLAlchemy models and status enums
app/services/            Incident updates, evidence, history, and retry handling
app/schemas.py           Request and response models
app/security.py          Admin-key and webhook-secret checks
app/config.py            Environment settings and CORS defaults
app/database.py          Engine and request-session setup
app/main.py              Application factory, table creation, routes, and health
scripts/                 Synthetic call producers
tests/                   Isolated API tests
```

## Tests and troubleshooting

```bash
pytest -q
```

Tests use a temporary SQLite database. They cover health, authentication, invalid input, missing facts, conversation binding, field corrections, duplicate retries, conflicting event IDs, unverified evidence, protected manual updates, and the absence of an assignment endpoint.

| Symptom | Check |
| --- | --- |
| Webhook returns `401` | Match the exact header name and secret; remove extra whitespace and any `Bearer` prefix |
| Write returns `503` | Set the relevant secret and restart the service |
| Browser cannot read incidents | Check the API address and the browser's exact origin in `CORS_ORIGINS` |
| Expected incidents are missing | Check the working directory and `DATABASE_URL` |
| Event returns `409` | Use a new event ID for changed content |

This backend stores synthetic incident data. It has no dispatch, responder delivery, acknowledgement, or DeepSpace endpoint. Keep those boundaries explicit when demonstrating the system.
