import { useState } from "react";
import { CallSidebar } from "./components/CallSidebar";
import { IncidentMap } from "./components/IncidentMap";
import { useAssignments, useGeocodes, useIncidentDetail, useIncidents, useNow } from "./hooks";
import { buildCalls } from "./intake";
import { planDispatch } from "./responders";

export default function App() {
  const { incidents, connection } = useIncidents();
  const points = useGeocodes(incidents);
  const now = useNow();
  const { assignments, send, cancel } = useAssignments();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [picks, setPicks] = useState<Record<string, string>>({});
  // Bumped on every selection so the map re-centres even when the same call is clicked again.
  const [focus, setFocus] = useState(0);
  const select = (id: string | null) => {
    setSelectedId(id);
    if (id) setFocus((count) => count + 1);
  };

  const calls = buildCalls(incidents, points, now);
  const selected = calls.find((call) => call.incident.id === selectedId);
  const detail = useIncidentDetail(selectedId, selected?.incident.updated_at);
  const busy = new Set(Object.entries(assignments).filter(([id]) => id !== selectedId).map(([, assignment]) => assignment.unitId));
  const plan = selected ? planDispatch(selected, busy, picks[selected.incident.id]) : null;

  const dispatch = selected &&
    plan && {
      plan,
      assignment: assignments[selected.incident.id],
      onPick: (unitId: string) => setPicks((prev) => ({ ...prev, [selected.incident.id]: unitId })),
      onSend: send.bind(null, selected.incident.id),
      onCancel: () => cancel(selected.incident.id),
    };

  return (
    <div className="layout">
      <CallSidebar
        calls={calls}
        connection={connection}
        now={now}
        selectedId={selectedId}
        detail={detail}
        assignments={assignments}
        dispatch={dispatch || null}
        onSelect={select}
      />
      <IncidentMap calls={calls} selected={selected} focus={focus} plan={plan} assignments={assignments} onSelect={select} />
    </div>
  );
}
