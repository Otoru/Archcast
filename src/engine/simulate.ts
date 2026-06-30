import { computeEndToEndLatency } from "@/engine/latency";
import { resolveProfile } from "@/engine/profile";
import { propagate } from "@/engine/propagate";
import type { NodeTypeRegistry } from "@/engine/registry";
import type {
  ChallengeParams,
  Flow,
  Graph,
  NodeResult,
  TickState,
  Violation,
} from "@/engine/types";

export interface TickResult {
  tSec: number;
  arrivalsRps: number;
  nodeResults: Record<string, NodeResult>;
  edgeFlows: Record<string, Flow>;
  structureViolations: Violation[];
  endToEndLatency: number;
  backlog: Record<string, number>;
}

export interface SimulationResult {
  ticks: TickResult[];
  peakProvisioned: Record<string, number>;
  weightedP99Latency: number;
  saturatedNodes: Set<string>;
  ratelimitedNodes: Set<string>;
  backlogSnapshots: Record<string, number[]>;
}

/**
 * p99 empírico ponderado por requisições: cada tick contribui com
 * `arrivalsRps * tickSec` amostras de valor `endToEndLatency`. O tick de burst
 * (mais arrivals + latência alta) domina a cauda corretamente. Ticks com
 * latência `Infinity` (caminho síncrono saturado) ficam no topo; se somam >1%
 * do peso, o p99 é `Infinity` → violação de latency (desejado).
 */
function weightedP99Latency(ticks: TickResult[], tickSec: number): number {
  const samples: Array<{ value: number; weight: number }> = [];
  for (const tick of ticks) {
    const weight = tick.arrivalsRps * tickSec;
    if (weight > 0) {
      samples.push({ value: tick.endToEndLatency, weight });
    }
  }
  if (samples.length === 0) {
    return ticks[0]?.endToEndLatency ?? 0;
  }
  samples.sort((a, b) => a.value - b.value);
  const total = samples.reduce((sum, s) => sum + s.weight, 0);
  const threshold = 0.99 * total;
  let acc = 0;
  for (const sample of samples) {
    acc += sample.weight;
    if (acc >= threshold) {
      return sample.value;
    }
  }
  // `samples` é não-vazio (guarda acima), então `.at(-1)` nunca é undefined.
  return (samples.at(-1) as (typeof samples)[number]).value;
}

interface TickAccumulators {
  saturatedNodes: Set<string>;
  ratelimitedNodes: Set<string>;
  peakProvisioned: Record<string, number>;
  backlogSnapshots: Record<string, number[]>;
}

/**
 * Acumula os resultados de um tick nos agregados cross-tick (saturação,
 * ratelimit, pico de provisionamento, snapshots de backlog) e devolve o
 * backlog do tick (usado como estado inicial do próximo). Extraído de
 * `simulate` para manter a complexidade cognitiva sob controle.
 */
function accumulateTick(
  nodeResults: Record<string, NodeResult>,
  acc: TickAccumulators,
): Record<string, number> {
  const backlog: Record<string, number> = {};
  for (const [nodeId, result] of Object.entries(nodeResults)) {
    if (result.saturated) {
      acc.saturatedNodes.add(nodeId);
    }
    if (result.rejectedRps !== undefined && result.rejectedRps > 0) {
      acc.ratelimitedNodes.add(nodeId);
    }
    if (result.provisioned !== undefined) {
      acc.peakProvisioned[nodeId] = Math.max(
        acc.peakProvisioned[nodeId] ?? 0,
        result.provisioned,
      );
    }
    if (result.backlog !== undefined) {
      backlog[nodeId] = result.backlog;
      const snapshots = acc.backlogSnapshots[nodeId] ?? [];
      snapshots.push(result.backlog);
      acc.backlogSnapshots[nodeId] = snapshots;
    }
  }
  return backlog;
}

/**
 * Event-loop: percorre o profile tick a tick, reusando `propagate` por tick
 * com estado de backlog cross-tick. Sem warm-up (backlog inicial 0 = sistema
 * frio). Determinístico (profile é função de t, sem rng).
 */
export function simulate(
  graph: Graph,
  params: ChallengeParams,
  registry: NodeTypeRegistry,
): SimulationResult {
  const points = resolveProfile(params);
  const tickSec = points.length > 1 ? points[1].tSec - points[0].tSec : 1;

  const ticks: TickResult[] = [];
  const peakProvisioned: Record<string, number> = {};
  const saturatedNodes = new Set<string>();
  const ratelimitedNodes = new Set<string>();
  const backlogSnapshots: Record<string, number[]> = {};

  let prevBacklog: Record<string, number> = {};

  for (const point of points) {
    const tickParams: ChallengeParams = { ...params, rps: point.rps };
    const tickState: TickState = { backlog: prevBacklog };
    const propagation = propagate(graph, tickParams, registry, tickState);
    const endToEndLatency = computeEndToEndLatency(
      graph,
      propagation.nodeResults,
      registry,
    );

    const backlog = accumulateTick(propagation.nodeResults, {
      saturatedNodes,
      ratelimitedNodes,
      peakProvisioned,
      backlogSnapshots,
    });

    ticks.push({
      tSec: point.tSec,
      arrivalsRps: point.rps,
      nodeResults: propagation.nodeResults,
      edgeFlows: propagation.edgeFlows,
      structureViolations: propagation.structureViolations,
      endToEndLatency,
      backlog,
    });

    prevBacklog = backlog;
  }

  return {
    ticks,
    peakProvisioned,
    weightedP99Latency: weightedP99Latency(ticks, tickSec),
    saturatedNodes,
    ratelimitedNodes,
    backlogSnapshots,
  };
}
