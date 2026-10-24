// Map presentation only. These defaults are never written into incident data.
export const LOUISIANA_CENTER: [number, number] = [30.95, -91.55];
export const LOUISIANA_BOUNDS: [[number, number], [number, number]] = [
  [28.9, -94.1],
  [33.1, -88.8],
];
export const TILE_PROVIDER = {
  url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>',
  maxZoom: 19,
};
