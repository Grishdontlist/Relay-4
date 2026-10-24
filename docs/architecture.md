# Relay4 Initial Architecture

## Core flow

```text
Caller voice intake
        ↓
Backend creates incident and records source words
        ↓
Dispatcher reviews live incident card
        ↓
Corrections update the shared incident record
        ↓
Dispatcher approves assignment
        ↓
Responder receives and acknowledges assignment
```

## Initial domain records

- `Call`: a single caller interaction and its transcript/source evidence.
- `Incident`: the normalized, shared emergency picture.
- `Location`: parish, landmark, service area, and confidence details.
- `Correction`: who changed a fact, what changed, and when.
- `Assignment`: dispatcher-approved responder work and acknowledgement status.
- `User`: caller, dispatcher, responder, or administrator permissions.

Unknown facts should remain explicitly unknown rather than being guessed. Related-call suggestions must remain suggestions until a dispatcher confirms them.

## Build order

1. Voice intake.
2. Live incident card.
3. Corrections and audit history.
4. Human approval and assignment.
5. Responder acknowledgement.
6. Related-call detection.
