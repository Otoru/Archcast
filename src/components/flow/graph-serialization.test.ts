import type { Edge } from "@xyflow/react";
import { describe, expect, it } from "vitest";
import type { BlockNode as BlockNodeType } from "@/components/flow/block-node";
import { defaultChallengeParams } from "@/components/flow/flow-editor-helpers";
import {
  deserializeGraph,
  GRAPH_DOC_VERSION,
  type GraphDocument,
  serializeGraph,
} from "@/components/flow/graph-serialization";

function rfNode(
  id: string,
  kind: string,
  attrs: Record<string, number> = {},
): BlockNodeType {
  return {
    id,
    type: "block",
    position: { x: 10, y: 20 },
    data: { kind, attrs },
    selected: true,
  } as BlockNodeType;
}

function rfEdge(id: string, source: string, target: string): Edge {
  return {
    id,
    source,
    target,
    sourceHandle: "out-read",
    targetHandle: "in-read",
  };
}

function validDoc(): GraphDocument {
  return {
    version: GRAPH_DOC_VERSION,
    nodes: [
      {
        id: "a",
        kind: "web-client",
        attrs: {},
        position: { x: 0, y: 0 },
      },
      {
        id: "b",
        kind: "app-server",
        attrs: { instances: 2 },
        position: { x: 100, y: 0 },
      },
    ],
    edges: [
      {
        id: "e1",
        source: "a",
        target: "b",
        sourceHandle: "out-read",
        targetHandle: "in-read",
      },
    ],
    params: defaultChallengeParams(),
  };
}

describe("serializeGraph", () => {
  it("colapsa RF nodes/edges/params num GraphDocument plano", () => {
    const doc = serializeGraph(
      [rfNode("a", "web-client"), rfNode("b", "app-server", { instances: 2 })],
      [rfEdge("e1", "a", "b")],
      defaultChallengeParams(),
    );
    expect(doc.version).toBe(GRAPH_DOC_VERSION);
    expect(doc.nodes).toHaveLength(2);
    expect(doc.nodes[1]).toMatchObject({
      id: "b",
      kind: "app-server",
      attrs: { instances: 2 },
      position: { x: 10, y: 20 },
    });
    expect(doc.edges[0]).toMatchObject({
      id: "e1",
      source: "a",
      target: "b",
      sourceHandle: "out-read",
      targetHandle: "in-read",
    });
  });

  it("faz round-trip serialize → deserialize preservando dados", () => {
    const doc = validDoc();
    const loaded = deserializeGraph(doc);
    const reDoc = serializeGraph(loaded.nodes, loaded.edges, loaded.params);
    expect(reDoc.nodes).toEqual(doc.nodes);
    expect(reDoc.edges.map((e) => e.id)).toEqual(["e1"]);
  });
});

describe("deserializeGraph", () => {
  it("reconstrói nós/arestas no shape do React Flow", () => {
    const loaded = deserializeGraph(validDoc());
    expect(loaded.nodes).toHaveLength(2);
    expect(loaded.nodes[0]).toMatchObject({
      id: "a",
      type: "block",
      data: { kind: "web-client" },
      selected: false,
    });
    expect(loaded.edges[0]).toMatchObject({ id: "e1", type: "wf" });
  });

  it("filtra attrs não-numéricos e tolera attrs ausente", () => {
    const doc = validDoc();
    // @ts-expect-error: raw JSON input may have invalid types
    doc.nodes[0].attrs = { instances: 3, bogus: "x", nope: null };
    const loaded = deserializeGraph(doc);
    expect(loaded.nodes[0].data.attrs).toEqual({ instances: 3 });
  });

  it("mescla params sobre os defaults", () => {
    const doc = validDoc();
    doc.params = { rps: 500 } as GraphDocument["params"];
    const loaded = deserializeGraph(doc);
    expect(loaded.params.rps).toBe(500);
    // campo ausente cai no default
    expect(loaded.params.trafficPattern).toBe(
      defaultChallengeParams().trafficPattern,
    );
  });

  it("rejeita documento que não é objeto", () => {
    expect(() => deserializeGraph(null)).toThrow(TypeError);
    expect(() => deserializeGraph(42)).toThrow(/expected a JSON object/);
  });

  it("rejeita versão incompatível", () => {
    expect(() => deserializeGraph({ ...validDoc(), version: 99 })).toThrow(
      /Unsupported graph version/,
    );
  });

  it("rejeita nodes/edges que não são arrays", () => {
    expect(() => deserializeGraph({ ...validDoc(), nodes: {} })).toThrow(
      /must be arrays/,
    );
  });

  it("rejeita params que não é objeto", () => {
    expect(() => deserializeGraph({ ...validDoc(), params: 1 })).toThrow(
      /params must be an object/,
    );
  });

  it("rejeita nó não-objeto, sem id, sem kind ou com posição inválida", () => {
    const base = validDoc();
    expect(() => deserializeGraph({ ...base, nodes: [1], edges: [] })).toThrow(
      /expected an object/,
    );
    expect(() =>
      deserializeGraph({ ...base, nodes: [{ kind: "web-client" }], edges: [] }),
    ).toThrow(/missing id/);
    expect(() =>
      deserializeGraph({ ...base, nodes: [{ id: "a" }], edges: [] }),
    ).toThrow(/missing kind/);
    expect(() =>
      deserializeGraph({
        ...base,
        nodes: [{ id: "a", kind: "web-client", position: { x: "no" } }],
        edges: [],
      }),
    ).toThrow(/missing position/);
  });

  it("rejeita kind desconhecido", () => {
    const base = validDoc();
    expect(() =>
      deserializeGraph({
        ...base,
        nodes: [{ id: "a", kind: "totally-made-up", position: { x: 0, y: 0 } }],
        edges: [],
      }),
    ).toThrow(/Unknown block kind: totally-made-up/);
  });

  it("rejeita aresta não-objeto ou sem id/source/target", () => {
    const base = validDoc();
    expect(() => deserializeGraph({ ...base, edges: [5] })).toThrow(
      /expected an object/,
    );
    expect(() =>
      deserializeGraph({ ...base, edges: [{ id: "e1", source: "a" }] }),
    ).toThrow(/missing id\/source\/target/);
  });

  it("normaliza handles ausentes para null", () => {
    const base = validDoc();
    const loaded = deserializeGraph({
      ...base,
      edges: [{ id: "e1", source: "a", target: "b" }],
    });
    expect(loaded.edges[0]).toMatchObject({
      sourceHandle: null,
      targetHandle: null,
    });
  });
});
