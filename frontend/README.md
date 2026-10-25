# Relay4 dispatcher console

The dispatcher console brings incoming incident facts, caller statements, and Louisiana map context into one view. It reads incidents from the FastAPI backend, highlights missing information, and prepares a report for a dispatcher-approved simulated assignment.

The browser reads incident data without changing backend records. Assignment approval updates local browser state; it does not deliver a report to a real responder.

[Project overview](../README.md) · [Backend documentation](../backend/README.md)

## Technical stack

| Component | Version family | Responsibility |
| --- | --- | --- |
| React and React DOM | 19 | Dashboard rendering and interaction |
| TypeScript | 6 | Static type checking |
| Vite and React plugin | 8 / 6 | Development server and production build |
| Leaflet and React Leaflet | 1.9 / 5 | Map, markers, layers, and map interaction |
| OpenStreetMap tiles | External service | Base map imagery |
| Nominatim | External service | Location-text lookup |
| Bundled Louisiana GeoJSON | Local data | State outline, parish boundaries, and point lookup |
| ESLint and TypeScript ESLint | 10 / 8 | Source linting |
| Browser localStorage | Browser API | Geocode cache and simulated assignment persistence |

`package.json` defines dependency ranges; `package-lock.json` records resolved versions. Styles use CSS in the repository.

## Setup

Use Node.js 20.19+ within the 20.x line, or Node.js 22.12+, matching the installed Vite engine range. Start the backend using its README, then run from the repository root:

```bash
cd frontend
cp .env.example .env
npm ci
npm run dev -- --host 127.0.0.1 --port 5173
```

