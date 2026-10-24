import { describe, expect, it } from "vitest";
import { normalizeCoordinates } from "./coordinates";
import { simulationApi } from "./api";
import { sampleData } from "./mockData";
import { correctIncident } from "./state";

describe("incident coordinate contract", () => {
  it("accepts explicit finite coordinates with provenance, including zero", () => {
    expect(
      normalizeCoordinates({ latitude: 0, longitude: 0, source: "reported" }),
    ).toEqual({ latitude: 0, longitude: 0, source: "reported" });
  });
  it.each([
    undefined,
    null,
    {},
    { latitude: "30", longitude: -90, source: "simulated" },
    { latitude: NaN, longitude: -90, source: "simulated" },
    { latitude: 30, longitude: Infinity, source: "reported" },
    { latitude: 91, longitude: 0, source: "reported" },
    { latitude: 30, longitude: -181, source: "reported" },
    { latitude: 30, longitude: -90 },
    { latitude: 30, longitude: -90, source: "verified" },
  ])("normalizes unknown or invalid coordinates to null: %j", (value) => {
    expect(normalizeCoordinates(value)).toBeNull();
  });
  it("loads coordinates through the adapter and labels only the fictional point as simulated", async () => {
    const snapshot = await simulationApi.load();
    expect(snapshot.incidents[0].coordinates?.source).toBe("simulated");
    expect(snapshot.incidents[1].coordinates).toBeNull();
    expect(snapshot.incidents[2].coordinates).toBeNull();
  });
  it.each(["location", "detail"] as const)(
    "clears stale coordinates on a text-only %s correction without inventing a replacement",
    (field) => {
      const original = structuredClone(sampleData);
      const corrected = correctIncident(original, "R4-001", {
        field,
        value: "Unknown",
        reason: "Caller could not verify this location.",
      });
      expect(corrected.incidents[0].coordinates).toBeNull();
      expect(corrected.activity[0].detail).toContain("Coordinates cleared");
      expect(original.incidents[0].coordinates?.source).toBe("simulated");
    },
  );
  it("preserves coordinate provenance during non-location corrections", () => {
    const corrected = correctIncident(structuredClone(sampleData), "R4-001", {
      field: "hazards",
      value: "Unknown",
      reason: "Caller retracted hazard report.",
    });
    expect(corrected.incidents[0].coordinates).toEqual(
      sampleData.incidents[0].coordinates,
    );
  });
});
