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
  it("D1: cdn forwards 0.15R, rho on full R", () => {
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

    expect(verdict.edgeFlows.e2?.read).toBeCloseTo(150);
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

  it("D4: structural dns excluded from lambda, presence and spof", () => {
    const graph = makeGraph(
      [
        sourceNode("src"),
        presetNode("dns", "dns", {}),
        serverNode("app", { capacity: 1000, latBase: 5 }),
      ],
      [{ id: "e1", from: "src", to: "app", kind: "read" }],
    );

    const missingDns = runSimulation(
      makeGraph(
        [sourceNode("src"), serverNode("app", { capacity: 1000, latBase: 5 })],
        [{ id: "e1", from: "src", to: "app", kind: "read" }],
      ),
      { ...defaultParams(), requiredKinds: ["dns"] },
    );

    const withDns = runSimulation(graph, defaultParams());

    expect(withDns.nodes.dns).toBeUndefined();
    expect(missingDns.violations.some((v) => v.type === "presence")).toBe(true);
    expect(
      withDns.violations.some((v) => v.type === "spof" && v.nodeId === "dns"),
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
