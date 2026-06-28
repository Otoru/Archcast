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
  saturatedNodes?: Set<string>;
  ratelimitedNodes?: Set<string>;
  weightedP99Latency?: number;
}

function collectSaturationViolations(
  nodeResults: Record<string, NodeResult>,
  saturatedNodes?: Set<string>,
): Violation[] {
  if (saturatedNodes) {
    return [...saturatedNodes].map((nodeId) => ({
      type: "saturation" as const,
      nodeId,
      detail: `Saturated during the traffic window`,
    }));
  }

  return Object.entries(nodeResults)
    .filter(([, result]) => result.saturated)
    .map(([nodeId, result]) => ({
      type: "saturation" as const,
      nodeId,
      detail: `Saturated (rho=${result.rho.toFixed(2)})`,
    }));
}

function collectRatelimitViolations(
  nodeResults: Record<string, NodeResult>,
  ratelimitedNodes?: Set<string>,
): Violation[] {
  if (ratelimitedNodes) {
    return [...ratelimitedNodes].map((nodeId) => ({
      type: "ratelimit" as const,
      nodeId,
      detail: `Rejected requests above rateCap during the traffic window`,
    }));
  }

  return Object.entries(nodeResults)
    .filter(
      ([, result]) =>
        result.rejectedRps !== undefined && result.rejectedRps > 0,
    )
    .map(([nodeId, result]) => ({
      type: "ratelimit" as const,
      nodeId,
      detail: `Rejected ${Math.round(result.rejectedRps ?? 0)} RPS above rateCap`,
    }));
}

function collectAvailabilityViolation(
  graph: Graph,
  systemAvailability: number,
  availabilitySlo: number,
): Violation | undefined {
  const availabilityCheck = checkAvailability(
    graph,
    systemAvailability,
    availabilitySlo,
  );
  if (!availabilityCheck.passed && availabilityCheck.detail) {
    return { type: "availability", detail: availabilityCheck.detail };
  }
  return undefined;
}

function collectLatencyViolation(
  effectiveLatency: number,
  latencySlo: number,
): Violation | undefined {
  if (Number.isFinite(effectiveLatency) && effectiveLatency > latencySlo) {
    return {
      type: "latency",
      detail: `End-to-end p99 latency ${Math.round(effectiveLatency)}ms exceeds SLO ${Math.round(latencySlo)}ms`,
    };
  }
  return undefined;
}

function appendIfDefined(
  violations: Violation[],
  violation: Violation | undefined,
): void {
  if (violation) {
    violations.push(violation);
  }
}

export function buildVerdict(input: BuildVerdictInput): Verdict {
  const violations: Violation[] = [
    ...input.structureViolations,
    ...input.presenceViolations,
    ...input.spofViolations,
    ...collectSaturationViolations(input.nodeResults, input.saturatedNodes),
    ...collectRatelimitViolations(input.nodeResults, input.ratelimitedNodes),
  ];

  const effectiveLatency = input.weightedP99Latency ?? input.endToEndLatency;
  appendIfDefined(
    violations,
    collectAvailabilityViolation(
      input.graph,
      input.systemAvailability,
      input.params.availabilitySlo,
    ),
  );
  appendIfDefined(
    violations,
    collectLatencyViolation(effectiveLatency, input.params.latencySlo),
  );

  // `passed` reflete apenas violações duras — warns (severity "warn") sinalizam
  // um problema de modelagem mas não derrubam o veredito.
  const failing = violations.filter((v) => v.severity !== "warn");

  return {
    passed: failing.length === 0,
    endToEndLatency: input.endToEndLatency,
    systemAvailability: input.systemAvailability,
    nodes: input.nodeResults,
    edgeFlows: input.edgeFlows,
    violations,
  };
}
