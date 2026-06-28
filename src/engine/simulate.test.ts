import { describe, expect, it } from "vitest";

import { runSimulation } from "@/engine";
import { createDefaultRegistry } from "@/engine/registry";
import { simulate } from "@/engine/simulate";
import {
  defaultParams,
  makeGraph,
  presetNode,
  sourceNode,
} from "@/engine/test-helpers";

const registry = createDefaultRegistry();

function spiky(overrides: Parameters<typeof defaultParams>[0] = {}) {
  return defaultParams({
    rps: 1000,
    trafficPattern: "spiky",
    readWriteRatio: 1,
    latencySlo: 1000,
    ...overrides,
  });
}

describe("simulate", () => {
  it("A: a queue before the bottleneck smooths the burst — bottleneck never saturates, backlog grows and drains", () => {
    const base = 1000;
    const burst = base * 10;
    const withQueue = makeGraph(
      [
        sourceNode("src"),
        presetNode("ingress", "app-server", {
          capacity: 50_000,
          latBase: 5,
        }),
        presetNode("queue", "message-queue", {
          drainRate: base,
          maxDepth: 1e6,
        }),
        presetNode("worker", "app-server", {
          capacity: 1500,
          latBase: 20,
        }),
      ],
      [
        { id: "e1", from: "src", to: "ingress", kind: "read" },
        { id: "e2", from: "ingress", to: "queue", kind: "async" },
        { id: "e3", from: "queue", to: "worker", kind: "async" },
      ],
    );

    const sim = simulate(withQueue, spiky({ rps: base }), registry);

    expect(Math.max(...sim.ticks.map((t) => t.arrivalsRps))).toBe(burst);
    expect(sim.saturatedNodes.has("worker")).toBe(false);
    expect(sim.backlogSnapshots.queue?.some((b) => b > 0)).toBe(true);
    // The worker downstream of the queue sees the drained (average) rate, not the burst.
    const workerRhos = sim.ticks.map((t) => t.nodeResults.worker?.rho ?? 0);
    expect(Math.max(...workerRhos)).toBeLessThan(1);
  });

  it("A2: without the queue the same bottleneck saturates at the burst", () => {
    const noQueue = makeGraph(
      [
        sourceNode("src"),
        presetNode("ingress", "app-server", {
          capacity: 50_000,
          latBase: 5,
        }),
        presetNode("worker", "app-server", {
          capacity: 1500,
          latBase: 20,
        }),
      ],
      [
        { id: "e1", from: "src", to: "ingress", kind: "read" },
        { id: "e2", from: "ingress", to: "worker", kind: "read" },
      ],
    );

    const sim = simulate(noQueue, spiky(), registry);

    expect(sim.saturatedNodes.has("worker")).toBe(true);
    expect(sim.weightedP99Latency).toBe(Number.POSITIVE_INFINITY);
  });

  it("B: serverless never saturates (passes SLO) with peak provisioning", () => {
    const graph = makeGraph(
      [sourceNode("src"), presetNode("fn", "serverless", {})],
      [{ id: "e1", from: "src", to: "fn", kind: "read" }],
    );

    const sim = simulate(graph, spiky(), registry);

    expect(sim.saturatedNodes.size).toBe(0);
    expect(sim.weightedP99Latency).toBeLessThan(1000);
    // Provisioned for the burst (peak), not the average.
    expect(sim.peakProvisioned.fn).toBeGreaterThan(1);
  });

  it("C: fixed queue + workers handle the burst without saturating", () => {
    const graph = makeGraph(
      [
        sourceNode("src"),
        presetNode("ingress", "app-server", {
          capacity: 20_000,
          latBase: 5,
        }),
        presetNode("queue", "message-queue", {
          drainRate: 1000,
          maxDepth: 1e6,
        }),
        presetNode("worker", "app-server", {
          capacity: 1500,
          latBase: 20,
        }),
      ],
      [
        { id: "e1", from: "src", to: "ingress", kind: "read" },
        { id: "e2", from: "ingress", to: "queue", kind: "async" },
        { id: "e3", from: "queue", to: "worker", kind: "async" },
      ],
    );

    const sim = simulate(graph, spiky(), registry);

    expect(sim.saturatedNodes.size).toBe(0);
    expect(sim.weightedP99Latency).toBeLessThan(1000);
  });

  it("D: steady path is unchanged and passes", () => {
    const graph = makeGraph(
      [
        sourceNode("src"),
        presetNode("app", "app-server", { capacity: 5000, latBase: 20 }),
      ],
      [{ id: "e1", from: "src", to: "app", kind: "read" }],
    );

    const verdict = runSimulation(
      graph,
      defaultParams({ rps: 100, readWriteRatio: 1 }),
    );

    expect(verdict.passed).toBe(true);
    expect(verdict.violations).toHaveLength(0);
  });

  it("E: deterministic — identical inputs produce identical results", () => {
    const graph = makeGraph(
      [
        sourceNode("src"),
        presetNode("app", "app-server", { capacity: 2000, latBase: 20 }),
      ],
      [{ id: "e1", from: "src", to: "app", kind: "read" }],
    );

    const a = simulate(graph, spiky({ rps: 500 }), registry);
    const b = simulate(graph, spiky({ rps: 500 }), registry);

    expect(a.ticks).toEqual(b.ticks);
    expect(a.weightedP99Latency).toBe(b.weightedP99Latency);
    expect([...a.saturatedNodes]).toEqual([...b.saturatedNodes]);
    expect([...a.ratelimitedNodes]).toEqual([...b.ratelimitedNodes]);
    expect(a.peakProvisioned).toEqual(b.peakProvisioned);
    expect(a.backlogSnapshots).toEqual(b.backlogSnapshots);
  });
});
