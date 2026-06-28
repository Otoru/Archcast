import { describe, expect, it } from "vitest";

import { computeCost, computeNodeCost } from "@/engine/cost";
import { createDefaultRegistry } from "@/engine/registry";
import { makeGraph, presetNode } from "@/engine/test-helpers";
import type { NodeResult } from "@/engine/types";

describe("computeNodeCost", () => {
  it("uses instances as footprint for fixed nodes", () => {
    const registry = createDefaultRegistry();
    const node = presetNode("app", "app-server", { instances: 3 });
    const resolved = registry.resolve(node);
    const cost = computeNodeCost(node, resolved, undefined);

    // app-server: costPerInstance 150, costPerCapacityUnit 0.05, capacity 2000
    expect(cost.footprint).toBe(3);
    expect(cost.nodeCost).toBe(3 * (150 + 2000 * 0.05));
  });

  it("uses provisioned as footprint for elastic nodes", () => {
    const registry = createDefaultRegistry();
    const node = presetNode("fn", "serverless", {});
    const resolved = registry.resolve(node);
    const result: NodeResult = {
      rho: 0.7,
      latency: 50,
      saturated: false,
      provisioned: 20,
    };
    const cost = computeNodeCost(node, resolved, result);

    // serverless: costPerInstance 0, costPerCapacityUnit 0.20, capacity 1000
    expect(cost.footprint).toBe(20);
    expect(cost.nodeCost).toBe(20 * (0 + 1000 * 0.2));
  });

  it("serverless with high provisioned is expensive (pedagogical vector)", () => {
    const registry = createDefaultRegistry();
    const node = presetNode("fn", "serverless", {});
    const resolved = registry.resolve(node);
    const cheap = computeNodeCost(node, resolved, {
      rho: 0.7,
      latency: 50,
      saturated: false,
      provisioned: 1,
    });
    const pricey = computeNodeCost(node, resolved, {
      rho: 0.7,
      latency: 50,
      saturated: false,
      provisioned: 100,
    });
    expect(pricey.nodeCost).toBeGreaterThan(cheap.nodeCost * 50);
  });
});

describe("computeCost", () => {
  it("sums monthly cost across all nodes", () => {
    const registry = createDefaultRegistry();
    const graph = makeGraph(
      [
        presetNode("src", "web-client", {}),
        presetNode("app", "app-server", { instances: 2 }),
        presetNode("db", "sql-db", { instances: 1 }),
        presetNode("q", "message-queue", { instances: 1 }),
      ],
      [],
    );
    const nodeResults: Record<string, NodeResult> = {
      src: { rho: 0, latency: 0, saturated: false },
      app: { rho: 0.5, latency: 40, saturated: false },
      db: { rho: 0.3, latency: 5, saturated: false },
      q: { rho: 0.2, latency: 0, saturated: false },
    };
    const result = computeCost(graph, nodeResults, registry);

    const expected =
      1 * (0 + 0 * 0) + // web-client
      2 * (150 + 2000 * 0.05) + // app-server x2
      1 * (400 + 5000 * 0.1) + // sql-db
      1 * (80 + 0 * 0.01); // message-queue (no capacity attr)
    expect(result.monthlyCost).toBeCloseTo(expected, 5);
    expect(result.breakdown).toHaveProperty("app");
    expect(result.breakdown).toHaveProperty("db");
  });

  it("elastic node contributes provisioned-scaled cost to the total", () => {
    const registry = createDefaultRegistry();
    const graph = makeGraph([presetNode("fn", "serverless", {})], []);
    const result = computeCost(
      graph,
      {
        fn: {
          rho: 0.7,
          latency: 50,
          saturated: false,
          provisioned: 50,
        },
      },
      registry,
    );
    expect(result.monthlyCost).toBe(50 * (0 + 1000 * 0.2));
  });
});
