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

Hash routes work without server rewrite rules: `/#/home`, `/#/incidents/R4-001`, `/#/calls`, `/#/responders`, `/#/activity`, and `/#/responder`.

- Home: select an incident, search the queue, filter review items, and open details. Pending actions link to responder coordination.
- Incident details: review evidence, correct facts with a required reason, review call links, select an unassigned unit, and explicitly approve its assignment.
- Calls: full synthetic transcripts, incident filter, search, and incident links.
- Responders: assignments, approval identities, acknowledgement state, and unit-specific responder view.
- Activity: corrections, call-link reviews, approvals, and acknowledgement history.
- Responder view: select a unit, read the latest location and hazards, and acknowledge receipt. Receipt does not mean en route.

All simulation changes share in-memory state across screens. Reload resets to the sample snapshot. Search is global and applies to the current screen's records; clear it using the search field's clear button. Incident filters and call filters are independent. No backend is called. Maps are decorative illustrations without coordinates or geographic accuracy.

## Structure

`src/types.ts`: shared domain types. `src/mockData.ts`: synthetic scenarios. `src/api.ts`: replaceable data adapter. `src/state.ts`: simulation commands. `src/App.tsx`: reusable panels, forms, navigation, and screens. `src/styles.css`: responsive styles. See [API-CONTRACT.md](API-CONTRACT.md) for the proposed backend handoff.

The browser may request optional Google Fonts; system sans-serif is the fallback. No secrets are required.
