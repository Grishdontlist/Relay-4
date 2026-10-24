# Relay4 React Frontend

React frontend service for Relay4. Vite is recommended for the initial client setup because it provides a small, fast development setup and works well with separate backend services.

## Planned screens

- Caller intake and location-confirmation screen.
- Dispatcher live incident dashboard.
- Assignment approval and correction-history views.
- Responder assignment and acknowledgement screen.

## Suggested structure

```text
frontend/
├── src/
│   ├── components/   # Reusable UI components
│   ├── screens/      # Caller, dispatcher, and responder screens
│   ├── services/     # Backend API and realtime clients
│   ├── types/        # Shared frontend data types
│   └── assets/
├── public/           # Static files served as-is
├── tests/
├── .env.example
└── README.md
```

The frontend should treat the backend as the source of truth for incident facts, assignment status, corrections, and permissions.
