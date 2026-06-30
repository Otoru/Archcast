import { describe, expect, it } from "vitest";

import { apportionChannel } from "@/engine/apportion";
import { createDefaultRegistry } from "@/engine/registry";
import { cacheNode, ensureTestCachePreset } from "@/engine/test-helpers";
import type { Edge, Graph, NodeInstance } from "@/engine/types";

const registry = createDefaultRegistry();

ensureTestCachePreset();

function makeGraph(nodes: NodeInstance[], edges: Edge[]): Graph {
  return { nodes, edges };
}

describe("apportionChannel", () => {
  it("splits read load proportionally between server peers", () => {
    const graph = makeGraph(
      [
        {
          id: "app",
          kind: "app-server",
          attrs: { capacity: 1000, latBase: 1 },
        },
        { id: "db1", kind: "app-server", attrs: { capacity: 100, latBase: 2 } },
        { id: "db2", kind: "app-server", attrs: { capacity: 100, latBase: 2 } },
      ],
      [
        { id: "e1", from: "app", to: "db1", kind: "read" },
        { id: "e2", from: "app", to: "db2", kind: "read" },
      ],
    );

    const result = apportionChannel("app", "read", 200, graph, registry);

    expect(result.deliveries.get("e1")).toBeCloseTo(100);
    expect(result.deliveries.get("e2")).toBeCloseTo(100);
    expect(result.hasValidDestination).toBe(true);
  });

  it("splits read load across three identical replicas", () => {
    const graph = makeGraph(
      [
        {
          id: "app",
          kind: "app-server",
          attrs: { capacity: 1000, latBase: 1 },
        },
        { id: "db1", kind: "app-server", attrs: { capacity: 100, latBase: 2 } },
        { id: "db2", kind: "app-server", attrs: { capacity: 100, latBase: 2 } },
        { id: "db3", kind: "app-server", attrs: { capacity: 100, latBase: 2 } },
      ],
      [
        { id: "e1", from: "app", to: "db1", kind: "read" },
        { id: "e2", from: "app", to: "db2", kind: "read" },
        { id: "e3", from: "app", to: "db3", kind: "read" },
      ],
    );

    const result = apportionChannel("app", "read", 300, graph, registry);

    expect(result.deliveries.get("e1")).toBeCloseTo(100);
    expect(result.deliveries.get("e2")).toBeCloseTo(100);
    expect(result.deliveries.get("e3")).toBeCloseTo(100);
  });

  it("routes cache-aside: cache sees full R, server sees residual", () => {
    const graph = makeGraph(
      [
        {
          id: "app",
          kind: "app-server",
          attrs: { capacity: 1000, latBase: 1 },
        },
        cacheNode("cache", { capacity: 5000, latBase: 1, hitRatio: 0.8 }),
        { id: "db", kind: "app-server", attrs: { capacity: 200, latBase: 3 } },
      ],
      [
        { id: "e1", from: "app", to: "cache", kind: "read" },
        { id: "e2", from: "app", to: "db", kind: "read" },
      ],
    );

    const result = apportionChannel("app", "read", 1000, graph, registry);

    expect(result.deliveries.get("e1")).toBeCloseTo(1000);
    expect(result.deliveries.get("e2")).toBeCloseTo(200);
  });

  it("contrasts split vs absorption with two read destinations", () => {
    const splitGraph = makeGraph(
      [
        {
          id: "app",
          kind: "app-server",
          attrs: { capacity: 1000, latBase: 1 },
        },
        { id: "db1", kind: "app-server", attrs: { capacity: 100, latBase: 2 } },
        { id: "db2", kind: "app-server", attrs: { capacity: 100, latBase: 2 } },
      ],
      [
        { id: "e1", from: "app", to: "db1", kind: "read" },
        { id: "e2", from: "app", to: "db2", kind: "read" },
      ],
    );

    const cacheGraph = makeGraph(
      [
        {
          id: "app",
          kind: "app-server",
          attrs: { capacity: 1000, latBase: 1 },
        },
        cacheNode("cache", { capacity: 5000, latBase: 1, hitRatio: 0.8 }),
        { id: "db", kind: "app-server", attrs: { capacity: 200, latBase: 3 } },
      ],
      [
        { id: "e1", from: "app", to: "cache", kind: "read" },
        { id: "e2", from: "app", to: "db", kind: "read" },
      ],
    );

    const split = apportionChannel("app", "read", 1000, splitGraph, registry);
    const cacheAside = apportionChannel(
      "app",
      "read",
      1000,
      cacheGraph,
      registry,
    );

    expect(split.deliveries.get("e1")).toBeCloseTo(500);
    expect(cacheAside.deliveries.get("e1")).toBeCloseTo(1000);
    expect(split.deliveries.get("e2")).toBeCloseTo(500);
    expect(cacheAside.deliveries.get("e2")).toBeCloseTo(200);
  });

  it("ignores write edges for absorber-aside destinations on read channel", () => {
    const graph = makeGraph(
      [
        {
          id: "app",
          kind: "app-server",
          attrs: { capacity: 1000, latBase: 1 },
        },
        cacheNode("cache", { capacity: 5000, latBase: 1, hitRatio: 0.5 }),
      ],
      [{ id: "e1", from: "app", to: "cache", kind: "write" }],
    );

    const result = apportionChannel("app", "read", 100, graph, registry);

    expect(result.hasValidDestination).toBe(false);
    expect(result.deliveries.size).toBe(0);
  });

  it("routes write channel only to nodes accepting write role", () => {
    const graph = makeGraph(
      [
        {
          id: "app",
          kind: "app-server",
          attrs: { capacity: 1000, latBase: 1 },
        },
        cacheNode("cache", { capacity: 5000, latBase: 1, hitRatio: 0.8 }),
        { id: "db", kind: "app-server", attrs: { capacity: 200, latBase: 3 } },
      ],
      [
        { id: "e1", from: "app", to: "cache", kind: "write" },
        { id: "e2", from: "app", to: "db", kind: "write" },
      ],
    );

    const result = apportionChannel("app", "write", 500, graph, registry);

    expect(result.deliveries.get("e1")).toBeUndefined();
    expect(result.deliveries.get("e2")).toBeCloseTo(500);
  });

  it("reports no valid destination when flow has nowhere to go", () => {
    const graph = makeGraph(
      [
        {
          id: "app",
          kind: "app-server",
          attrs: { capacity: 1000, latBase: 1 },
        },
        cacheNode("cache", { capacity: 5000, latBase: 1, hitRatio: 0.8 }),
      ],
      [],
    );

    const result = apportionChannel("app", "read", 100, graph, registry);

    expect(result.hasValidDestination).toBe(false);
  });

  it("ignora arestas que apontam para nós inexistentes (dangling)", () => {
    const graph = makeGraph(
      [
        {
          id: "app",
          kind: "app-server",
          attrs: { capacity: 1000, latBase: 1 },
        },
        { id: "db1", kind: "app-server", attrs: { capacity: 100, latBase: 2 } },
      ],
      [
        // valid edge + dangling edge (destination absent from the graph)
        { id: "e1", from: "app", to: "db1", kind: "read" },
        { id: "e2", from: "app", to: "ghost", kind: "read" },
      ],
    );

    const result = apportionChannel("app", "read", 100, graph, registry);

    // all flow goes to the single real destination; the dangling one is
    // discarded
    expect(result.deliveries.get("e1")).toBeCloseTo(100);
    expect(result.deliveries.has("e2")).toBe(false);
    expect(result.hasValidDestination).toBe(true);
  });
});
