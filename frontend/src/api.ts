import type { Incident, IncidentDetail } from "./types";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`);
  if (!response.ok) throw new Error(`GET ${path} failed (${response.status})`);
  return (await response.json()) as T;
}

export const fetchIncidents = () => getJson<Incident[]>("/api/incidents");
export const fetchIncident = (id: string) => getJson<IncidentDetail>(`/api/incidents/${id}`);
