import type { Edge } from "@xyflow/react";
import type { BlockNode as BlockNodeType } from "@/components/flow/block-node";
import { defaultChallengeParams } from "@/components/flow/flow-editor-helpers";
import { type ChallengeParams, getPreset } from "@/engine";

/**
 * Versão do formato de documento. Bump + migração se o shape mudar; por ora
 * só `1` existe. `deserializeGraph` rejeita qualquer outra versão.
 */
export const GRAPH_DOC_VERSION = 1;

export type GraphNode = {
  id: string;
  kind: string;
  attrs: Record<string, number>;
  position: { x: number; y: number };
};

export type GraphEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle: string | null;
  targetHandle: string | null;
};

export type GraphDocument = {
  version: typeof GRAPH_DOC_VERSION;
  nodes: GraphNode[];
  edges: GraphEdge[];
  params: ChallengeParams;
};

/**
 * Grafo pronto pra aplicar no editor: nós/arestas no shape do React Flow (com
 * `data.kind`/`data.attrs`) + params. É o que `deserializeGraph` devolve e o que
 * `applyGraph` consome — distinto do `GraphDocument` (plano, serializável), que
 * é o shape de export/share/localStorage.
 */
export type LoadedGraph = {
  nodes: BlockNodeType[];
  edges: Edge[];
  params: ChallengeParams;
};

/**
 * Colapsa o estado do editor (RF nodes/edges + params) num `GraphDocument`
 * estável e serializável. `data.kind`/`data.attrs` viram top-level; `type:"block"`
 * é implícito (recriado no load); `selected` é descartado (estado efêmero de
 * UI). Edges mantêm `source`/`target`/`sourceHandle`/`targetHandle` — exatamente
 * o que `buildGraph` lê para reconstruir o grafo do motor.
 */
export function serializeGraph(
  nodes: BlockNodeType[],
  edges: Edge[],
  params: ChallengeParams,
): GraphDocument {
  return {
    version: GRAPH_DOC_VERSION,
    nodes: nodes.map((node) => ({
      id: node.id,
      kind: node.data.kind,
      attrs: { ...(node.data.attrs ?? {}) },
      position: { x: node.position.x, y: node.position.y },
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle ?? null,
      targetHandle: edge.targetHandle ?? null,
    })),
    params: { ...params },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Reconstrói RF nodes/edges/params a partir de um `GraphDocument` (ou qualquer
 * `unknown` vindo de JSON.parse). Valida `version`, arrays, o shape de cada
 * nó/aresta, e **cada `kind` via `getPreset`** — um `kind` desconhecido vira um
 * `Error("Unknown block kind: X")` que o chamador converte em `toast.error`.
 * `params` é mergeado sobre os defaults para tolerar campos ausentes (links
 * compartilhados de versões anteriores), mantendo o tipo seguro.
 */
export function deserializeGraph(doc: unknown): LoadedGraph {
  if (!isRecord(doc)) {
    throw new Error("Invalid graph document: expected a JSON object.");
  }
  if (doc.version !== GRAPH_DOC_VERSION) {
    throw new Error(
      `Unsupported graph version: expected ${GRAPH_DOC_VERSION}, got ${String(doc.version)}.`,
    );
  }
  if (!Array.isArray(doc.nodes) || !Array.isArray(doc.edges)) {
    throw new Error("Invalid graph document: nodes and edges must be arrays.");
  }
  if (!isRecord(doc.params)) {
    throw new Error("Invalid graph document: params must be an object.");
  }

  const nodes: BlockNodeType[] = doc.nodes.map((raw, index) => {
    if (!isRecord(raw)) {
      throw new Error(`Invalid node at index ${index}: expected an object.`);
    }
    if (typeof raw.id !== "string") {
      throw new Error(`Invalid node at index ${index}: missing id.`);
    }
    if (typeof raw.kind !== "string") {
      throw new Error(`Invalid node at index ${index}: missing kind.`);
    }
    if (!getPreset(raw.kind)) {
      throw new Error(`Unknown block kind: ${raw.kind}`);
    }
    if (
      !isRecord(raw.position) ||
      !isNumber(raw.position.x) ||
      !isNumber(raw.position.y)
    ) {
      throw new Error(`Invalid node at index ${index}: missing position.`);
    }
    const attrs = isRecord(raw.attrs)
      ? (Object.fromEntries(
          Object.entries(raw.attrs).filter(([, v]) => isNumber(v)),
        ) as Record<string, number>)
      : {};
    return {
      id: raw.id,
      type: "block",
      position: { x: raw.position.x, y: raw.position.y },
      data: { kind: raw.kind, attrs },
      selected: false,
    } as BlockNodeType;
  });

  const edges: Edge[] = doc.edges.map((raw, index) => {
    if (!isRecord(raw)) {
      throw new Error(`Invalid edge at index ${index}: expected an object.`);
    }
    if (
      typeof raw.id !== "string" ||
      typeof raw.source !== "string" ||
      typeof raw.target !== "string"
    ) {
      throw new Error(
        `Invalid edge at index ${index}: missing id/source/target.`,
      );
    }
    return {
      id: raw.id,
      source: raw.source,
      target: raw.target,
      sourceHandle:
        typeof raw.sourceHandle === "string" ? raw.sourceHandle : null,
      targetHandle:
        typeof raw.targetHandle === "string" ? raw.targetHandle : null,
      type: "wf",
    } as Edge;
  });

  const params: ChallengeParams = {
    ...defaultChallengeParams(),
    ...(Object.fromEntries(
      Object.entries(doc.params).filter(
        ([, v]) => isNumber(v) || typeof v === "string",
      ),
    ) as Partial<ChallengeParams>),
  };

  return { nodes, edges, params };
}
