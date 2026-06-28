import type { ChallengeParams, Graph, Violation } from "@/engine/types";

export function checkPresence(
  graph: Graph,
  params: ChallengeParams,
): Violation[] {
  const required = params.requiredKinds ?? [];
  if (required.length === 0) {
    return [];
  }

  const presentKinds = new Set(graph.nodes.map((node) => node.kind));
  const violations: Violation[] = [];

  for (const kind of required) {
    if (!presentKinds.has(kind)) {
      violations.push({
        type: "presence",
        detail: `Required block kind "${kind}" is missing from the graph`,
      });
    }
  }

  return violations;
}
