import { computeSystemAvailability } from "@/engine/availability";
import { validateDag } from "@/engine/graph";
import { computeEndToEndLatency } from "@/engine/latency";
import { checkPresence } from "@/engine/presence";
import { propagate } from "@/engine/propagate";
import { createDefaultRegistry } from "@/engine/registry";
import { detectSpof } from "@/engine/spof";
import type { ChallengeParams, Graph } from "@/engine/types";
import { validateEdges } from "@/engine/validate-edges";
import { buildVerdict } from "@/engine/verdict";

export function runSimulation(
  graph: Graph,
  params: ChallengeParams,
  registry = createDefaultRegistry(),
) {
  validateDag(graph);

  const edgeViolations = validateEdges(graph);
  const propagation = propagate(graph, params, registry);
  const endToEndLatency = computeEndToEndLatency(
    graph,
    propagation.nodeResults,
    registry,
  );
  const systemAvailability = computeSystemAvailability(graph);
  const presenceViolations = checkPresence(graph, params);
  const spofViolations = detectSpof(graph);

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
export { propagate } from "@/engine/propagate";
export { computeQueue } from "@/engine/queue";
export { createDefaultRegistry, NodeTypeRegistry } from "@/engine/registry";
export type {
  BlockFlags,
  BlockPreset,
  ChallengeParams,
  ChannelRole,
  Edge,
  Flow,
  Graph,
  Layer,
  NodeInstance,
  NodeResult,
  PrimitiveHandler,
  PrimitiveKind,
  ResolvedNode,
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
