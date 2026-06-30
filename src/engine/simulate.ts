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
 * Request-weighted empirical p99: each tick contributes
 * `arrivalsRps * tickSec` samples of value `endToEndLatency`. The burst tick
 * (more arrivals + high latency) dominates the tail correctly. Ticks with
 * `Infinity` latency (saturated synchronous path) sit at the top; if they sum
 * to >1% of the weight, the p99 is `Infinity` → latency violation (intended).
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
  // `samples` is non-empty (guard above), so `.at(-1)` is never undefined.
  return (samples.at(-1) as (typeof samples)[number]).value;
}

interface TickAccumulators {
  saturatedNodes: Set<string>;
  ratelimitedNodes: Set<string>;
  peakProvisioned: Record<string, number>;
  backlogSnapshots: Record<string, number[]>;
}

/**
 * Accumulates a tick's results into the cross-tick aggregates (saturation,
 * rate-limiting, peak provisioning, backlog snapshots) and returns the tick's
 * backlog (used as the next tick's initial state). Extracted from `simulate`
 * to keep cognitive complexity under control.
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
 * Event loop: walks the profile tick by tick, reusing `propagate` per tick
 * with cross-tick backlog state. No warm-up (initial backlog 0 = cold system).
 * Deterministic (profile is a function of t, no rng).
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
