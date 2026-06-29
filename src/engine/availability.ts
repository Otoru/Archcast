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

  // Agrupa os destinos por `kind`: destinos do MESMO kind são réplicas
  // redundantes (qualquer uma serve → combina em paralelo); destinos de kinds
  // DIFERENTES são dependências distintas, todas necessárias para a requisição
  // (→ multiplica em série). Assim um load balancer → 3 app-servers continua
  // sendo redundância, mas um app-server → db + feature-flag passa a exigir os
  // dois — a disponibilidade do feature-flag deixa de ser mascarada pela do db.
  const branchesByKind = new Map<string, number[]>();

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
    const branch = destAvail * further;
    const group = branchesByKind.get(destNode.kind);
    if (group) {
      group.push(branch);
    } else {
      branchesByKind.set(destNode.kind, [branch]);
    }
  }

  let available = 1;
  for (const branches of branchesByKind.values()) {
    available *= combineParallel(branches);
  }
  return available;
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
      detail: `System availability ${(systemAvailability * 100).toFixed(2)}% is below SLO ${(availabilitySlo * 100).toFixed(2)}%`,
    };
  }
  return { passed: true };
}
