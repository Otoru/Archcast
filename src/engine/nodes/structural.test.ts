import { describe, expect, it } from "vitest";

import { runSimulation } from "@/engine";
import { propagate } from "@/engine/propagate";
import { createDefaultRegistry } from "@/engine/registry";
import {
  defaultParams,
  makeGraph,
  presetNode,
  sourceNode,
} from "@/engine/test-helpers";

describe("structural", () => {
  it("feature-flags does not receive or emit lambda", () => {
    const graph = makeGraph(
      [
        sourceNode("src"),
        presetNode("ff", "feature-flags", {}),
        presetNode("app", "app-server", { capacity: 1000, latBase: 5 }),
      ],
      [{ id: "e1", from: "src", to: "app", kind: "read" }],
    );

    const result = propagate(graph, defaultParams(), createDefaultRegistry());

    expect(result.nodeResults.ff).toBeUndefined();
    expect(Object.keys(result.edgeFlows)).not.toContain("ff");
  });

  it("missing required feature-flags triggers presence violation", () => {
    const graph = makeGraph(
      [
        sourceNode("src"),
        presetNode("app", "app-server", { capacity: 1000, latBase: 5 }),
      ],
      [{ id: "e1", from: "src", to: "app", kind: "read" }],
    );

    const verdict = runSimulation(graph, {
      ...defaultParams(),
      requiredKinds: ["feature-flags"],
    });

    expect(verdict.violations.some((v) => v.type === "presence")).toBe(true);
  });

  it("single feature-flags triggers spof as structural infrastructure", () => {
    const graph = makeGraph(
      [
        sourceNode("src"),
        presetNode("ff", "feature-flags", {}),
        presetNode("app", "app-server", { capacity: 1000, latBase: 5 }),
      ],
      [{ id: "e1", from: "src", to: "app", kind: "read" }],
    );

    const verdict = runSimulation(graph, defaultParams());

    expect(
      verdict.violations.some((v) => v.type === "spof" && v.nodeId === "ff"),
    ).toBe(true);
  });
});
