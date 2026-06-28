import { describe, expect, it } from "vitest";

import { runSimulation } from "@/engine";
import {
  defaultParams,
  makeGraph,
  presetNode,
  serverNode,
  sourceNode,
} from "@/engine/test-helpers";

describe("async-buffer", () => {
  it("does not saturate below drainRate and does not add sync latency", () => {
    const graph = makeGraph(
      [
        sourceNode("src"),
        serverNode("app", { capacity: 10000, latBase: 5 }),
        presetNode("queue", "message-queue", {
          drainRate: 5000,
          maxDepth: 1e6,
          latBase: 5,
        }),
        presetNode("worker", "worker", { capacity: 1000, latBase: 100 }),
      ],
      [
        { id: "e1", from: "src", to: "app", kind: "read" },
        { id: "e2", from: "app", to: "queue", kind: "async" },
        { id: "e3", from: "queue", to: "worker", kind: "async" },
      ],
    );

    const verdict = runSimulation(
      graph,
      defaultParams({ rps: 10, readWriteRatio: 1 }),
    );

    expect(verdict.nodes.queue?.saturated).toBe(false);
    expect(verdict.nodes.queue?.rho).toBeCloseTo(10 / 5000);
    expect(verdict.endToEndLatency).toBeCloseTo(5 * Math.log(100), 0);
  });

  it("saturates when lambda exceeds drainRate", () => {
    const graph = makeGraph(
      [
        sourceNode("src"),
        serverNode("app", { capacity: 10000, latBase: 5 }),
        presetNode("queue", "message-queue", {
          drainRate: 5000,
          maxDepth: 1000,
          latBase: 5,
        }),
      ],
      [
        { id: "e1", from: "src", to: "app", kind: "read" },
        { id: "e2", from: "app", to: "queue", kind: "async" },
      ],
    );

    const verdict = runSimulation(
      graph,
      defaultParams({ rps: 8000, readWriteRatio: 1 }),
    );

    expect(verdict.nodes.queue?.saturated).toBe(true);
    expect(verdict.violations.some((v) => v.type === "saturation")).toBe(true);
  });
});
