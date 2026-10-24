import type { Snapshot, Correction } from "./types";
function event(
  state: Snapshot,
  incidentId: string,
  title: string,
  detail: string,
): Snapshot["activity"] {
  return [
    {
      id: crypto.randomUUID(),
      time: new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }),
      title,
      detail,
      incidentId,
    },
    ...state.activity,
  ];
}
export function correctIncident(
  state: Snapshot,
  id: string,
  correction: Correction,
): Snapshot {
  const incident = state.incidents.find((i) => i.id === id);
  if (!incident || !correction.value.trim() || !correction.reason.trim())
    throw new Error("A value and evidence or reason are required.");
  const detail = `Demo dispatcher changed ${correction.field} from “${incident[correction.field]}” to “${correction.value.trim()}”. Reason: ${correction.reason.trim()}`;
  return {
    ...state,
    incidents: state.incidents.map((i) =>
      i.id === id
        ? {
            ...i,
            [correction.field]: correction.value.trim(),
            status:
              i.status === "Assigned"
                ? "Assigned"
                : correction.field === "location" ||
                    correction.field === "detail"
                  ? "Location updated"
                  : "Needs review",
          }
        : i,
    ),
    activity: event(state, id, "Correction saved", detail),
  };
}
export function approveAssignment(
  state: Snapshot,
  incidentId: string,
  unitId: string,
): Snapshot {
  if (
    !state.incidents.some((i) => i.id === incidentId) ||
    !state.units.some((u) => u.id === unitId)
  )
    throw new Error("Select an incident and unit.");
  if (
    state.assignments.some(
      (a) => a.unitId === unitId || a.incidentId === incidentId,
    )
  )
    throw new Error("This unit or incident already has an assignment.");
  return {
    ...state,
    incidents: state.incidents.map((i) =>
      i.id === incidentId ? { ...i, status: "Assigned" } : i,
    ),
    assignments: [
      ...state.assignments,
      {
        id: crypto.randomUUID(),
        incidentId,
        unitId,
        approvedBy: "Demo dispatcher",
        acknowledged: false,
      },
    ],
    activity: event(
      state,
      incidentId,
      "Assignment approved",
      `Demo dispatcher assigned ${state.units.find((u) => u.id === unitId)!.name}. Awaiting acknowledgement.`,
    ),
  };
}
export function acknowledgeAssignment(state: Snapshot, id: string): Snapshot {
  const assignment = state.assignments.find((a) => a.id === id);
  if (!assignment || assignment.acknowledged) return state;
  return {
    ...state,
    assignments: state.assignments.map((a) =>
      a.id === id ? { ...a, acknowledged: true } : a,
    ),
    activity: event(
      state,
      assignment.incidentId,
      "Assignment acknowledged",
      `${state.units.find((u) => u.id === assignment.unitId)!.name} acknowledged receipt. Travel status: Unknown.`,
    ),
  };
}
export function reviewCall(
  state: Snapshot,
  callId: string,
  incidentId: string,
  link: boolean,
): Snapshot {
  const call = state.calls.find((c) => c.id === callId);
  if (!call || !state.incidents.some((i) => i.id === incidentId))
    throw new Error("Call or incident not found.");
  const previousId = call.incidentId;
  const nextId = link ? incidentId : null;
  return {
    ...state,
    calls: state.calls.map((c) =>
      c.id === callId ? { ...c, incidentId: nextId } : c,
    ),
    incidents: state.incidents.map((i) => ({
      ...i,
      callIds: [
        ...i.callIds.filter((id) => id !== callId),
        ...(i.id === nextId ? [callId] : []),
      ],
    })),
    activity: event(
      state,
      incidentId,
      link ? "Call link reviewed" : "Call unlinked",
      `Demo dispatcher ${link ? "linked" : "unlinked"} ${callId}.${previousId && previousId !== incidentId ? ` Previous incident: ${previousId}.` : ""}`,
    ),
  };
}
