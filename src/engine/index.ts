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
 * Escolhe o tick que determina o p99 de latência reportado, para que o
 * `Verdict.nodes`/`edgeFlows` reflitam o MESMO momento que produz o
 * `weightedP99Latency` — e não o último tick (que, no perfil spiky, é o estado
 * calmo pós-burst). Por construção `weightedP99Latency` retorna o
 * `endToEndLatency` de algum tick (`simulate.ts`), então a igualdade direta
 * resolve; caem em fallback robusto para Infinity/empate.
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
  // Fallback: tick de maior latência finita (mesma cauda que o p99 captura).
  const finite = ticks.filter((tick) => Number.isFinite(tick.endToEndLatency));
  if (finite.length > 0) {
    return finite.reduce(
      (a, b) => (b.endToEndLatency > a.endToEndLatency ? b : a),
      finite[0],
    );
  }
  // `ticks` é não-vazio (guarda no topo), então `.at(-1)` nunca é undefined.
  return ticks.at(-1) as TickResult;
}

/**
 * Reduz os ticks do perfil spiky/diurnal pelo pico de fluxo de escrita por
 * edge — o pior caso de volume armazenado. NÃO usa o `p99Tick` (que é o tick
 * de pico de LATÊNCIA); o pico de escrita pode cair num tick diferente, e a
 * checagem de perda de dados quer o volume máximo acumulado, não o momento do
 * burst de latência. As demais componentes do flow (read/async) são zeradas —
 * só o canal `write` importa pra storage.
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
    // Consolida a partir do tick que determina o p99 (o momento de burst que
    // produz `weightedP99Latency`), não do último tick (calmo pós-burst) —
    // assim `nodes`/`edgeFlows` e o `Latency p99` do veredito olham o mesmo
    // instante e o painel de nós bate com o veredito por construção.
    const p99Tick = pickP99Tick(sim);
    const lastEdgeFlows = p99Tick.edgeFlows;
    // Storage usa o pico de escrita entre os ticks (pior caso de volume
    // acumulado), não o tick-p99 de latência — ver `peakWriteEdgeFlows`.
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
