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
    // Mesma lógica do cache-aside (test 13 de run-simulation), aplicada ao CDN
    // em série: o lookup no CDN é sempre pago (hit ou miss), e o origin só é
    // atingido num miss → seu p99 entra pesado por passThrough = 1 − hitRatio.
    // Sem isso, um CDN com 85% de hit não mexe no verdict (origin somado
    // integralmente) — o mesmo bug que o cache já teve.
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

    // E o CDN de fato reduz o verdict vs. bater direto no origin.
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
    // Cliente ligado no CDN E no app (duas leituras irmãs). O CDN não é uma
    // réplica que balanceia carga por capacidade — ele serve só a fração de hit
    // e os misses seguem pro app. Sem isso, o split por capacidade mandava 2/3
    // do tráfego pro CDN (cap maior) e os misses sumiam, derrubando o load do
    // app/bancos pra perto de zero.
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

    // CDN serve 5% (500); os 95% de miss (9500) vão pro app e descem pro db.
    expect(verdict.edgeFlows.e1?.read).toBeCloseTo(500);
    expect(verdict.edgeFlows.e2?.read).toBeCloseTo(9500);
    expect(verdict.edgeFlows.e3?.read).toBeCloseTo(9500);
    expect(verdict.nodes.db?.rho).toBeCloseTo(9500 / 5000);
  });
});
