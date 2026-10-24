import { sampleData } from "./mockData";
import type { Snapshot } from "./types";
import { normalizeCoordinates } from "./coordinates";
// Replace this adapter when backend contracts are agreed. No endpoint assumptions.
export const simulationApi = {
  // Explicit retry seam for the teammate's future context service. No URL or key
  // is assumed; reloads the local fixture today, without touching incident facts.
  async reloadContextLayer(id: string) {
    const layer = sampleData.contextLayers.find((layer) => layer.id === id);
    if (!layer) throw new Error("No context source configured for this layer.");
    return structuredClone(layer);
  },
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
