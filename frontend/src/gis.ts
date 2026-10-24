import type {
  Incident,
  IncidentCategory,
  Snapshot,
  ContextLayer,
  ContextFeature,
  UnitDiscipline,
} from "./types";
import { normalizeCoordinates } from "./coordinates";
export const categories = [
  { id: "all", label: "All", symbol: "◎" },
  { id: "accident", label: "Accidents", symbol: "↯" },
  { id: "fire", label: "Fire", symbol: "♨" },
  { id: "medical", label: "Medical", symbol: "✚" },
  { id: "flood", label: "Flood", symbol: "≈" },
  { id: "weather", label: "Weather", symbol: "ϟ" },
] as const;
export const categoryLabel = (category: IncidentCategory) =>
  ({
    accident: "Accident",
    fire: "Fire",
    medical: "Medical",
    flood: "Flood",
    weather: "Severe weather",
    other: "Other report",
  })[category];
export const disciplineLabel = (discipline: UnitDiscipline) =>
  ({ fire: "Fire", ems: "EMS", rescue: "Rescue", support: "Support" })[
    discipline
  ];
export function tagLabels(incident: Incident) {
  return [
    ...new Set([
      categoryLabel(incident.category),
      ...incident.tags
        .filter((t) => t !== incident.category)
        .map((t) =>
          t === "fire"
            ? "Fire hazard"
            : t === "road-blockage"
              ? "Road blockage"
              : categoryLabel(t),
        ),
    ]),
  ];
}
export function matchesCategory(incident: Incident, filter: string) {
  return (
    filter === "all" ||
    incident.category === filter ||
    incident.tags.includes(filter as IncidentCategory)
  );
}
export function assignmentStatus(data: Snapshot, id: string) {
  const assignments = data.assignments.filter((a) => a.incidentId === id);
  if (!assignments.length) return "No approved assignments";
  const received = assignments.filter((a) => a.acknowledged).length;
  return `${assignments.length} approved · ${received} acknowledged`;
}
export function displayTimestamp(value: string | null | undefined) {
  if (!value || Number.isNaN(Date.parse(value))) return "Unknown";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}
export function featureHasGeometry(feature: ContextFeature) {
  if (!feature?.geometry) return false;
  const geometry = feature.geometry;
  if (geometry.type === "point")
    return !!normalizeCoordinates(geometry.position);
  return (
    Array.isArray(geometry.positions) &&
    geometry.positions.length >= (geometry.type === "polygon" ? 3 : 2) &&
    geometry.positions.every((p) => !!normalizeCoordinates(p))
  );
}
// Derive overlays from the same incident/assignment records as the rest of the UI.
// Static context comes from the adapter; no unit positions are inferred from an assignment.
export function buildMapLayers(data: Snapshot): ContextLayer[] {
  const reportLayer = (
    id: string,
    name: string,
    predicate: (i: Incident) => boolean,
  ): ContextLayer => ({
    id,
    name,
    state: "synthetic",
    source: "Synthetic caller reports",
    updatedAt: data.incidents.reduce(
      (latest, i) => (i.updatedAt > latest ? i.updatedAt : latest),
      "",
    ),
    features: data.incidents
      .filter(predicate)
      .map((i) => ({
        id: i.id,
        name: `${i.id} · ${i.title}`,
        description: `${i.location}. Reported hazards: ${i.hazards}`,
        source: i.source,
        updatedAt: i.updatedAt,
        geometry: { type: "point", position: i.coordinates },
      })),
  });
  const unitLayer = (
    id: string,
    name: string,
    predicate: (unit: Snapshot["units"][number]) => boolean,
  ): ContextLayer => ({
    id,
    name,
    state: "synthetic",
    source: "Synthetic unit roster",
    updatedAt: null,
    features: data.units.filter(predicate).map((u) => {
      const assignment = data.assignments.find((a) => a.unitId === u.id);
      return {
        id: u.id,
        name: u.name,
        description: `${disciplineLabel(u.discipline)}. ${assignment ? `${assignment.incidentId} · ${assignment.acknowledged ? "Receipt acknowledged" : "Awaiting acknowledgement"}` : "No approved assignment"}. Availability: Unknown. Travel status: Unknown.`,
        source: u.source,
        updatedAt: u.updatedAt,
        geometry: { type: "point", position: u.coordinates },
      };
    }),
  });
  return [
    reportLayer("road-blockages", "Reported road blockages", (i) =>
      i.tags.includes("road-blockage"),
    ),
    unitLayer("assigned-units", "Assigned response units", (u) =>
      data.assignments.some((a) => a.unitId === u.id),
    ),
    reportLayer(
      "fire-hazards",
      "Reported fire hazards",
      (i) => i.category === "fire" || i.tags.includes("fire"),
    ),
    unitLayer("fire-units", "Fire units", (u) => u.discipline === "fire"),
    unitLayer(
      "assigned-ems",
      "Assigned EMS",
      (u) =>
        u.discipline === "ems" &&
        data.assignments.some((a) => a.unitId === u.id),
    ),
    ...(data.contextLayers ?? []),
  ];
}
