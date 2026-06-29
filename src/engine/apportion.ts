import type { NodeTypeRegistry } from "@/engine/registry";
import type { EdgeChannel, Graph } from "@/engine/types";
import { distributedCapacity } from "@/engine/types";

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
  // Defaults to "no distributor upstream" (conservative: `instances` does not
  // scale capacity). The production caller in `propagate.ts` passes the real
  // set computed from the graph's distributor edges.
  distributedUpstream: Set<string> = new Set(),
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
  // Absorvedores-encaminhadores (CDN/WAF) irmãos: têm `roleFor` = server, mas
  // são identificados pelo primitive. `hitRatio` = fração que servem direto.
  const forwarders: { edgeId: string; hitRatio: number }[] = [];

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
    } else if (resolved.primitive === "absorber-forwarding") {
      // outboundMultiplier = 1 − hitRatio (fração de miss repassada adiante).
      const passThrough = handler.outboundMultiplier?.(resolved) ?? 1;
      forwarders.push({ edgeId: edge.id, hitRatio: 1 - passThrough });
    } else {
      servers.push(classified);
    }
  }

  if (
    absorbers.length === 0 &&
    servers.length === 0 &&
    broadcasters.length === 0 &&
    forwarders.length === 0
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

  // Encaminhadores SEM servers irmãos: é o caso série (ex.: client → cdn →
  // origin). O hit ratio TAMBÉM se aplica aqui, só que adiante: o CDN recebe o
  // fluxo cheio (precisa pra calcular o próprio rho — toda request consulta o
  // cache) e repassa só os misses pro origin via `outboundMultiplier` em
  // `propagate` (origin vê `(1−hitRatio)×flow`). Aplicar `hitRatio` aqui também
  // contaria o desconto duas vezes — por isso o CDN recebe o `residual` cheio.
  if (servers.length === 0) {
    for (const forwarder of forwarders) {
      deliveries.set(forwarder.edgeId, residual);
    }
    return { deliveries, hasValidDestination: true };
  }

  // Encaminhadores COM servers irmãos: o cliente roteia a fração de hit pro
  // CDN (servida direto) e só os misses seguem pros servers. Cada CDN tira
  // `hitRatio × residual` do topo; o restante desce pros servers.
  for (const forwarder of forwarders) {
    deliveries.set(forwarder.edgeId, forwarder.hitRatio * residual);
    residual *= 1 - forwarder.hitRatio;
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
    return (
      sum +
      distributedCapacity(
        resolved.attrs,
        distributedUpstream.has(server.nodeId),
      )
    );
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
            : distributedCapacity(
                resolved.attrs,
                distributedUpstream.has(server.nodeId),
              )) / totalWeight
        : 0;
    deliveries.set(server.edgeId, residual * weight);
  }

  return { deliveries, hasValidDestination: true };
}
