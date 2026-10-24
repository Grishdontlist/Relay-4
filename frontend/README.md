# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## GIS demo and integration limits

R4-004 is a synthetic collision with reported fuel leakage and smoke. It is tagged Accident + Fire hazard and appears in both filters. Open it from Map, approve Engine 07 for fire and EMS 09 for medical response separately, then acknowledge each unit through Responder View. Approval and receipt stay independent and update Map, Home, Details, Responders, and Activity. A unit cannot be assigned twice, but an incident can have multiple units. No unassigned unit is presented as an available resource.

Layers include reported blockages, assigned response units, fire hazards, fire units, assigned EMS, fictional hospital locations, synthetic weather alerts/flood-risk polygons, and reported demo closures. Unit/hazard overlays derive from shared records. Other context arrives through the API adapter. Layer toggles are independent of incident filters. Every added overlay has source/timestamp metadata and synthetic labeling. The live alert connection is explicitly unavailable; no official feed is fabricated. Unknown-position records stay readable in Layers without map geometry. Empty/unavailable layers do not disable the base map.

Only OpenStreetMap tiles are externally connected. Backend incident data, authenticated multi-unit approvals, authoritative unit positions, hospital data, weather alerts, flood models, closure sources, durable audit and synchronization still require the teammate's backend integration. There is no live GPS, resource-availability inference, severity scoring, or route/safety guidance. See the proposed API handoff for the new fields and cardinality.

## Structure

The scaffold's separation of reusable UI, screens, service clients, types, and assets is retained. Current implementation files are shown below; the `screens/`, `services/`, `types/`, and `tests/` directories contain incoming placeholders for future organization, not a second data model or active API client.

```text
frontend/
├── src/
│   ├── App.tsx          # Navigation, dispatcher/responder screens, shared state
│   ├── components/      # Reusable UI, GIS workspace, map and overlays
│   ├── screens/         # Reserved screen modules, including future caller UI
│   ├── services/        # Reserved backend API and realtime clients
│   ├── types/           # Reserved type modules; current contract is types.ts
│   ├── types.ts         # Shared frontend domain types
│   ├── api.ts           # Current simulation adapter; future service boundary
│   ├── mockData.ts      # Synthetic scenario data
│   └── assets/          # Local SVG assets and source/license documentation
├── public/              # Static files served as-is
├── e2e/                 # Active browser workflow and map tests
├── tests/               # Incoming test scaffold; current unit tests are in src/
├── .env.example         # Prospective service settings, no secrets
├── API-CONTRACT.md      # Backend teammate handoff
└── README.md
```

`src/types.ts`: shared domain types. `src/mockData.ts`: synthetic scenarios. `src/api.ts`: replaceable data adapter. `src/state.ts`: simulation commands. `src/coordinates.ts`: coordinate validation. `src/components/IncidentMap.tsx`: shared map. `src/components/GisMapPage.tsx`: full GIS workspace. `src/components/ContextOverlays.tsx`: context geometry. `src/gis.ts`: taxonomy, assignment summaries, and derived layers. `src/mapConfig.ts`: tile provider and regional defaults. `src/App.tsx`: reusable panels, forms, navigation, and screens. `src/styles.css`: responsive styles. See [API-CONTRACT.md](API-CONTRACT.md) for the proposed backend handoff.

The browser may request optional Google Fonts; system sans-serif is the fallback. No secrets are required.
