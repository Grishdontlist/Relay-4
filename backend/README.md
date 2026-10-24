# Relay4 Backend

Backend service for Relay4.

## Responsibilities

- Receive and normalize emergency intake data.
- Store live incident records and their correction history.
- Detect and suggest related calls for dispatcher confirmation.
- Manage dispatcher-approved assignments.
- Track responder acknowledgement status.
- Enforce roles and permissions.
- Integrate with ElevenLabs voice workflows and the DeepSpace shared-record service.

## Suggested structure

```text
backend/
├── app/
│   ├── api/          # HTTP routes and request/response schemas
│   ├── core/         # Configuration, security, and shared dependencies
│   ├── integrations/ # ElevenLabs and DeepSpace adapters
│   ├── models/       # Incident, call, assignment, user, and audit models
│   ├── services/     # Domain logic and coordination workflows
│   └── main.*        # Service entry point
├── tests/
├── .env.example
└── README.md
```

The `*.keep` files are placeholders so Git preserves the initial directories while implementation is being divided among the team.
