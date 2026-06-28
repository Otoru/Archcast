import { describe, expect, it } from "vitest";

import { CycleError, runSimulation } from "@/engine";
import {
  cacheNode,
  defaultParams,
  makeGraph,
  serverNode,
  sourceNode,
} from "@/engine/test-helpers";
import { p99FromLatency } from "@/engine/types";

describe("runSimulation", () => {
  it("1: source→server low load does not saturate, W≈latBase", () => {
    const graph = makeGraph(
      [sourceNode("src"), serverNode("db", { capacity: 1000, latBase: 5 })],
      [{ id: "e1", from: "src", to: "db", kind: "read" }],
    );

    const verdict = runSimulation(
      graph,
      defaultParams({ rps: 10, readWriteRatio: 1 }),
    );

    expect(verdict.passed).toBe(true);
    expect(verdict.nodes.db?.saturated).toBe(false);
    expect(verdict.nodes.db?.latency).toBeCloseTo(5, 0);
  });

  it("2: rho≈0.9 yields latency≈10×latBase", () => {
    const graph = makeGraph(
      [sourceNode("src"), serverNode("db", { capacity: 100, latBase: 2 })],
      [{ id: "e1", from: "src", to: "db", kind: "read" }],
    );

    const verdict = runSimulation(
      graph,
      defaultParams({ rps: 90, readWriteRatio: 1 }),
    );

    expect(verdict.nodes.db?.rho).toBeCloseTo(0.9);
    expect(verdict.nodes.db?.latency).toBeCloseTo(20);
  });

  it("3: load above capacity saturates and fails with saturation violation", () => {
    const graph = makeGraph(
      [sourceNode("src"), serverNode("db", { capacity: 100, latBase: 2 })],
      [{ id: "e1", from: "src", to: "db", kind: "read" }],
    );

    const verdict = runSimulation(
      graph,
      defaultParams({ rps: 150, readWriteRatio: 1 }),
    );

    expect(verdict.passed).toBe(false);
    expect(verdict.nodes.db?.saturated).toBe(true);
    expect(verdict.violations.some((v) => v.type === "saturation")).toBe(true);
  });

  it("4: endToEndLatency above latencySlo yields latency violation", () => {
    const graph = makeGraph(
      [
        sourceNode("src"),
        serverNode("app", { capacity: 1000, latBase: 10 }),
        serverNode("db", { capacity: 100, latBase: 20 }),
      ],
      [
        { id: "e1", from: "src", to: "app", kind: "read" },
        { id: "e2", from: "app", to: "db", kind: "read" },
      ],
    );

    const verdict = runSimulation(
      graph,
      defaultParams({ rps: 90, readWriteRatio: 1, latencySlo: 1 }),
    );

    expect(verdict.passed).toBe(false);
    expect(verdict.endToEndLatency).toBeGreaterThan(1);
    expect(verdict.violations.some((v) => v.type === "latency")).toBe(true);
  });

  it("5: two sources fan-in sum channels on the target server", () => {
    const graph = makeGraph(
      [
        sourceNode("src1"),
        sourceNode("src2"),
        serverNode("db", { capacity: 1000, latBase: 2 }),
      ],
      [
        { id: "e1", from: "src1", to: "db", kind: "read" },
        { id: "e2", from: "src2", to: "db", kind: "read" },
      ],
    );

    const verdict = runSimulation(graph, defaultParams({ rps: 100 }));

    expect(verdict.edgeFlows.e1?.read).toBeCloseTo(80);
    expect(verdict.edgeFlows.e2?.read).toBeCloseTo(80);
    expect(verdict.nodes.db?.rho).toBeCloseTo(160 / 1000);
  });

  it("6: same input produces identical verdict", () => {
    const graph = makeGraph(
      [sourceNode("src"), serverNode("db", { capacity: 500, latBase: 3 })],
      [{ id: "e1", from: "src", to: "db", kind: "read" }],
    );
    const params = defaultParams({ rps: 50 });

    const first = runSimulation(graph, params);
    const second = runSimulation(graph, params);

    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it("7: cycle throws descriptive error", () => {
    const graph = makeGraph(
      [
        serverNode("a", { capacity: 100, latBase: 1 }),
        serverNode("b", { capacity: 100, latBase: 1 }),
        serverNode("c", { capacity: 100, latBase: 1 }),
      ],
      [
        { id: "e1", from: "a", to: "b", kind: "read" },
        { id: "e2", from: "b", to: "c", kind: "read" },
        { id: "e3", from: "c", to: "a", kind: "read" },
      ],
    );

    expect(() => runSimulation(graph, defaultParams())).toThrow(CycleError);
  });

  it("8: readWriteRatio=0.8 splits rps at the source", () => {
    const graph = makeGraph(
      [
        sourceNode("src"),
        serverNode("reader", { capacity: 1000, latBase: 1 }),
        serverNode("writer", { capacity: 1000, latBase: 1 }),
      ],
      [
        { id: "e1", from: "src", to: "reader", kind: "read" },
        { id: "e2", from: "src", to: "writer", kind: "write" },
      ],
    );

    const verdict = runSimulation(
      graph,
      defaultParams({ rps: 100, readWriteRatio: 0.8 }),
    );

    expect(verdict.edgeFlows.e1?.read).toBeCloseTo(80);
    expect(verdict.edgeFlows.e2?.write).toBeCloseTo(20);
  });

  it("9: two identical read replicas each receive R/2", () => {
    const graph = makeGraph(
      [
        sourceNode("src"),
        serverNode("app", { capacity: 10000, latBase: 1 }),
        serverNode("db1", { capacity: 100, latBase: 2 }),
        serverNode("db2", { capacity: 100, latBase: 2 }),
      ],
      [
        { id: "e1", from: "src", to: "app", kind: "read" },
        { id: "e2", from: "app", to: "db1", kind: "read" },
        { id: "e3", from: "app", to: "db2", kind: "read" },
      ],
    );

    const verdict = runSimulation(
      graph,
      defaultParams({ rps: 1000, readWriteRatio: 1 }),
    );

    expect(verdict.edgeFlows.e2?.read).toBeCloseTo(500);
    expect(verdict.edgeFlows.e3?.read).toBeCloseTo(500);
  });

  it("10: cache-aside delivers R to cache and 0.2R to db without cache→db edge", () => {
    const graph = makeGraph(
      [
        sourceNode("src"),
        serverNode("app", { capacity: 10000, latBase: 1 }),
        cacheNode("cache", { capacity: 5000, latBase: 1, hitRatio: 0.8 }),
        serverNode("db", { capacity: 200, latBase: 3 }),
      ],
      [
        { id: "e1", from: "src", to: "app", kind: "read" },
        { id: "e2", from: "app", to: "cache", kind: "read" },
        { id: "e3", from: "app", to: "db", kind: "read" },
      ],
    );

    const verdict = runSimulation(
      graph,
      defaultParams({ rps: 1000, readWriteRatio: 1 }),
    );

    expect(verdict.edgeFlows.e2?.read).toBeCloseTo(1000);
    expect(verdict.edgeFlows.e3?.read).toBeCloseTo(200);
    expect(
      graph.edges.some((edge) => edge.from === "cache" && edge.to === "db"),
    ).toBe(false);
  });

  it("11: two read destinations split vs absorb produce different flows", () => {
    const splitGraph = makeGraph(
      [
        sourceNode("src"),
        serverNode("app", { capacity: 10000, latBase: 1 }),
        serverNode("db1", { capacity: 100, latBase: 2 }),
        serverNode("db2", { capacity: 100, latBase: 2 }),
      ],
      [
        { id: "e1", from: "src", to: "app", kind: "read" },
        { id: "e2", from: "app", to: "db1", kind: "read" },
        { id: "e3", from: "app", to: "db2", kind: "read" },
      ],
    );

    const cacheGraph = makeGraph(
      [
        sourceNode("src"),
        serverNode("app", { capacity: 10000, latBase: 1 }),
        cacheNode("cache", { capacity: 5000, latBase: 1, hitRatio: 0.8 }),
        serverNode("db", { capacity: 200, latBase: 3 }),
      ],
      [
        { id: "e1", from: "src", to: "app", kind: "read" },
        { id: "e2", from: "app", to: "cache", kind: "read" },
        { id: "e3", from: "app", to: "db", kind: "read" },
      ],
    );

    const split = runSimulation(
      splitGraph,
      defaultParams({ rps: 1000, readWriteRatio: 1 }),
    );
    const cacheAside = runSimulation(
      cacheGraph,
      defaultParams({ rps: 1000, readWriteRatio: 1 }),
    );

    expect(split.edgeFlows.e2?.read).toBeCloseTo(500);
    expect(split.edgeFlows.e3?.read).toBeCloseTo(500);
    expect(cacheAside.edgeFlows.e2?.read).toBeCloseTo(1000);
    expect(cacheAside.edgeFlows.e3?.read).toBeCloseTo(200);
  });

  it("12: writes only reach write edges and reads only read edges", () => {
    const graph = makeGraph(
      [
        sourceNode("src"),
        serverNode("app", { capacity: 1000, latBase: 1 }),
        cacheNode("cache", { capacity: 5000, latBase: 1, hitRatio: 0.8 }),
        serverNode("db", { capacity: 500, latBase: 2 }),
      ],
      [
        { id: "e1", from: "src", to: "app", kind: "read" },
        { id: "e2", from: "src", to: "app", kind: "write" },
        { id: "e3", from: "app", to: "cache", kind: "read" },
        { id: "e4", from: "app", to: "db", kind: "read" },
        { id: "e5", from: "app", to: "db", kind: "write" },
      ],
    );

    const verdict = runSimulation(
      graph,
      defaultParams({ rps: 100, readWriteRatio: 0.8 }),
    );

    expect(verdict.edgeFlows.e3?.read).toBeCloseTo(80);
    expect(verdict.edgeFlows.e3?.write).toBe(0);
    expect(verdict.edgeFlows.e4?.read).toBeCloseTo(16);
    expect(verdict.edgeFlows.e5?.write).toBeCloseTo(20);
    expect(verdict.edgeFlows.e5?.read).toBe(0);
    expect(verdict.nodes.cache?.rho).toBeCloseTo(80 / 5000);
    expect(verdict.nodes.db?.rho).toBeCloseTo((16 + 20) / 500);
  });

  it("13: read latency sums cache p99 in series with max server p99", () => {
    const graph = makeGraph(
      [
        sourceNode("src"),
        serverNode("app", { capacity: 10000, latBase: 2 }),
        cacheNode("cache", { capacity: 50000, latBase: 1, hitRatio: 0.8 }),
        serverNode("db", { capacity: 10000, latBase: 4 }),
      ],
      [
        { id: "e1", from: "src", to: "app", kind: "read" },
        { id: "e2", from: "app", to: "cache", kind: "read" },
        { id: "e3", from: "app", to: "db", kind: "read" },
      ],
    );

    const verdict = runSimulation(
      graph,
      defaultParams({ rps: 10, readWriteRatio: 1 }),
    );

    const expected =
      p99FromLatency(verdict.nodes.app?.latency ?? 0) +
      p99FromLatency(verdict.nodes.cache?.latency ?? 0) +
      p99FromLatency(verdict.nodes.db?.latency ?? 0);

    expect(verdict.endToEndLatency).toBeCloseTo(expected);
  });

  it("14: channel with flow but no valid destination yields structure violation", () => {
    const graph = makeGraph(
      [
        sourceNode("src"),
        serverNode("app", { capacity: 1000, latBase: 1 }),
        cacheNode("cache", { capacity: 5000, latBase: 1, hitRatio: 0.8 }),
      ],
      [
        { id: "e1", from: "src", to: "app", kind: "read" },
        { id: "e2", from: "src", to: "app", kind: "write" },
        { id: "e3", from: "app", to: "cache", kind: "read" },
        { id: "e4", from: "app", to: "cache", kind: "write" },
      ],
    );

    const verdict = runSimulation(
      graph,
      defaultParams({ rps: 100, readWriteRatio: 0.8 }),
    );

    expect(verdict.passed).toBe(false);
    expect(
      verdict.violations.some(
        (v) => v.type === "structure" && v.detail.includes("write"),
      ),
    ).toBe(true);
  });

  it("15: instances=3 matches three-way replica split", () => {
    const splitGraph = makeGraph(
      [
        sourceNode("src"),
        serverNode("app", { capacity: 10000, latBase: 1 }),
        serverNode("db1", { capacity: 100, latBase: 2 }),
        serverNode("db2", { capacity: 100, latBase: 2 }),
        serverNode("db3", { capacity: 100, latBase: 2 }),
      ],
      [
        { id: "e1", from: "src", to: "app", kind: "read" },
        { id: "e2", from: "app", to: "db1", kind: "read" },
        { id: "e3", from: "app", to: "db2", kind: "read" },
        { id: "e4", from: "app", to: "db3", kind: "read" },
      ],
    );

    const instancesGraph = makeGraph(
      [
        sourceNode("src"),
        serverNode("app", { capacity: 10000, latBase: 1 }),
        serverNode("db", { capacity: 100, latBase: 2, instances: 3 }),
      ],
      [
        { id: "e1", from: "src", to: "app", kind: "read" },
        { id: "e2", from: "app", to: "db", kind: "read" },
      ],
    );

    const params = defaultParams({ rps: 900, readWriteRatio: 1 });
    const split = runSimulation(splitGraph, params);
    const instances = runSimulation(instancesGraph, params);

    expect(split.nodes.db1?.rho).toBeCloseTo(3);
    expect(split.nodes.db2?.rho).toBeCloseTo(3);
    expect(split.nodes.db3?.rho).toBeCloseTo(3);
    expect(instances.nodes.db?.rho).toBeCloseTo(3);
    expect(instances.nodes.db?.latency).toBeCloseTo(
      split.nodes.db1?.latency ?? 0,
    );
  });
});
