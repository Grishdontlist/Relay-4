import { sampleData } from "./mockData";
import type { Incident, Snapshot } from "./types";
import { normalizeCoordinates } from "./coordinates";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");

type BackendIncident = {
  id: string;
  incident_type: string | null;
  description: string | null;
  location: string | null;
  landmark: string | null;
  hazard: string | null;
  people_count: number | null;
  injuries: string | null;
  location_confirmed: boolean;
  status: "intake" | "needs_review" | "reviewed";
  conversation_id: string | null;
  created_at: string;
  updated_at: string;
};

function categoryFor(incidentType: string | null): Incident["category"] {
  const value = (incidentType ?? "").toLowerCase();
  if (value.includes("fire")) return "fire";
  if (value.includes("medical") || value.includes("injur")) return "medical";
  if (value.includes("flood") || value.includes("water")) return "flood";
  if (value.includes("weather") || value.includes("wind")) return "weather";
  if (value.includes("collision") || value.includes("accident")) return "accident";
  return "other";
}

function mapBackendIncident(record: BackendIncident): Incident {
  const category = categoryFor(record.incident_type);
  const displayStatus: Incident["status"] =
    record.status === "reviewed" ? "Location updated" : "Needs review";

  return {
    id: record.id,
    category,
    tags: [category],
    responseNeeds: [],
    source: "Relay4 backend · synthetic intake",
    reportedAt: record.created_at,
    updatedAt: record.updated_at,
    title: record.incident_type?.replaceAll("_", " ") || "Emergency incident",
    location: record.location || "Unknown location",
    detail: record.landmark || record.description || "Unknown details",
    hazards: record.hazard || "Unknown",
    people: record.people_count == null ? "Unknown" : `${record.people_count} reported`,
    injuries: record.injuries || "Unknown",
    status: displayStatus,
    callIds: record.conversation_id ? [record.conversation_id] : [],
    coordinates: null,
  };
}

async function loadBackendIncidents(): Promise<Incident[]> {
  const response = await fetch(`${API_BASE_URL}/api/incidents`);
  if (!response.ok) throw new Error(`Backend incident request failed (${response.status})`);
  const records = (await response.json()) as BackendIncident[];
  return records.map(mapBackendIncident);
}

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
    const normalizedSnapshot = {
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

    try {
      const backendIncidents = await loadBackendIncidents();
      if (backendIncidents.length > 0) {
        normalizedSnapshot.incidents = backendIncidents;
      }
    } catch (error) {
      console.warn("Relay4 backend unavailable; using synthetic frontend data.", error);
    }

    return normalizedSnapshot;
  },
};
