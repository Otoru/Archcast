import type { Edge as RFEdge } from "@xyflow/react";
import type { VariantProps } from "class-variance-authority";
import type {
  BlockNode as BlockNodeType,
  RunEdgeState,
  RunState,
} from "@/components/flow/block-node";
import type { badgeVariants } from "@/components/ui/badge";
import {
  type BlockPreset,
  type ChallengeParams,
  DEFAULT_INSTANCES,
  getPreset,
  p99FromLatency,
  type Verdict,
  type Violation,
} from "@/engine";

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

/**
 * Initial challenge params — sensible defaults for a typical web system
 * (1000 rps steady, 70% reads, 200ms / 99.9% SLO). Used by
 * `FlowEditorProvider` on first render and as a reference in tests.
 */
export function defaultChallengeParams(): ChallengeParams {
  return {
    rps: 1000,
    trafficPattern: "steady",
    readWriteRatio: 0.7,
    latencySlo: 200,
    availabilitySlo: 0.999,
    bytesPerWrite: 0,
  };
}

/** Human labels for each `BlockDefaults` key (per-node editable attrs). */
const ATTR_LABELS: Record<string, string> = {
  capacity: "Capacity (rps)",
  latBase: "Base latency (ms)",
  hitRatio: "Hit ratio",
  drainRate: "Drain rate (rps)",
  maxDepth: "Max depth",
  availability: "Availability",
  instances: "Instances",
  rateCap: "Rate cap (rps)",
  maxStorage: "Max storage (GB)",
  retention: "Retention (days)",
};

export type AttrField = { key: string; label: string };

/**
 * Lists the attr fields to render in a node's inspector: one entry per key
 * present in `preset.defaults` (never all of `BlockDefaults` — a `cdn`
 * exposes 6 fields, not 10). Order follows the preset declaration.
 */
export function attrsFormSpec(preset: BlockPreset): AttrField[] {
  return Object.keys(preset.defaults).map((key) => ({
    key,
    label: ATTR_LABELS[key] ?? key,
  }));
}

/**
 * Returns a new node with `data.attrs[key]` updated immutably. If `value` is
 * `undefined` (cleared field) or non-finite, the key is removed from attrs —
 * which reverts the override and makes `resolveNode` fall back to the preset
 * default (`{ ...preset.defaults, ...node.attrs }`).
 */
export function applyAttrChange(
  node: BlockNodeType,
  key: string,
  value: number | undefined,
): BlockNodeType {
  const attrs: Record<string, number> = { ...node.data.attrs };
  if (value === undefined || !Number.isFinite(value)) {
    delete attrs[key];
  } else {
    attrs[key] = value;
  }
  return {
    ...node,
    data: { ...node.data, attrs },
  };
}

/** Status of a verdict metric against the SLO/budget. */
export type MetricStatus = "ok" | "danger";

export type MetricSummary = {
  value: number;
  threshold: number;
  status: MetricStatus;
};

export type NodeRow = {
  id: string;
  label: string;
  rho: number;
  latency: number;
  saturated: boolean;
  provisioned: number;
  dropped: number;
  storageUsed: number;
  storageCap: number;
};

export type VerdictSummary = {
  passed: boolean;
  latency: MetricSummary;
  availability: MetricSummary;
  violations: Violation[];
  nodeRows: NodeRow[];
};

/**
 * Maps a `Violation` to a Badge variant for the verdict panel. Honors
 * `severity`: `warn` is always a warning. Otherwise, structural violations
 * (cycle/invalid edge), SPOF and missing required blocks are "hard"
 * (destructive); saturation, latency, availability and rate limit are
 * warnings (warning).
 */
export function violationBadgeVariant(violation: Violation): BadgeVariant {
  if (violation.severity === "warn") {
    return "warning";
  }
  switch (violation.type) {
    case "structure":
    case "spof":
    case "presence":
    case "storage":
      return "destructive";
    default:
      return "warning";
  }
}

