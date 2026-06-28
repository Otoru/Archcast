import { getPreset } from "@/engine/catalog";
import type { Graph, Violation } from "@/engine/types";

export function validateEdges(graph: Graph): Violation[] {
  const violations: Violation[] = [];
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));

  for (const edge of graph.edges) {
    const fromNode = nodeById.get(edge.from);
    const toNode = nodeById.get(edge.to);
    if (!fromNode || !toNode) {
      continue;
    }

    const fromPreset = getPreset(fromNode.kind);
    const toPreset = getPreset(toNode.kind);
    if (!fromPreset || !toPreset) {
      continue;
    }

    const validOut = fromPreset.edges.out.includes(edge.kind);
    const validIn = toPreset.edges.in.includes(edge.kind);

    if (!validOut || !validIn) {
      violations.push({
        type: "structure",
        nodeId: edge.from,
        detail: `Invalid edge ${edge.kind} from "${fromNode.kind}" to "${toNode.kind}"`,
      });
    }
  }

  return violations;
}
