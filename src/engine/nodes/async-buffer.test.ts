import { describe, expect, it } from "vitest";
import { runSimulation } from "@/engine";
import { asyncBufferHandler } from "@/engine/nodes/async-buffer";
import { createDefaultRegistry } from "@/engine/registry";
import {
  defaultParams,
  makeGraph,
  presetNode,
  serverNode,
  sourceNode,
} from "@/engine/test-helpers";

function resolveQueue(attrs: Record<string, number>) {
  const registry = createDefaultRegistry();
  const node = presetNode("q", "message-queue", attrs);
  return registry.resolve(node);
}

describe("async-buffer", () => {
  it("does not saturate below drainRate and does not add sync latency", () => {
    const graph = makeGraph(
      [
        sourceNode("src"),
        serverNode("app", { capacity: 10000, latBase: 5 }),
        presetNode("queue", "message-queue", {
          drainRate: 5000,
          maxDepth: 1e6,
          latBase: 5,
        }),
        presetNode("worker", "worker", { capacity: 1000, latBase: 100 }),
      ],
      [
        { id: "e1", from: "src", to: "app", kind: "read" },
        { id: "e2", from: "app", to: "queue", kind: "async" },
        { id: "e3", from: "queue", to: "worker", kind: "async" },
      ],
    );

    const verdict = runSimulation(
      graph,
      defaultParams({ rps: 10, readWriteRatio: 1 }),
    );

    expect(verdict.nodes.queue?.saturated).toBe(false);
    expect(verdict.nodes.queue?.rho).toBeCloseTo(10 / 5000);
    expect(verdict.endToEndLatency).toBeCloseTo(5 * Math.log(100), 0);
  });

  it("saturates when lambda exceeds drainRate", () => {
    const graph = makeGraph(
      [
        sourceNode("src"),
        serverNode("app", { capacity: 10000, latBase: 5 }),
        presetNode("queue", "message-queue", {
          drainRate: 5000,
          maxDepth: 1000,
          latBase: 5,
        }),
      ],
      [
        { id: "e1", from: "src", to: "app", kind: "read" },
        { id: "e2", from: "app", to: "queue", kind: "async" },
      ],
    );

    const verdict = runSimulation(
      graph,
      defaultParams({ rps: 8000, readWriteRatio: 1 }),
    );

    expect(verdict.nodes.queue?.saturated).toBe(true);
    expect(verdict.violations.some((v) => v.type === "saturation")).toBe(true);
  });
});

describe("async-buffer event-loop (tickState)", () => {
  it("accumulates backlog across ticks and drains at effectiveDrain", () => {
    const resolved = resolveQueue({ drainRate: 5000, maxDepth: 1e6 });

    const tick1 = asyncBufferHandler.compute(8000, resolved, {
      params: defaultParams(),
      tickState: { backlog: {} },
    });
    expect(tick1.backlog).toBe(3000);
    expect(tick1.outboundFlow).toBe(5000);
    expect(tick1.saturated).toBe(false);

    const tick2 = asyncBufferHandler.compute(0, resolved, {
      params: defaultParams(),
      tickState: { backlog: { q: tick1.backlog ?? 0 } },
    });
    expect(tick2.backlog).toBe(0);
    expect(tick2.outboundFlow).toBe(3000);
  });

  it("smooths the burst: downstream sees drainRate, not the peak arrival", () => {
    const resolved = resolveQueue({ drainRate: 5000, maxDepth: 1e6 });
    const tick = asyncBufferHandler.compute(50_000, resolved, {
      params: defaultParams(),
      tickState: { backlog: {} },
    });
    expect(tick.outboundFlow).toBe(5000);
    expect(tick.backlog).toBe(45_000);
  });

  it("saturates when accumulated backlog exceeds maxDepth", () => {
    const resolved = resolveQueue({ drainRate: 1000, maxDepth: 5000 });
    let backlog = 0;
    let saturated = false;
    for (let i = 0; i < 10 && !saturated; i++) {
      const tick = asyncBufferHandler.compute(2000, resolved, {
        params: defaultParams(),
        tickState: { backlog: { q: backlog } },
      });
      backlog = tick.backlog ?? 0;
      saturated = tick.saturated;
    }
    expect(saturated).toBe(true);
  });
});