Open [the console](http://127.0.0.1:5173).

The frontend setting is:

```dotenv
VITE_API_BASE_URL=http://localhost:8000
```

The backend must allow the exact browser origin through `CORS_ORIGINS`. Its example file includes localhost and 127.0.0.1 on ports 5173 and 5174. Restart Vite after changing `.env`. Vite exposes `VITE_` variables to browser code; keep webhook and admin secrets in the backend configuration.

To populate the console, run from `backend/` with its virtual environment active:

```bash
python scripts/simulate_call.py flood
```

## Data flow and refresh

1. `src/api.ts` reads `GET /api/incidents` from the configured API base URL.
2. `useIncidents` polls every four seconds and tracks the connection state.
3. `useGeocodes` resolves distinct location strings into Louisiana coordinates.
4. `buildCalls` calculates priority reasons, missing facts, parish context, and related-call flags.
5. Selecting an incident requests `GET /api/incidents/{id}` for evidence and history. The detail request runs again when the selected incident's `updated_at` changes.
6. The sidebar and map render the resulting call information. Report approval stores a simulated assignment locally.

The console uses HTTP polling. It has no WebSocket or server-sent-event connection. Failed list requests mark the connection offline while retaining previously loaded incidents.

## Reading the console

### Call activity and summaries

An **ongoing** call has status `intake` and an incident update within the last ten minutes. This is a frontend activity rule: the backend has no call-ended event. The clock refreshes every five seconds.

The call summary comes from the backend `description` field supplied during intake. The browser does not generate a separate AI summary. Missing facts display as unknown, and agent-supplied caller statements remain unverified.

### Priority and intake questions

The console assigns a recommended priority using text rules in `src/intake.ts`:

| Priority | Rule |
| --- | --- |
| P1 Critical | Matches configured terms for fire, rising water, serious medical symptoms, hazardous materials, weapons, or entrapment |
| P2 Urgent | Reports injuries, at least five people, or a hazard without a P1 match |
| P3 Routine | Has no matching critical or urgent condition in the available facts |

Each recommendation includes its reasons. Calls sort by priority, then most recent update. These rules inspect text and do not establish clinical severity or verify a report; incomplete information can still produce P3.

The facts meter checks six areas: location, caller confirmation, incident type, people count, injuries, and hazard. Missing information produces **Still to ask** prompts for the call-taker.

### Related calls

Two calls are flagged as possibly related when their creation times are no more than two hours apart and either:

- Their geocoded points are within one kilometre.
- Their location strings match after trimming and ignoring case.

The map connects related pinned calls with a dashed line. The application does not merge records or persist a confirmed relationship.

## Louisiana map and geocoding

Leaflet displays OpenStreetMap tiles with a Louisiana-focused view. The console dims the area outside the state, constrains navigation, and draws the 64 parishes from simplified boundary data. Parish hover details include names and call counts. Boundaries disappear beyond the configured city-scale zoom threshold because the simplified outlines lose accuracy at that scale.

The backend stores location text. The browser sends that text to Nominatim, bounds searches to the Louisiana region, and rejects results outside the local Louisiana geometry. Lookups are queued with a 1.1-second delay after each request and cached under `relay4.geocode.v2` in localStorage.

A missing result appears as **Not found on map**. The code also returns no point after a network failure, so that state does not prove a location is invalid. Failed network requests are not persisted in the cache. The map and uncached location lookup require internet access; location text is sent to the external geocoding service.

Pins show the geocoder's coordinates. Critical calls pulse red until an assignment is recorded; active calls use their priority colour. Geocoding does not confirm an address with the caller.

## Responder report simulation

`src/responders.ts` defines synthetic fire, EMS, police, and water-rescue units at fixed Louisiana locations. Text rules choose a service type. The console ranks available units by that type and straight-line distance, and the dispatcher can select another listed unit.

The displayed ETA is a demo calculation: two minutes plus straight-line travel at 50 km/h, rounded to minutes. It does not use road routes, traffic, road closures, or live unit positions.

The report includes priority and reasons, location, parish, coordinates, reported facts, unverified quotes, unanswered questions, and the conversation ID. Selecting **Approve & send** stores the unit ID, send time, and report under `relay4.assignments.v1` in localStorage. Canceling removes that local assignment.

Assignments persist in the same browser when storage is available. They are not synchronized between dispatchers, written to SQLite, or delivered to a responder service. If storage is unavailable, they last only for the current session. **Awaiting responder acknowledgement** is a display placeholder; there is no acknowledgement workflow.

## Source guide

| File | Responsibility |
| --- | --- |
| `src/main.tsx` | React entry point; currently imports `./1App` and `styles.css` |
| `src/1App.tsx` | Active sidebar-and-map composition and selection state |
| `src/App.tsx` | Alternate composition with the incident drawer; not imported by the current entry point |
| `src/IncidentDetailsDrawer.tsx`, `src/relay-layout.css` | Drawer and layout used by the alternate composition |
| `src/api.ts` | Backend GET requests |
| `src/hooks.ts` | Polling, incident detail, geocoding state, clock, and local assignments |
| `src/types.ts` | Incident and evidence types |
| `src/format.ts` | Live-call window, labels, and timestamp formatting |
| `src/intake.ts` | Priority rules, missing-fact prompts, and related-call detection |
| `src/geocode.ts` | Nominatim requests, queue, and cache |
| `src/louisiana.ts` | Geometry checks, parish lookup, and distance calculation |
| `src/data/louisiana.json` | Bundled state and parish boundaries |
| `src/responders.ts` | Synthetic units, recommendations, ETA, and report text |
| `src/components/CallSidebar.tsx` | Incident cards and selected-call information |
| `src/components/IncidentMap.tsx` | Map layers, pins, relationships, and unit context |
| `src/components/DispatchPanel.tsx` | Unit selection, report preview, approval, and cancellation |
| `src/styles.css` | Active console styling |

## Build and checks

Run from `frontend/`:

```bash
npm run build
npm run lint
```

The build runs `tsc --noEmit` before Vite writes `dist/`. Lint runs ESLint across the project. There is no frontend automated test command in `package.json`.

Preview the production build locally:

```bash
npm run preview -- --host 127.0.0.1 --port 4173
```

Add `http://127.0.0.1:4173` to the backend's `CORS_ORIGINS` and restart the backend before using that preview. The API URL is embedded at build time; rebuild after changing it.

## Troubleshooting

| Symptom | Action |
| --- | --- |
| Console shows offline | Check the backend process, `VITE_API_BASE_URL`, and CORS origin |
| Console is empty | Run a synthetic call and check `GET /api/incidents` |
| Incident has no pin | Inspect the reported location and geocoding network request; use a recognizable Louisiana address or landmark |
| Call is no longer ongoing | Check its status and the ten-minute activity window |
| Unit is unavailable | Check existing simulated assignments in this browser and cancel one to release it |
| A layout edit does not appear | Check `main.tsx`; the active component is `1App.tsx` |

Use synthetic data for this console. Its recommendations and local approval flow demonstrate dispatcher review; real responder delivery, shared assignments, and acknowledgements require backend implementation.
