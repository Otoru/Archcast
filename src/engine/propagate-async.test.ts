import { describe, expect, it } from "vitest";

import { propagate } from "@/engine/propagate";
import { createDefaultRegistry } from "@/engine/registry";
import {
  defaultParams,
  makeGraph,
  presetNode,
  serverNode,
  sourceNode,
} from "@/engine/test-helpers";

describe("propagate async routing", () => {
  it("routes sync load from app to message-queue via async edge", () => {
    const graph = makeGraph(
      [
        sourceNode("src"),
        serverNode("app", { capacity: 10000, latBase: 5 }),
        presetNode("queue", "message-queue", {
          drainRate: 5000,
          maxDepth: 1e6,
        }),
      ],
      [
        { id: "e1", from: "src", to: "app", kind: "read" },
        { id: "e2", from: "app", to: "queue", kind: "async" },
      ],
    );

    const result = propagate(
      graph,
      defaultParams({ rps: 3000, readWriteRatio: 1 }),
      createDefaultRegistry(),
    );

    expect(result.edgeFlows.e2?.async).toBeCloseTo(3000);
    expect(result.nodeResults.queue?.rho).toBeCloseTo(0.6);
  });
});
