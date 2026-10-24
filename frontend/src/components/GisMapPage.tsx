import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Layers, MapPin } from "lucide-react";
import type { Snapshot } from "../types";
import {
  assignmentStatus,
  buildMapLayers,
  categories,
  categoryLabel,
  disciplineLabel,
  displayTimestamp,
  featureHasGeometry,
  matchesCategory,
} from "../gis";
import { normalizeCoordinates } from "../coordinates";
import { incidentSymbols } from "../mapIcons";
import IncidentMap from "./IncidentMap";
import IncidentTags from "./IncidentTags";
import "./GisMapPage.css";
export default function GisMapPage({
  data,
  selectedId,
  onSelect,
  onOpen,
  query,
}: {
  data: Snapshot;
  selectedId: string;
  onSelect: (id: string) => void;
  onOpen: (id: string) => void;
  query: string;
}) {
  const [filter, setFilter] = useState("all");
  const [enabled, setEnabled] = useState<string[]>([]);
  const layers = useMemo(() => buildMapLayers(data), [data]);
  const visible = data.incidents.filter(
    (i) =>
      matchesCategory(i, filter) &&
      `${i.id} ${i.title} ${i.location} ${i.hazards} ${i.category} ${i.tags.join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const selected = visible.find((i) => i.id === selectedId) ?? visible[0];
  const visibleKey = visible.map((i) => i.id).join(",");
  useEffect(() => {
    if (selected && selected.id !== selectedId) onSelect(selected.id);
  }, [selected?.id, selectedId, visibleKey, onSelect]);
  const mapped = visible.filter((i) => normalizeCoordinates(i.coordinates));
  return (
    <div className="gis-page">
      <div className="gis-intro">
        <p>
          Incident reports and coordination context. All additional overlays are
          synthetic training data.
        </p>
        <span>No live tracking · no route guidance</span>
      </div>
      <div
        className="gis-filters"
        role="group"
        aria-label="Filter map incidents"
      >
        {categories.map((category) => (
          <button
            type="button"
            key={category.id}
            aria-label={category.label}
            className={filter === category.id ? "active" : ""}
            aria-pressed={filter === category.id}
            onClick={() => setFilter(category.id)}
          >
            <span aria-hidden="true">{category.symbol}</span>
            {category.label}
            <small>
              {
                data.incidents.filter((i) => matchesCategory(i, category.id))
                  .length
              }
            </small>
          </button>
        ))}
      </div>
      <p className="gis-filter-note">
        Filters include secondary tags: a collision with a reported fire hazard
        appears in Accidents and Fire.
      </p>
      <div className="gis-layout">
        <div className="gis-map-column">
          <div className="gis-map-count" aria-live="polite">
            <strong>{visible.length} incidents</strong>
            <span>
              {mapped.length} mapped · {visible.length - mapped.length} exact
              locations unknown
            </span>
          </div>
          {!visible.length && (
            <div className="gis-empty">
              No incidents match this filter or search. Try All or clear the
              search.
            </div>
          )}
          <IncidentMap
            incidents={data.incidents}
            selectedIncidentId={selected?.id ?? selectedId}
            visibleIncidentIds={visible.map((i) => i.id)}
            onSelectIncident={onSelect}
            contextLayers={layers.filter(
              (layer) =>
                enabled.includes(layer.id) && layer.state !== "unavailable",
            )}
            overview
          />
          <details className="gis-layers">
            <summary>
              <Layers size={17} aria-hidden="true" />
              Layers{" "}
              <span>
                {
                  enabled.filter((id) =>
                    layers.some(
                      (l) => l.id === id && l.state !== "unavailable",
                    ),
                  ).length
                }{" "}
                on
              </span>
            </summary>
            <div className="gis-layer-content">
              <p>
                Context is independent of incident filters. Dashed overlays are
                synthetic; unit points are static sample positions, not
                availability or tracking.
              </p>
              <div className="gis-layer-options">
                {layers.map((layer) => {
                  const located =
                    layer.features.filter(featureHasGeometry).length;
                  return (
                    <div className="gis-layer" key={layer.id}>
                      <label>
                        <input
                          type="checkbox"
                          aria-label={layer.name}
                          disabled={layer.state === "unavailable"}
                          checked={
                            enabled.includes(layer.id) &&
                            layer.state !== "unavailable"
                          }
                          onChange={(e) =>
                            setEnabled((ids) =>
                              e.target.checked
                                ? [...ids, layer.id]
                                : ids.filter((id) => id !== layer.id),
                            )
                          }
                        />
                        <span>
                          <strong>{layer.name}</strong>
                          <small>
                            {layer.state === "synthetic"
                              ? "Synthetic"
                              : layer.state === "unavailable"
                                ? "Unavailable"
                                : "Connected"}{" "}
                            · {located} mapped / {layer.features.length} records
                          </small>
                        </span>
                      </label>
                      <p>
                        {layer.source} · Updated{" "}
                        {displayTimestamp(layer.updatedAt)}
                      </p>
                      {layer.message && <p>{layer.message}</p>}
                      {enabled.includes(layer.id) && (
                        <ul className="gis-layer-records">
                          {layer.features.length ? (
                            layer.features.map((feature) => (
                              <li key={feature.id}>
                                <strong>{feature.name}</strong>
                                <span>{feature.description}</span>
                                <small>
                                  {featureHasGeometry(feature)
                                    ? "Position supplied · " +
                                      (feature.geometry.type === "point"
                                        ? feature.geometry.position?.source
                                        : feature.geometry.positions[0]?.source)
                                    : "Exact location unknown · not mapped"}{" "}
                                  · {displayTimestamp(feature.updatedAt)}
                                </small>
                              </li>
                            ))
                          ) : (
                            <li>
                              No records supplied. The base map remains
                              available.
                            </li>
                          )}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </details>
          <details className="gis-legend" open>
            <summary>Legend</summary>
            <div>
              {categories
                .filter((c) => c.id !== "all")
                .map((c) => (
                  <span key={c.id}>
                    <i
                      className={`legend-symbol category-${c.id}`}
                      aria-hidden="true"
                    >
                      {c.symbol}
                    </i>
                    {c.label}
                  </span>
                ))}
              <span>
                <i className="legend-symbol" aria-hidden="true">
                  •
                </i>
                Other report
              </span>
              <span>
                <i className="legend-context" aria-hidden="true" />
                Synthetic context
              </span>
            </div>
            <p>
              Marker icon shows primary category. Secondary tags appear in the
              list and incident panel. Unknown positions have no incident
              marker. Dashed circles: context points; dashed outlines: zones;
              dashed lines: closures.
            </p>
          </details>
        </div>
        <aside
          className="gis-side"
          aria-label="Map incidents and selected incident"
        >
          {selected ? (
            <section
              className="gis-selected"
              aria-labelledby="gis-selected-title"
            >
              <p className="eyebrow">SELECTED INCIDENT · {selected.id}</p>
              <h2 id="gis-selected-title">{selected.title}</h2>
              <IncidentTags incident={selected} />
              <dl>
                <div>
                  <dt>Type</dt>
                  <dd>{categoryLabel(selected.category)}</dd>
                </div>
                <div>
                  <dt>Location</dt>
                  <dd>
                    {selected.location}
                    <small>{selected.detail}</small>
                  </dd>
                </div>
                <div>
                  <dt>Reported hazards</dt>
                  <dd>{selected.hazards}</dd>
                </div>
                <div>
                  <dt>People involved</dt>
                  <dd>{selected.people}</dd>
                </div>
                <div>
                  <dt>Assignment status</dt>
                  <dd>{assignmentStatus(data, selected.id)}</dd>
                </div>
              </dl>
              {selected.responseNeeds.map((need) => {
                const assignments = data.assignments.filter(
                  (a) =>
                    a.incidentId === selected.id &&
                    data.units.find((u) => u.id === a.unitId)?.discipline ===
                      need,
                );
                return (
                  <p className="gis-response-need" key={need}>
                    <strong>{disciplineLabel(need)}</strong>
                    {assignments.length
                      ? assignments
                          .map(
                            (a) =>
                              `${data.units.find((u) => u.id === a.unitId)?.name} · ${a.acknowledged ? "Acknowledged" : "Awaiting acknowledgement"}`,
                          )
                          .join("; ")
                      : "Human approval pending"}
                  </p>
                );
              })}
              <div className="gis-source">
                {selected.source}
                <br />
                Reported {displayTimestamp(selected.reportedAt)}
                <br />
                Updated {displayTimestamp(selected.updatedAt)}
              </div>
              <button
                className="button wide"
                onClick={() => onOpen(selected.id)}
              >
                Open incident
                <ArrowRight size={16} />
              </button>
            </section>
          ) : (
            <section className="gis-selected">
              <h2>No incident selected</h2>
              <p>Adjust the filters or search to select a report.</p>
            </section>
          )}
          <section className="gis-incident-list" aria-label="Incident list">
            <div className="gis-list-heading">
              <h2>Incident list</h2>
              <span>{visible.length} reports</span>
            </div>
            {visible.map((incident) => (
              <button
                key={incident.id}
                type="button"
                className={`gis-list-item ${selected?.id === incident.id ? "selected" : ""}`}
                aria-pressed={selected?.id === incident.id}
                onClick={() => onSelect(incident.id)}
              >
                <span
                  className={`legend-symbol category-${incident.category}`}
                  aria-hidden="true"
                >
                  {incidentSymbols[incident.category]}
                </span>
                <span>
                  <strong>{incident.title}</strong>
                  <small>
                    {incident.id} · {incident.location}
                  </small>
                  <IncidentTags incident={incident} />
                  <small>{assignmentStatus(data, incident.id)}</small>
                  {!normalizeCoordinates(incident.coordinates) && (
                    <small>
                      <MapPin size={11} /> Exact location unknown
                    </small>
                  )}
                </span>
              </button>
            ))}
          </section>
        </aside>
      </div>
    </div>
  );
}
