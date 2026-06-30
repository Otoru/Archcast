import { describe, expect, it } from "vitest";
import { runSimulation } from "@/engine";
import {
  checkAvailability,
  computeSystemAvailability,
} from "@/engine/availability";
import {
  defaultParams,
  makeGraph,
  presetNode,
  serverNode,
  sourceNode,
} from "@/engine/test-helpers";
import { effectiveAvailability } from "@/engine/types";

describe("availability", () => {
  it("combines parallel sql-db replicas as 1-(1-a)^2", () => {
    const a = 0.999;
    const graph = makeGraph(
      [
        sourceNode("src"),
        serverNode("app", { capacity: 5000, latBase: 5 }),
        presetNode("db1", "sql-db", { availability: a, instances: 1 }),
        presetNode("db2", "sql-db", { availability: a, instances: 1 }),
      ],
      [
        { id: "e1", from: "src", to: "app", kind: "read" },
        { id: "e2", from: "app", to: "db1", kind: "read" },
        { id: "e3", from: "app", to: "db2", kind: "read" },
      ],
    );

    const parallelDb =
      1 - (1 - effectiveAvailability({ availability: a, instances: 1 })) ** 2;
    const appAvail = effectiveAvailability({
      availability: 0.99,
      instances: 1,
    });
    const expected = appAvail * parallelDb;

    expect(computeSystemAvailability(graph)).toBeCloseTo(expected, 5);
  });

  it("treats distinct-kind fan-out as series (all dependencies required)", () => {
    // app → db (sql-db) + feature-flag: different kinds, both required.
    // The feature-flag availability MUST NOT be masked by the db's.
    const ff = 0.99;
    const graph = makeGraph(
      [
        sourceNode("src"),
        serverNode("app", { capacity: 5000, latBase: 5, availability: 1 }),
        presetNode("db", "sql-db", { availability: 0.9999, instances: 1 }),
        presetNode("flag", "feature-flags", { availability: ff, instances: 1 }),
      ],
      [
        { id: "e1", from: "src", to: "app", kind: "read" },
        { id: "e2", from: "app", to: "db", kind: "read" },
        { id: "e3", from: "app", to: "flag", kind: "read" },
      ],
    );

    const expected =
      effectiveAvailability({ availability: 0.9999, instances: 1 }) *
      effectiveAvailability({ availability: ff, instances: 1 });

    // Series: ~0.9999 * 0.99 ≈ 0.9899, clearly pulled by the feature-flag —
    // not the ~0.9999 that the parallel (combineParallel) would give.
    expect(computeSystemAvailability(graph)).toBeCloseTo(expected, 5);
    expect(computeSystemAvailability(graph)).toBeLessThan(0.991);
  });

  it("lowering a single-instance dependency moves system availability", () => {
    const mk = (flagAvail: number) =>
      makeGraph(
        [
          sourceNode("src"),
          serverNode("app", { capacity: 5000, latBase: 5, availability: 1 }),
          presetNode("db", "sql-db", { availability: 0.9999, instances: 1 }),
          presetNode("flag", "feature-flags", {
            availability: flagAvail,
            instances: 1,
          }),
        ],
        [
          { id: "e1", from: "src", to: "app", kind: "read" },
          { id: "e2", from: "app", to: "db", kind: "read" },
          { id: "e3", from: "app", to: "flag", kind: "read" },
        ],
      );

    expect(computeSystemAvailability(mk(0.999))).toBeGreaterThan(
      computeSystemAvailability(mk(0.99)),
    );
  });

  it("multiplies availability along series path", () => {
    const graph = makeGraph(
      [
        sourceNode("src"),
        serverNode("app", { capacity: 5000, latBase: 5, availability: 0.99 }),
        presetNode("db", "sql-db", { availability: 0.999, instances: 1 }),
      ],
      [
        { id: "e1", from: "src", to: "app", kind: "read" },
        { id: "e2", from: "app", to: "db", kind: "read" },
      ],
    );

    const expected =
      effectiveAvailability({ availability: 0.99, instances: 1 }) *
      effectiveAvailability({ availability: 0.999, instances: 1 });

    expect(computeSystemAvailability(graph)).toBeCloseTo(expected, 5);
  });

  it("formats availability violation with two decimal places", () => {
    const result = checkAvailability({ nodes: [], edges: [] }, 0.9988, 0.999);
    expect(result.passed).toBe(false);
    expect(result.detail).toBe(
      "System availability 99.88% is below SLO 99.90%",
    );
  });

  it("generates availability violation when below SLO", () => {
    const graph = makeGraph(
      [
        sourceNode("src"),
        presetNode("app", "app-server", {
          capacity: 5000,
          latBase: 5,
          availability: 0.5,
        }),
      ],
      [{ id: "e1", from: "src", to: "app", kind: "read" }],
    );

    const verdict = runSimulation(
      graph,
      defaultParams({ availabilitySlo: 0.99 }),
    );

    expect(verdict.violations.some((v) => v.type === "availability")).toBe(
      true,
    );
  });

  it("passes when availability meets SLO", () => {
    const graph = makeGraph(
      [
        sourceNode("src"),
        presetNode("app", "app-server", {
          capacity: 5000,
          latBase: 5,
          availability: 0.999,
        }),
      ],
      [{ id: "e1", from: "src", to: "app", kind: "read" }],
    );

    const verdict = runSimulation(
      graph,
      defaultParams({ availabilitySlo: 0.99 }),
    );

    expect(verdict.violations.some((v) => v.type === "availability")).toBe(
      false,
    );
  });
});
