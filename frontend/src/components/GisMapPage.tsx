import {
  useEffect,
  useMemo,
  useState,
  useRef,
  type Dispatch,
  type SetStateAction,
} from "react";
import { ArrowRight, MapPin } from "lucide-react";
import type { Snapshot, ContextLayer } from "../types";
import {
  assignmentStatus,
  buildMapLayers,
  categories,
  categoryLabel,
  disciplineLabel,
  displayTimestamp,
  matchesCategory,
} from "../gis";
import { normalizeCoordinates } from "../coordinates";
import { incidentSymbols } from "../mapIcons";
import IncidentMap from "./IncidentMap";
import ResponseContextPanel from "./ResponseContextPanel";
import MapLayerControls from "./MapLayerControls";
import MapLegend from "./MapLegend";
import { MAP_STYLES } from "../mapConfig";
import { simulationApi } from "../api";
import {
  isLayerReady,
  presetExtent,
  responsePresets,
  type ResponsePreset,
  type MapStyle,
  type MapPreferences,
  type MapCamera,
  type ViewportRequest,
} from "../responsePresets";
import IncidentTags from "./IncidentTags";
import "./GisMapPage.css";
export default function GisMapPage({
  data,
  selectedId,
  onSelect,
  onOpen,
  query,
  preferences,
  onPreferencesChange,
  initialCamera,
  onCameraChange,
  onLayerUpdate,
}: {
  data: Snapshot;
  selectedId: string;
  onSelect: (id: string) => void;
  onOpen: (id: string) => void;
  query: string;
  preferences: MapPreferences;
  onPreferencesChange: Dispatch<SetStateAction<MapPreferences>>;
  initialCamera?: MapCamera;
  onCameraChange: (camera: MapCamera) => void;
  onLayerUpdate: (layer: ContextLayer) => void;
}) {
  const filter = preferences.filter;
  const preset = preferences.preset;
  const enabled = preferences.layersByPreset[preset];
  const [viewportRequest, setViewportRequest] = useState<ViewportRequest>();
  const sequence = useRef(0);
  const setFilter = (filter: string) =>
    onPreferencesChange((previous) => ({ ...previous, filter }));
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
  const activeLayers = layers.filter(
    (layer) => enabled.includes(layer.id) && isLayerReady(layer),
  );
  function focusPreset(next: ResponsePreset) {
    setViewportRequest({
      token: ++sequence.current,
      mode: "fit",
      points: presetExtent(
        next,
        data,
        layers,
        preferences.layersByPreset[next],
      ),
      maxZoom: responsePresets[next].maxZoom,
    });
  }
  function selectIncident(id: string) {
    onSelect(id);
    const point = normalizeCoordinates(
      data.incidents.find((i) => i.id === id)?.coordinates,
    );
    if (point)
      setViewportRequest({
        token: ++sequence.current,
        mode: "pan",
        points: [[point.latitude, point.longitude]],
        maxZoom: 19,
      });
  }
  async function retryLayer(layer: ContextLayer) {
    onLayerUpdate({
      ...layer,
      state: "loading",
      features: [],
      message: "Refreshing context source…",
    });
    try {
      onLayerUpdate(await simulationApi.reloadContextLayer(layer.id));
    } catch (error) {
      onLayerUpdate({
        ...layer,
        state: "error",
        features: [],
        message:
          error instanceof Error
            ? error.message
            : "Context source unavailable.",
      });
    }
  }

  return (
    <div className="gis-page">
      <div className="gis-intro">
        <p>
          Incident reports and coordination context. All additional overlays are
          synthetic training data.
        </p>
        <span>No live tracking · no route guidance</span>
      </div>
      <div className="map-preset-controls">
        <label>
          Map style
          <select
            aria-label="Map style"
            value={preferences.style}
            onChange={(e) => {
              const style = e.target.value as MapStyle;
              if (MAP_STYLES[style].available)
                onPreferencesChange((previous) => ({ ...previous, style }));
            }}
          >
            {Object.entries(MAP_STYLES).map(([id, style]) => (
              <option key={id} value={id} disabled={!style.available}>
                {style.label}
                {!style.available ? " — unavailable" : ""}
              </option>
            ))}
          </select>
        </label>
        <label>
          Response preset
          <select
            aria-label="Response preset"
            value={preset}
            onChange={(e) => {
              const next = e.target.value as ResponsePreset;
              onPreferencesChange((previous) => ({
                ...previous,
                preset: next,
              }));
              focusPreset(next);
            }}
          >
            {Object.entries(responsePresets).map(([id, preset]) => (
              <option key={id} value={id}>
                {preset.label}
              </option>
            ))}
          </select>
        </label>
        <p className="map-style-availability">
          Streets uses OpenStreetMap. Satellite and Terrain are unavailable: no
          licensed provider or credentials configured.
        </p>
      </div>
      <p className="map-independence-note">
        Incident category filter is independent of the response preset. Presets
        never hide mixed-category reports.
      </p>
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
            onSelectIncident={selectIncident}
            contextLayers={activeLayers}
            mapStyle={preferences.style}
            manualViewport
            viewportRequest={viewportRequest}
            initialCamera={initialCamera}
            onViewportChange={onCameraChange}
            onRecenter={() => focusPreset(preset)}
          />
          <MapLayerControls
            layers={layers}
            enabled={enabled}
            onToggle={(id, checked) =>
              onPreferencesChange((previous) => ({
                ...previous,
                layersByPreset: {
                  ...previous.layersByPreset,
                  [preset]: checked
                    ? [...new Set([...previous.layersByPreset[preset], id])]
                    : previous.layersByPreset[preset].filter(
                        (current) => current !== id,
                      ),
                },
              }))
            }
            onReset={() =>
              onPreferencesChange((previous) => ({
                ...previous,
                layersByPreset: {
                  ...previous.layersByPreset,
                  [preset]: [...responsePresets[preset].layers],
                },
              }))
            }
            onRetry={retryLayer}
          />
          <MapLegend incidents={visible} layers={activeLayers} />
        </div>
        <aside
          className="gis-side"
          aria-label="Map incidents and selected incident"
        >
          <ResponseContextPanel
            preset={preset}
            data={data}
            layers={layers}
            enabled={enabled}
          />
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
                onClick={() => selectIncident(incident.id)}
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
