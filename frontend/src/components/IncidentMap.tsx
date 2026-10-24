import { useEffect, useId, useRef, useState } from "react";
import { Crosshair, Expand, MapPin, Minus, Plus, X } from "lucide-react";
import {
  latLngBounds,
  type Map as LeafletMap,
  type Marker as LeafletMarker,
} from "leaflet";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { normalizeCoordinates } from "../coordinates";
import {
  LOUISIANA_BOUNDS,
  LOUISIANA_CENTER,
  TILE_PROVIDER,
} from "../mapConfig";
import type { Incident, ContextLayer } from "../types";
import { categoryLabel, tagLabels } from "../gis";
import { incidentMarkerIcon } from "../mapIcons";
import ContextOverlays from "./ContextOverlays";
import "leaflet/dist/leaflet.css";
import "./IncidentMap.css";

type Props = {
  incidents: Incident[];
  selectedIncidentId: string;
  onSelectIncident?: (id: string) => void;
  visibleIncidentIds?: string[];
  contextLayers?: ContextLayer[];
  overview?: boolean;
};
function positionLabel(incident: Incident) {
  const coordinates = normalizeCoordinates(incident.coordinates);
  if (!coordinates) return "Exact location unknown";
  return coordinates.source === "simulated"
    ? "Simulated coordinates · not a verified real location"
    : "Reported coordinates · not live GPS";
}