/** Ids of nodes present on the RF canvas — used to filter orphan entries from the frozen verdict. */
function canvasNodeIds(nodes: BlockNodeType[]): Set<string> {
  return new Set(nodes.map((n) => n.id));
}

/** Builds the node table rows: joins `verdict.nodes` with RF nodes for labels, sorted by ρ desc. */
export function nodeRows(verdict: Verdict, nodes: BlockNodeType[]): NodeRow[] {
  const onCanvas = canvasNodeIds(nodes);
  const labelById = new Map<string, string>();
  const instancesById = new Map<string, number>();
  // Client-layer nodes do not go into the verdict node table — the user
  // reasons about the system (edge/compute/data/...), not about the client.
  const clientIds = new Set<string>();
  for (const node of nodes) {
    const preset = getPreset(node.data.kind);
    labelById.set(node.id, preset?.label ?? node.data.kind);
    if (preset?.layer === "client") {
      clientIds.add(node.id);
    }
    // User-configured instances (stepper) → preset default → global fallback.
    // Used when the engine does not return `provisioned` (autoscaling only
    // runs in the `server` handler); other nodes reflect what the user set,
    // not 0.
    instancesById.set(
      node.id,
      node.data.attrs?.instances ??
        preset?.defaults.instances ??
        DEFAULT_INSTANCES,
    );
  }
  return Object.entries(verdict.nodes)
    .filter(([id]) => onCanvas.has(id) && !clientIds.has(id))
    .map(([id, result]) => ({
      id,
      label: labelById.get(id) ?? id,
      rho: result.rho,
      // Node p99 (latency × ln 100) — same magnitude summed in the verdict
      // (`computeEndToEndLatency`). Showing the raw mean left the panel
      // disconnected from the verdict `Latency p99` (~4.6× smaller per node).
      latency: p99FromLatency(result.latency),
      saturated: result.saturated,
      provisioned:
        result.provisioned ?? instancesById.get(id) ?? DEFAULT_INSTANCES,
      dropped: result.dropped ?? 0,
      storageUsed: result.storageUsed ?? 0,
      storageCap: result.storageCap ?? 0,
    }))
    .sort((a, b) => b.rho - a.rho);
}

/**
 * Summarizes the `Verdict` into a display struct: passed + latency / availability
 * against SLOs + violations + node rows. All conditional logic (ok/danger)
 * lives here — the component only maps.
 */
export function summarizeVerdict(
  verdict: Verdict,
  params: ChallengeParams,
  nodes: BlockNodeType[],
): VerdictSummary {
  const latency: MetricSummary = {
    value: verdict.endToEndLatency,
    threshold: params.latencySlo,
    status: verdict.endToEndLatency <= params.latencySlo ? "ok" : "danger",
  };
  const availability: MetricSummary = {
    value: verdict.systemAvailability,
    threshold: params.availabilitySlo,
    status:
      verdict.systemAvailability >= params.availabilitySlo ? "ok" : "danger",
  };

  const onCanvas = canvasNodeIds(nodes);

  return {
    passed: verdict.passed,
    latency,
    availability,
    violations: verdict.violations.filter(
      (v) => !v.nodeId || onCanvas.has(v.nodeId),
    ),
    nodeRows: nodeRows(verdict, nodes),
  };
}

/**
 * Formats a 0–1 ratio as a percentage with `digits` decimal places. A value
 * < 1 never displays "100%": `toFixed` rounds (0.99995 → "100.00%"), which
 * would lie about an impossible availability. In that case it clamps to the
 * largest representable value below 100 at the given precision (e.g. 99.99%
 * with 2 digits). A genuine `1` (with no downstream dependencies) still
 * shows 100%.
 */
export function formatPercent(value: number, digits = 3): string {
  const pct = value * 100;
  if (value < 1 && Number(pct.toFixed(digits)) >= 100) {
    return `${(100 - 10 ** -digits).toFixed(digits)}%`;
  }
  return `${pct.toFixed(digits)}%`;
}

