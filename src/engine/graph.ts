import type { Graph } from "@/engine/types";

export class CycleError extends Error {
  constructor(message = "Graph contains a cycle and cannot be simulated") {
    super(message);
    this.name = "CycleError";
  }
}

export function validateDag(graph: Graph): void {
  topologicalSort(graph);
}

interface AdjacencyLists {
  inDegree: Map<string, number>;
  adjacency: Map<string, string[]>;
}

function buildAdjacencyLists(
  graph: Graph,
  nodeIds: Set<string>,
): AdjacencyLists {
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const id of nodeIds) {
    inDegree.set(id, 0);
    adjacency.set(id, []);
  }

  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) {
      continue;
    }
    adjacency.get(edge.from)?.push(edge.to);
    inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1);
  }

  return { inDegree, adjacency };
}

function zeroInDegreeNodes(inDegree: Map<string, number>): string[] {
  const queue: string[] = [];
  for (const [id, degree] of inDegree) {
    if (degree === 0) {
      queue.push(id);
    }
  }
  return queue;
}

function drainQueue(
  queue: string[],
  adjacency: Map<string, string[]>,
  inDegree: Map<string, number>,
): string[] {
  const order: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) {
      break;
    }
    order.push(current);

    for (const next of adjacency.get(current) ?? []) {
      const nextDegree = (inDegree.get(next) ?? 0) - 1;
      inDegree.set(next, nextDegree);
      if (nextDegree === 0) {
        queue.push(next);
      }
    }
  }

  return order;
}

export function topologicalSort(graph: Graph): string[] {
  const nodeIds = new Set(graph.nodes.map((node) => node.id));
  const { inDegree, adjacency } = buildAdjacencyLists(graph, nodeIds);
  const order = drainQueue(zeroInDegreeNodes(inDegree), adjacency, inDegree);

  if (order.length !== nodeIds.size) {
    throw new CycleError(
      "Graph contains a cycle and cannot be simulated deterministically",
    );
  }

  return order;
}
