import { apportionChannel } from "@/engine/apportion";
import { isOrigin, isStructural } from "@/engine/catalog";
import { topologicalSort } from "@/engine/graph";
import { emptyFlow } from "@/engine/latency";
import type { NodeTypeRegistry } from "@/engine/registry";
import type {
  ChallengeParams,
  EdgeChannel,
  Flow,
  Graph,
  NodeInstance,
  NodeResult,
  Violation,
} from "@/engine/types";

export interface PropagationResult {
  nodeResults: Record<string, NodeResult>;
  edgeFlows: Record<string, Flow>;
  structureViolations: Violation[];
}

const CHANNELS = ["read", "write", "async"] as const;

interface PropagationState {
  edgeFlows: Record<string, Flow>;
  nodeResults: Record<string, NodeResult>;
  structureViolations: Violation[];
}

interface NodePropagationContext {
  graph: Graph;
  params: ChallengeParams;
  registry: NodeTypeRegistry;
  state: PropagationState;
}

interface ChannelPropagation {
  nodeId: string;
  routingFlow: Flow;
  isSource: boolean;
  outboundMultiplier: number;
}

function aggregateIncomingFlow(
  nodeId: string,
  graph: Graph,
  edgeFlows: Record<string, Flow>,
): Flow {
  let read = 0;
  let write = 0;
  let async = 0;

  for (const edge of graph.edges) {
    if (edge.to !== nodeId) {
      continue;
    }
    const flow = edgeFlows[edge.id] ?? emptyFlow();
    if (edge.kind === "read") {
      read += flow.read;
    } else if (edge.kind === "write") {
      write += flow.write;
    } else if (edge.kind === "async") {
      async += flow.async;
    }
  }

  return { read, write, async };
}

function sourceFlow(params: ChallengeParams): Flow {
  return {
    read: params.rps * params.readWriteRatio,
    write: params.rps * (1 - params.readWriteRatio),
    async: 0,
  };
}

function channelValue(flow: Flow, channel: EdgeChannel): number {
  if (channel === "read") {
    return flow.read;
  }
  if (channel === "write") {
    return flow.write;
  }
  return flow.async;
}

function addToEdgeFlow(
  edgeFlows: Record<string, Flow>,
  edgeId: string,
  channel: EdgeChannel,
  amount: number,
): void {
  const existing = edgeFlows[edgeId] ?? emptyFlow();
  edgeFlows[edgeId] = {
    read: existing.read + (channel === "read" ? amount : 0),
    write: existing.write + (channel === "write" ? amount : 0),
    async: existing.async + (channel === "async" ? amount : 0),
  };
}

function hasOutgoingEdge(
  graph: Graph,
  nodeId: string,
  channel: EdgeChannel,
): boolean {
  return graph.edges.some(
    (edge) => edge.from === nodeId && edge.kind === channel,
  );
}

function resolveChannelFlow(
  channel: EdgeChannel,
  routingFlow: Flow,
  hasAsyncOutgoing: boolean,
  isSource: boolean,
): number {
  const direct = channelValue(routingFlow, channel);
  if (channel === "async" && direct <= 0 && hasAsyncOutgoing && !isSource) {
    return routingFlow.read + routingFlow.write;
  }
  return direct;
}

function shouldPropagateChannel(
  channelFlow: number,
  isSource: boolean,
  hasOutgoing: boolean,
): boolean {
  return channelFlow > 0 && (isSource || hasOutgoing);
}

function propagateNodeChannels(
  ctx: NodePropagationContext,
  channel: ChannelPropagation,
): void {
  const { graph, registry, state } = ctx;
  const { nodeId, routingFlow, isSource, outboundMultiplier } = channel;
  const hasAsyncOutgoing = hasOutgoingEdge(graph, nodeId, "async");

  for (const channel of CHANNELS) {
    const channelFlow = resolveChannelFlow(
      channel,
      routingFlow,
      hasAsyncOutgoing,
      isSource,
    );
    if (
      !shouldPropagateChannel(
        channelFlow,
        isSource,
        hasOutgoingEdge(graph, nodeId, channel),
      )
    ) {
      continue;
    }

    const apportion = apportionChannel(
      nodeId,
      channel,
      channelFlow * outboundMultiplier,
      graph,
      registry,
    );

    if (!apportion.hasValidDestination) {
      state.structureViolations.push({
        type: "structure",
        nodeId,
        detail: `${channel} channel has flow but no valid destination`,
      });
    }

    for (const [edgeId, amount] of apportion.deliveries) {
      addToEdgeFlow(state.edgeFlows, edgeId, channel, amount);
    }
  }
}

function processNode(
  nodeId: string,
  node: NodeInstance,
  ctx: NodePropagationContext,
): void {
  const { graph, params, registry, state } = ctx;
  const handler = registry.getHandler(node);
  const resolved = registry.resolve(node);
  const routingFlow = isOrigin(node)
    ? sourceFlow(params)
    : aggregateIncomingFlow(nodeId, graph, state.edgeFlows);

  const deliveredLambda =
    routingFlow.read + routingFlow.write + routingFlow.async;
  state.nodeResults[nodeId] = handler.compute(deliveredLambda, resolved, {
    params,
  });

  propagateNodeChannels(ctx, {
    nodeId,
    routingFlow,
    isSource: isOrigin(node),
    outboundMultiplier: handler.outboundMultiplier?.(resolved) ?? 1,
  });
}

export function propagate(
  graph: Graph,
  params: ChallengeParams,
  registry: NodeTypeRegistry,
): PropagationResult {
  const order = topologicalSort(graph);
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  const state: PropagationState = {
    nodeResults: {},
    edgeFlows: {},
    structureViolations: [],
  };
  const ctx: NodePropagationContext = { graph, params, registry, state };

  for (const nodeId of order) {
    const node = nodeById.get(nodeId);
    if (!node || isStructural(node)) {
      continue;
    }

    processNode(nodeId, node, ctx);
  }

  return state;
}