/**
 * Magnitude (|r|+|w|+|a|) of an engine `Flow` — how much flow that edge
 * carries, used to normalize the visual color/thickness in run mode.
 */
function flowMagnitude(flow: { read: number; write: number; async: number }) {
  return flow.read + flow.write + flow.async;
}

/**
 * Derives the visual `RunState` from the `Verdict` + RF graph: which is the
 * bottleneck (max ρ, excluding the client layer — the user reasons about the
 * system, not the client), which nodes are saturated, and the state of each
 * edge (magnitude normalized by the peak, and whether the source is saturated
 * → "hot" edge in wf-destructive). Pure, no React — independently testable.
 *
 * `running` only signals lock/animation; `hasVerdict` (running OR frozen
 * post-stop) gates the highlights. No verdict → "empty" state (nothing
 * highlighted), keeping `running` for the lock if called that way.
 */
/**
 * Scans `verdict.nodes` (excluding client and off-canvas nodes) to find the
 * saturated ones and the bottleneck (max ρ). Extracted from `deriveRunState`
 * to keep cognitive complexity under control.
 */
function deriveBottleneck(
  verdict: Verdict,
  nodes: BlockNodeType[],
): { saturatedNodeIds: Set<string>; bottleneckId: string | null } {
  const onCanvas = canvasNodeIds(nodes);
  const clientIds = new Set<string>();
  for (const node of nodes) {
    if (getPreset(node.data.kind)?.layer === "client") {
      clientIds.add(node.id);
    }
  }

  const saturatedNodeIds = new Set<string>();
  let bottleneckId: string | null = null;
  let maxRho = Number.NEGATIVE_INFINITY;
  for (const [id, result] of Object.entries(verdict.nodes)) {
    if (!onCanvas.has(id) || clientIds.has(id)) {
      continue;
    }
    if (result.saturated) {
      saturatedNodeIds.add(id);
    }
    if (result.rho > maxRho) {
      maxRho = result.rho;
      bottleneckId = id;
    }
  }
  // If no non-client node has a result, bottleneckId stays null (correct).
  return {
    saturatedNodeIds,
    bottleneckId: maxRho === Number.NEGATIVE_INFINITY ? null : bottleneckId,
  };
}

export function deriveRunState(
  verdict: Verdict | null,
  nodes: BlockNodeType[],
  edges: RFEdge[],
  running: boolean,
): RunState {
  if (!verdict) {
    return {
      running,
      hasVerdict: false,
      bottleneckId: null,
      saturatedNodeIds: new Set<string>(),
      edgeStateById: new Map<string, RunEdgeState>(),
      maxFlow: 0,
    };
  }

  // The client layer is not part of system reasoning (same criterion as
  // `nodeRows`) — it is not a bottleneck candidate nor eligible for saturated
  // highlighting.
  const { saturatedNodeIds, bottleneckId } = deriveBottleneck(verdict, nodes);

  let maxFlow = 0;
  for (const flow of Object.values(verdict.edgeFlows)) {
    const mag = flowMagnitude(flow);
    if (mag > maxFlow) {
      maxFlow = mag;
    }
  }

  const edgeStateById = new Map<string, RunEdgeState>();
  for (const edge of edges) {
    const flow = verdict.edgeFlows[edge.id];
    if (!flow) {
      continue;
    }
    const mag = flowMagnitude(flow);
    edgeStateById.set(edge.id, {
      flow: mag,
      magnitude: maxFlow > 0 ? mag / maxFlow : 0,
      // "hot" edge: the source node is saturated (the bottleneck is exhausting
      // this output).
      saturated: saturatedNodeIds.has(edge.source),
    });
  }

  return {
    running,
    hasVerdict: true,
    bottleneckId,
    saturatedNodeIds,
    edgeStateById,
    maxFlow,
  };
}
