import { sampleData } from "./mockData";
import type { Snapshot } from "./types";
import { normalizeCoordinates } from "./coordinates";
// Replace this adapter when backend contracts are agreed. No endpoint assumptions.
export const simulationApi = {
  async load(): Promise<Snapshot> {
    const snapshot = structuredClone(sampleData);
    return {
      ...snapshot,
      contextLayers: (snapshot.contextLayers ?? []).map((layer) => ({
        ...layer,
        features: Array.isArray(layer.features) ? layer.features : [],
      })),
      units: snapshot.units.map((unit) => ({
        ...unit,
        coordinates: normalizeCoordinates(unit.coordinates),
      })),
      incidents: snapshot.incidents.map((incident) => ({
        ...incident,
        coordinates: normalizeCoordinates(incident.coordinates),
      })),
    };
  },
};
