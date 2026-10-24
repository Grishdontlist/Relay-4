import { clock, humanize } from "./format";
import { PRIORITY_LABEL, type Call } from "./intake";
import { distanceKm } from "./louisiana";
import type { Evidence, LatLng } from "./types";

// Synthetic demo units placed in real Louisiana cities. The backend has no
// responder or assignment API yet, so sending is simulated in the browser.
export type UnitType = "fire" | "ems" | "police" | "water_rescue";

export type Unit = { id: string; name: string; type: UnitType; base: string; point: LatLng };

export const UNIT_TYPE_LABEL: Record<UnitType, string> = { fire: "Fire", ems: "EMS", police: "Police", water_rescue: "Water rescue" };

export const UNITS: Unit[] = [
  { id: "nola-e29", name: "Engine 29", type: "fire", base: "French Quarter, New Orleans", point: [29.9584, -90.0644] },
  { id: "nola-m7", name: "Medic 7", type: "ems", base: "Mid-City, New Orleans", point: [29.9707, -90.0918] },
  { id: "nola-p8", name: "Patrol 8", type: "police", base: "Marigny, New Orleans", point: [29.9637, -90.0518] },
  { id: "jeff-w2", name: "Water Rescue 2", type: "water_rescue", base: "Metairie", point: [29.9841, -90.1529] },
  { id: "br-e12", name: "Engine 12", type: "fire", base: "Downtown Baton Rouge", point: [30.4515, -91.1871] },
  { id: "br-m3", name: "Medic 3", type: "ems", base: "Mid City, Baton Rouge", point: [30.4475, -91.1534] },
  { id: "laf-e5", name: "Engine 5", type: "fire", base: "Lafayette", point: [30.2241, -92.0198] },
  { id: "laf-m4", name: "Medic 4", type: "ems", base: "Lafayette", point: [30.2106, -92.0303] },
  { id: "lc-e3", name: "Engine 3", type: "fire", base: "Lake Charles", point: [30.2266, -93.2174] },
  { id: "houma-w1", name: "Water Rescue 1", type: "water_rescue", base: "Houma", point: [29.5958, -90.7195] },
  { id: "alex-e1", name: "Engine 1", type: "fire", base: "Alexandria", point: [31.3113, -92.4451] },
  { id: "mon-m2", name: "Medic 2", type: "ems", base: "Monroe", point: [32.5093, -92.1193] },
  { id: "shv-e9", name: "Engine 9", type: "fire", base: "Shreveport", point: [32.5252, -93.7502] },
  { id: "shv-p4", name: "Patrol 4", type: "police", base: "Shreveport", point: [32.5135, -93.7476] },
];

const NEEDS: [RegExp, UnitType, string][] = [
  [/fire|smoke|burn|explos|gas leak|hazmat|chemical/i, "fire", "Fire or hazardous material"],
  [/rising.water|flood|drown|swept|submerged|stranded/i, "water_rescue", "Water hazard"],
  [/medical|injur|breath|unconscious|unresponsive|cardiac|chest|stroke|seizure|bleeding|collapsed|overdose|hurt/i, "ems", "Medical need"],
  [/shoot|gun|weapon|stab|assault|robbery|fight/i, "police", "Violence or weapon"],
];

export function needFor(call: Call): { type: UnitType; why: string } {
  const { incident } = call;
  const text = [incident.incident_type, incident.hazard, incident.description, incident.injuries].filter(Boolean).join(" ").replaceAll("_", " ");
  const hit = NEEDS.find(([pattern]) => pattern.test(text));
  return hit ? { type: hit[1], why: hit[2] } : { type: "police", why: "No specific need reported; patrol to assess" };
}

export type Suggestion = { unit: Unit; km: number; etaMin: number };

const eta = (km: number) => Math.round(2 + (km / 50) * 60); // straight line at ~50 km/h plus turnout

export type DispatchPlan = {
  need: { type: UnitType; why: string };
  options: Suggestion[]; // needed type first, then nearest
  chosen: Suggestion | null;
};

/** Suggests the nearest free unit of the needed type. `pickedId` is the dispatcher's override. */
export function planDispatch(call: Call, busy: Set<string>, pickedId: string | undefined): DispatchPlan {
  const need = needFor(call);
  const point = call.point;
  if (!point) return { need, options: [], chosen: null };
  const options = UNITS.filter((unit) => !busy.has(unit.id))
    .map((unit) => {
      const km = distanceKm(unit.point, point);
      return { unit, km, etaMin: eta(km) };
    })
    .sort((a, b) => Number(b.unit.type === need.type) - Number(a.unit.type === need.type) || a.km - b.km);
  const chosen = options.find((option) => option.unit.id === pickedId) ?? (options[0]?.unit.type === need.type ? options[0] : null);
  return { need, options, chosen };
}

export function buildReport(call: Call, unit: Unit, evidence: Evidence[] | undefined): string {
  const { incident, point, parish, priority, reasons, facts } = call;
  const lines = [
    "RELAY4 INCIDENT REPORT · SYNTHETIC DEMO",
    `To: ${unit.name} (${UNIT_TYPE_LABEL[unit.type]}, ${unit.base})`,
    `Priority: ${PRIORITY_LABEL[priority]} (suggested) · ${reasons.join("; ")}`,
    `Type: ${humanize(incident.incident_type, "Unclassified")}`,
    `Location: ${incident.location ?? "Unknown"}${incident.landmark ? ` · ${incident.landmark}` : ""}`,
    `Parish: ${parish ?? "Unknown"}`,
    point
      ? `Coordinates: ${point[0].toFixed(5)}, ${point[1].toFixed(5)} (geocoded from caller's words; ${incident.location_confirmed ? "caller confirmed" : "NOT confirmed"})`
      : "Coordinates: unknown",
    `Hazard: ${humanize(incident.hazard)} | People: ${incident.people_count ?? "Unknown"} | Injuries: ${incident.injuries ?? "Unknown"}`,
    `Summary: ${incident.description ?? "None yet"}`,
  ];
  if (evidence?.length) lines.push("Caller statements (unverified):", ...evidence.map((item) => `  "${item.source_quote}" (${clock(item.created_at)})`));
  if (facts.asks.length) lines.push("Still unknown:", ...facts.asks.map((ask) => `  - ${ask}`));
  if (incident.conversation_id) lines.push(`Conversation: ${incident.conversation_id}`);
  return lines.join("\n");
}
