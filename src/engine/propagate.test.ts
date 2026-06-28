import { describe, expect, it } from "vitest";

import { propagate } from "@/engine/propagate";
import { createDefaultRegistry } from "@/engine/registry";
import type { ChallengeParams, Graph } from "@/engine/types";

const registry = createDefaultRegistry();

const baseParams: ChallengeParams = {
  rps: 100,
  trafficPattern: "steady",
  readWriteRatio: 0.8,
  latencySlo: 1000,
  availabilitySlo: 0.99,
};

describe("propagate", () => {
  it("aggregates fan-in from two sources onto one server", () => {
    const graph: Graph = {
      nodes: [
        { id: "src1", kind: "web-client", attrs: {} },
        { id: "src2", kind: "web-client", attrs: {} },
        {
          id: "db",
          kind: "app-server",
          attrs: { capacity: 1000, latBase: 2 },
        },
      ],
      edges: [
        { id: "e1", from: "src1", to: "db", kind: "read" },
        { id: "e2", from: "src2", to: "db", kind: "read" },
      ],
    };

    const result = propagate(graph, baseParams, registry);

    expect(result.edgeFlows.e1?.read).toBeCloseTo(80);
    expect(result.edgeFlows.e2?.read).toBeCloseTo(80);
    expect(result.nodeResults.db?.rho).toBeCloseTo(160 / 1000);
  });

  it("splits read and write at the source by readWriteRatio", () => {
    const graph: Graph = {
      nodes: [
        { id: "src", kind: "web-client", attrs: {} },
        {
          id: "app",
          kind: "app-server",
          attrs: { capacity: 1000, latBase: 1 },
        },
        {
          id: "db",
          kind: "app-server",
          attrs: { capacity: 1000, latBase: 2 },
        },
      ],
      edges: [
        { id: "e1", from: "src", to: "app", kind: "read" },
        { id: "e2", from: "src", to: "db", kind: "write" },
      ],
    };

    const result = propagate(graph, baseParams, registry);

    expect(result.edgeFlows.e1?.read).toBeCloseTo(80);
    expect(result.edgeFlows.e2?.write).toBeCloseTo(20);
    expect(result.nodeResults.app?.rho).toBeCloseTo(80 / 1000);
    expect(result.nodeResults.db?.rho).toBeCloseTo(20 / 1000);
  });
});
