import type { Edge } from "@xyflow/react";
import type { BlockNode as BlockNodeType } from "@/components/flow/block-node";
import { defaultChallengeParams } from "@/components/flow/flow-editor-helpers";
import { type ChallengeParams, getPreset } from "@/engine";

/**
 * Document format version. Bump + migrate if the shape changes; for now only
 * `1` exists. `deserializeGraph` rejects any other version.
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
 * Graph ready to apply to the editor: nodes/edges in the React Flow shape (with
 * `data.kind`/`data.attrs`) + params. This is what `deserializeGraph` returns
 * and what `applyGraph` consumes — distinct from `GraphDocument` (flat,
 * serializable), which is the export/share/localStorage shape.
 */
export type LoadedGraph = {
  nodes: BlockNodeType[];
  edges: Edge[];
  params: ChallengeParams;
};

/**
 * Collapses the editor state (RF nodes/edges + params) into a stable,
 * serializable `GraphDocument`. `data.kind`/`data.attrs` become top-level;
 * `type:"block"` is implicit (recreated on load); `selected` is dropped
 * (ephemeral UI state). Edges keep `source`/`target`/`sourceHandle`/`targetHandle`
 * — exactly what `buildGraph` reads to reconstruct the engine graph.
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
      attrs: { ...node.data.attrs },
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
 * Reconstructs RF nodes/edges/params from a `GraphDocument` (or any `unknown`
 * coming from JSON.parse). Validates `version`, arrays, the shape of each
 * node/edge, and **each `kind` via `getPreset`** — an unknown `kind` becomes an
 * `Error("Unknown block kind: X")` which the caller turns into a `toast.error`.
 * `params` is merged over defaults to tolerate missing fields (shared links
 * from older versions), while keeping the type safe.
 */
export function deserializeGraph(doc: unknown): LoadedGraph {
  if (!isRecord(doc)) {
    throw new TypeError("Invalid graph document: expected a JSON object.");
  }
  if (doc.version !== GRAPH_DOC_VERSION) {
    throw new Error(
      `Unsupported graph version: expected ${GRAPH_DOC_VERSION}, got ${String(doc.version)}.`,
    );
  }
  if (!Array.isArray(doc.nodes) || !Array.isArray(doc.edges)) {
    throw new TypeError(
      "Invalid graph document: nodes and edges must be arrays.",
    );
  }
  if (!isRecord(doc.params)) {
    throw new TypeError("Invalid graph document: params must be an object.");
  }

  const nodes: BlockNodeType[] = doc.nodes.map((raw, index) => {
    if (!isRecord(raw)) {
      throw new TypeError(
        `Invalid node at index ${index}: expected an object.`,
      );
    }
    if (typeof raw.id !== "string") {
      throw new TypeError(`Invalid node at index ${index}: missing id.`);
    }
    if (typeof raw.kind !== "string") {
      throw new TypeError(`Invalid node at index ${index}: missing kind.`);
    }
    if (!getPreset(raw.kind)) {
      throw new Error(`Unknown block kind: ${raw.kind}`);
    }
    if (
      !isRecord(raw.position) ||
      !isNumber(raw.position.x) ||
      !isNumber(raw.position.y)
    ) {
      throw new TypeError(`Invalid node at index ${index}: missing position.`);
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
      throw new TypeError(
        `Invalid edge at index ${index}: expected an object.`,
      );
    }
    if (
      typeof raw.id !== "string" ||
      typeof raw.source !== "string" ||
      typeof raw.target !== "string"
    ) {
      throw new TypeError(
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
