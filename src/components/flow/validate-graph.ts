import type { Connection, Edge } from "@xyflow/react";
import type { BlockNode as BlockNodeType } from "@/components/flow/block-node";
import { getPreset, validateEdges } from "@/engine";
import type { EdgeChannel, Graph } from "@/engine/types";

const CHANNELS: readonly EdgeChannel[] = ["read", "write", "async"];

/**
 * Extracts the `EdgeChannel` encoded in a Handle's `id` (`in-read`,
 * `out-write`, `out-async`...). Returns `undefined` if the handle does not
 * exist or the suffix is not a valid channel — signaling a connection that
 * does not belong to the engine's model.
 */
export function channelFromHandle(
  handleId: string | null | undefined,
): EdgeChannel | undefined {
  if (!handleId) {
    return undefined;
  }
  let suffix = handleId;
  if (handleId.startsWith("in-")) {
    suffix = handleId.slice(3);
  } else if (handleId.startsWith("out-")) {
    suffix = handleId.slice(4);
  }
  return CHANNELS.find((channel) => channel === suffix);
}

/**
 * Translates React Flow state into the engine's `Graph`: RF node →
 * `NodeInstance` (kind in `data.kind`), RF edge → `Edge` (channel derived
 * from `sourceHandle`). Edges whose channel cannot be resolved are discarded
 * — they do not represent a modeled flow and should not go to validation.
 */
export function buildGraph(nodes: BlockNodeType[], edges: Edge[]): Graph {
  return {
    nodes: nodes.map((node) => ({
      id: node.id,
      kind: node.data.kind,
      attrs: node.data.attrs ?? {},
    })),
    edges: edges
      .map((edge) => {
        const kind = channelFromHandle(edge.sourceHandle);
        if (!kind) {
          return null;
        }
        return {
          id: edge.id,
          from: edge.source,
          to: edge.target,
          kind,
        };
      })
      .filter((edge): edge is NonNullable<typeof edge> => edge !== null),
  };
}

/**
 * Decides whether an in-progress connection can be completed, consulting the
 * presets of the involved nodes — used by React Flow's `isValidConnection`
 * to reject the drop (red line) **before** the edge is created.
 *
 * Rules: no self-loop; the source channel (`out-foo`) must exist and match the
 * target's (`in-foo`); both presets must exist; the channel must be in
 * `fromPreset.edges.out` AND in `toPreset.edges.in`.
 */
export function isConnectionValid(
  connection: Connection | Edge,
  getNode: (id: string) => BlockNodeType | undefined,
): boolean {
  const { source, target, sourceHandle, targetHandle } = connection;
  if (!source || !target || source === target) {
    return false;
  }

  const outChannel = channelFromHandle(sourceHandle);
  const inChannel = channelFromHandle(targetHandle);
  if (!outChannel || !inChannel || outChannel !== inChannel) {
    return false;
  }

  const srcNode = getNode(source);
  const tgtNode = getNode(target);
  if (!srcNode || !tgtNode) {
    return false;
  }

  const srcPreset = getPreset(srcNode.data.kind);
  const tgtPreset = getPreset(tgtNode.data.kind);
  if (!srcPreset || !tgtPreset) {
    return false;
  }

  return (
    srcPreset.edges.out.includes(outChannel) &&
    tgtPreset.edges.in.includes(inChannel)
  );
}

/**
 * Finds the set of nodes that participate in a cycle via Tarjan's SCC
 * (strongly connected components of size ≥ 2 = a cycle). Self-loops
 * (`from === to`) also mark the node. O(V+E), sufficient for a canvas.
 */
function findCycleNodeIds(graph: Graph): Set<string> {
  const ids = graph.nodes.map((node) => node.id);
  const adj = new Map<string, string[]>(ids.map((id) => [id, []]));
  for (const edge of graph.edges) {
    if (!adj.has(edge.from) || !adj.has(edge.to)) {
      continue;
    }
    adj.get(edge.from)?.push(edge.to);
  }

  const indexMap = new Map<string, number>();
  const lowlink = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  let index = 0;
  const cyclic = new Set<string>();

  const strongconnect = (v: string) => {
    indexMap.set(v, index);
    lowlink.set(v, index);
    index += 1;
    stack.push(v);
    onStack.add(v);

    for (const w of adj.get(v) ?? []) {
      if (w === v) {
        cyclic.add(v); // explicit self-loop
        continue;
      }
      if (!indexMap.has(w)) {
        strongconnect(w);
        lowlink.set(v, Math.min(lowlink.get(v) ?? 0, lowlink.get(w) ?? 0));
      } else if (onStack.has(w)) {
        lowlink.set(v, Math.min(lowlink.get(v) ?? 0, indexMap.get(w) ?? 0));
      }
    }

    if (lowlink.get(v) === indexMap.get(v)) {
      const component: string[] = [];
      let w: string;
      do {
        w = stack.pop() as string;
        onStack.delete(w);
        component.push(w);
      } while (w !== v);
      if (component.length > 1) {
        for (const id of component) {
          cyclic.add(id);
        }
      }
    }
  };

  for (const id of ids) {
    if (!indexMap.has(id)) {
      strongconnect(id);
    }
  }

  return cyclic;
}

/**
 * Set of nodes to mark as invalid on the canvas: (1) source nodes of edges
 * that are structurally invalid per the engine (`validateEdges`, safety net —
 * usually empty because `isValidConnection` already blocked the drop) and
 * (2) nodes that participate in a cycle. Pure derivation, no side effects —
 * safe to run in a `useMemo` on every state change.
 */
export function findInvalidNodeIds(graph: Graph): Set<string> {
  const invalid = new Set<string>();
  for (const violation of validateEdges(graph)) {
    if (violation.nodeId) {
      invalid.add(violation.nodeId);
    }
  }
  for (const id of findCycleNodeIds(graph)) {
    invalid.add(id);
  }
  return invalid;
}
