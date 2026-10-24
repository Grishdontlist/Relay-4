import type { ContextLayer, Coordinates } from "./types";
const updatedAt = "2026-10-24T15:50:00Z";
const simulated = (latitude: number, longitude: number): Coordinates => ({
  latitude,
  longitude,
  source: "simulated",
});
export const responseFixtures: ContextLayer[] = [
  {
    id: "building-entrances",
    name: "Building entrances",
    state: "synthetic",
    source: "Synthetic building-access training fixture",
    updatedAt,
    features: [
      {
        id: "ENT-DEMO",
        name: "R4-004 · Demo entrance A",
        description:
          "Fictional entrance near the collision exercise. Actual access, building layout and suitability: Unknown.",
        source: "Synthetic training fixture; not surveyed",
        updatedAt,
        geometry: { type: "point", position: simulated(30.2448, -90.6098) },
      },
    ],
  },
  {
    id: "hydrants",
    name: "Hydrants",
    state: "synthetic",
    source: "Synthetic hydrant training fixture; not a utility register",
    updatedAt,
    features: [
      {
        id: "HYD-DEMO",
        name: "Demo hydrant H1",
        description:
          "Fictional training hydrant only. Existence at this real-world position, serviceability, flow and pressure: Unknown. Not verified.",
        source: "Synthetic training fixture; no verified hydrants connected",
        updatedAt,
        geometry: { type: "point", position: simulated(30.2455, -90.611) },
      },
    ],
  },
  {
    id: "vehicle-locations",
    name: "Vehicle locations",
    state: "synthetic",
    source: "Synthetic collision-position training fixture",
    updatedAt,
    features: [
      {
        id: "VEH-DEMO-A",
        name: "R4-004 · Demo vehicle A",
        description:
          "Static simulated vehicle position, not a live or verified position. Occupancy and vehicle condition: Unknown.",
        source: "Synthetic collision exercise",
        updatedAt,
        geometry: { type: "point", position: simulated(30.2451, -90.6102) },
      },
      {
        id: "VEH-DEMO-B",
        name: "R4-004 · Demo vehicle B",
        description:
          "Static simulated vehicle position, not a live or verified position. Occupancy and vehicle condition: Unknown.",
        source: "Synthetic collision exercise",
        updatedAt,
        geometry: { type: "point", position: simulated(30.2454, -90.6104) },
      },
    ],
  },
  {
    id: "access-points",
    name: "Medical access points",
    state: "synthetic",
    source: "Synthetic medical-access training fixture",
    updatedAt,
    features: [
      {
        id: "ACCESS-DEMO",
        name: "R4-005 · Demo access point",
        description:
          "Fictional access point. Suitability, passability and permission to enter: Unknown.",
        source: "Synthetic medical exercise; not surveyed",
        updatedAt,
        geometry: { type: "point", position: simulated(30.2698, -90.7199) },
      },
    ],
  },
  {
    id: "waterways",
    name: "Waterways",
    state: "synthetic",
    source: "Synthetic waterway training geometry; not official hydrography",
    updatedAt,
    features: [
      {
        id: "WATER-DEMO",
        name: "Demo channel",
        description:
          "Illustrative waterway only, not a surveyed channel or navigable route. Actual channel position, depth and flow: Unknown.",
        source: "Synthetic weather exercise",
        updatedAt,
        geometry: {
          type: "line",
          positions: [
            simulated(30.12, -90.75),
            simulated(30.19, -90.69),
            simulated(30.25, -90.72),
            simulated(30.31, -90.67),
          ],
        },
      },
    ],
  },
];
