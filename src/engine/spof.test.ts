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

  it("flags every single-instance relay on the unique source→sink path (LB behind a WAF)", () => {
    // src → waf → lb → app → db: every node in the chain (except db, the
    // sink) is a SPOF when it has 1 instance. Before the fix, the LB was NOT
    // flagged: removing it made the WAF (whose only output was the LB) become
    // a fake "sink" and remain reachable from src, so the algorithm understood
    // the path as intact. With sinks derived from the original graph, db
    // becomes the reference sink — removing the LB makes it unreachable.
    const graph = makeGraph(
      [
        sourceNode("src"),
        presetNode("waf", "waf", { capacity: 5e4, latBase: 5, instances: 1 }),
        presetNode("lb", "load-balancer", {
          capacity: 1e5,
          latBase: 1,
          instances: 1,
        }),
        serverNode("app", { capacity: 2000, latBase: 20, instances: 1 }),
        presetNode("db", "sql-db", {
          capacity: 5000,
          latBase: 5,
          instances: 1,
        }),
      ],
      [
        { id: "e1", from: "src", to: "waf", kind: "read" },
        { id: "e2", from: "waf", to: "lb", kind: "read" },
        { id: "e3", from: "lb", to: "app", kind: "read" },
        { id: "e4", from: "app", to: "db", kind: "read" },
      ],
    );

    const violations = detectSpof(graph);
    const spofIds = new Set(
      violations.filter((v) => v.type === "spof").map((v) => v.nodeId),
    );
    expect(spofIds.has("waf")).toBe(true);
    expect(spofIds.has("lb")).toBe(true);
    expect(spofIds.has("app")).toBe(true);
  });
});