export default function IncidentMap({
  incidents,
  selectedIncidentId,
  onSelectIncident,
  visibleIncidentIds,
  contextLayers,
  overview,
}: Props) {
  const selected = incidents.find((i) => i.id === selectedIncidentId);
  const [expanded, setExpanded] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const expandButton = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  useEffect(() => {
    if (!expanded) return;
    dialog.current?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [expanded]);
  if (!selected) return null;
  function closeExpanded() {
    dialog.current?.close();
    setExpanded(false);
    requestAnimationFrame(() => expandButton.current?.focus());
  }
  const contents = (large: boolean) => (
    <MapContents
      incidents={incidents}
      selected={selected}
      onSelectIncident={onSelectIncident}
      expanded={large}
      visibleIncidentIds={visibleIncidentIds}
      contextLayers={contextLayers}
      overview={overview}
    />
  );
  return (
    <section
      className="incident-map"
      aria-label={`Incident map for ${selected.id}`}
    >
      <div className="incident-map-heading">
        <span>
          <MapPin size={14} aria-hidden="true" />
          Incident location
        </span>
        <button
          type="button"
          ref={expandButton}
          className="map-expand"
          onClick={() => setExpanded(true)}
          aria-label="Expand incident map"
        >
          <Expand size={14} aria-hidden="true" />
          Expand
        </button>
      </div>
      {!expanded ? (
        contents(false)
      ) : (
        <div className="map-placeholder">Map open in expanded view</div>
      )}
      {expanded && (
        <dialog
          ref={dialog}
          className="map-dialog"
          aria-labelledby={titleId}
          onCancel={(event) => {
            event.preventDefault();
            closeExpanded();
          }}
          onClose={() => setExpanded(false)}
        >
          <div className="map-dialog-heading">
            <div>
              <p className="eyebrow">INCIDENT LOCATION</p>
              <h2 id={titleId}>Map · {selected.id}</h2>
            </div>
            <button
              type="button"
              className="map-action"
              onClick={closeExpanded}
              aria-label="Close expanded map"
              autoFocus
            >
              <X size={18} aria-hidden="true" />
              Close
            </button>
          </div>
          {onSelectIncident && (
            <label className="map-incident-select">
              Incident
              <select
                aria-label="Map incident"
                value={selected.id}
                onChange={(e) => onSelectIncident(e.target.value)}
              >
                {incidents
                  .filter(
                    (i) =>
                      !visibleIncidentIds || visibleIncidentIds.includes(i.id),
                  )
                  .map((i) => (
                    <option value={i.id} key={i.id}>
                      {i.id} · {i.title}
                    </option>
                  ))}
              </select>
            </label>
          )}
          {contents(true)}
        </dialog>
      )}
    </section>
  );
}

function MapContents({
  incidents,
  selected,
  onSelectIncident,
  expanded,
  visibleIncidentIds,
  contextLayers = [],
  overview = false,
}: {
  incidents: Incident[];
  selected: Incident;
  onSelectIncident?: Props["onSelectIncident"];
  expanded: boolean;
  visibleIncidentIds?: string[];
  contextLayers?: ContextLayer[];
  overview?: boolean;
}) {
  const coordinates = normalizeCoordinates(selected.coordinates);
  const displayedIncidents = incidents.filter(
    (i) => !visibleIncidentIds || visibleIncidentIds.includes(i.id),
  );
  const located = displayedIncidents.flatMap((i) => {
    const p = normalizeCoordinates(i.coordinates);
    return p ? [[p.latitude, p.longitude] as [number, number]] : [];
  });
  const scope = overview ? JSON.stringify(located) : "";
  const [map, setMap] = useState<LeafletMap | null>(null);
  const [recenter, setRecenter] = useState(0);
  const [tileState, setTileState] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [retry, setRetry] = useState(0);
  const tileError = useRef(false);
  const helpId = useId();
  const [view, setView] = useState({
    zoom: 6,
    latitude: LOUISIANA_CENTER[0],
    longitude: LOUISIANA_CENTER[1],
  });
  useEffect(() => {
    if (tileState !== "loading") return;
    const timeout = window.setTimeout(() => setTileState("error"), 12000);
    return () => window.clearTimeout(timeout);
  }, [tileState]);
  return (
    <div
      className={`map-contents ${expanded ? "is-expanded" : ""}`}
      data-map-zoom={view.zoom}
      data-map-latitude={view.latitude}
      data-map-longitude={view.longitude}
    >
      <div
        className={`map-location-note ${coordinates?.source === "simulated" ? "simulated" : ""}`}
      >
        <strong>{positionLabel(selected)}</strong>
        <span>
          {selected.id} · {selected.location}
        </span>
        {coordinates ? (
          <small>
            {coordinates.latitude.toFixed(4)},{" "}
            {coordinates.longitude.toFixed(4)} ·{" "}
            {coordinates.source === "simulated"
              ? "Fictional demo point only"
              : "Provided by incident data"}
          </small>
        ) : (
          <small>Louisiana regional view · no pin for this incident</small>
        )}
      </div>
      <div className="map-controlbar">
        <span className="map-zoom-controls">
          <button
            type="button"
            className="map-action map-zoom-button"
            aria-label="Zoom in"
            disabled={!map || view.zoom >= TILE_PROVIDER.maxZoom}
            onClick={() => map?.zoomIn()}
          >
            <Plus size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="map-action map-zoom-button"
            aria-label="Zoom out"
            disabled={!map || view.zoom <= 3}
            onClick={() => map?.zoomOut()}
          >
            <Minus size={18} aria-hidden="true" />
          </button>
        </span>
        <button
          className="map-action"
          type="button"
          onClick={() => {
            map?.closePopup();
            setRecenter((n) => n + 1);
          }}
        >
          <Crosshair size={15} aria-hidden="true" />
          Recenter
        </button>
        <button
          className="map-action"
          type="button"
          disabled={!located.length}
          onClick={() =>
            map?.fitBounds(latLngBounds(located), {
              padding: [32, 32],
              maxZoom: 12,
              animate: false,
            })
          }
        >
          Fit visible incidents
        </button>
        <span className="map-zoom-readout" aria-live="polite">
          Zoom {view.zoom}
        </span>
      </div>
      <MapContainer
        ref={setMap}
        className="relay-leaflet-map"
        center={LOUISIANA_CENTER}
        zoom={6}
        minZoom={3}
        maxZoom={TILE_PROVIDER.maxZoom}
        zoomControl={false}
        scrollWheelZoom
        touchZoom
        dragging
        keyboard
        aria-label={`Interactive map for ${selected.id}`}
        aria-describedby={helpId}
      >
        <MapViewSync
          selectedId={selected.id}
          latitude={coordinates?.latitude}
          longitude={coordinates?.longitude}
          recenter={recenter}
          onViewChange={setView}
          helpId={helpId}
          scope={scope}
        />
        <TileLayer
          key={retry}
          url={TILE_PROVIDER.url}
          attribution={TILE_PROVIDER.attribution}
          maxZoom={TILE_PROVIDER.maxZoom}
          keepBuffer={0}
          updateWhenIdle
          eventHandlers={{
            loading: () => {
              tileError.current = false;
              setTileState("loading");
            },
            tileerror: () => {
              tileError.current = true;
              setTileState("error");
            },
            load: () => setTileState(tileError.current ? "error" : "ready"),
          }}
        />
        <ContextOverlays layers={contextLayers} />
        {displayedIncidents.map((incident) => (
          <IncidentPin
            key={incident.id}
            incident={incident}
            selected={incident.id === selected.id}
            onSelectIncident={onSelectIncident}
          />
        ))}
      </MapContainer>
      <div className="map-tile-message" aria-live="polite">
        {tileState === "error" ? (
          <>
            <span>
              Map tiles unavailable or incomplete. Check your connection.
              Incident details remain available above.
            </span>
            <button
              type="button"
              className="text-button"
              onClick={() => {
                tileError.current = false;
                setTileState("loading");
                setRetry((n) => n + 1);
              }}
            >
              Retry map tiles
            </button>
          </>
        ) : tileState === "loading" ? (
          "Loading OpenStreetMap tiles…"
        ) : (
          "OpenStreetMap · browse to explore the area"
        )}
      </div>
      <p id={helpId} className="map-help">
        Drag or use arrow keys to pan. Scroll, pinch, or use + / − to zoom.
        Browsing never changes incident facts. No live GPS tracking.
      </p>
      <a
        className="map-issue-link"
        href="https://www.openstreetmap.org/fixthemap"
        target="_blank"
        rel="noopener noreferrer"
      >
        Report a map issue
      </a>
    </div>
  );
}

function IncidentPin({
  incident,
  selected,
  onSelectIncident,
}: {
  incident: Incident;
  selected: boolean;
  onSelectIncident?: Props["onSelectIncident"];
}) {
  const marker = useRef<LeafletMarker>(null);
  useEffect(() => {
    if (!selected) marker.current?.closePopup();
  }, [selected]);
  useEffect(() => {
    marker.current
      ?.getElement()
      ?.setAttribute(
        "aria-label",
        `${incident.id}, ${tagLabels(incident).join(", ")}, ${incident.location}, ${incident.coordinates?.source ?? "unknown"} position`,
      );
  }, [incident]);
  const point = normalizeCoordinates(incident.coordinates);
  if (!point) return null;
  const simulated = point.source === "simulated";
  return (
    <Marker
      ref={marker}
      position={[point.latitude, point.longitude]}
      icon={incidentMarkerIcon(incident.category, selected, simulated)}
      title={`${incident.id} · ${incident.location} · ${tagLabels(incident).join(", ")} · ${simulated ? "Simulated coordinates" : "Reported coordinates"}`}
      alt={`${incident.id} incident marker, ${simulated ? "simulated" : "reported"}`}
      zIndexOffset={selected ? 1000 : 0}
      keyboard
      draggable={false}
      eventHandlers={{ click: () => onSelectIncident?.(incident.id) }}
    >
      <Popup>
        <div className="incident-map-popup">
          <strong>{incident.id}</strong>
          <span>{incident.location}</span>
          <span>
            {categoryLabel(incident.category)} · {incident.status}
          </span>
          <small>{positionLabel(incident)}</small>
        </div>
      </Popup>
    </Marker>
  );
}

function MapViewSync({
  selectedId,
  latitude,
  longitude,
  recenter,
  onViewChange,
  helpId,
  scope,
}: {
  helpId: string;
  scope: string;
  selectedId: string;
  latitude?: number;
  longitude?: number;
  recenter: number;
  onViewChange: (view: {
    zoom: number;
    latitude: number;
    longitude: number;
  }) => void;
}) {
  const map = useMap();
  const lastScope = useRef<string | null>(null);
  useMapEvents({ moveend: () => updateView(), zoomend: () => updateView() });
  function updateView() {
    const center = map.getCenter();
    onViewChange({
      zoom: map.getZoom(),
      latitude: center.lat,
      longitude: center.lng,
    });
  }
  useEffect(() => {
    const container = map.getContainer();
    container.setAttribute("role", "region");
    container.setAttribute("aria-label", "Interactive incident map");
    container.setAttribute("aria-describedby", helpId);
    let initialized = false;
    const resize = () => {
      // Native dialogs start display:none. Wait for a real viewport before
      // centering; subsequent resizing preserves the user's browsed center.
      if (!container.clientWidth || !container.clientHeight) return;
      map.invalidateSize({ animate: false });
      if (!initialized) {
        initialized = true;
        map.stop();
        if (scope && lastScope.current !== scope) {
          lastScope.current = scope;
          const points = JSON.parse(scope) as [number, number][];
          if (points.length)
            map.fitBounds(latLngBounds(points), {
              padding: [32, 32],
              maxZoom: 12,
              animate: false,
            });
          else
            map.fitBounds(LOUISIANA_BOUNDS, {
              padding: [12, 12],
              animate: false,
            });
        } else if (latitude !== undefined && longitude !== undefined)
          map.setView([latitude, longitude], 11, { animate: false });
        else
          map.fitBounds(LOUISIANA_BOUNDS, {
            padding: [12, 12],
            animate: false,
          });
      }
      updateView();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();
    return () => observer.disconnect();
  }, [map, selectedId, latitude, longitude, recenter, helpId, scope]);
  return null;
}
