import { describe, expect, it } from "vitest";
import {
  initialMapPreferences,
  isLayerReady,
  presetExtent,
  relevantIncidents,
  responsePresets,
} from "./responsePresets";
import { buildMapLayers } from "./gis";
import { sampleData } from "./mockData";
import { MAP_STYLES } from "./mapConfig";
import { simulationApi } from "./api";
describe("response presets and provider availability", () => {
  it("keeps category filtering independent and includes mixed accident/fire reports in either relevant context", () => {
    expect(
      relevantIncidents("fire", sampleData.incidents).map((i) => i.id),
    ).toContain("R4-004");
    expect(
      relevantIncidents("accident", sampleData.incidents).map((i) => i.id),
    ).toContain("R4-004");
    const initial = initialMapPreferences();
    initial.layersByPreset.fire = [];
    expect(initialMapPreferences().layersByPreset.fire).toContain("hydrants");
    expect(initial.filter).toBe("all");
  });
  it("supplies the operational layer groups with explicit synthetic provenance", () => {
    const layers = buildMapLayers(sampleData);
    for (const preset of Object.values(responsePresets))
      for (const id of preset.layers) {
        const layer = layers.find((l) => l.id === id)!;
        expect(layer).toBeTruthy();
        expect(layer.state).toBe("synthetic");
        expect(layer.source).toContain("Synthetic");
        expect(layer.updatedAt).toBeTruthy();
      }
  });
  it("ignores unknown positions, unavailable layers and malformed geometry when calculating an explicit extent", () => {
    const data = structuredClone(sampleData);
    data.incidents.forEach((i) => (i.coordinates = null));
    const layers = buildMapLayers(data).map((l) => ({
      ...l,
      state: "unavailable" as const,
    }));
    expect(
      presetExtent("fire", data, layers, responsePresets.fire.layers),
    ).toEqual([]);
    expect(isLayerReady({ ...layers[0], state: "error" })).toBe(false);
    expect(isLayerReady({ ...layers[0], state: "loading" })).toBe(false);
  });
  it("never mutates incident facts or implicitly assigns responders while building preset extents", () => {
    const data = structuredClone(sampleData);
    const before = structuredClone(data);
    const layers = buildMapLayers(data);
    const fire = presetExtent(
      "fire",
      data,
      layers,
      responsePresets.fire.layers,
    );
    const accident = presetExtent(
      "accident",
      data,
      layers,
      responsePresets.accident.layers,
    );
    expect(fire.length).toBeGreaterThan(0);
    expect(accident).not.toEqual(fire);
    expect(data).toEqual(before);
  });
  it("provides Streets only; unavailable styles have no substitute provider or credentials", () => {
    expect(MAP_STYLES.streets.provider?.url).toBe(
      "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    );
    for (const style of [MAP_STYLES.satellite, MAP_STYLES.terrain]) {
      expect(style.available).toBe(false);
      expect(style.provider).toBeNull();
    }
  });
  it("retries a context fixture through the adapter without altering the sample data", async () => {
    const before = structuredClone(sampleData);
    const layer = await simulationApi.reloadContextLayer("hydrants");
    expect(layer.state).toBe("synthetic");
    layer.features = [];
    expect(sampleData).toEqual(before);
    await expect(
      simulationApi.reloadContextLayer("missing-layer"),
    ).rejects.toThrow("No context source");
  });
});
