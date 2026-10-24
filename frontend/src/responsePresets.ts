import type { ContextLayer, Incident, Snapshot } from "./types";
import { featureHasGeometry, matchesCategory } from "./gis";
import { normalizeCoordinates } from "./coordinates";
export type ResponsePreset =
  "overview" | "fire" | "accident" | "medical" | "weather";
export type MapStyle = "streets" | "satellite" | "terrain";
export type MapCamera = { latitude: number; longitude: number; zoom: number };
export type ViewportRequest = {
  token: number;
  mode: "fit" | "pan";
  points: [number, number][];
  maxZoom: number;
};
export type MapPreferences = {
  preset: ResponsePreset;
  style: MapStyle;
  filter: string;
  layersByPreset: Record<ResponsePreset, string[]>;
};
export const responsePresets: Record<
  ResponsePreset,
  {
    label: string;
    layers: string[];
    maxZoom: number;
    description: string;
    focus: string;
  }
> = {
  overview: {
    label: "Overview",
    layers: [],
    maxZoom: 12,
    description:
      "Coordinate the shared incident picture. Review reports and independent assignments before opening an incident.",
    focus:
      "All supplied incident positions. Unknown locations remain unpinned.",
  },
  fire: {
    label: "Fire",
    layers: ["building-entrances", "hydrants", "fire-hazards", "fire-units"],
    maxZoom: 16,
    description:
      "Review building entrances, sample hydrants, reported fire hazards and fire-unit records together.",
    focus:
      "Fire reports, including Accident + Fire hazard, and enabled context. Hydrant serviceability, flow and pressure: Unknown.",
  },
  accident: {
    label: "Accident",
    layers: ["road-blockages", "vehicle-locations", "assigned-units"],
    maxZoom: 16,
    description:
      "Compare reported blockages, demonstration vehicle positions and approved response assignments.",
    focus:
      "Accident reports, including secondary fire hazards, and enabled context. Vehicle positions are simulated; no route or lane safety is inferred.",
  },
  medical: {
    label: "Medical",
    layers: ["access-points", "ems-units", "hospitals"],
    maxZoom: 13,
    description:
      "Review access-point records, EMS units and fictional hospital locations.",
    focus:
      "Medical reports and enabled context. Hospital capabilities, receiving status, access suitability and unit availability: Unknown.",
  },
  weather: {
    label: "Weather",
    layers: ["weather-alerts", "waterways", "flood-zones"],
    maxZoom: 10,
    description:
      "Compare available warning polygons, demonstration waterways and illustrative flood-risk areas.",
    focus:
      "Weather/flood reports and enabled context. These fixtures are not official warnings, surveyed waterways or verified hazard boundaries.",
  },
};
export function initialMapPreferences(): MapPreferences {
  return {
    preset: "overview",
    style: "streets",
    filter: "all",
    layersByPreset: Object.fromEntries(
      Object.entries(responsePresets).map(([id, preset]) => [
        id,
        [...preset.layers],
      ]),
    ) as Record<ResponsePreset, string[]>,
  };
}
export function isLayerReady(layer: ContextLayer) {
  return layer.state === "synthetic" || layer.state === "connected";
}
export function relevantIncidents(
  preset: ResponsePreset,
  incidents: Incident[],
) {
  return incidents.filter(
    (i) =>
      preset === "overview" ||
      matchesCategory(i, preset) ||
      (preset === "weather" && matchesCategory(i, "flood")),
  );
}
export function presetExtent(
  preset: ResponsePreset,
  data: Snapshot,
  layers: ContextLayer[],
  enabled: string[],
): [number, number][] {
  const points = relevantIncidents(preset, data.incidents).flatMap(
    (incident) => {
      const c = normalizeCoordinates(incident.coordinates);
      return c ? [[c.latitude, c.longitude] as [number, number]] : [];
    },
  );
  for (const layer of layers.filter(
    (layer) => enabled.includes(layer.id) && isLayerReady(layer),
  )) {
    for (const feature of layer.features.filter(featureHasGeometry)) {
      if (feature.geometry.type === "point") {
        const p = normalizeCoordinates(feature.geometry.position)!;
        points.push([p.latitude, p.longitude]);
      } else
        points.push(
          ...feature.geometry.positions.map(
            (p) => [p.latitude, p.longitude] as [number, number],
          ),
        );
    }
  }
  return points;
}
