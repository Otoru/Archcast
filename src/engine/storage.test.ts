import { describe, expect, it } from "vitest";
import { propagate } from "@/engine/propagate";
import { createDefaultRegistry } from "@/engine/registry";
import { checkStorage } from "@/engine/storage";
import {
  defaultParams,
  makeGraph,
  presetNode,
  sourceNode,
} from "@/engine/test-helpers";

const registry = createDefaultRegistry();

function run(
  attrs: Record<string, number>,
  params: ReturnType<typeof defaultParams>,
) {
  const graph = makeGraph(
    [sourceNode("src"), presetNode("db", "sql-db", attrs)],
    [{ id: "e1", from: "src", to: "db", kind: "write" }],
  );
  const propagation = propagate(graph, params, registry);
  return {
    graph,
    ...checkStorage(graph, params, registry, propagation.edgeFlows),
  };
}

describe("checkStorage", () => {
  it("is disabled when bytesPerWrite is absent/0", () => {
    const { violations, usage } = run(
      { maxStorage: 1, retention: 1, capacity: 1e6 },
      defaultParams({ rps: 1000, readWriteRatio: 0 }),
    );
    expect(violations).toHaveLength(0);
    expect(usage.db).toBeUndefined();
  });

  it("computes usedGB ≈ writeFlow × bytesPerWrite × retention", () => {
    // 100 rps × (1 − 0) = 100 writes/s × 1024 B × 1d.
    // = 100 × 1024 B × 86400 s = 8.847.360.000 B ÷ 1024³ ≈ 8.24 GB.
    const { usage } = run(
      { maxStorage: 50, retention: 1, capacity: 1e6 },
      defaultParams({ rps: 100, readWriteRatio: 0, bytesPerWrite: 1024 }),
    );
    expect(usage.db?.usedGB).toBeCloseTo(8.24, 1);
    expect(usage.db?.capGB).toBe(50);
  });

  it("flags a hard storage violation on overflow", () => {
    const { violations } = run(
      { maxStorage: 1, retention: 1, capacity: 1e6 },
      defaultParams({ rps: 100, readWriteRatio: 0, bytesPerWrite: 1024 }),
    );
    const storage = violations.find((v) => v.type === "storage");
    expect(storage).toBeDefined();
    expect(storage?.nodeId).toBe("db");
    expect(storage?.severity).toBeUndefined();
  });

  it("instances do NOT scale the cap (cap = maxStorage)", () => {
    const single = run(
      { maxStorage: 1, retention: 1, capacity: 1e6, instances: 1 },
      defaultParams({ rps: 100, readWriteRatio: 0, bytesPerWrite: 1024 }),
    );
    const replicated = run(
      { maxStorage: 1, retention: 1, capacity: 1e6, instances: 10 },
      defaultParams({ rps: 100, readWriteRatio: 0, bytesPerWrite: 1024 }),
    );
    expect(single.usage.db?.capGB).toBe(1);
    expect(replicated.usage.db?.capGB).toBe(1);
    expect(replicated.usage.db?.usedGB).toBeCloseTo(
      single.usage.db?.usedGB ?? 0,
    );
    expect(replicated.violations.some((v) => v.type === "storage")).toBe(true);
  });
});
