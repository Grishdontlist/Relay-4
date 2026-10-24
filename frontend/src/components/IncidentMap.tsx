import L from "leaflet";
import { useEffect, useState } from "react";
import { MapContainer, Marker, Polygon, Polyline, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import { humanize } from "../format";
import { PRIORITY_LABEL, type Call } from "../intake";
import { LOUISIANA_BOUNDS, OUTLINE_LATLNGS, OUTSIDE_MASK, PARISH_SHAPES } from "../louisiana";
import type { Assignment } from "../hooks";
import { UNIT_TYPE_LABEL, UNITS, type DispatchPlan, type Unit } from "../responders";
import type { LatLng } from "../types";

const PAN_LIMIT = L.latLngBounds(LOUISIANA_BOUNDS).pad(0.15);
// The boundaries are simplified; past city level they drift off the streets, so hide them.
const BOUNDARY_MAX_ZOOM = 11;

type Props = {
  calls: Call[];
  selected: Call | undefined;
  focus: number;
  plan: DispatchPlan | null;
  assignments: Record<string, Assignment>;
  onSelect: (id: string) => void;
};

// The pin is centred on the geocoded point. Live calls, and critical calls whose
// report has not been sent yet, keep pinging in their priority colour.
const icon = (call: Call, selected: boolean, sent: boolean) => {
  const ping = selected || call.live || (call.priority === 1 && !sent);
  return L.divIcon({
    className: "",
    html: `<span class="pin p${call.priority}${ping ? " ping" : ""}${sent ? " sent" : ""}${selected ? " selected" : ""}"></span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
};

const UNIT_LETTER: Record<Unit["type"], string> = { fire: "F", ems: "M", police: "P", water_rescue: "W" };
const unitIcon = (unit: Unit, state: "free" | "busy" | "chosen") =>
  L.divIcon({ className: "", html: `<span class="unit ${state}">${UNIT_LETTER[unit.type]}</span>`, iconSize: [18, 18], iconAnchor: [9, 9] });

/** Keep the view on Louisiana: can't zoom out past the whole state. */
function LockToLouisiana() {
  const map = useMap();
  useEffect(() => {
    const fit = () => map.setMinZoom(map.getBoundsZoom(LOUISIANA_BOUNDS, false, L.point(24, 24)));
    fit();
    map.on("resize", fit);
    return () => {
      map.off("resize", fit);
    };
  }, [map]);
  return null;
}

function StateBoundaries({ callsByParish }: { callsByParish: Map<string, number> }) {
  const map = useMap();
  const [zoom, setZoom] = useState(() => map.getZoom());
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) });
  if (zoom > BOUNDARY_MAX_ZOOM) return null;

  return (
    <>
      <Polygon positions={OUTSIDE_MASK} interactive={false} pathOptions={{ stroke: false, fillColor: "#06070a", fillOpacity: 0.72 }} />
      {PARISH_SHAPES.map((parish) => {
        const count = callsByParish.get(parish.name) ?? 0;
        return (
          <Polygon
            key={parish.name}
            positions={parish.latlngs}
            pathOptions={{ color: "#ffffff", opacity: 0.14, weight: 1, fillColor: "#f4b01f", fillOpacity: count ? 0.1 : 0 }}
          >
            <Tooltip sticky className="parish-tip">
              {parish.name}
              {count > 0 && ` · ${count} call${count > 1 ? "s" : ""}`}
            </Tooltip>
          </Polygon>
        );
      })}
      <Polygon positions={OUTLINE_LATLNGS} interactive={false} pathOptions={{ color: "#f4b01f", opacity: 0.55, weight: 1.5, fill: false }} />
    </>
  );
}

function FlyToSelected({ point, focus }: { point: LatLng | undefined; focus: number }) {
  const map = useMap();
  useEffect(() => {
    if (point) map.flyTo(point, 17, { duration: 0.8 });
  }, [map, point, focus]);
  return null;
}

export function IncidentMap({ calls, selected, focus, plan, assignments, onSelect }: Props) {
  const pinned = calls.filter((call): call is Call & { point: LatLng } => Boolean(call.point));
  const unpinned = calls.filter((call) => call.point === null).length;
  const callsByParish = new Map<string, number>();
  for (const call of calls) if (call.parish) callsByParish.set(call.parish, (callsByParish.get(call.parish) ?? 0) + 1);
  const relatedPoints = (selected?.related ?? [])
    .map((item) => pinned.find((call) => call.incident.id === item.id)?.point)
    .filter((point): point is LatLng => Boolean(point));
  const busy = new Set(Object.values(assignments).map((assignment) => assignment.unitId));
  const selectedAssignment = selected && assignments[selected.incident.id];
  const routeUnit = selectedAssignment ? UNITS.find((unit) => unit.id === selectedAssignment.unitId) : plan?.chosen?.unit;

  return (
    <div className="map-wrap">
      <MapContainer bounds={LOUISIANA_BOUNDS} boundsOptions={{ padding: [24, 24] }} maxBounds={PAN_LIMIT} maxBoundsViscosity={1} className="map" zoomControl={false}>
        <LockToLouisiana />
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors · boundaries US Census'
          maxZoom={19}
        />
        <StateBoundaries callsByParish={callsByParish} />

        {selected?.point &&
          relatedPoints.map((point, index) => (
            <Polyline key={index} positions={[selected.point as LatLng, point]} pathOptions={{ color: "#f4b01f", weight: 2, dashArray: "4 6" }} />
          ))}

        {UNITS.map((unit) => (
          <Marker
            key={unit.id}
            position={unit.point}
            icon={unitIcon(unit, unit === routeUnit ? "chosen" : busy.has(unit.id) ? "busy" : "free")}
            zIndexOffset={-100}
          >
            <Tooltip direction="top" offset={[0, -10]}>
              {unit.name} · {UNIT_TYPE_LABEL[unit.type]} · {busy.has(unit.id) ? "assigned" : "available"}
              <br />
              {unit.base} (synthetic unit)
            </Tooltip>
          </Marker>
        ))}

        {selected?.point && routeUnit && (
          <Polyline
            positions={[routeUnit.point, selected.point]}
            pathOptions={{ color: selectedAssignment ? "#7bffb2" : "#ffffff", opacity: 0.7, weight: 2, dashArray: selectedAssignment ? undefined : "2 6" }}
          />
        )}

        {pinned.map((call) => (
          <Marker
            // Remount when selected: Leaflet won't switch an existing tooltip to permanent.
            key={call === selected ? `${call.incident.id}:selected` : call.incident.id}
            position={call.point}
            icon={icon(call, call === selected, Boolean(assignments[call.incident.id]))}
            zIndexOffset={call === selected ? 1000 : (4 - call.priority) * 100}
            eventHandlers={{ click: () => onSelect(call.incident.id) }}
          >
            {call === selected ? (
              <Tooltip permanent direction="right" offset={[18, 0]} className={`reported-tip p${call.priority}`}>
                <span className="eyebrow">Reported location</span>
                <strong>{call.incident.location}</strong>
                {call.incident.landmark && <span>{call.incident.landmark}</span>}
                <span className="mono">
                  {call.point[0].toFixed(5)}, {call.point[1].toFixed(5)}
                  {call.parish && ` · ${call.parish}`}
                </span>
                <span className={call.incident.location_confirmed ? "ok" : "warn"}>
                  {call.incident.location_confirmed ? "Caller confirmed" : "Not confirmed by caller"}
                </span>
              </Tooltip>
            ) : (
              <Tooltip direction="top" offset={[0, -12]}>
                <strong>{humanize(call.incident.incident_type, "Unclassified incident")}</strong> · {PRIORITY_LABEL[call.priority]}
                <br />
                {call.incident.location}
                {call.parish && ` · ${call.parish}`}
              </Tooltip>
            )}
          </Marker>
        ))}
        <FlyToSelected point={selected?.point ?? undefined} focus={focus} />
      </MapContainer>

      {selected && !selected.point && (
        <div className="map-notice">
          <b>{selected.incident.location ?? "No location reported yet"}</b>
          <span>
            {!selected.incident.location
              ? "Ask the caller for an address, cross street or landmark."
              : selected.point === undefined
                ? "Locating on the map…"
                : "Could not be found in Louisiana. Ask for a cross street, parish or nearby landmark."}
          </span>
        </div>
      )}

      <div className="map-legend">
        <span><i className="pin p1" /> P1</span>
        <span><i className="pin p2" /> P2</span>
        <span><i className="pin p3" /> P3</span>
        <span><i className="pin p3 ring" /> Live / P1 unsent</span>
        <span><i className="unit free">F</i> Unit (synthetic)</span>
        {unpinned > 0 && <span className="warn">{unpinned} not on map</span>}
        <span className="muted">Pins geocoded from the caller's stated location · priority is a suggestion</span>
      </div>
    </div>
  );
}
