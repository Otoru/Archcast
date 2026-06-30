import { computeSystemAvailability } from "@/engine/availability";
import { validateDag } from "@/engine/graph";
import { computeEndToEndLatency, emptyFlow } from "@/engine/latency";
import { checkPresence } from "@/engine/presence";
import { propagate } from "@/engine/propagate";
import { createDefaultRegistry } from "@/engine/registry";
import type { SimulationResult, TickResult } from "@/engine/simulate";
import { simulate } from "@/engine/simulate";
import { detectSpof } from "@/engine/spof";
import type { StorageUsage } from "@/engine/storage";
import { checkStorage, stampStorageUsage } from "@/engine/storage";
import type {
  ChallengeParams,
  Flow,
  Graph,
  NodeResult,
  Violation,
} from "@/engine/types";
import { validateEdges } from "@/engine/validate-edges";
import { buildVerdict } from "@/engine/verdict";

function consolidateNodeResults(
  graph: Graph,
  nodeResults: Record<string, NodeResult>,
  peakProvisioned: Record<string, number>,
  saturatedNodes: Set<string>,
  storageUsage?: Record<string, StorageUsage>,
): Record<string, NodeResult> {
  const consolidated: Record<string, NodeResult> = {};
  for (const node of graph.nodes) {
    const last = nodeResults[node.id];
    if (!last) {
      continue;
    }
    const u = storageUsage?.[node.id];
    consolidated[node.id] = {
      ...last,
      provisioned: peakProvisioned[node.id] ?? last.provisioned,
      saturated: saturatedNodes.has(node.id),
      storageUsed: u?.usedGB,
      storageCap: u?.capGB,
    };
  }
  return consolidated;
}

/**
 * Picks the tick that determines the reported latency p99, so that
 * `Verdict.nodes`/`edgeFlows` reflect the SAME moment that produces the
 * `weightedP99Latency` — not the last tick (which, in the spiky profile, is the
 * calm post-burst state). By construction `weightedP99Latency` returns the
 * `endToEndLatency` of some tick (`simulate.ts`), so a direct equality match
 * resolves it; falls back to a robust fallback for Infinity/ties.
 */
function pickP99Tick(sim: SimulationResult): TickResult {
  const ticks = sim.ticks;
  if (ticks.length === 0) {
    throw new Error("simulation produced no ticks");
  }
  const target = sim.weightedP99Latency;
  const match = ticks.find((tick) => tick.endToEndLatency === target);
  if (match) {
    return match;
  }
  // Fallback: tick with the highest finite latency (same tail the p99 captures).
  const finite = ticks.filter((tick) => Number.isFinite(tick.endToEndLatency));
  if (finite.length > 0) {
    return finite.reduce(
      (a, b) => (b.endToEndLatency > a.endToEndLatency ? b : a),
      finite[0],
    );
  }
  // `ticks` is non-empty (guard at the top), so `.at(-1)` is never undefined.
  return ticks.at(-1) as TickResult;
}

/**
 * Reduces the ticks of the spiky/diurnal profile to the peak write flow per
 * edge — the worst case for stored volume. Does NOT use `p99Tick` (which is
 * the LATENCY peak tick); the write peak may fall on a different tick, and the
 * data loss check wants the maximum accumulated volume, not the latency burst
 * moment. The other flow components (read/async) are zeroed — only the `write`
 * channel matters for storage.
 */
function peakWriteEdgeFlows(sim: SimulationResult): Record<string, Flow> {
  const peaks: Record<string, Flow> = {};
  for (const tick of sim.ticks) {
    for (const [edgeId, flow] of Object.entries(tick.edgeFlows)) {
      const prev = peaks[edgeId]?.write ?? 0;
      if (flow.write > prev) {
        peaks[edgeId] = { ...emptyFlow(), write: flow.write };
      }
    }
  }
  return peaks;
}

