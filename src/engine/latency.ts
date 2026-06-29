import { isOrigin, isStructural } from "@/engine/catalog";
import type { NodeTypeRegistry } from "@/engine/registry";
import type { Flow, Graph, NodeResult } from "@/engine/types";
import { p99FromLatency } from "@/engine/types";

type SyncChannel = "read" | "write";

function nodeP99(
  nodeResults: Record<string, NodeResult>,
  nodeId: string,
): number {
  const result = nodeResults[nodeId];
  if (!result) {
    return 0;
  }
  return p99FromLatency(result.latency);
}

function channelLatencyFromNode(
  nodeId: string,
  channel: SyncChannel,
  graph: Graph,
  registry: NodeTypeRegistry,
  nodeResults: Record<string, NodeResult>,
): number {
  let total = nodeP99(nodeResults, nodeId);

  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  const outgoing = graph.edges.filter(
    (edge) => edge.from === nodeId && edge.kind === channel,
  );

  // Fração do tráfego que ESTE nó repassa adiante. Para um server comum é 1
  // (encaminha tudo); para um absorvedor-encaminhador (CDN/WAF) é
  // `1 − hitRatio` — só os misses atingem o origin a jusante. É o espelho de
  // `outboundMultiplier` (usado em `propagate` no lado carga) aplicado ao lado
  // latência: o p99 do origin só é pago na fração que de fato chega lá. Mesma
  // lógica do cache-aside (irmão absorvedor), agora estendida ao CDN em série.
  const currentNode = nodeById.get(nodeId);
  let nodeForwardRatio = 1;
  if (currentNode) {
    const currentHandler = registry.getHandler(currentNode);
    const currentResolved = registry.resolve(currentNode);
    nodeForwardRatio =
      currentHandler.outboundMultiplier?.(currentResolved) ?? 1;
  }

  const absorberNodes: Array<{ id: string; passThrough: number }> = [];
  const serverNodes: string[] = [];

  for (const edge of outgoing) {
    const destNode = nodeById.get(edge.to);
    if (!destNode) {
      continue;
    }

    if (isStructural(destNode)) {
      continue;
    }

    const handler = registry.getHandler(destNode);
    const resolved = registry.resolve(destNode);
    const role = handler.roleFor(channel, resolved);
    if (!role) {
      continue;
    }

    if (role.kind === "absorber") {
      absorberNodes.push({ id: destNode.id, passThrough: role.passThrough });
    } else if (role.kind === "server") {
      serverNodes.push(destNode.id);
    }
  }

  // O lookup no cache-aside é sempre pago (hit ou miss): soma-se o p99 do
  // absorvedor integralmente.
  for (const absorber of absorberNodes) {
    total += nodeP99(nodeResults, absorber.id);
  }

  if (serverNodes.length > 0) {
    // O servidor a jusante (ex.: DB num cache-aside, ou o origin atrás de um
    // CDN) só é atingido numa fração dos pedidos: pesa-se o p99 do caminho
    // adiante pelo produto do `nodeForwardRatio` deste nó (miss ratio do
    // CDN/WAF) pelos `passThrough` dos absorvedores irmãos (miss ratio do
    // cache) — mesmo residual usado em `apportionChannel`. Assim um cache/CDN
    // com 90% de hit reduz a contribuição do origin a 10% —
    // colocar/remover move o verdict de forma visível, esteja o origin saturado
    // ou não.
    const passThroughProduct = absorberNodes.reduce(
      (acc, absorber) => acc * absorber.passThrough,
      nodeForwardRatio,
    );
    const serverLatencies = serverNodes.map((serverId) => {
      return channelLatencyFromNode(
        serverId,
        channel,
        graph,
        registry,
        nodeResults,
      );
    });
    total += passThroughProduct * Math.max(...serverLatencies);
  }

  return total;
}

export function computeEndToEndLatency(
  graph: Graph,
  nodeResults: Record<string, NodeResult>,
  registry: NodeTypeRegistry,
): number {
  const sources = graph.nodes.filter((node) => isOrigin(node));
  if (sources.length === 0) {
    return 0;
  }

  let maxLatency = 0;
  for (const source of sources) {
    const readLatency = channelLatencyFromNode(
      source.id,
      "read",
      graph,
      registry,
      nodeResults,
    );
    const writeLatency = channelLatencyFromNode(
      source.id,
      "write",
      graph,
      registry,
      nodeResults,
    );
    maxLatency = Math.max(maxLatency, readLatency, writeLatency);
  }

  return maxLatency;
}

export function emptyFlow(): Flow {
  return { read: 0, write: 0, async: 0 };
}
