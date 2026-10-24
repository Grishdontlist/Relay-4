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

// Only the existing Streets source is configured. There is no Satellite/Terrain
// endpoint or approved credential set; never substitute Streets for these labels.
export const MAP_STYLES = {
  streets: {
    label: "Streets",
    available: true,
    provider: TILE_PROVIDER,
    reason:
      "OpenStreetMap raster tiles · visible contributor attribution · no API key required.",
  },
  satellite: {
    label: "Satellite",
    available: false,
    provider: null,
    reason:
      "Unavailable: no licensed imagery provider, attribution terms or credentials configured.",
  },
  terrain: {
    label: "Terrain",
    available: false,
    provider: null,
    reason:
      "Unavailable: no licensed terrain provider, attribution terms or credentials configured.",
  },
} as const;
