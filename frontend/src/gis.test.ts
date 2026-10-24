import { describe, expect, it } from "vitest";
import { sampleData } from "./mockData";
import {
  assignmentStatus,
  buildMapLayers,
  featureHasGeometry,
  matchesCategory,
  tagLabels,
} from "./gis";
import {
  acknowledgeAssignment,
  approveAssignment,
  correctIncident,
} from "./state";
describe("GIS incident and assignment model", () => {
  it("matches both the primary accident category and secondary fire hazard without changing reported facts", () => {
    const incident = sampleData.incidents.find((i) => i.id === "R4-004")!;
    expect(matchesCategory(incident, "accident")).toBe(true);
    expect(matchesCategory(incident, "fire")).toBe(true);
    expect(matchesCategory(incident, "medical")).toBe(false);
    expect(tagLabels(incident)).toEqual(["Accident", "Fire hazard"]);
    expect(incident.hazards).toContain("Fuel leakage");
  });
  it("supports independent human-approved fire and EMS assignments and receipt status", () => {
    let data = approveAssignment(structuredClone(sampleData), "R4-004", "U07");
    data = approveAssignment(data, "R4-004", "U09");
    expect(assignmentStatus(data, "R4-004")).toBe(
      "2 approved · 0 acknowledged",
    );
    expect(() => approveAssignment(data, "R4-005", "U09")).toThrow();
    const ems = data.assignments.find((a) => a.unitId === "U09")!;
    data = acknowledgeAssignment(data, ems.id);
    expect(assignmentStatus(data, "R4-004")).toBe(
      "2 approved · 1 acknowledged",
    );
    expect(data.assignments.find((a) => a.unitId === "U07")?.acknowledged).toBe(
      false,
    );
    expect(
      data.assignments.find((a) => a.unitId === "U09")?.acknowledgedAt,
    ).toBeTruthy();
  });
  it("derives context from shared assignments, leaves unknown positions unknown, and updates hazard reports", () => {
    let data = structuredClone(sampleData);
    expect(
      buildMapLayers(data).find((l) => l.id === "assigned-ems")?.features,
    ).toHaveLength(0);
    data = approveAssignment(data, "R4-004", "U09");
    expect(
      buildMapLayers(data).find((l) => l.id === "assigned-ems")?.features[0]
        .description,
    ).toContain("R4-004");
    const closure = buildMapLayers(data).find((l) => l.id === "road-blockages")!
      .features[0];
    expect(featureHasGeometry(closure)).toBe(false);
    data = correctIncident(data, "R4-004", {
      field: "hazards",
      value: "Unknown",
      reason: "Report retracted.",
    });
    expect(
      buildMapLayers(data)
        .find((l) => l.id === "fire-hazards")
        ?.features.find((f) => f.id === "R4-004")?.description,
    ).toContain("Unknown");
    expect(data.incidents.find((i) => i.id === "R4-004")?.tags).toContain(
      "fire",
    );
  });
  it("handles absent static context and unavailable layers without inventing a feed", () => {
    const data = { ...structuredClone(sampleData), contextLayers: [] };
    expect(buildMapLayers(data)).toHaveLength(5);
    const unavailable = sampleData.contextLayers.find(
      (l) => l.state === "unavailable",
    )!;
    expect(unavailable.features).toEqual([]);
  });
});
