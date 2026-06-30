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

interface ClassifiedOutgoing {
  absorbers: ClassifiedEdge[];
  servers: ClassifiedEdge[];
  broadcasters: ClassifiedEdge[];
  // Absorvedores-encaminhadores (CDN/WAF) irmãos: têm `roleFor` = server, mas
  // são identificados pelo primitive. `hitRatio` = fração que servem direto.
  forwarders: { edgeId: string; hitRatio: number }[];
}

/** Reparte as edges de saída do canal em servers/absorbers/broadcasters/forwarders. */
function classifyOutgoing(
  outgoing: Graph["edges"],
  nodeById: Map<string, Graph["nodes"][number]>,
  registry: NodeTypeRegistry,
): ClassifiedOutgoing {
  const result: ClassifiedOutgoing = {
    absorbers: [],
    servers: [],
    broadcasters: [],
    forwarders: [],
  };
  for (const edge of outgoing) {
    const destNode = nodeById.get(edge.to);
    if (!destNode) {
      continue;
    }
    const handler = registry.getHandler(destNode);
    const resolved = registry.resolve(destNode);
    const role = handler.roleFor(edge.kind, resolved);
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
      result.absorbers.push(classified);
    } else if (role.kind === "broadcaster") {
      result.broadcasters.push(classified);
    } else if (resolved.primitive === "absorber-forwarding") {
      // outboundMultiplier = 1 − hitRatio (fração de miss repassada adiante).
      const passThrough = handler.outboundMultiplier?.(resolved) ?? 1;
      result.forwarders.push({ edgeId: edge.id, hitRatio: 1 - passThrough });
    } else {
      result.servers.push(classified);
    }
  }
  return result;
}

/** Capacidade-peso de um server (peso da edge se `weighted`, senão capacidade distribuída). */
function serverWeight(
  server: ClassifiedEdge,
  registry: NodeTypeRegistry,
  nodeById: Map<string, Graph["nodes"][number]>,
  useWeighted: boolean,
  distributedUpstream: Set<string>,
): number {
  if (useWeighted && server.edgeWeight !== undefined) {
    return server.edgeWeight;
  }
  const node = nodeById.get(server.nodeId);
  if (!node) {
    return 0;
  }
  const resolved = registry.resolve(node);
  return distributedCapacity(
    resolved.attrs,
    distributedUpstream.has(server.nodeId),
  );
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

  const { absorbers, servers, broadcasters, forwarders } = classifyOutgoing(
    outgoing,
    nodeById,
    registry,
  );

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

  const totalWeight = servers.reduce(
    (sum, server) =>
      sum +
      serverWeight(
        server,
        registry,
        nodeById,
        useWeighted,
        distributedUpstream,
      ),
    0,
  );

  const equalSplit = totalWeight <= 0;

  for (const server of servers) {
    const weight = equalSplit
      ? 1 / servers.length
      : serverWeight(
          server,
          registry,
          nodeById,
          useWeighted,
          distributedUpstream,
        ) / totalWeight;
    deliveries.set(server.edgeId, residual * weight);
  }

  return { deliveries, hasValidDestination: true };
}
