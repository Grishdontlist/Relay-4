import { describe, expect, it } from "vitest";
import { sampleData } from "./mockData";
import {
  acknowledgeAssignment,
  approveAssignment,
  correctIncident,
  reviewCall,
} from "./state";
const fresh = () => structuredClone(sampleData);
describe("shared simulation workflows", () => {
  it("preserves corrections and evidence in history without mutating source data", () => {
    const original = fresh();
    const next = correctIncident(original, "R4-001", {
      field: "location",
      value: "Unknown",
      reason: "Caller could not verify the market name.",
    });
    expect(next.incidents[0].location).toBe("Unknown");
    expect(next.activity[0].detail).toContain("Cypress Bend Market");
    expect(next.activity[0].detail).toContain("Caller could not verify");
    expect(original.incidents[0].location).toBe("Cypress Bend Market");
  });
  it("rejects missing correction evidence", () => {
    expect(() =>
      correctIncident(fresh(), "R4-001", {
        field: "people",
        value: "Unknown",
        reason: " ",
      }),
    ).toThrow();
  });
  it("approves an assignment, prevents conflicts, and acknowledges receipt idempotently", () => {
    const approved = approveAssignment(fresh(), "R4-001", "U07");
    const assignment = approved.assignments.find(
      (a) => a.incidentId === "R4-001",
    )!;
    expect(assignment.acknowledged).toBe(false);
    expect(approved.incidents[0].status).toBe("Assigned");
    expect(() => approveAssignment(approved, "R4-002", "U07")).toThrow();
    const reinforced = approveAssignment(approved, "R4-001", "U12");
    expect(
      reinforced.assignments.filter((a) => a.incidentId === "R4-001"),
    ).toHaveLength(2);
    const received = acknowledgeAssignment(approved, assignment.id);
    expect(
      received.assignments.find((a) => a.id === assignment.id)?.acknowledged,
    ).toBe(true);
    expect(received.activity[0].detail).toContain("Travel status: Unknown");
    expect(acknowledgeAssignment(received, assignment.id).activity.length).toBe(
      received.activity.length,
    );
  });
  it("keeps latest hazards after assignment and retains assignment state", () => {
    const approved = approveAssignment(fresh(), "R4-001", "U07");
    const changed = correctIncident(approved, "R4-001", {
      field: "hazards",
      value: "Unknown",
      reason: "Caller retracted the report.",
    });
    expect(changed.incidents[0].hazards).toBe("Unknown");
    expect(changed.incidents[0].status).toBe("Assigned");
  });
  it("moves and unlinks a call consistently on both sides of the relationship", () => {
    const linked = reviewCall(fresh(), "CALL-003", "R4-001", true);
    expect(linked.calls.find((c) => c.id === "CALL-003")?.incidentId).toBe(
      "R4-001",
    );
    expect(linked.incidents[0].callIds).toContain("CALL-003");
    expect(linked.incidents[1].callIds).not.toContain("CALL-003");
    const unlinked = reviewCall(linked, "CALL-003", "R4-001", false);
    expect(
      unlinked.calls.find((c) => c.id === "CALL-003")?.incidentId,
    ).toBeNull();
    expect(unlinked.incidents[0].callIds).not.toContain("CALL-003");
  });
});
