import { describe, expect, it } from "vitest";

import type {
  ChallengeParams,
  Graph,
  NodeResult,
  Violation,
} from "@/engine/types";
import { buildVerdict } from "@/engine/verdict";

const params: ChallengeParams = {
  rps: 100,
  trafficPattern: "steady",
  readWriteRatio: 1,
  latencySlo: 50,
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

describe("buildVerdict", () => {
  it("flags saturation violations", () => {
    const nodes: Record<string, NodeResult> = {
      db: {
        rho: 1.2,
        latency: Number.POSITIVE_INFINITY,
        saturated: true,
      },
    };

    const verdict = buildVerdict(
      buildInput({
        nodeResults: nodes,
        endToEndLatency: 10,
      }),
    );

    expect(verdict.passed).toBe(false);
    expect(verdict.violations).toContainEqual({
      type: "saturation",
      nodeId: "db",
      detail: expect.stringContaining("db"),
    });
  });

  it("flags latency SLO violations", () => {
    const nodes: Record<string, NodeResult> = {
      app: { rho: 0.1, latency: 5, saturated: false },
    };

    const verdict = buildVerdict(
      buildInput({
        params: { ...params, latencySlo: 20 },
        nodeResults: nodes,
        endToEndLatency: 100,
      }),
    );

    expect(verdict.passed).toBe(false);
    expect(verdict.violations).toContainEqual({
      type: "latency",
      detail: expect.stringContaining("100"),
    });
  });

  it("includes structure violations", () => {
    const structureViolations: Violation[] = [
      {
        type: "structure",
        nodeId: "app",
        detail: "read channel has flow but no valid destination",
      },
    ];

    const verdict = buildVerdict(buildInput({ structureViolations }));

    expect(verdict.passed).toBe(false);
    expect(verdict.violations).toEqual(structureViolations);
  });

  it("passes when there are no violations", () => {
    const verdict = buildVerdict(
      buildInput({
        params: { ...params, latencySlo: 200 },
        nodeResults: {
          app: { rho: 0.1, latency: 5, saturated: false },
        },
        endToEndLatency: 10,
      }),
    );

    expect(verdict.passed).toBe(true);
    expect(verdict.violations).toHaveLength(0);
  });

  it("flags ratelimit violations from rejectedRps", () => {
    const verdict = buildVerdict(
      buildInput({
        nodeResults: {
          gw: { rho: 1, latency: 5, saturated: false, rejectedRps: 500 },
        },
      }),
    );

    expect(verdict.violations.some((v) => v.type === "ratelimit")).toBe(true);
  });
});
