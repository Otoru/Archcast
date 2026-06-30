import { beforeEach, describe, expect, it } from "vitest";
import type { BlockNode as BlockNodeType } from "@/components/flow/block-node";
import { defaultChallengeParams } from "@/components/flow/flow-editor-helpers";
import {
  clearStoredGraph,
  readStoredGraph,
  writeStoredGraph,
} from "@/components/flow/graph-persistence";

function rfNode(id: string, kind: string): BlockNodeType {
  return {
    id,
    type: "block",
    position: { x: 1, y: 2 },
    data: { kind, attrs: {} },
  } as BlockNodeType;
}

describe("graph-persistence", () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
  });

  it("read devolve null quando não há nada salvo", () => {
    expect(readStoredGraph()).toBeNull();
  });

  it("write então read faz round-trip do grafo", () => {
    writeStoredGraph(
      [rfNode("a", "web-client"), rfNode("b", "app-server")],
      [
        {
          id: "e1",
          source: "a",
          target: "b",
          sourceHandle: "out-read",
          targetHandle: "in-read",
        },
      ],
      defaultChallengeParams(),
    );
    const loaded = readStoredGraph();
    expect(loaded).not.toBeNull();
    expect(loaded?.nodes.map((n) => n.id)).toEqual(["a", "b"]);
    expect(loaded?.edges).toHaveLength(1);
  });

  it("clear remove o grafo salvo", () => {
    writeStoredGraph([rfNode("a", "web-client")], [], defaultChallengeParams());
    expect(readStoredGraph()).not.toBeNull();
    clearStoredGraph();
    expect(readStoredGraph()).toBeNull();
  });

  it("read devolve null para conteúdo corrompido", () => {
    globalThis.localStorage.setItem("wireframe:graph", "{not json");
    expect(readStoredGraph()).toBeNull();
  });
});
