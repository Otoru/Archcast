import { describe, expect, it } from "vitest";

import { runSimulation } from "@/engine";
import {
  defaultParams,
  makeGraph,
  presetNode,
  sourceNode,
} from "@/engine/test-helpers";
import type { ChallengeParams, Graph, Violation } from "@/engine/types";
import { buildVerdict } from "@/engine/verdict";

const params: ChallengeParams = {
  rps: 100,
  trafficPattern: "steady",
  readWriteRatio: 1,
  latencySlo: 1000,
  availabilitySlo: 0.99,
};

const emptyGraph: Graph = { nodes: [], edges: [] };

function buildInput(
  overrides: Partial<Parameters<typeof buildVerdict>[0]> = {},
) {
  return {
    graph: emptyGraph,
    params,
    nodeResults: {},
    edgeFlows: {},
    endToEndLatency: 0,
    systemAvailability: 1,
    structureViolations: [] as Violation[],
    presenceViolations: [] as Violation[],
    spofViolations: [] as Violation[],
    ...overrides,
  };
}

describe("buildVerdict budget", () => {
  it("flags a budget violation when monthlyCost exceeds budget", () => {
    const verdict = buildVerdict(
      buildInput({ monthlyCost: 5000, budget: 1000 }),
    );
    expect(verdict.passed).toBe(false);
    expect(verdict.violations.some((v) => v.type === "budget")).toBe(true);
    expect(verdict.monthlyCost).toBe(5000);
    expect(verdict.budget).toBe(1000);
  });

  it("does not flag budget when monthlyCost fits", () => {
    const verdict = buildVerdict(
      buildInput({ monthlyCost: 800, budget: 1000 }),
    );
    expect(verdict.violations.some((v) => v.type === "budget")).toBe(false);
  });

  it("does not flag budget when no budget is set", () => {
    const verdict = buildVerdict(buildInput({ monthlyCost: 999_999 }));
    expect(verdict.violations.some((v) => v.type === "budget")).toBe(false);
    expect(verdict.budget).toBeUndefined();
  });
});

describe("runSimulation cost/budget integration (spiky)", () => {
  it("serverless passes SLO but blows the budget at peak", () => {
    const graph = makeGraph(
      [sourceNode("src"), presetNode("fn", "serverless", {})],
      [{ id: "e1", from: "src", to: "fn", kind: "read" }],
    );

    const verdict = runSimulation(
      graph,
      defaultParams({
        rps: 1000,
        trafficPattern: "spiky",
        readWriteRatio: 1,
        latencySlo: 1000,
        budget: 1000,
      }),
    );

    // SLO holds: serverless never saturates and keeps latency bounded.
    expect(verdict.violations.some((v) => v.type === "saturation")).toBe(false);
    expect(verdict.violations.some((v) => v.type === "latency")).toBe(false);
    // ...but provisioning for the burst costs more than the budget allows.
    expect(verdict.monthlyCost).toBeGreaterThan(1000);
    expect(verdict.violations.some((v) => v.type === "budget")).toBe(true);
    expect(verdict.passed).toBe(false);
  });

  it("queue + fixed workers handle the burst and fit the budget", () => {
    const graph = makeGraph(
      [
        sourceNode("src"),
        presetNode("ingress", "app-server", {
          capacity: 10_000,
          latBase: 5,
          instances: 2,
        }),
        presetNode("queue", "message-queue", {
          drainRate: 1000,
          maxDepth: 1e6,
          instances: 2,
        }),
        presetNode("worker", "app-server", {
          capacity: 1500,
          latBase: 20,
          instances: 2,
        }),
      ],
      [
        { id: "e1", from: "src", to: "ingress", kind: "read" },
        { id: "e2", from: "ingress", to: "queue", kind: "async" },
        { id: "e3", from: "queue", to: "worker", kind: "async" },
      ],
    );

    const verdict = runSimulation(
      graph,
      defaultParams({
        rps: 1000,
        trafficPattern: "spiky",
        readWriteRatio: 1,
        latencySlo: 1000,
        budget: 2000,
      }),
    );

    expect(verdict.violations).toHaveLength(0);
    expect(verdict.passed).toBe(true);
    expect(verdict.monthlyCost).toBeLessThanOrEqual(2000);
  });
});
