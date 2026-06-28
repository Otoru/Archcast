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

  const absorberNodes: string[] = [];
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
      absorberNodes.push(destNode.id);
    } else if (role.kind === "server") {
      serverNodes.push(destNode.id);
    }
  }

  for (const absorberId of absorberNodes) {
    total += nodeP99(nodeResults, absorberId);
  }

  if (serverNodes.length > 0) {
    const serverLatencies = serverNodes.map((serverId) => {
      return channelLatencyFromNode(
        serverId,
        channel,
        graph,
        registry,
        nodeResults,
      );
    });
    total += Math.max(...serverLatencies);
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
