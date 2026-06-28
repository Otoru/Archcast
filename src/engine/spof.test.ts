import { describe, expect, it } from "vitest";

import { detectSpof } from "@/engine/spof";
import {
  makeGraph,
  presetNode,
  serverNode,
  sourceNode,
} from "@/engine/test-helpers";

describe("detectSpof", () => {
  it("flags single-instance node whose removal disconnects graph", () => {
    const graph = makeGraph(
      [
        sourceNode("src"),
        serverNode("app", { capacity: 1000, latBase: 5, instances: 1 }),
        presetNode("db", "sql-db", {
          capacity: 5000,
          latBase: 5,
          instances: 1,
        }),
      ],
      [
        { id: "e1", from: "src", to: "app", kind: "read" },
        { id: "e2", from: "app", to: "db", kind: "read" },
      ],
    );

    const violations = detectSpof(graph);

    expect(violations.some((v) => v.nodeId === "app")).toBe(true);
  });

  it("does not flag node with instances >= 2", () => {
    const graph = makeGraph(
      [
        sourceNode("src"),
        serverNode("app", { capacity: 1000, latBase: 5, instances: 2 }),
      ],
      [{ id: "e1", from: "src", to: "app", kind: "read" }],
    );

    const violations = detectSpof(graph);
    expect(violations.filter((v) => v.nodeId === "app")).toHaveLength(0);
  });
});
