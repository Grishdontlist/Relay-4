import { divIcon } from "leaflet";
import type { IncidentCategory } from "./types";
export const incidentSymbols: Record<IncidentCategory, string> = {
  accident: "↯",
  fire: "♨",
  medical: "✚",
  flood: "≈",
  weather: "ϟ",
  other: "•",
};
const cache = new Map<string, ReturnType<typeof divIcon>>();
export function incidentMarkerIcon(
  category: IncidentCategory,
  selected: boolean,
  simulated: boolean,
) {
  const key = `${category}-${selected}-${simulated}`;
  if (!cache.has(key))
    cache.set(
      key,
      divIcon({
        className: "relay-map-marker",
        html: `<span class="relay-pin category-${category} ${selected ? "is-selected" : ""} ${simulated ? "is-simulated" : ""}"><span class="pin-symbol">${incidentSymbols[category] ?? "•"}</span></span>`,
        iconSize: [32, 40],
        iconAnchor: [16, 36],
        popupAnchor: [0, -32],
      }),
    );
  return cache.get(key)!;
}
