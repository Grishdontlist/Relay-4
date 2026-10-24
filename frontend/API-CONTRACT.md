# Backend handoff — proposed data shapes

These are frontend domain shapes, **not agreed endpoint contracts**. No backend paths, authentication schemes, ElevenLabs calls, or DeepSpace calls are assumed or implemented. No keys belong in this frontend. The teammate should agree transport, identifiers, authorization, validation, errors, concurrency, and lifecycle semantics before connecting a live service.

`src/types.ts` is the source for the current TypeScript shapes. `src/mockData.ts` contains synthetic Louisiana scenarios. `src/api.ts` supplies a fresh in-memory snapshot. `src/state.ts` contains simulation commands; components render that state. Reloading resets the simulation. No live request is sent by the demo.

## Read model

```ts
type Incident = {
  id: string;
  title: string;
  location: string;
  detail: string;
  hazards: string;
  people: string;
  injuries: string;
  status: 'Needs review' | 'Location updated' | 'Assigned';
  callIds: string[];
};
type Call = {
  id: string;
  incidentId: string | null;
  language: string;
  time: string; // display-only demo time; live service should provide ISO timestamps
  transcript: { speaker: string; text: string }[];
};
type Unit = { id: string; name: string; capability: string };
type Assignment = {
  id: string;
  incidentId: string;
  unitId: string;
  approvedBy: string;
  acknowledged: boolean;
};
type Activity = {
  id: string;
  time: string; // display-only demo time
  title: string;
  detail: string;
  incidentId: string;
};
type Snapshot = {
  incidents: Incident[];
  calls: Call[];
  units: Unit[];
  assignments: Assignment[];
  activity: Activity[];
};
```

Missing facts render as `Unknown`. A future service can use nullable structured fields, with the adapter normalizing their display. This demo contains no severity, confidence, or coordinates. The generated map pattern has no geographic accuracy and must never be used for navigation.

## Proposed command inputs

| Action | Input | Required behavior |
| --- | --- | --- |
| Correct incident | `incidentId`, `field` (`location`, `detail`, `hazards`, `people`, `injuries`), `value`, `reason` | Require nonempty value and reason; return updated incident and audit entry with previous value. |
| Review call link | `callId`, `incidentId`, `link: boolean` | Explicit human review; update both call relationship and incident call lists atomically; preserve audit history. Linking elsewhere moves the single incident relationship. |
| Approve assignment | `incidentId`, `unitId`, explicit human confirmation | Reject already assigned incident or occupied unit in this demo; create approval and pending acknowledgement. |
| Acknowledge receipt | `assignmentId` | Idempotent receipt acknowledgement; create at most one audit entry. Must not change travel status to en route. |

When integrating, replace the snapshot adapter and command implementations with service calls; update shared state only from successful responses. Live commands require server-verified identity, authorization, durable audit records, and concurrency handling. The demo checkbox and “Demo dispatcher” label are simulation UI, not authentication. Agree a structured error shape and expose validation/conflict failures without losing corrections. A live service should distinguish receipt, travel, and arrival; this demo shows travel as Unknown.

No network streaming, voice synthesis, emergency-service messaging, external maps, or backend integration is included. Call timestamps and scenario place names are illustrative. Integration choices belong to the backend teammate.
