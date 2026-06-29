import { describe, expect, it } from "vitest";

import { detectSpof } from "@/engine/spof";
import {
  makeGraph,
  presetNode,
  serverNode,
  sourceNode,
} from "@/engine/test-helpers";

describe("detectSpof", () => {
  it("flags single-instance node whose removal disconnects graph", () => {
    const graph = makeGraph(
      [
        sourceNode("src"),
        serverNode("app", { capacity: 1000, latBase: 5, instances: 1 }),
        presetNode("db", "sql-db", {
          capacity: 5000,
          latBase: 5,
          instances: 1,
        }),
      ],
      [
        { id: "e1", from: "src", to: "app", kind: "read" },
        { id: "e2", from: "app", to: "db", kind: "read" },
      ],
    );

    const violations = detectSpof(graph);

    expect(violations.some((v) => v.nodeId === "app")).toBe(true);
  });

  it("does not flag node with instances >= 2", () => {
    const graph = makeGraph(
      [
        sourceNode("src"),
        serverNode("app", { capacity: 1000, latBase: 5, instances: 2 }),
      ],
      [{ id: "e1", from: "src", to: "app", kind: "read" }],
    );

    const violations = detectSpof(graph);
    expect(violations.filter((v) => v.nodeId === "app")).toHaveLength(0);
  });

  it("flags every single-instance relay on the unique source→sink path (LB behind a WAF)", () => {
    // src → waf → lb → app → db: cada nó na cadeia (exceto o db, sink) é um
    // SPOF quando tem 1 instância. Antes do fix, o LB NÃO era flaggeado: ao
    // removê-lo, o WAF (cuja única saída era o LB) virava um "sink" falso e
    // continuava alcançável a partir de src, então o algoritmo entendia o
    // caminho como intacto. Com os sinks derivados do grafo original, o db
    // passa a ser o sink de referência — remover o LB o torna inalcançável.
    const graph = makeGraph(
      [
        sourceNode("src"),
        presetNode("waf", "waf", { capacity: 5e4, latBase: 5, instances: 1 }),
        presetNode("lb", "load-balancer", {
          capacity: 1e5,
          latBase: 1,
          instances: 1,
        }),
        serverNode("app", { capacity: 2000, latBase: 20, instances: 1 }),
        presetNode("db", "sql-db", {
          capacity: 5000,
          latBase: 5,
          instances: 1,
        }),
      ],
      [
        { id: "e1", from: "src", to: "waf", kind: "read" },
        { id: "e2", from: "waf", to: "lb", kind: "read" },
        { id: "e3", from: "lb", to: "app", kind: "read" },
        { id: "e4", from: "app", to: "db", kind: "read" },
      ],
    );

    const violations = detectSpof(graph);
    const spofIds = new Set(
      violations.filter((v) => v.type === "spof").map((v) => v.nodeId),
    );
    expect(spofIds.has("waf")).toBe(true);
    expect(spofIds.has("lb")).toBe(true);
    expect(spofIds.has("app")).toBe(true);
  });
});
