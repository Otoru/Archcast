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
  TickState,
  Violation,
} from "@/engine/types";

/**
 * Conjunto de nós que têm um distribuidor (load-balancer/api-gateway) imediato
 * a montante. Para esses nós, `instances` escala a capacidade; nos demais,
 * `instances` só afeta disponibilidade.
 */
function computeDistributedUpstream(
  graph: Graph,
  registry: NodeTypeRegistry,
): Set<string> {
  const distributed = new Set<string>();
  for (const edge of graph.edges) {
    const from = graph.nodes.find((node) => node.id === edge.from);
    if (!from) {
      continue;
    }
    const resolved = registry.resolve(from);
    if (resolved.flags.distribute) {
      distributed.add(edge.to);
    }
  }
  return distributed;
}

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
  tickState?: TickState;
  distributedUpstream: Set<string>;
}

interface ChannelPropagation {
  nodeId: string;
  routingFlow: Flow;
  isSource: boolean;
  outboundMultiplier: number;
}

export function aggregateIncomingFlow(
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
  // sync→async: um nó com entrada síncrona (read/write) e saída async empacota
  // read+write no canal async — é o que alimenta uma fila a jusante.
  if (channel === "async" && direct <= 0 && hasAsyncOutgoing && !isSource) {
    return routingFlow.read + routingFlow.write;
  }
  // async→sync: o espelho — um worker consome async e re-emite síncrono
  // (read/write) ao processar. Sua vazão de saída é dirigida pelo throughput
  // async que ele recebeu, então um canal síncrono sem fluxo direto (a entrada
  // do worker é só async) carrega o async de entrada adiante (ex.: worker que
  // escreve no db). Sem isso, a escrita nunca chega ao destino síncrono.
  if (
    channel !== "async" &&
    direct <= 0 &&
    routingFlow.async > 0 &&
    !isSource
  ) {
    return routingFlow.async;
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
  const result = state.nodeResults[nodeId];
  const totalRouting = routingFlow.read + routingFlow.write + routingFlow.async;
  const outboundFlow = result?.outboundFlow;
  const outboundScale =
    outboundFlow !== undefined && totalRouting > 0
      ? outboundFlow / totalRouting
      : outboundMultiplier;

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
      channelFlow * outboundScale,
      graph,
      registry,
      ctx.distributedUpstream,
    );

    if (!apportion.hasValidDestination) {
      state.structureViolations.push({
        type: "structure",
        nodeId,
        detail: `${channel} channel has flow but no valid destination`,
        // Aviso, não erro: o canal tem fluxo sem destino válido, mas isso
        // descreve uma decisão de modelagem pendente (ex.: ainda não ligado a
        // um absorvedor) em vez de uma falha dura do sistema simulado.
        severity: "warn",
      });
      // O fluxo que este canal tentou encaminhar não tem para onde ir, então é
      // perdido — conta como drop no nó. Ex.: uma CDN com 85% de hit encaminha
      // 15% adiante; sem fallback, esses 15% caem aqui.
      const lost = channelFlow * outboundScale;
      const result = state.nodeResults[nodeId];
      if (result && lost > 0) {
        result.dropped = (result.dropped ?? 0) + lost;
      }
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
    tickState: ctx.tickState,
    distributed: ctx.distributedUpstream.has(nodeId),
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
  tickState?: TickState,
): PropagationResult {
  const order = topologicalSort(graph);
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  const state: PropagationState = {
    nodeResults: {},
    edgeFlows: {},
    structureViolations: [],
  };
  const ctx: NodePropagationContext = {
    graph,
    params,
    registry,
    state,
    tickState,
    distributedUpstream: computeDistributedUpstream(graph, registry),
  };

  for (const nodeId of order) {
    const node = nodeById.get(nodeId);
    if (!node || isStructural(node)) {
      continue;
    }

    processNode(nodeId, node, ctx);
  }

  return state;
}
