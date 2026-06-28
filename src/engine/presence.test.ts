import { describe, expect, it } from "vitest";

import { checkPresence } from "@/engine/presence";
import { makeGraph, presetNode, sourceNode } from "@/engine/test-helpers";

describe("checkPresence", () => {
  it("flags missing required kinds", () => {
    const graph = makeGraph(
      [
        sourceNode("src"),
        presetNode("app", "app-server", { capacity: 1000, latBase: 5 }),
      ],
      [],
    );

    const violations = checkPresence(graph, {
      rps: 100,
      trafficPattern: "steady",
      readWriteRatio: 1,
      latencySlo: 1000,
      availabilitySlo: 0.99,
      requiredKinds: ["dns", "app-server"],
    });

    expect(violations).toHaveLength(1);
    expect(violations[0]?.type).toBe("presence");
    expect(violations[0]?.detail).toContain("dns");
  });
});
