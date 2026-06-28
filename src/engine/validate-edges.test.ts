import { describe, expect, it } from "vitest";
import {
  cacheNode,
  makeGraph,
  serverNode,
  sourceNode,
} from "@/engine/test-helpers";
import { validateEdges } from "@/engine/validate-edges";

describe("validateEdges", () => {
  it("rejects write to absorber-aside cache with structure violation", () => {
    const graph = makeGraph(
      [
        serverNode("app", { capacity: 1000, latBase: 1 }),
        cacheNode("cache", { capacity: 5000, latBase: 1, hitRatio: 0.8 }),
      ],
      [{ id: "e1", from: "app", to: "cache", kind: "write" }],
    );

    const violations = validateEdges(graph);

    expect(violations).toHaveLength(1);
    expect(violations[0]?.type).toBe("structure");
  });

  it("accepts read from web-client to app-server", () => {
    const graph = makeGraph(
      [sourceNode("src"), serverNode("app", { capacity: 1000, latBase: 1 })],
      [{ id: "e1", from: "src", to: "app", kind: "read" }],
    );

    const violations = validateEdges(graph);
    expect(violations).toHaveLength(0);
  });
});
