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

  // Fraction of the traffic THIS node forwards onward. For a regular server
  // it is 1 (forwards everything); for a forwarding absorber (CDN/WAF) it is
  // `1 − hitRatio` — only the misses reach the downstream origin. This is the
  // mirror of `outboundMultiplier` (used in `propagate` on the load side)
  // applied to the latency side: the origin's p99 is only paid on the fraction
  // that actually reaches it. Same logic as cache-aside (absorber sibling),
  // now extended to the CDN in series.
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

  // The cache-aside lookup is always paid (hit or miss): the absorber's p99
  // is added in full.
  for (const absorber of absorberNodes) {
    total += nodeP99(nodeResults, absorber.id);
  }

  if (serverNodes.length > 0) {
    // The downstream server (e.g. a DB in cache-aside, or the origin behind a
    // CDN) is only reached on a fraction of the requests: the p99 of the
    // onward path is weighted by the product of this node's `nodeForwardRatio`
    // (miss ratio of the CDN/WAF) and the `passThrough` of the sibling
    // absorbers (miss ratio of the cache) — the same residual used in
    // `apportionChannel`. So a cache/CDN with a 90% hit ratio reduces the
    // origin's contribution to 10% — adding/removing it moves the verdict
    // visibly, whether the origin is saturated or not.
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
