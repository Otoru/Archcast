import { describe, expect, it } from "vitest";

import { computeEndToEndLatency } from "@/engine/latency";
import { createDefaultRegistry } from "@/engine/registry";
import {
  cacheNode,
  ensureTestCachePreset,
  serverNode,
  sourceNode,
} from "@/engine/test-helpers";
import type { Graph, NodeResult } from "@/engine/types";
import { p99FromLatency } from "@/engine/types";

const registry = createDefaultRegistry();

ensureTestCachePreset();

function resultsFrom(
  entries: Record<string, Partial<NodeResult> & { latBase?: number }>,
): Record<string, NodeResult> {
  const out: Record<string, NodeResult> = {};
  for (const [id, entry] of Object.entries(entries)) {
    const latBase = entry.latBase ?? entry.latency ?? 0;
    out[id] = {
      rho: entry.rho ?? 0,
      latency: entry.latency ?? latBase,
      saturated: entry.saturated ?? false,
    };
  }
  return out;
}

describe("computeEndToEndLatency", () => {
  it("weights downstream server p99 by cache miss ratio on read path", () => {
    const graph: Graph = {
      nodes: [
        sourceNode("src"),
        serverNode("app", { capacity: 1000, latBase: 2 }),
        cacheNode("cache", { capacity: 5000, latBase: 1, hitRatio: 0.8 }),
        serverNode("db", { capacity: 500, latBase: 4 }),
      ],
      edges: [
        { id: "e1", from: "src", to: "app", kind: "read" },
        { id: "e2", from: "app", to: "cache", kind: "read" },
        { id: "e3", from: "app", to: "db", kind: "read" },
      ],
    };

    const nodeResults = resultsFrom({
      src: { latency: 0 },
      app: { latency: 2 },
      cache: { latency: 1 },
      db: { latency: 4 },
    });

    const latency = computeEndToEndLatency(graph, nodeResults, registry);

    // Cache lookup always paid (p99(1)); DB only reached on a miss → its p99
    // is weighted by passThrough = 1 − hitRatio = 0.2.
    const expected =
      p99FromLatency(2) + p99FromLatency(1) + 0.2 * p99FromLatency(4);
    expect(latency).toBeCloseTo(expected);
  });

  it("uses max p99 among parallel server replicas", () => {
    const graph: Graph = {
      nodes: [
        { id: "src", kind: "web-client", attrs: {} },
        {
          id: "app",
          kind: "app-server",
          attrs: { capacity: 1000, latBase: 1 },
        },
        {
          id: "db1",
          kind: "app-server",
          attrs: { capacity: 100, latBase: 2 },
        },
        {
          id: "db2",
          kind: "app-server",
          attrs: { capacity: 100, latBase: 6 },
        },
      ],
      edges: [
        { id: "e1", from: "src", to: "app", kind: "read" },
        { id: "e2", from: "app", to: "db1", kind: "read" },
        { id: "e3", from: "app", to: "db2", kind: "read" },
      ],
    };

    const nodeResults = resultsFrom({
      src: { latency: 0 },
      app: { latency: 1 },
      db1: { latency: 2 },
      db2: { latency: 6 },
    });

    const latency = computeEndToEndLatency(graph, nodeResults, registry);
    const expected = p99FromLatency(1) + p99FromLatency(6);
    expect(latency).toBeCloseTo(expected);
  });

  it("ignores async edges in latency chain", () => {
    const graph: Graph = {
      nodes: [
        { id: "src", kind: "web-client", attrs: {} },
        {
          id: "app",
          kind: "app-server",
          attrs: { capacity: 1000, latBase: 2 },
        },
        {
          id: "queue",
          kind: "message-queue",
          attrs: { drainRate: 1000, maxDepth: 1e6, latBase: 50 },
        },
        {
          id: "worker",
          kind: "worker",
          attrs: { capacity: 1000, latBase: 100 },
        },
      ],
      edges: [
        { id: "e1", from: "src", to: "app", kind: "read" },
        { id: "e2", from: "app", to: "queue", kind: "async" },
        { id: "e3", from: "queue", to: "worker", kind: "async" },
      ],
    };

    const nodeResults = resultsFrom({
      src: { latency: 0 },
      app: { latency: 2 },
      queue: { latency: 50 },
      worker: { latency: 100 },
    });

    const latency = computeEndToEndLatency(graph, nodeResults, registry);
    expect(latency).toBeCloseTo(p99FromLatency(2));
  });
});
