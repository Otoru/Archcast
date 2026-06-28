import { describe, expect, it } from "vitest";

import { runSimulation } from "@/engine";
import {
  defaultParams,
  makeGraph,
  presetNode,
  sourceNode,
} from "@/engine/test-helpers";
import { ELASTIC_TARGET_RHO } from "@/engine/types";

describe("flags", () => {
  it("elastic serverless never saturates and reports provisioned", () => {
    const graph = makeGraph(
      [
        sourceNode("src"),
        presetNode("fn", "serverless", { capacity: 1000, latBase: 50 }),
      ],
      [{ id: "e1", from: "src", to: "fn", kind: "read" }],
    );

    const verdict = runSimulation(
      graph,
      defaultParams({ rps: 50000, readWriteRatio: 1 }),
    );

    expect(verdict.nodes.fn?.saturated).toBe(false);
    expect(verdict.nodes.fn?.provisioned).toBe(
      Math.ceil(50000 / (ELASTIC_TARGET_RHO * 1000)),
    );
  });

  it("drop flag on waf records dropped traffic", () => {
    const graph = makeGraph(
      [
        sourceNode("src"),
        presetNode("waf", "waf", { hitRatio: 0.02, capacity: 5e4, latBase: 5 }),
        presetNode("app", "app-server", { capacity: 5000, latBase: 10 }),
      ],
      [
        { id: "e1", from: "src", to: "waf", kind: "read" },
        { id: "e2", from: "waf", to: "app", kind: "read" },
      ],
    );

    const verdict = runSimulation(
      graph,
      defaultParams({ rps: 1000, readWriteRatio: 1 }),
    );

    expect(verdict.edgeFlows.e2?.read).toBeCloseTo(980);
    expect(verdict.nodes.waf?.dropped).toBeCloseTo(20);
  });

  it("rateCap on api-gateway rejects excess and flags ratelimit", () => {
    const graph = makeGraph(
      [
        sourceNode("src"),
        presetNode("gw", "api-gateway", {
          capacity: 2e4,
          latBase: 5,
          rateCap: 2e4,
        }),
      ],
      [{ id: "e1", from: "src", to: "gw", kind: "read" }],
    );

    const verdict = runSimulation(
      graph,
      defaultParams({ rps: 30000, readWriteRatio: 1 }),
    );

    expect(verdict.nodes.gw?.rejectedRps).toBeCloseTo(10000);
    expect(verdict.violations.some((v) => v.type === "ratelimit")).toBe(true);
  });
});
