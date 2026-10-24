# Relay4 frontend

Emergency intake and coordination simulation for Louisiana. Geeks From SLU — Team 404.

## Start locally

Requires Node.js 22 or newer and npm.

```sh
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. Vite prints the actual port if 5173 is occupied.

```sh
npm run build
npm test
npm run preview
```

Browser workflow checks (first install the test browser):

```sh
npx playwright install chromium
npm run test:e2e
```

Preview serves the production build at http://localhost:4173 by default.

## Screens and interaction

Hash routes work without server rewrite rules: `/#/home`, `/#/map`, `/#/incidents/R4-001`, `/#/calls`, `/#/responders`, `/#/activity`, and `/#/responder`.

- Home: compact queue (up to three reports), search, pending actions, selected summary, and a link to the full Map page.
- Map: category/tag filters, incident list synchronized with markers and side panel, fit visible incidents, collapsible context layers, and a legend.
- Incident details: review evidence, correct facts with a required reason, review call links, select an unassigned unit, and explicitly approve its assignment.
- Calls: full synthetic transcripts, incident filter, search, and incident links.
- Responders: assignments, approval identities, acknowledgement state, and unit-specific responder view.
- Activity: corrections, call-link reviews, approvals, and acknowledgement history.
- Responder view: select a unit, read the latest location and hazards, and acknowledge receipt. Receipt does not mean en route.

All simulation changes share in-memory state across screens. Reload resets to the sample snapshot. Search is global and applies to the current screen's records; clear it using the search field's clear button. Incident filters and call filters are independent. No backend is called. The shared interactive map reads incident coordinates supplied by the simulation adapter; see the map behavior below.

## Interactive maps

Home, Incident Details, and Responder View share `src/components/IncidentMap.tsx`. Use +/−, wheel zoom, dragging, touch pinch, arrow-key panning, Recenter, or the expanded map dialog. Escape closes expansion and returns focus to its button. Selecting an incident recenters the map; browsing does not alter its facts. The expanded dispatcher map also has an incident selector. The responder map stays on the assigned incident. The dedicated Map page reuses the same component, with category icons, fit-to-visible, a synchronized list and panel, and context overlays. Category chips match primary category or secondary tags. Fit excludes unknown incident positions and context geometry.

R4-001 and the new collision, medical, and weather scenarios use explicitly labeled simulated positions, not verified real places. Reports without supplied coordinates show “Exact location unknown” with a Louisiana regional view and no pin for that incident. Only incidents with valid provided coordinates get markers; any other markers in a regional view retain their own incident ID and provenance. Popups show ID, location, status, and coordinate provenance. Location/detail text corrections clear stale coordinates pending review; other corrections preserve coordinates. There is no geocoding, GPS request, tracking, polling, or simulated movement.

The base map uses `https://tile.openstreetmap.org/{z}/{x}/{y}.png` with visible © OpenStreetMap contributors attribution and a report-issue link. Provider settings are isolated in `src/mapConfig.ts`. The browser sends its normal User-Agent and Referer and honors standard HTTP caching. The map requests viewport tiles only (`keepBuffer: 0`, idle updates); there is no tile prefetch, bulk/offline download, proxy, or cache bypass. If hosting later, preserve browser Referer and caching behavior. For more traffic, choose a provider with appropriate capacity and terms. See the [OpenStreetMap tile usage policy](https://operations.osmfoundation.org/policies/tiles/).

If tiles fail or take too long, location details remain visible with a connection message and an explicit retry button. This demo does not offer offline mapping. Automated browser tests intercept tile requests with local synthetic fixtures and never run gesture tests against OSM's community tile servers.

## GIS demo and integration limits

R4-004 is a synthetic collision with reported fuel leakage and smoke. It is tagged Accident + Fire hazard and appears in both filters. Open it from Map, approve Engine 07 for fire and EMS 09 for medical response separately, then acknowledge each unit through Responder View. Approval and receipt stay independent and update Map, Home, Details, Responders, and Activity. A unit cannot be assigned twice, but an incident can have multiple units. No unassigned unit is presented as an available resource.

Layers include reported blockages, assigned response units, fire hazards, fire units, assigned EMS, fictional hospital locations, synthetic weather alerts/flood-risk polygons, and reported demo closures. Unit/hazard overlays derive from shared records. Other context arrives through the API adapter. Layer toggles are independent of incident filters. Every added overlay has source/timestamp metadata and synthetic labeling. The live alert connection is explicitly unavailable; no official feed is fabricated. Unknown-position records stay readable in Layers without map geometry. Empty/unavailable layers do not disable the base map.

Only OpenStreetMap tiles are externally connected. Backend incident data, authenticated multi-unit approvals, authoritative unit positions, hospital data, weather alerts, flood models, closure sources, durable audit and synchronization still require the teammate's backend integration. There is no live GPS, resource-availability inference, severity scoring, or route/safety guidance. See the proposed API handoff for the new fields and cardinality.

## Structure

`src/types.ts`: shared domain types. `src/mockData.ts`: synthetic scenarios. `src/api.ts`: replaceable data adapter. `src/state.ts`: simulation commands. `src/coordinates.ts`: coordinate validation. `src/components/IncidentMap.tsx`: shared map. `src/components/GisMapPage.tsx`: full GIS workspace. `src/components/ContextOverlays.tsx`: context geometry. `src/gis.ts`: taxonomy, assignment summaries, and derived layers. `src/mapConfig.ts`: tile provider and regional defaults. `src/App.tsx`: reusable panels, forms, navigation, and screens. `src/styles.css`: responsive styles. See [API-CONTRACT.md](API-CONTRACT.md) for the proposed backend handoff.

The browser may request optional Google Fonts; system sans-serif is the fallback. No secrets are required.
