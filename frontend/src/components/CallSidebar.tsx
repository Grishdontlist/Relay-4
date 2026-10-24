import { ago, clock, humanize, STATUS_LABEL } from "../format";
import type { Assignment, Connection } from "../hooks";
import { DispatchPanel } from "./DispatchPanel";
import { UNITS, type DispatchPlan } from "../responders";
import { PRIORITY_LABEL, type Call } from "../intake";
import type { IncidentDetail } from "../types";

type Props = {
  calls: Call[];
  connection: Connection;
  now: number;
  selectedId: string | null;
  detail: IncidentDetail | null;
  assignments: Record<string, Assignment>;
  dispatch: Dispatch | null;
  onSelect: (id: string | null) => void;
};

type Dispatch = {
  plan: DispatchPlan;
  assignment: Assignment | undefined;
  onPick: (unitId: string) => void;
  onSend: (assignment: Assignment) => void;
  onCancel: () => void;
};

export function CallSidebar({ calls, connection, now, selectedId, detail, assignments, dispatch, onSelect }: Props) {
  const live = calls.filter((call) => call.live);
  const past = calls.filter((call) => !call.live);
  const critical = calls.filter((call) => call.priority === 1).length;
  const awaiting = calls.filter((call) => call.priority === 1 && !assignments[call.incident.id]).length;

  const renderCard = (call: Call) => (
    <CallCard
      key={call.incident.id}
      call={call}
      now={now}
      selected={call.incident.id === selectedId}
      detail={call.incident.id === selectedId ? detail : null}
      sentTo={assignments[call.incident.id] && (UNITS.find((unit) => unit.id === assignments[call.incident.id].unitId)?.name ?? "unit")}
      dispatch={call.incident.id === selectedId ? dispatch : null}
      onSelect={onSelect}
    />
  );

  return (
    <aside className="sidebar">
      <header className="brand">
        <div>
          <h1>
            Relay<span>4</span>
          </h1>
          <p className="eyebrow">Louisiana emergency intake</p>
        </div>
        <div className="brand-chips">
          <span className={`chip conn-${connection}`}>
            <i /> {connection === "online" ? "Backend online" : connection === "offline" ? "Backend offline" : "Connecting"}
          </span>
          <span className="chip demo">Synthetic demo</span>
        </div>
      </header>

      <div className="stats">
        <div><b>{live.length}</b><span>Live</span></div>
        <div className={critical ? "hot" : ""}><b>{critical}</b><span>P1</span></div>
        <div className={awaiting ? "hot" : ""}><b>{awaiting}</b><span>P1 unsent</span></div>
        <div><b>{calls.length}</b><span>Total</span></div>
      </div>

      <div className="sidebar-scroll">
        <section>
          <h2 className="section-title">
            Ongoing calls <span>{live.length}</span>
          </h2>
          {live.length ? live.map(renderCard) : <p className="empty">No active calls.</p>}
        </section>

        <section>
          <h2 className="section-title">
            Call summaries <span>{past.length}</span>
          </h2>
          {past.length ? (
            past.map(renderCard)
          ) : (
            <p className="empty">
              {connection === "offline"
                ? "Cannot reach the Relay4 backend. Start it on port 8000."
                : "Summaries appear here when an ElevenLabs call finishes."}
            </p>
          )}
        </section>
      </div>
    </aside>
  );
}

type CardProps = {
  call: Call;
  now: number;
  selected: boolean;
  detail: IncidentDetail | null;
  sentTo: string | undefined;
  dispatch: Dispatch | null;
  onSelect: (id: string | null) => void;
};

