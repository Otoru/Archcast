import { describe, expect, it } from "vitest";

import { getPreset, registerPreset, runSimulation } from "@/engine";
import {
  cacheNode,
  defaultParams,
  makeGraph,
  presetNode,
  serverNode,
  sourceNode,
} from "@/engine/test-helpers";
import { ELASTIC_TARGET_RHO } from "@/engine/types";

describe("acceptance criteria", () => {
  it("D1: cdn forwards 0.9R, rho on full R", () => {
    const graph = makeGraph(
      [
        sourceNode("src"),
        presetNode("cdn", "cdn"),
        serverNode("origin", { capacity: 5000, latBase: 10 }),
      ],
      [
        { id: "e1", from: "src", to: "cdn", kind: "read" },
        { id: "e2", from: "cdn", to: "origin", kind: "read" },
      ],
    );

    const verdict = runSimulation(
      graph,
      defaultParams({ rps: 1000, readWriteRatio: 1 }),
    );

    // CDN default hitRatio = 0.10 → 90% miss forwarded to origin.
    expect(verdict.edgeFlows.e2?.read).toBeCloseTo(900);
    expect(verdict.nodes.cdn?.rho).toBeCloseTo(1000 / 2e5);
  });

  it("D2: broadcaster duplicates vs server splits", () => {
    const pubsubGraph = makeGraph(
      [
        serverNode("app", { capacity: 10000, latBase: 1 }),
        presetNode("pub", "pubsub-topic", {}),
        presetNode("w1", "worker", {}),
        presetNode("w2", "worker", {}),
        presetNode("w3", "worker", {}),
      ],
      [
        { id: "e0", from: "app", to: "pub", kind: "async" },
        { id: "e1", from: "pub", to: "w1", kind: "async" },
        { id: "e2", from: "pub", to: "w2", kind: "async" },
        { id: "e3", from: "pub", to: "w3", kind: "async" },
      ],
    );

    const serverGraph = makeGraph(
      [
        serverNode("app", { capacity: 1000, latBase: 1 }),
        serverNode("db1", { capacity: 100, latBase: 2 }),
        serverNode("db2", { capacity: 100, latBase: 2 }),
        serverNode("db3", { capacity: 100, latBase: 2 }),
      ],
      [
        { id: "e1", from: "app", to: "db1", kind: "read" },
        { id: "e2", from: "app", to: "db2", kind: "read" },
        { id: "e3", from: "app", to: "db3", kind: "read" },
      ],
    );

    const pubVerdict = runSimulation(
      makeGraph(
        [sourceNode("src"), ...pubsubGraph.nodes],
        [
          { id: "es", from: "src", to: "app", kind: "read" },
          ...pubsubGraph.edges,
        ],
      ),
      defaultParams({ rps: 300, readWriteRatio: 1 }),
    );

    const serverVerdict = runSimulation(
      makeGraph(
        [sourceNode("src"), ...serverGraph.nodes],
        [
          { id: "es", from: "src", to: "app", kind: "read" },
          ...serverGraph.edges,
        ],
      ),
      defaultParams({ rps: 300, readWriteRatio: 1 }),
    );

    expect(pubVerdict.edgeFlows.e1?.async).toBeCloseTo(300);
    expect(pubVerdict.edgeFlows.e2?.async).toBeCloseTo(300);
    expect(pubVerdict.edgeFlows.e3?.async).toBeCloseTo(300);
    expect(serverVerdict.edgeFlows.e1?.read).toBeCloseTo(100);
  });

  it("D3: async-buffer saturation and no sync latency", () => {
    const graph = makeGraph(
      [
        sourceNode("src"),
        serverNode("app", { capacity: 10000, latBase: 5 }),
        presetNode("queue", "message-queue", {
          drainRate: 5000,
          maxDepth: 1000,
        }),
      ],
      [
        { id: "e1", from: "src", to: "app", kind: "read" },
        { id: "e2", from: "app", to: "queue", kind: "async" },
      ],
    );

    const low = runSimulation(
      graph,
      defaultParams({ rps: 10, readWriteRatio: 1 }),
    );
    const high = runSimulation(
      graph,
      defaultParams({ rps: 8000, readWriteRatio: 1 }),
    );

    expect(low.nodes.queue?.saturated).toBe(false);
    expect(high.nodes.queue?.saturated).toBe(true);
    expect(low.endToEndLatency).toBeCloseTo(5 * Math.log(100), 0);
  });

  it("D4: structural feature-flags excluded from lambda, presence and spof", () => {
    const graph = makeGraph(
      [
        sourceNode("src"),
        presetNode("ff", "feature-flags", {}),
        serverNode("app", { capacity: 1000, latBase: 5 }),
      ],
      [{ id: "e1", from: "src", to: "app", kind: "read" }],
    );

    const missingFf = runSimulation(
      makeGraph(
        [sourceNode("src"), serverNode("app", { capacity: 1000, latBase: 5 })],
        [{ id: "e1", from: "src", to: "app", kind: "read" }],
      ),
      { ...defaultParams(), requiredKinds: ["feature-flags"] },
    );

    const withFf = runSimulation(graph, defaultParams());

    expect(withFf.nodes.ff).toBeUndefined();
    expect(missingFf.violations.some((v) => v.type === "presence")).toBe(true);
    expect(
      withFf.violations.some((v) => v.type === "spof" && v.nodeId === "ff"),
    ).toBe(true);
  });

  it("D5: elastic serverless provisioned at targetRho 0.7", () => {
    const graph = makeGraph(
      [sourceNode("src"), presetNode("fn", "serverless", {})],
      [{ id: "e1", from: "src", to: "fn", kind: "read" }],
    );

    const verdict = runSimulation(
      graph,
      defaultParams({ rps: 50000, readWriteRatio: 1 }),
    );

    expect(verdict.nodes.fn?.saturated).toBe(false);
    expect(verdict.nodes.fn?.provisioned).toBe(
      Math.ceil(50000 / (ELASTIC_TARGET_RHO * 1000)),
    );
  });

  it("D6: waf drop reduces forward flow and records dropped", () => {
    const graph = makeGraph(
      [
        sourceNode("src"),
        presetNode("waf", "waf", {}),
        serverNode("app", { capacity: 5000, latBase: 10 }),
      ],
      [
        { id: "e1", from: "src", to: "waf", kind: "read" },
        { id: "e2", from: "waf", to: "app", kind: "read" },
      ],
    );

    const verdict = runSimulation(
      graph,
      defaultParams({ rps: 1000, readWriteRatio: 1 }),
    );

    expect(verdict.edgeFlows.e2?.read).toBeCloseTo(980);
    expect(verdict.nodes.waf?.dropped).toBeCloseTo(20);
  });

  it("D7: api-gateway rateCap rejects excess", () => {
    const graph = makeGraph(
      [sourceNode("src"), presetNode("gw", "api-gateway", {})],
      [{ id: "e1", from: "src", to: "gw", kind: "read" }],
    );

    const verdict = runSimulation(
      graph,
      defaultParams({ rps: 30000, readWriteRatio: 1 }),
    );

    expect(verdict.nodes.gw?.rejectedRps).toBeCloseTo(10000);
    expect(verdict.violations.some((v) => v.type === "ratelimit")).toBe(true);
  });

  it("D8: availability parallel and series with SLO", () => {
    const parallel = makeGraph(
      [
        sourceNode("src"),
        serverNode("app", { capacity: 5000, latBase: 5, availability: 0.9999 }),
        presetNode("db1", "sql-db", { availability: 0.999, instances: 1 }),
        presetNode("db2", "sql-db", { availability: 0.999, instances: 1 }),
      ],
      [
        { id: "e1", from: "src", to: "app", kind: "read" },
        { id: "e2", from: "app", to: "db1", kind: "read" },
        { id: "e3", from: "app", to: "db2", kind: "read" },
      ],
    );

    const verdict = runSimulation(
      parallel,
      defaultParams({ availabilitySlo: 0.99 }),
    );
    expect(verdict.systemAvailability).toBeGreaterThan(0.99);
    expect(verdict.violations.some((v) => v.type === "availability")).toBe(
      false,
    );
  });

  it("D9: write to absorber-aside cache rejected as structure", () => {
    const graph = makeGraph(
      [
        serverNode("app", { capacity: 1000, latBase: 1 }),
        cacheNode("cache", {}),
      ],
      [{ id: "e1", from: "app", to: "cache", kind: "write" }],
    );

    const verdict = runSimulation(graph, defaultParams());
    expect(verdict.violations.some((v) => v.type === "structure")).toBe(true);
  });

  it("D11: storage below maxStorage passes; above → data-loss violation; replicas don't help", () => {
    // src → db (write). The write channel carries rps × (1 − readWriteRatio);
    // with readWriteRatio=0, the entire rps becomes writes to the db. Setting
    // `bytesPerWrite` enables the data-loss check.
    const build = (attrs: Record<string, number>) =>
      makeGraph(
        [sourceNode("src"), presetNode("db", "sql-db", attrs)],
        [{ id: "e1", from: "src", to: "db", kind: "write" }],
      );

    // 100 rps × 1024 B × 1d ≈ 8.2 GB < 50 GB → no data loss.
    const ok = runSimulation(
      build({ maxStorage: 50, retention: 1, capacity: 1e6 }),
      defaultParams({ rps: 100, readWriteRatio: 0, bytesPerWrite: 1024 }),
    );
    expect(ok.violations.some((v) => v.type === "storage")).toBe(false);
    expect(ok.passed).toBe(true);

    // Same load, 30d retention → ~247 GB > 50 GB → data loss.
    const overflow = runSimulation(
      build({ maxStorage: 50, retention: 30, capacity: 1e6 }),
      defaultParams({ rps: 100, readWriteRatio: 0, bytesPerWrite: 1024 }),
    );
    expect(overflow.violations.some((v) => v.type === "storage")).toBe(true);
    expect(overflow.passed).toBe(false);

    // Increasing the db `instances` does NOT fix the overflow — replicas serve
    // for load/SPOF, not to add space (the cap is `maxStorage`, without
    // `× instances`).
    const withReplicas = runSimulation(
      build({ maxStorage: 50, retention: 30, capacity: 1e6, instances: 10 }),
      defaultParams({ rps: 100, readWriteRatio: 0, bytesPerWrite: 1024 }),
    );
    expect(withReplicas.violations.some((v) => v.type === "storage")).toBe(
      true,
    );
  });

  it("D10: new catalog preset usable without code changes", () => {
    const testKind = "test-widget";
    expect(getPreset(testKind)).toBeUndefined();

    registerPreset({
      kind: testKind,
      label: "Test Widget",
      primitive: "server",
      layer: "compute",
      defaults: { capacity: 500, latBase: 10 },
      edges: { in: ["read"], out: ["read"] },
    });

    expect(getPreset(testKind)).toBeDefined();

    const graph = makeGraph(
      [sourceNode("src"), presetNode("widget", testKind, {})],
      [{ id: "e1", from: "src", to: "widget", kind: "read" }],
    );

    const verdict = runSimulation(
      graph,
      defaultParams({ rps: 100, readWriteRatio: 1 }),
    );

    expect(verdict.nodes.widget?.rho).toBeCloseTo(100 / 500);
  });
});
