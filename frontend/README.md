# Relay4 frontend

Dispatcher console: ongoing ElevenLabs calls and call summaries on the left, a full Louisiana map on the right with a pin at each reported incident location. Synthetic/demo only; it is read-only and never dispatches anyone.

## Run

```bash
cp .env.example .env        # VITE_API_BASE_URL=http://localhost:8000
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

The backend must be running with `CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173`. Seed a call with `backend/scripts/simulate_voice_tool.py`.

`npm run build` type-checks and builds; `npm run lint` lints.

## How it works

- Polls `GET /api/incidents` every 4 s. Opening a call fetches `GET /api/incidents/{id}` for the caller statements.
- **Ongoing call** = status `intake` and updated within the last 10 minutes (`src/format.ts`). The backend has no call-ended event yet.
- **Summary** = the incident `description` the ElevenLabs agent sent. Missing facts are shown as `Unknown`; caller quotes are labelled `Unverified` until verified.
- **Louisiana focus**: the map can't pan or zoom out beyond the state, everything outside it is dimmed, and the 64 parishes are drawn (hover for name and call count). Each pinned call is labelled with its parish. Boundaries are simplified US Census data in `src/data/louisiana.json`, hidden past city zoom where they get inaccurate.
- **Suggested priority (P1–P3)**: rule-based on the reported facts, always shown with its reasons (`src/intake.ts`). Calls are sorted by it. The dispatcher decides; nothing is dispatched.
- **Still to ask**: the facts still unknown (location, confirmation, type, people, injuries, hazard) become prompts for the call-taker, with a facts meter on each card.
- **Possibly related calls**: calls within 1 km and 2 h of each other (or with the same location text) are flagged and linked on the map with a dashed line. They are never merged automatically.
- **Critical pings**: each pin sits on the geocoded point (coordinates shown on the card). P1 calls ping in red until a report is sent; live calls ping in their priority colour.
- **Responder report (suggested, dispatcher approves)**: for the open call the console suggests the nearest free unit of the needed type (fire, EMS, police, water rescue) with a straight-line distance and ETA, and drafts the report (priority and reasons, location, parish, coordinates, facts, unverified caller quotes, open questions). The dispatcher can change the unit and must click **Approve & send**; nothing is sent automatically. Units are synthetic fixtures (`src/responders.ts`) and sending is simulated in localStorage because the backend has no responder/assignment API yet.
- **Pins**: the backend stores locations as text, so the browser geocodes them with OpenStreetMap Nominatim, restricted to Louisiana (`src/geocode.ts`, max 1 request/s, cached in localStorage). A place that cannot be found, or that resolves outside Louisiana, is listed as "Not found on map", never guessed.

## Files

```
src/api.ts                  backend requests
src/hooks.ts                polling, detail fetch, geocoding
src/geocode.ts              Nominatim lookup + cache
src/format.ts               live-call rule, time and label formatting
src/intake.ts               priority, missing facts, related calls
src/louisiana.ts            parish lookup, state outline and mask
src/responders.ts           synthetic units, unit suggestion, report text
src/components/DispatchPanel.tsx
src/components/CallSidebar.tsx
src/components/IncidentMap.tsx
src/styles.css              palette adapted from DispatcherAI's console
```