function CallCard({ call, now, selected, detail, sentTo, dispatch, onSelect }: CardProps) {
  const { incident, point, parish, live, priority, reasons, facts, related } = call;
  const pin = !incident.location ? "No location" : point === undefined ? "Locating…" : point ? "Pinned" : "Not on map";

  return (
    <article className={`card p${priority}${selected ? " selected" : ""}`}>
      <button className="card-head" onClick={() => onSelect(selected ? null : incident.id)} aria-expanded={selected}>
        <div className="card-row">
          <span className="chips">
            <span className={`chip prio p${priority}`}>{PRIORITY_LABEL[priority]}</span>
            {live ? <span className="chip live"><i /> Live</span> : <span className="chip">{STATUS_LABEL[incident.status]}</span>}
          </span>
          <time title={incident.updated_at}>{live ? ago(incident.updated_at, now) : clock(incident.created_at)}</time>
        </div>
        <h3>{humanize(incident.incident_type, "Unclassified incident")}</h3>
        <p className="card-location">
          {incident.location ?? "Location unknown"}
          {incident.landmark && <span> · {incident.landmark}</span>}
        </p>
        <p className="card-meta">
          <span className={point ? "ok" : "warn"}>{parish ?? pin}</span>
          <span className={incident.location_confirmed ? "ok" : "warn"}>{incident.location_confirmed ? "Confirmed" : "Unconfirmed"}</span>
          <span className="facts-meter" title={`${facts.known} of ${facts.total} key facts known`}>
            <span style={{ width: `${(facts.known / facts.total) * 100}%` }} />
          </span>
          <span className="muted">{facts.known}/{facts.total} facts</span>
          {related.length > 0 && <span className="warn">⟷ {related.length} related?</span>}
          {sentTo ? <span className="ok">✓ Sent to {sentTo}</span> : priority === 1 && <span className="hot-text">Report not sent</span>}
        </p>
      </button>

      {selected && (
        <div className="card-body">
          <button className="btn locate" onClick={() => onSelect(incident.id)} disabled={!point}>
            {point ? "◎ Show exact location on map" : point === undefined && incident.location ? "Locating…" : "Location not on map"}
          </button>
          <h4 className="eyebrow">Suggested priority · dispatcher decides</h4>
          <ul className="reasons">
            {reasons.map((reason) => <li key={reason}>{reason}</li>)}
          </ul>

          <h4 className="eyebrow">Responder · suggested, dispatcher approves</h4>
          {dispatch && (
            <DispatchPanel
              call={call}
              plan={dispatch.plan}
              evidence={detail?.evidence}
              assignment={dispatch.assignment}
              onPick={dispatch.onPick}
              onSend={dispatch.onSend}
              onCancel={dispatch.onCancel}
            />
          )}

          {facts.asks.length > 0 && (
            <>
              <h4 className="eyebrow">Still to ask</h4>
              <ul className="asks">
                {facts.asks.map((ask) => <li key={ask}>{ask}</li>)}
              </ul>
            </>
          )}

          <h4 className="eyebrow">Agent summary</h4>
          <p className="summary">{incident.description ?? "No summary from the agent yet."}</p>

          <dl className="facts">
            <dt>Hazard</dt>
            <dd>{humanize(incident.hazard)}</dd>
            <dt>People</dt>
            <dd>{incident.people_count ?? "Unknown"}</dd>
            <dt>Injuries</dt>
            <dd>{incident.injuries ?? "Unknown"}</dd>
            <dt>Parish</dt>
            <dd>{parish ?? "Unknown"}</dd>
            <dt>Coords</dt>
            <dd className="mono">{point ? `${point[0].toFixed(5)}, ${point[1].toFixed(5)}` : "Unknown"}</dd>
          </dl>

          <h4 className="eyebrow">Caller statements</h4>
          {!detail ? (
            <p className="empty">Loading…</p>
          ) : detail.evidence.length === 0 ? (
            <p className="empty">None recorded.</p>
          ) : (
            <ul className="quotes">
              {detail.evidence.map((item) => (
                <li key={item.id}>
                  <q>{item.source_quote}</q>
                  <span className={`verify ${item.verification_status}`}>
                    {item.verification_status === "verified" ? "Verified" : "Unverified"} · {clock(item.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {related.length > 0 && (
            <>
              <h4 className="eyebrow">Possibly the same incident · confirm before linking</h4>
              <ul className="related">
                {related.map((item) => (
                  <li key={item.id}>
                    <button onClick={() => onSelect(item.id)}>
                      <b>{humanize(item.label)}</b> <span>{item.detail}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          {incident.conversation_id && <p className="mono-id">conversation {incident.conversation_id}</p>}
        </div>
      )}
    </article>
  );
}
