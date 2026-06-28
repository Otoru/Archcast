import type { NodeTypeRegistry } from "@/engine/registry";
import type { EdgeChannel, Graph } from "@/engine/types";
import { effectiveCapacity } from "@/engine/types";

export interface ApportionResult {
  deliveries: Map<string, number>;
  hasValidDestination: boolean;
}

interface ClassifiedEdge {
  edgeId: string;
  nodeId: string;
  edgeWeight?: number;
  role:
    | { kind: "server" }
    | { kind: "absorber"; passThrough: number }
    | { kind: "broadcaster" };
}

export function apportionChannel(
  sourceNodeId: string,
  channel: EdgeChannel,
  flow: number,
  graph: Graph,
  registry: NodeTypeRegistry,
): ApportionResult {
  const deliveries = new Map<string, number>();

  if (flow <= 0) {
    return { deliveries, hasValidDestination: true };
  }

  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  const sourceNode = nodeById.get(sourceNodeId);
  if (!sourceNode) {
    return { deliveries, hasValidDestination: false };
  }

  const sourceResolved = registry.resolve(sourceNode);
  const useWeighted = sourceResolved.flags.weighted ?? false;
  const isBroadcaster = sourceResolved.primitive === "broadcaster";

  const outgoing = graph.edges.filter(
    (edge) => edge.from === sourceNodeId && edge.kind === channel,
  );

  if (isBroadcaster) {
    for (const edge of outgoing) {
      const destNode = nodeById.get(edge.to);
      if (!destNode) {
        continue;
      }
      const handler = registry.getHandler(destNode);
      const resolved = registry.resolve(destNode);
      const role = handler.roleFor(channel, resolved);
      if (role) {
        deliveries.set(edge.id, flow);
      }
    }
    return {
      deliveries,
      hasValidDestination: deliveries.size > 0,
    };
  }

  const absorbers: ClassifiedEdge[] = [];
  const servers: ClassifiedEdge[] = [];
  const broadcasters: ClassifiedEdge[] = [];

  for (const edge of outgoing) {
    const destNode = nodeById.get(edge.to);
    if (!destNode) {
      continue;
    }

    const handler = registry.getHandler(destNode);
    const resolved = registry.resolve(destNode);
    const role = handler.roleFor(channel, resolved);
    if (!role) {
      continue;
    }

    const classified: ClassifiedEdge = {
      edgeId: edge.id,
      nodeId: destNode.id,
      edgeWeight: edge.weight,
      role,
    };

    if (role.kind === "absorber") {
      absorbers.push(classified);
    } else if (role.kind === "broadcaster") {
      broadcasters.push(classified);
    } else {
      servers.push(classified);
    }
  }

  if (
    absorbers.length === 0 &&
    servers.length === 0 &&
    broadcasters.length === 0
  ) {
    return { deliveries, hasValidDestination: false };
  }

  for (const broadcaster of broadcasters) {
    deliveries.set(broadcaster.edgeId, flow);
  }

  let residual = flow;
  for (const absorber of absorbers) {
    if (absorber.role.kind === "absorber") {
      residual *= absorber.role.passThrough;
    }
  }

  for (const absorber of absorbers) {
    deliveries.set(absorber.edgeId, flow);
  }

  if (servers.length === 0) {
    return { deliveries, hasValidDestination: true };
  }

  const totalWeight = servers.reduce((sum, server) => {
    const node = nodeById.get(server.nodeId);
    if (!node) {
      return sum;
    }
    const resolved = registry.resolve(node);
    if (useWeighted && server.edgeWeight !== undefined) {
      return sum + server.edgeWeight;
    }
    return sum + effectiveCapacity(resolved.attrs);
  }, 0);

  const equalSplit = totalWeight <= 0;

  for (const server of servers) {
    const node = nodeById.get(server.nodeId);
    if (!node) {
      continue;
    }
    const resolved = registry.resolve(node);
    const weight = equalSplit
      ? 1 / servers.length
      : totalWeight > 0
        ? (useWeighted && server.edgeWeight !== undefined
            ? server.edgeWeight
            : effectiveCapacity(resolved.attrs)) / totalWeight
        : 0;
    deliveries.set(server.edgeId, residual * weight);
  }

  return { deliveries, hasValidDestination: true };
}
