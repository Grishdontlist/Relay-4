import data from "./data/louisiana.json";
import type { LatLng } from "./types";

// Boundaries from US Census cartographic data (via plotly/datasets and
// PublicaMundi/MappingAPI), simplified. Stored as GeoJSON [lng, lat].
type Ring = number[][];
type Polygon = Ring[]; // outer ring, then holes

const outline = data.outline as Polygon[];
const parishes = data.parishes as { name: string; polygons: Polygon[] }[];

function inRing([lat, lng]: LatLng, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

const inPolygons = (point: LatLng, polygons: Polygon[]) =>
  polygons.some(([outer, ...holes]) => inRing(point, outer) && !holes.some((hole) => inRing(point, hole)));

export function parishAt(point: LatLng): string | null {
  const match = parishes.find((parish) => inPolygons(point, parish.polygons));
  return match ? `${match.name} Parish` : null;
}

export const isInLouisiana = (point: LatLng) => inPolygons(point, outline) || parishAt(point) !== null;

// Leaflet wants [lat, lng].
const toLatLngs = (polygons: Polygon[]) => polygons.map((polygon) => polygon.map((ring) => ring.map(([lng, lat]) => [lat, lng] as LatLng)));

export const OUTLINE_LATLNGS = toLatLngs(outline);
export const PARISH_SHAPES = parishes.map((parish) => ({ name: `${parish.name} Parish`, latlngs: toLatLngs(parish.polygons) }));

const lats = outline.flat(2).map(([, lat]) => lat);
const lngs = outline.flat(2).map(([lng]) => lng);
export const LOUISIANA_BOUNDS: [LatLng, LatLng] = [
  [Math.min(...lats), Math.min(...lngs)],
  [Math.max(...lats), Math.max(...lngs)],
];

// Everything outside Louisiana, for dimming: a world ring with the state cut out.
export const OUTSIDE_MASK: LatLng[][] = [
  [[-89, -179], [-89, 179], [89, 179], [89, -179]],
  ...OUTLINE_LATLNGS.map((polygon) => polygon[0]),
];

export function distanceKm([lat1, lng1]: LatLng, [lat2, lng2]: LatLng): number {
  const rad = Math.PI / 180;
  const a = Math.sin(((lat2 - lat1) * rad) / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lng2 - lng1) * rad) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(a));
}
