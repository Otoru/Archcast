import { isOrigin, isStructural, resolveNode } from "@/engine/catalog";
import type { EdgeChannel, Graph } from "@/engine/types";
import { effectiveAvailability } from "@/engine/types";

function nodeAvailability(nodeId: string, graph: Graph): number {
  const node = graph.nodes.find((n) => n.id === nodeId);
  if (!node) {
    return 1;
  }
  if (isOrigin(node)) {
    return 1;
  }
  if (isStructural(node)) {
    return effectiveAvailability(resolveNode(node).attrs);
  }
  return effectiveAvailability(resolveNode(node).attrs);
}

function combineParallel(availabilities: number[]): number {
  if (availabilities.length === 0) {
    return 1;
  }
  return 1 - availabilities.reduce((product, a) => product * (1 - a), 1);
}

function downstreamAvailability(
  nodeId: string,
  channel: EdgeChannel,
  graph: Graph,
  visited: Set<string>,
): number {
  if (visited.has(nodeId)) {
    return 1;
  }
  visited.add(nodeId);

  const outgoing = graph.edges.filter(
    (edge) => edge.from === nodeId && edge.kind === channel,
  );

  if (outgoing.length === 0) {
    return 1;
  }

  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
  const branchAvailabilities: number[] = [];

  for (const edge of outgoing) {
    const destNode = nodeById.get(edge.to);
    if (!destNode) {
      continue;
    }

    const destAvail = nodeAvailability(destNode.id, graph);
    const further = downstreamAvailability(
      destNode.id,
      channel,
      graph,
      new Set(visited),
    );
    branchAvailabilities.push(destAvail * further);
  }

  return combineParallel(branchAvailabilities);
}

export function computeSystemAvailability(graph: Graph): number {
  const sources = graph.nodes.filter((node) => isOrigin(node));
  if (sources.length === 0) {
    return 1;
  }

  const pathAvailabilities: number[] = [];

  for (const source of sources) {
    const readAvail = downstreamAvailability(
      source.id,
      "read",
      graph,
      new Set(),
    );
    const writeAvail = downstreamAvailability(
      source.id,
      "write",
      graph,
      new Set(),
    );
    pathAvailabilities.push(readAvail * writeAvail);
  }

  return Math.min(...pathAvailabilities);
}

export function checkAvailability(
  _graph: Graph,
  systemAvailability: number,
  availabilitySlo: number,
): { passed: boolean; detail?: string } {
  if (systemAvailability < availabilitySlo) {
    return {
      passed: false,
      detail: `System availability ${(systemAvailability * 100).toFixed(3)}% is below SLO ${(availabilitySlo * 100).toFixed(3)}%`,
    };
  }
  return { passed: true };
}
