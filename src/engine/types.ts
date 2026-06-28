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
}

export interface ResolvedNode {
  id: string;
  kind: string;
  preset: BlockPreset;
  primitive: PrimitiveKind;
  attrs: Record<string, number>;
  flags: BlockFlags;
}

export interface PrimitiveHandler {
  primitive: PrimitiveKind;
  roleFor(channel: EdgeChannel, resolved: ResolvedNode): ChannelRole | null;
  compute(
    deliveredLambda: number,
    resolved: ResolvedNode,
    ctx: { params: ChallengeParams },
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
    | "ratelimit";
  nodeId?: string;
  detail: string;
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
