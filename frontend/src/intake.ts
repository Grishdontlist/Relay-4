import { isLive, parseTime } from "./format";
import { distanceKm, parishAt } from "./louisiana";
import type { Incident, LatLng } from "./types";

// Decision support only. Every value here is a suggestion shown with its reason;
// the dispatcher decides priority, links calls and approves any dispatch.

export type Priority = 1 | 2 | 3;

export type Call = {
  incident: Incident;
  point: LatLng | null | undefined; // undefined = still geocoding, null = not on map
  parish: string | null;
  live: boolean;
  priority: Priority;
  reasons: string[];
  facts: { known: number; total: number; asks: string[] };
  related: { id: string; label: string; detail: string }[];
};

export const PRIORITY_LABEL: Record<Priority, string> = { 1: "P1 Critical", 2: "P2 Urgent", 3: "P3 Routine" };

const LIFE_THREATS: [RegExp, string][] = [
  [/fire|smoke|burn|explos/i, "Fire or smoke"],
  [/rising.water|flood|drown|swept|submerged/i, "Rising water"],
  [/not breathing|unconscious|unresponsive|cardiac|chest pain|stroke|seizure|bleeding|collapsed|overdose/i, "Possible life-threatening medical"],
  [/gas leak|chemical|hazmat|downed (power )?line|live wire/i, "Hazardous material or downed lines"],
  [/shoot|gun|weapon|stab/i, "Weapon involved"],
  [/trapped|entrap|pinned/i, "Person trapped"],
];

const NO_INJURY = /^\s*(no|none|unknown|n\/a|not? (injured|hurt))\b/i;

function triage(incident: Incident): { priority: Priority; reasons: string[] } {
  const text = [incident.incident_type, incident.hazard, incident.description, incident.injuries].filter(Boolean).join(" ").replaceAll("_", " ");
  const critical = LIFE_THREATS.filter(([pattern]) => pattern.test(text)).map(([, reason]) => reason);
  if (critical.length) return { priority: 1, reasons: critical };

  const urgent: string[] = [];
  if (incident.injuries && !NO_INJURY.test(incident.injuries)) urgent.push("Injuries reported");
  if ((incident.people_count ?? 0) >= 5) urgent.push(`${incident.people_count} people involved`);
  if (incident.hazard) urgent.push(`Hazard: ${incident.hazard.replaceAll("_", " ")}`);
  if (urgent.length) return { priority: 2, reasons: urgent };

  return { priority: 3, reasons: ["No life threat, injury or hazard reported yet"] };
}

function factCheck(incident: Incident, point: LatLng | null | undefined) {
  const checks: [boolean, string][] = [
    [Boolean(incident.location) && point !== null,
      incident.location ? "Location not found on the Louisiana map: ask for a cross street, parish or nearby landmark." : "Where are you? Get an address, cross street or landmark."],
    [incident.location_confirmed, "Read the location back and confirm it with the caller."],
    [Boolean(incident.incident_type), "What is the emergency?"],
    [incident.people_count != null, "How many people are involved?"],
    [incident.injuries != null, "Is anyone hurt?"],
    [incident.hazard != null, "Any hazards: water, fire, smoke, downed lines?"],
  ];
  return { known: checks.filter(([ok]) => ok).length, total: checks.length, asks: checks.filter(([ok]) => !ok).map(([, ask]) => ask) };
}

const RELATED_KM = 1;
const RELATED_MS = 2 * 60 * 60 * 1000;

const sameText = (a: string | null, b: string | null) => Boolean(a && b && a.trim().toLowerCase() === b.trim().toLowerCase());

export function buildCalls(incidents: Incident[], points: Record<string, LatLng | null>, now: number): Call[] {
  const calls: Call[] = incidents.map((incident) => {
    const point = incident.location ? points[incident.location] : null;
    return {
      incident,
      point,
      parish: point ? parishAt(point) : null,
      live: isLive(incident, now),
      ...triage(incident),
      facts: factCheck(incident, point),
      related: [],
    };
  });

  for (const a of calls) {
    for (const b of calls) {
      if (a === b) continue;
      const minutes = Math.abs(parseTime(a.incident.created_at) - parseTime(b.incident.created_at)) / 60000;
      if (minutes * 60000 > RELATED_MS) continue;
      const km = a.point && b.point ? distanceKm(a.point, b.point) : null;
      if ((km !== null && km <= RELATED_KM) || sameText(a.incident.location, b.incident.location)) {
        a.related.push({
          id: b.incident.id,
          label: b.incident.incident_type?.replaceAll("_", " ") ?? "Unclassified incident",
          detail: `${km === null ? "same location text" : `${km < 0.1 ? "<0.1" : km.toFixed(1)} km away`} · ${Math.round(minutes)} min apart`,
        });
      }
    }
  }

  return calls.sort((a, b) => a.priority - b.priority || parseTime(b.incident.updated_at) - parseTime(a.incident.updated_at));
}
