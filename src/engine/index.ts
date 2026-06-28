import { computeSystemAvailability } from "@/engine/availability";
import { computeCost } from "@/engine/cost";
import { validateDag } from "@/engine/graph";
import { computeEndToEndLatency } from "@/engine/latency";
import { checkPresence } from "@/engine/presence";
import { propagate } from "@/engine/propagate";
import { createDefaultRegistry } from "@/engine/registry";
import { simulate } from "@/engine/simulate";
import { detectSpof } from "@/engine/spof";
import type {
  ChallengeParams,
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
): Record<string, NodeResult> {
  const consolidated: Record<string, NodeResult> = {};
  for (const node of graph.nodes) {
    const last = nodeResults[node.id];
    if (!last) {
      continue;
    }
    consolidated[node.id] = {
      ...last,
      provisioned: peakProvisioned[node.id] ?? last.provisioned,
      saturated: saturatedNodes.has(node.id),
    };
  }
  return consolidated;
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
    const lastEdgeFlows = sim.ticks[sim.ticks.length - 1]?.edgeFlows ?? {};
    const consolidated = consolidateNodeResults(
      graph,
      sim.ticks[sim.ticks.length - 1]?.nodeResults ?? {},
      sim.peakProvisioned,
      sim.saturatedNodes,
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
      monthlyCost: sim.monthlyCost,
      budget: params.budget,
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
  const cost = computeCost(graph, propagation.nodeResults, registry);

  return buildVerdict({
    graph,
    params,
    nodeResults: propagation.nodeResults,
    edgeFlows: propagation.edgeFlows,
    endToEndLatency,
    systemAvailability,
    structureViolations: [
      ...edgeViolations,
      ...propagation.structureViolations,
    ],
    presenceViolations,
    spofViolations,
    monthlyCost: cost.monthlyCost,
    budget: params.budget,
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
export type { NodeCostBreakdown } from "@/engine/cost";
export { computeCost } from "@/engine/cost";
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
  ELASTIC_TARGET_RHO,
  effectiveAvailability,
  effectiveCapacity,
  p99FromLatency,
} from "@/engine/types";
export { validateEdges } from "@/engine/validate-edges";
export { buildVerdict } from "@/engine/verdict";