function dedupeStructureViolations(violations: Violation[]): Violation[] {
  const seen = new Set<string>();
  const out: Violation[] = [];
  for (const v of violations) {
    const key = `${v.type}|${v.nodeId ?? ""}|${v.detail}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(v);
  }
  return out;
}

export function runSimulation(
  graph: Graph,
  params: ChallengeParams,
  registry = createDefaultRegistry(),
) {
  validateDag(graph);
  const edgeViolations = validateEdges(graph);

  if (params.trafficPattern !== "steady") {
    const sim = simulate(graph, params, registry);
    const systemAvailability = computeSystemAvailability(graph);
    const presenceViolations = checkPresence(graph, params);
    const spofViolations = detectSpof(graph);
    // Consolidate from the tick that determines the p99 (the burst moment that
    // produces `weightedP99Latency`), not the last tick (calm post-burst) —
    // so `nodes`/`edgeFlows` and the verdict's `Latency p99` look at the same
    // instant, and the node panel matches the verdict by construction.
    const p99Tick = pickP99Tick(sim);
    const lastEdgeFlows = p99Tick.edgeFlows;
    // Storage uses the peak write across ticks (worst case of accumulated
    // volume), not the latency p99 tick — see `peakWriteEdgeFlows`.
    const storage = checkStorage(
      graph,
      params,
      registry,
      peakWriteEdgeFlows(sim),
    );
    const consolidated = consolidateNodeResults(
      graph,
      p99Tick.nodeResults,
      sim.peakProvisioned,
      sim.saturatedNodes,
      storage.usage,
    );
    const tickStructureViolations = sim.ticks.flatMap(
      (t) => t.structureViolations,
    );

    return buildVerdict({
      graph,
      params,
      nodeResults: consolidated,
      edgeFlows: lastEdgeFlows,
      endToEndLatency: sim.weightedP99Latency,
      systemAvailability,
      structureViolations: dedupeStructureViolations([
        ...edgeViolations,
        ...tickStructureViolations,
      ]),
      presenceViolations,
      spofViolations,
      storageViolations: storage.violations,
      saturatedNodes: sim.saturatedNodes,
      ratelimitedNodes: sim.ratelimitedNodes,
      weightedP99Latency: sim.weightedP99Latency,
    });
  }

  const propagation = propagate(graph, params, registry);
  const endToEndLatency = computeEndToEndLatency(
    graph,
    propagation.nodeResults,
    registry,
  );
  const systemAvailability = computeSystemAvailability(graph);
  const presenceViolations = checkPresence(graph, params);
  const spofViolations = detectSpof(graph);
  const storage = checkStorage(graph, params, registry, propagation.edgeFlows);

  return buildVerdict({
    graph,
    params,
    nodeResults: stampStorageUsage(propagation.nodeResults, storage.usage),
    edgeFlows: propagation.edgeFlows,
    endToEndLatency,
    systemAvailability,
    structureViolations: [
      ...edgeViolations,
      ...propagation.structureViolations,
    ],
    presenceViolations,
    spofViolations,
    storageViolations: storage.violations,
  });
}

export { apportionChannel } from "@/engine/apportion";
export {
  BLOCK_CATALOG,
  getPreset,
  isOrigin,
  isStructural,
  registerPreset,
  resolveNode,
} from "@/engine/catalog";
export { CycleError, topologicalSort, validateDag } from "@/engine/graph";
export { computeEndToEndLatency } from "@/engine/latency";
export type {
  ProfileConfig,
  ProfilePoint,
  SpikyOptions,
} from "@/engine/profile";
export {
  diurnalProfile,
  resolveProfile,
  spikyProfile,
  steadyProfile,
} from "@/engine/profile";
export { propagate } from "@/engine/propagate";
export { computeQueue } from "@/engine/queue";
export { createDefaultRegistry, NodeTypeRegistry } from "@/engine/registry";
export type { SimulationResult, TickResult } from "@/engine/simulate";
export { simulate } from "@/engine/simulate";
export type { StorageCheckResult, StorageUsage } from "@/engine/storage";
export { checkStorage, formatStorage } from "@/engine/storage";
export type {
  BlockFlags,
  BlockPreset,
  ChallengeParams,
  ChannelRole,
  ComputeContext,
  Edge,
  Flow,
  Graph,
  Layer,
  NodeInstance,
  NodeResult,
  PrimitiveHandler,
  PrimitiveKind,
  ResolvedNode,
  TickState,
  Verdict,
  Violation,
} from "@/engine/types";
export {
  DEFAULT_AVAILABILITY,
  DEFAULT_INSTANCES,
  distributedCapacity,
  ELASTIC_TARGET_RHO,
  effectiveAvailability,
  effectiveCapacity,
  p99FromLatency,
} from "@/engine/types";
export { validateEdges } from "@/engine/validate-edges";
export { buildVerdict } from "@/engine/verdict";
