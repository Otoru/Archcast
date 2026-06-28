import type { NodeTypeRegistry } from "@/engine/registry";
import type {
  Graph,
  NodeInstance,
  NodeResult,
  ResolvedNode,
} from "@/engine/types";

export interface NodeCostBreakdown {
  footprint: number;
  costPerInstance: number;
  costPerCapacityUnit: number;
  capacity: number;
  nodeCost: number;
}

/**
 * Footprint é o que de fato escala o custo: `provisioned` (nós elásticos, que
 * provisionam para o pico) ou `instances` (nós fixos). Serverless tem
 * costPerInstance=0 mas costPerCapacityUnit alto × provisioned → caro no pico.
 */
export function computeNodeCost(
  _node: NodeInstance,
  resolved: ResolvedNode,
  nodeResult: NodeResult | undefined,
): NodeCostBreakdown {
  const costPerInstance = resolved.attrs.costPerInstance ?? 0;
  const costPerCapacityUnit = resolved.attrs.costPerCapacityUnit ?? 0;
  const capacity = resolved.attrs.capacity ?? 0;
  const footprint = nodeResult?.provisioned ?? resolved.attrs.instances ?? 1;
  const nodeCost =
    footprint * (costPerInstance + capacity * costPerCapacityUnit);
  return {
    footprint,
    costPerInstance,
    costPerCapacityUnit,
    capacity,
    nodeCost,
  };
}

export interface CostResult {
  monthlyCost: number;
  breakdown: Record<string, NodeCostBreakdown>;
}

export function computeCost(
  graph: Graph,
  nodeResults: Record<string, NodeResult>,
  registry: NodeTypeRegistry,
): CostResult {
  let monthlyCost = 0;
  const breakdown: Record<string, NodeCostBreakdown> = {};
  for (const node of graph.nodes) {
    const resolved = registry.resolve(node);
    const cost = computeNodeCost(node, resolved, nodeResults[node.id]);
    breakdown[node.id] = cost;
    monthlyCost += cost.nodeCost;
  }
  return { monthlyCost, breakdown };
}
