export type PrimitiveKind =
  | "origin"
  | "server"
  | "absorber-aside"
  | "absorber-forwarding"
  | "async-buffer"
  | "broadcaster"
  | "structural";

export type Layer =
  | "client"
  | "edge"
  | "compute"
  | "data"
  | "messaging"
  | "platform";

export type EdgeChannel = "read" | "write" | "async";

export interface BlockFlags {
  weighted?: boolean;
  elastic?: boolean;
  drop?: boolean;
  /**
   * Marks the block as a load distributor (load-balancer, api-gateway).
   * A downstream `server` only scales capacity via `instances` if there is an
   * upstream distributor — without one, multiple instances only help
   * availability, not capacity (there is no way to split traffic among them).
   */
  distribute?: boolean;
}

export interface BlockDefaults {
  capacity?: number;
  latBase?: number;
  hitRatio?: number;
  drainRate?: number;
  maxDepth?: number;
  availability?: number;
  instances?: number;
  rateCap?: number;
  /**
   * Storage capacity of the node (GB). Database configuration, not challenge.
   * Replicas (`instances`) do NOT add storage — the whole dataset must fit in a
   * single instance; replicas serve load and SPOF. Used by the data loss check
   * when `ChallengeParams.bytesPerWrite` is set.
   */
  maxStorage?: number;
  /**
   * Retention window (days) — how long written data remains stored before
   * expiring. The larger it is, the more accumulated volume (worst case:
   * peak write rate sustained across the whole window).
   */
  retention?: number;
}

export interface BlockPreset {
  kind: string;
  label: string;
  primitive: PrimitiveKind;
  layer: Layer;
  defaults: BlockDefaults;
  flags?: BlockFlags;
  edges: { in: EdgeChannel[]; out: EdgeChannel[] };
}

export interface Flow {
  read: number;
  write: number;
  async: number;
}

export interface ChallengeParams {
  rps: number;
  trafficPattern: "steady" | "spiky" | "diurnal";
  readWriteRatio: number;
  latencySlo: number;
  availabilitySlo: number;
  requiredKinds?: string[];
  /**
   * Volume written per request (bytes) — the only storage parameter that lives
   * in the challenge (workload). If `0`/absent, the storage check is disabled.
   * Combined with the `writeFlow` (already split by `readWriteRatio`) and the
   * node's `retention`, determines whether the database exceeds `maxStorage`
   * (data loss).
   */
  bytesPerWrite?: number;
}

export interface NodeInstance {
  id: string;
  kind: string;
  attrs: Record<string, number>;
}

export interface Edge {
  id: string;
  from: string;
  to: string;
  kind: EdgeChannel;
  weight?: number;
}

export interface Graph {
  nodes: NodeInstance[];
  edges: Edge[];
}

export type ChannelRole =
  | { kind: "server" }
  | { kind: "absorber"; passThrough: number }
  | { kind: "broadcaster" };

export interface NodeResult {
  rho: number;
  latency: number;
  saturated: boolean;
  provisioned?: number;
  dropped?: number;
  rejectedRps?: number;
  backlog?: number;
  outboundFlow?: number;
  /** Accumulated storage volume on the node (GB) — UI only, worst-case. */
  storageUsed?: number;
  /** Storage capacity of the node (GB) — UI only (`maxStorage`, no `× instances`). */
  storageCap?: number;
}

export interface ResolvedNode {
  id: string;
  kind: string;
  preset: BlockPreset;
  primitive: PrimitiveKind;
  attrs: Record<string, number>;
  flags: BlockFlags;
}

export interface TickState {
  backlog: Record<string, number>;
}

export interface ComputeContext {
  params: ChallengeParams;
  tickState?: TickState;
  /**
   * `true` if this node has an immediate distributor (load-balancer/api-gateway)
   * upstream. For `server`, this is what enables capacity scaling via
   * `instances` — without a distributor, `instances` only affects availability.
   */
  distributed?: boolean;
}

export interface PrimitiveHandler {
  primitive: PrimitiveKind;
  roleFor(channel: EdgeChannel, resolved: ResolvedNode): ChannelRole | null;
  compute(
    deliveredLambda: number,
    resolved: ResolvedNode,
    ctx: ComputeContext,
  ): NodeResult;
  outboundMultiplier?(resolved: ResolvedNode): number;
}

export interface Violation {
  type:
    | "saturation"
    | "latency"
    | "structure"
    | "presence"
    | "availability"
    | "spof"
    | "ratelimit"
    | "storage";
  nodeId?: string;
  detail: string;
  /**
   * `warn` = non-fatal warning (does not bring down `passed`); `error` (default
   * when omitted) = hard failure. Used for structural conditions that signal a
   * modeling problem without invalidating the verdict (e.g. a channel with flow
   * but no valid destination).
   */
  severity?: "warn" | "error";
}

export interface Verdict {
  passed: boolean;
  endToEndLatency: number;
  systemAvailability: number;
  nodes: Record<string, NodeResult>;
  edgeFlows: Record<string, Flow>;
  violations: Violation[];
}

export const DEFAULT_AVAILABILITY = 0.999;
export const DEFAULT_INSTANCES = 1;
export const ELASTIC_TARGET_RHO = 0.7;

export function effectiveCapacity(attrs: Record<string, number>): number {
  return (attrs.capacity ?? 0) * (attrs.instances ?? DEFAULT_INSTANCES);
}

/**
 * Effective capacity of a `server`, considering whether there is an upstream
 * distributor. With a distributor, `instances` scales capacity (the balancer
 * splits traffic across instances); without one, capacity is just the base —
 * multiple instances without a balancer do not serve more requests (only
 * redundancy/availability).
 */
export function distributedCapacity(
  attrs: Record<string, number>,
  distributed: boolean,
): number {
  const capacity = attrs.capacity ?? 0;
  if (!distributed) {
    return capacity;
  }
  return capacity * (attrs.instances ?? DEFAULT_INSTANCES);
}

export function effectiveAvailability(attrs: Record<string, number>): number {
  const availability = attrs.availability ?? DEFAULT_AVAILABILITY;
  const instances = attrs.instances ?? DEFAULT_INSTANCES;
  return 1 - (1 - availability) ** instances;
}

export function p99FromLatency(latency: number): number {
  if (!Number.isFinite(latency)) {
    return Number.POSITIVE_INFINITY;
  }
  return latency * Math.log(100);
}
