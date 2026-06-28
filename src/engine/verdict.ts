import { checkAvailability } from "@/engine/availability";
import type {
  ChallengeParams,
  Flow,
  Graph,
  NodeResult,
  Verdict,
  Violation,
} from "@/engine/types";

interface BuildVerdictInput {
  graph: Graph;
  params: ChallengeParams;
  nodeResults: Record<string, NodeResult>;
  edgeFlows: Record<string, Flow>;
  endToEndLatency: number;
  systemAvailability: number;
  structureViolations: Violation[];
  presenceViolations: Violation[];
  spofViolations: Violation[];
}

export function buildVerdict(input: BuildVerdictInput): Verdict {
  const violations: Violation[] = [
    ...input.structureViolations,
    ...input.presenceViolations,
    ...input.spofViolations,
  ];

  for (const [nodeId, result] of Object.entries(input.nodeResults)) {
    if (result.saturated) {
      violations.push({
        type: "saturation",
        nodeId,
        detail: `Node "${nodeId}" is saturated (rho=${result.rho})`,
      });
    }

    if (result.rejectedRps !== undefined && result.rejectedRps > 0) {
      violations.push({
        type: "ratelimit",
        nodeId,
        detail: `Node "${nodeId}" rejected ${result.rejectedRps} RPS above rateCap`,
      });
    }
  }

  const availabilityCheck = checkAvailability(
    input.graph,
    input.systemAvailability,
    input.params.availabilitySlo,
  );
  if (!availabilityCheck.passed && availabilityCheck.detail) {
    violations.push({
      type: "availability",
      detail: availabilityCheck.detail,
    });
  }

  if (
    Number.isFinite(input.endToEndLatency) &&
    input.endToEndLatency > input.params.latencySlo
  ) {
    violations.push({
      type: "latency",
      detail: `End-to-end p99 latency ${input.endToEndLatency}ms exceeds SLO ${input.params.latencySlo}ms`,
    });
  }

  return {
    passed: violations.length === 0,
    endToEndLatency: input.endToEndLatency,
    systemAvailability: input.systemAvailability,
    nodes: input.nodeResults,
    edgeFlows: input.edgeFlows,
    violations,
  };
}
