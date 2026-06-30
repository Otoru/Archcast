import type { Connection, Edge } from "@xyflow/react";
import { describe, expect, it } from "vitest";

import type { BlockNode as BlockNodeType } from "@/components/flow/block-node";
import {
  buildGraph,
  channelFromHandle,
  findInvalidNodeIds,
  isConnectionValid,
} from "@/components/flow/validate-graph";

function rfNode(id: string, kind: string): BlockNodeType {
  return { id, type: "block", position: { x: 0, y: 0 }, data: { kind } };
}

function rfEdge(
  id: string,
  source: string,
  target: string,
  sourceHandle: string,
  targetHandle: string,
): Edge {
  return { id, source, target, sourceHandle, targetHandle };
}

function getNode(nodes: BlockNodeType[]) {
  return (id: string) => nodes.find((node) => node.id === id);
}

describe("channelFromHandle", () => {
  it("decodifica handles in-/out- para o canal", () => {
    expect(channelFromHandle("out-read")).toBe("read");
    expect(channelFromHandle("in-write")).toBe("write");
    expect(channelFromHandle("out-async")).toBe("async");
  });

  it("devolve undefined para handle ausente ou canal desconhecido", () => {
    expect(channelFromHandle(null)).toBeUndefined();
    expect(channelFromHandle(undefined)).toBeUndefined();
    expect(channelFromHandle("out-x")).toBeUndefined();
    expect(channelFromHandle("nada")).toBeUndefined();
  });
});

describe("buildGraph", () => {
  it("mapeia nós e arestas RF para o Graph do motor", () => {
    const graph = buildGraph(
      [rfNode("src", "web-client"), rfNode("app", "app-server")],
      [rfEdge("e1", "src", "app", "out-read", "in-read")],
    );

    expect(graph.nodes).toEqual([
      { id: "src", kind: "web-client", attrs: {} },
      { id: "app", kind: "app-server", attrs: {} },
    ]);
    expect(graph.edges).toEqual([
      { id: "e1", from: "src", to: "app", kind: "read" },
    ]);
  });

  it("descarta arestas cujo canal não é resolvable do sourceHandle", () => {
    const graph = buildGraph(
      [rfNode("a", "app-server"), rfNode("b", "app-server")],
      [
        rfEdge("e1", "a", "b", "out-read", "in-read"),
        rfEdge("e2", "a", "b", "??", "in-read"),
      ],
    );

    expect(graph.edges).toHaveLength(1);
    expect(graph.edges[0]?.id).toBe("e1");
  });
});

describe("isConnectionValid", () => {
  const nodes = [
    rfNode("src", "web-client"),
    rfNode("app", "app-server"),
    rfNode("db", "sql-db"),
  ];
  const lookup = getNode(nodes);

  it("aceita canal compatível entre presets válidos", () => {
    const connection: Connection = {
      source: "src",
      target: "app",
      sourceHandle: "out-read",
      targetHandle: "in-read",
    };
    expect(isConnectionValid(connection, lookup)).toBe(true);
  });

  it("recusa self-loop", () => {
    const connection: Connection = {
      source: "app",
      target: "app",
      sourceHandle: "out-read",
      targetHandle: "in-read",
    };
    expect(isConnectionValid(connection, lookup)).toBe(false);
  });

  it("recusa canal divergente entre source e target", () => {
    const connection: Connection = {
      source: "src",
      target: "app",
      sourceHandle: "out-read",
      targetHandle: "in-write",
    };
    expect(isConnectionValid(connection, lookup)).toBe(false);
  });

  it("recusa quando o source não oferece o canal (sql-db out vazio)", () => {
    const connection: Connection = {
      source: "db",
      target: "app",
      sourceHandle: "out-read",
      targetHandle: "in-read",
    };
    expect(isConnectionValid(connection, lookup)).toBe(false);
  });

  it("recusa nó desconhecido", () => {
    const connection: Connection = {
      source: "src",
      target: "missing",
      sourceHandle: "out-read",
      targetHandle: "in-read",
    };
    expect(isConnectionValid(connection, lookup)).toBe(false);
  });
});

describe("findInvalidNodeIds", () => {
  it("não marca nada num grafo acíclico válido", () => {
    const graph = buildGraph(
      [rfNode("src", "web-client"), rfNode("app", "app-server")],
      [rfEdge("e1", "src", "app", "out-read", "in-read")],
    );

    expect(findInvalidNodeIds(graph)).toEqual(new Set());
  });

  it("marca os nós de um ciclo", () => {
    const graph = buildGraph(
      [rfNode("a", "app-server"), rfNode("b", "app-server")],
      [
        rfEdge("e1", "a", "b", "out-read", "in-read"),
        rfEdge("e2", "b", "a", "out-read", "in-read"),
      ],
    );

    expect(findInvalidNodeIds(graph)).toEqual(new Set(["a", "b"]));
  });

  it("marca o nó-fonte de uma aresta estruturalmente inválida", () => {
    // sql-db has empty out: a "read" edge leaving it is structurally
    // invalid — bypasses isValidConnection (built directly on the graph).
    const graph = buildGraph(
      [rfNode("db", "sql-db"), rfNode("app", "app-server")],
      [rfEdge("e1", "db", "app", "out-read", "in-read")],
    );

    expect(findInvalidNodeIds(graph)).toEqual(new Set(["db"]));
  });
});
