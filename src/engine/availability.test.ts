import { describe, expect, it } from "vitest";
import { runSimulation } from "@/engine";
import { computeSystemAvailability } from "@/engine/availability";
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
