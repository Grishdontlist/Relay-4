# Relay4

Relay4 is an AI-powered emergency intake and coordination assistant for Louisiana communities.

## Repository layout

```text
Relay-4/
├── backend/       # API, incident records, permissions, assignments, and integrations
├── frontend/      # Caller, dispatcher, and responder interfaces
├── docs/          # Shared architecture and API notes
└── README.md
```

## Services

- **Backend:** Owns incidents, callers, locations, corrections, assignments, permissions, and integrations with ElevenLabs and DeepSpace.
- **Frontend:** Contains the caller intake, dispatcher dashboard, and responder acknowledgement screens.

## Local development

Each service has its own README and environment template. Run the backend and frontend as separate services from their respective directories.

This project uses synthetic calls, fictional landmarks, simulated responders, and human-approved dispatch for the hackathon demo.
