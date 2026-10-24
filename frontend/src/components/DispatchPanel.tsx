import { clock } from "../format";
import type { Assignment } from "../hooks";
import type { Call } from "../intake";
import { buildReport, UNIT_TYPE_LABEL, UNITS, type DispatchPlan } from "../responders";
import type { Evidence } from "../types";

type Props = {
  call: Call;
  plan: DispatchPlan;
  evidence: Evidence[] | undefined;
  assignment: Assignment | undefined;
  onPick: (unitId: string) => void;
  onSend: (assignment: Assignment) => void;
  onCancel: () => void;
};

export function DispatchPanel({ call, plan, evidence, assignment, onPick, onSend, onCancel }: Props) {
  if (assignment) {
    const unit = UNITS.find((item) => item.id === assignment.unitId);
    return (
      <div className="dispatch sent">
        <p>
          <b>Report sent to {unit?.name ?? assignment.unitId}</b> at {clock(assignment.sentAt)}
        </p>
        <p className="muted">Awaiting responder acknowledgement · simulated, not delivered to a real unit</p>
        <details>
          <summary>View sent report</summary>
          <pre>{assignment.report}</pre>
        </details>
        <button className="btn ghost" onClick={onCancel}>Cancel assignment</button>
      </div>
    );
  }

  if (!call.point) {
    return <p className="empty">A unit can be suggested once the location is on the map.</p>;
  }

  const { need, options, chosen } = plan;
  const report = chosen ? buildReport(call, chosen.unit, evidence) : "";

  return (
    <div className="dispatch">
      <p className="dispatch-need">
        Needs <b>{UNIT_TYPE_LABEL[need.type]}</b> · {need.why}
      </p>
      {chosen ? (
        <p className="dispatch-unit">
          <b>{chosen.unit.name}</b> · {UNIT_TYPE_LABEL[chosen.unit.type]} · {chosen.unit.base}
          <span>
            {chosen.km.toFixed(1)} km · ≈{chosen.etaMin} min straight-line
          </span>
        </p>
      ) : (
        <p className="warn">No free {UNIT_TYPE_LABEL[need.type]} unit. Pick another unit below.</p>
      )}

      <label className="dispatch-pick">
        <span className="eyebrow">Change unit</span>
        <select value={chosen?.unit.id ?? ""} onChange={(event) => onPick(event.target.value)}>
          {!chosen && <option value="">Select a unit…</option>}
          {options.map(({ unit, km }) => (
            <option key={unit.id} value={unit.id}>
              {unit.name} · {UNIT_TYPE_LABEL[unit.type]} · {unit.base} · {km.toFixed(1)} km
            </option>
          ))}
        </select>
      </label>

      {chosen && (
        <>
          <details>
            <summary>Preview report</summary>
            <pre>{report}</pre>
          </details>
          <button
            className="btn primary"
            onClick={() => onSend({ unitId: chosen.unit.id, sentAt: new Date().toISOString(), report })}
          >
            Approve &amp; send to {chosen.unit.name}
          </button>
        </>
      )}
    </div>
  );
}
