import { isOrigin, isStructural, resolveNode } from "@/engine/catalog";
import type { Graph, Violation } from "@/engine/types";

function getReachableFrom(
  startIds: string[],
  graph: Graph,
  excludeNodeId?: string,
): Set<string> {
  const adjacency = new Map<string, string[]>();
  for (const node of graph.nodes) {
    if (node.id === excludeNodeId) {
      continue;
    }
    adjacency.set(node.id, []);
  }

  for (const edge of graph.edges) {
    if (edge.from === excludeNodeId || edge.to === excludeNodeId) {
      continue;
    }
    adjacency.get(edge.from)?.push(edge.to);
  }

  const reachable = new Set<string>();
  const queue = startIds.filter((id) => id !== excludeNodeId);

  for (const id of queue) {
    reachable.add(id);
  }

  let head = 0;
  while (head < queue.length) {
    const current = queue[head++];
    for (const next of adjacency.get(current) ?? []) {
      if (!reachable.has(next)) {
        reachable.add(next);
        queue.push(next);
      }
    }
  }

  return reachable;
}

function getSinkNodes(graph: Graph, excludeNodeId?: string): string[] {
  const nodesWithOutgoing = new Set<string>();
  for (const edge of graph.edges) {
    if (edge.from !== excludeNodeId) {
      nodesWithOutgoing.add(edge.from);
    }
  }

  return graph.nodes
    .filter(
      (node) =>
        node.id !== excludeNodeId &&
        !nodesWithOutgoing.has(node.id) &&
        !isOrigin(node) &&
        !isStructural(node),
    )
    .map((node) => node.id);
}

function hasPathSourceToSink(graph: Graph, excludeNodeId?: string): boolean {
  const sources = graph.nodes
    .filter((node) => isOrigin(node) && node.id !== excludeNodeId)
    .map((node) => node.id);

  if (sources.length === 0) {
    return true;
  }

  const sinks = getSinkNodes(graph, excludeNodeId);
  if (sinks.length === 0) {
    return true;
  }

  const reachable = getReachableFrom(sources, graph, excludeNodeId);
  return sinks.some((sink) => reachable.has(sink));
}

export function detectSpof(graph: Graph): Violation[] {
  const violations: Violation[] = [];

  for (const node of graph.nodes) {
    if (isOrigin(node)) {
      continue;
    }

    const resolved = resolveNode(node);
    const instances = resolved.attrs.instances ?? 1;

    if (instances >= 2) {
      continue;
    }

    if (isStructural(node)) {
      violations.push({
        type: "spof",
        nodeId: node.id,
        detail: `Single point of failure`,
      });
      continue;
    }

    const connectedBefore = hasPathSourceToSink(graph);
    const connectedAfter = hasPathSourceToSink(graph, node.id);

    if (connectedBefore && !connectedAfter) {
      violations.push({
        type: "spof",
        nodeId: node.id,
        detail: `Single point of failure`,
      });
    }
  }

  return violations;
}
