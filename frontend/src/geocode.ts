import { isInLouisiana } from "./louisiana";
import type { LatLng } from "./types";

// OpenStreetMap Nominatim, restricted to Louisiana (results outside the state are dropped). Its usage policy allows at
// most one request per second, so lookups are queued and results are cached.
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const LOUISIANA_VIEWBOX = "-94.1,33.1,-88.8,28.9";
const CACHE_KEY = "relay4.geocode.v2";

const cache: Record<string, LatLng | null> = readCache();
const inflight = new Map<string, Promise<LatLng | null>>();
let queue: Promise<unknown> = Promise.resolve();

function readCache(): Record<string, LatLng | null> {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function writeCache() {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Storage unavailable; the in-memory cache still works.
  }
}

async function lookup(location: string): Promise<LatLng | null> {
  const q = /louisiana|\bLA\b/i.test(location) ? location : `${location}, Louisiana`;
  const params = new URLSearchParams({ q, format: "jsonv2", limit: "1", countrycodes: "us", viewbox: LOUISIANA_VIEWBOX, bounded: "1" });
  const response = await fetch(`${NOMINATIM_URL}?${params}`, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Geocoder failed (${response.status})`);
  const [hit] = (await response.json()) as { lat: string; lon: string }[];
  if (!hit) return null;
  const point: LatLng = [Number(hit.lat), Number(hit.lon)];
  // The search box is a rectangle that clips Texas, Arkansas and Mississippi.
  return isInLouisiana(point) ? point : null;
}

/** Resolves to coordinates, or null when the place cannot be found. Never guesses. */
export function geocode(location: string): Promise<LatLng | null> {
  const key = location.trim().toLowerCase();
  if (key in cache) return Promise.resolve(cache[key]);
  const pending = inflight.get(key);
  if (pending) return pending;

  const job = queue.then(() => lookup(location));
  queue = job.catch(() => undefined).then(() => new Promise((resolve) => setTimeout(resolve, 1100)));
  const result = job
    .then((point) => {
      cache[key] = point;
      writeCache();
      return point;
    })
    .catch(() => null) // Network failure: not cached, retried on the next lookup.
    .finally(() => inflight.delete(key));
  inflight.set(key, result);
  return result;
}
