import { describe, expect, it } from "vitest";

import { runSimulation } from "@/engine";
import {
  defaultParams,
  makeGraph,
  presetNode,
  serverNode,
  sourceNode,
} from "@/engine/test-helpers";
import { p99FromLatency } from "@/engine/types";

describe("absorber-forwarding", () => {
  it("cdn forwards 0.15R on read output and computes rho on full R", () => {
    const graph = makeGraph(
      [
        sourceNode("src"),
        presetNode("cdn", "cdn", {
          hitRatio: 0.85,
          capacity: 2e5,
          latBase: 15,
        }),
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

  it("cdn weights the origin p99 by its miss ratio on the read path", () => {
    // Same logic as cache-aside (test 13 of run-simulation), applied to the CDN
    // in series: the CDN lookup is always paid (hit or miss), and the origin is
    // only hit on a miss → its p99 weighs in via passThrough = 1 − hitRatio.
    // Without this, a CDN with 85% hit does not affect the verdict (origin added
    // in full) — the same bug the cache once had.
    const withCdn = makeGraph(
      [
        sourceNode("src"),
        presetNode("cdn", "cdn", {
          hitRatio: 0.85,
          capacity: 2e5,
          latBase: 15,
        }),
        serverNode("origin", { capacity: 5000, latBase: 20 }),
      ],
      [
        { id: "e1", from: "src", to: "cdn", kind: "read" },
        { id: "e2", from: "cdn", to: "origin", kind: "read" },
      ],
    );

    const verdict = runSimulation(
      withCdn,
      defaultParams({ rps: 1000, readWriteRatio: 1 }),
    );

    const expected =
      p99FromLatency(verdict.nodes.cdn?.latency ?? 0) +
      0.15 * p99FromLatency(verdict.nodes.origin?.latency ?? 0);

    expect(verdict.endToEndLatency).toBeCloseTo(expected);

    // And the CDN in fact reduces the verdict vs. hitting the origin directly.
    const noCdn = makeGraph(
      [
        sourceNode("src"),
        serverNode("origin", { capacity: 5000, latBase: 20 }),
      ],
      [{ id: "e1", from: "src", to: "origin", kind: "read" }],
    );
    const noCdnVerdict = runSimulation(
      noCdn,
      defaultParams({ rps: 1000, readWriteRatio: 1 }),
    );
    expect(verdict.endToEndLatency).toBeLessThan(noCdnVerdict.endToEndLatency);
  });

  it("cdn beside the app (sibling read targets) offloads only its hit fraction", () => {
    // Client connected to both the CDN and the app (two sibling reads). The CDN
    // is not a capacity-load-balancing replica — it only serves the hit fraction
    // and misses go to the app. Without this, the capacity-based split would
    // send 2/3 of the traffic to the CDN (higher cap) and misses would vanish,
    // dropping the load on the app/databases to near zero.
    const graph = makeGraph(
      [
        sourceNode("src"),
        presetNode("cdn", "cdn", { hitRatio: 0.05, capacity: 2e5 }),
        serverNode("app", { capacity: 1e5, latBase: 1 }),
        serverNode("db", { capacity: 5000, latBase: 5 }),
      ],
      [
        { id: "e1", from: "src", to: "cdn", kind: "read" },
        { id: "e2", from: "src", to: "app", kind: "read" },
        { id: "e3", from: "app", to: "db", kind: "read" },
      ],
    );

    const verdict = runSimulation(
      graph,
      defaultParams({ rps: 10000, readWriteRatio: 1 }),
    );

    // CDN serves 5% (500); the 95% of misses (9500) go to the app and down to the db.
    expect(verdict.edgeFlows.e1?.read).toBeCloseTo(500);
    expect(verdict.edgeFlows.e2?.read).toBeCloseTo(9500);
    expect(verdict.edgeFlows.e3?.read).toBeCloseTo(9500);
    expect(verdict.nodes.db?.rho).toBeCloseTo(9500 / 5000);
  });
});
