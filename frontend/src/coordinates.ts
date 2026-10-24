import type { Coordinates } from "./types";

// Treat malformed or unsupported backend coordinates as Unknown. Never geocode
// location text or fall back to map-center coordinates for an incident.
export function normalizeCoordinates(value: unknown): Coordinates | null {
  if (!value || typeof value !== "object") return null;
  const { latitude, longitude, source } = value as Record<string, unknown>;
  if (
    typeof latitude !== "number" ||
    !Number.isFinite(latitude) ||
    Math.abs(latitude) > 90 ||
    typeof longitude !== "number" ||
    !Number.isFinite(longitude) ||
    Math.abs(longitude) > 180 ||
    (source !== "simulated" && source !== "reported")
  )
    return null;
  return { latitude, longitude, source };
}
