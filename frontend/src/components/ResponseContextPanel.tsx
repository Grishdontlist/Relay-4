import type { ContextLayer, Snapshot } from "../types";
import {
  relevantIncidents,
  responsePresets,
  isLayerReady,
  type ResponsePreset,
} from "../responsePresets";
import { normalizeCoordinates } from "../coordinates";
export default function ResponseContextPanel({
  preset,
  data,
  layers,
  enabled,
}: {
  preset: ResponsePreset;
  data: Snapshot;
  layers: ContextLayer[];
  enabled: string[];
}) {
  const config = responsePresets[preset];
  const reports = relevantIncidents(preset, data.incidents);
  const requested = layers.filter((layer) => enabled.includes(layer.id));
  return (
    <section
      className="response-context"
      aria-label={`${config.label} response context`}
    >
      <div>
        <p className="eyebrow">
          RESPONSE CONTEXT · {config.label.toUpperCase()}
        </p>
        <h2>{config.label} response context</h2>
        <p>{config.description}</p>
      </div>
      <dl>
        <div>
          <dt>Relevant reports</dt>
          <dd>
            {reports.length} ·{" "}
            {reports.filter((i) => normalizeCoordinates(i.coordinates)).length}{" "}
            with supplied positions
          </dd>
        </div>
        <div>
          <dt>Requested context</dt>
          <dd>
            {requested.filter(isLayerReady).length} ready / {requested.length}{" "}
            enabled
          </dd>
        </div>
      </dl>
      <p className="response-focus">{config.focus}</p>
      {preset !== "overview" && (
        <ul>
          {reports.length ? (
            reports.map((incident) => (
              <li key={incident.id}>
                <strong>
                  {incident.id} · {incident.title}
                </strong>
                <span>
                  Reported hazards: {incident.hazards}. People:{" "}
                  {incident.people}. Injuries: {incident.injuries}.
                </span>
              </li>
            ))
          ) : (
            <li>
              No relevant reports supplied. Category filtering remains
              independent.
            </li>
          )}
        </ul>
      )}
      <small>
        Preset focus never filters incidents, confirms access, verifies hazards
        or changes assignment authority.
      </small>
    </section>
  );
}
