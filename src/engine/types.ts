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
   * Marca o bloco como um distribuidor de carga (load-balancer, api-gateway).
   * Um `server` a jusante só escala capacidade por `instances` se houver um
   * distribuidor upstream — sem ele, múltiplas instâncias só ajudam a
   * disponibilidade, não a capacidade (não há como dividir tráfego entre elas).
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
   * Capacidade de storage do nó (GB). Configuração do banco, não do challenge.
   * Réplicas (`instances`) NÃO somam storage — o dataset inteiro precisa caber
   * numa instância; réplicas servem pra load e SPOF. Usado pela checagem de
   * perda de dados quando `ChallengeParams.bytesPerWrite` está setado.
   */
  maxStorage?: number;
  /**
   * Janela de retenção (dias) — por quanto tempo os dados escritos ficam
   * armazenados antes de expirar. Quanto maior, mais volume acumulado (pior
   * caso: taxa de escrita de pico sustentada por toda a janela).
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
   * Volume escrito por requisição (bytes) — único parâmetro de storage que vive
   * no challenge (workload). Se `0`/ausente, a checagem de storage fica
   * desligada. Combinado com o `writeFlow` (já particionado pelo
   * `readWriteRatio`) e o `retention` do nó, determina se o banco estoura o
   * `maxStorage` (perda de dados).
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
  /** Volume de storage acumulado no nó (GB) — só pra UI, worst-case. */
  storageUsed?: number;
  /** Capacidade de storage do nó (GB) — só pra UI (`maxStorage`, sem `× instances`). */
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
   * `true` se este nó tem um distribuidor (load-balancer/api-gateway) imediato
   * a montante. Para `server`, é o que libera o scaling de capacidade por
   * `instances` — sem distribuidor, `instances` só afeta disponibilidade.
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
   * `warn` = advertência não-fatal (não derruba o `passed`); `error` (default
   * quando omitido) = falha dura. Usado para condições estruturais que sinalizam
   * um problema de modelagem sem invalidar o veredito (ex.: canal com fluxo sem
   * destino válido).
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
 * Capacidade efetiva de um `server` considerando se há um distribuidor
 * upstream. Com distribuidor, `instances` escala a capacidade (o balanceador
 * divide o tráfego entre as instâncias); sem distribuidor, a capacidade é só a
 * base — múltiplas instâncias sem balanceador não atendem mais requisições
 * (só redundância/disponibilidade).
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
