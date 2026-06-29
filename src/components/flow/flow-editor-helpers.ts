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
  type Verdict,
  type Violation,
} from "@/engine";

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

/**
 * Parâmetros do desafio iniciais — valores-padrão sensatos para um sistema
 * web típico (1000 rps steady, 70% leitura, SLO 200ms / 99,9%). Usado pelo
 * `FlowEditorProvider` no primeiro render e como referência nos testes.
 */
export function defaultChallengeParams(): ChallengeParams {
  return {
    rps: 1000,
    trafficPattern: "steady",
    readWriteRatio: 0.7,
    latencySlo: 200,
    availabilitySlo: 0.999,
  };
}

/** Rótulos humanos para cada chave de `BlockDefaults` (attrs editáveis por nó). */
const ATTR_LABELS: Record<string, string> = {
  capacity: "Capacity (rps)",
  latBase: "Base latency (ms)",
  hitRatio: "Hit ratio",
  drainRate: "Drain rate (rps)",
  maxDepth: "Max depth",
  availability: "Availability",
  instances: "Instances",
  rateCap: "Rate cap (rps)",
};

export type AttrField = { key: string; label: string };

/**
 * Lista os campos de attrs a renderizar no inspector de um nó: uma entrada por
 * chave presente em `preset.defaults` (nunca todas de `BlockDefaults` — um
 * `cdn` expõe 6 campos, não 10). A ordem segue a declaração do preset.
 */
export function attrsFormSpec(preset: BlockPreset): AttrField[] {
  return Object.keys(preset.defaults).map((key) => ({
    key,
    label: ATTR_LABELS[key] ?? key,
  }));
}

/**
 * Devolve um novo nó com `data.attrs[key]` atualizado de forma imutável. Se
 * `value` for `undefined` (campo limpo) ou não-finito, a chave é removida dos
 * attrs — o que reverte o override e faz `resolveNode` voltar ao default do
 * preset (`{ ...preset.defaults, ...node.attrs }`).
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

/** Estado de uma métrica do veredito frente ao SLO/budget. */
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
};

export type VerdictSummary = {
  passed: boolean;
  latency: MetricSummary;
  availability: MetricSummary;
  violations: Violation[];
  nodeRows: NodeRow[];
};

/**
 * Mapa `Violation` → variante de Badge para o painel de veredito. Honra o
 * `severity`: `warn` é sempre advertência (warning). No resto, violações
 * estruturais (ciclo/aresta inválida), SPOF e blocos obrigatórios ausentes são
 * "duras" (destructive); saturação, latência, availability e rate limit são
 * advertência (warning).
 */
export function violationBadgeVariant(violation: Violation): BadgeVariant {
  if (violation.severity === "warn") {
    return "warning";
  }
  switch (violation.type) {
    case "structure":
    case "spof":
    case "presence":
      return "destructive";
    default:
      return "warning";
  }
}

/** Ids dos nós presentes no canvas RF — usado para filtrar entradas órfãs do veredito congelado. */
function canvasNodeIds(nodes: BlockNodeType[]): Set<string> {
  return new Set(nodes.map((n) => n.id));
}

/** Constrói as linhas da tabela de nós: junta `verdict.nodes` com os nós do RF para rótulo, ordenadas por ρ desc. */
export function nodeRows(verdict: Verdict, nodes: BlockNodeType[]): NodeRow[] {
  const onCanvas = canvasNodeIds(nodes);
  const labelById = new Map<string, string>();
  const instancesById = new Map<string, number>();
  // Nós da camada client não entram na tabela de nós do veredito — o usuário
  // raciocina sobre o sistema (edge/compute/data/...), não sobre o cliente.
  const clientIds = new Set<string>();
  for (const node of nodes) {
    const preset = getPreset(node.data.kind);
    labelById.set(node.id, preset?.label ?? node.data.kind);
    if (preset?.layer === "client") {
      clientIds.add(node.id);
    }
    // Instâncias configuradas pelo usuário (stepper) → default do preset →
    // fallback global. Usado quando o engine não devolve `provisioned`
    // (autoscaling só roda no handler `server`); os demais nós refletem o
    // que o usuário definiu, não 0.
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
      latency: result.latency,
      saturated: result.saturated,
      provisioned:
        result.provisioned ?? instancesById.get(id) ?? DEFAULT_INSTANCES,
      dropped: result.dropped ?? 0,
    }))
    .sort((a, b) => b.rho - a.rho);
}

/**
 * Resume o `Verdict` em um struct de display: passed + latência / availability
 * frente aos SLOs + violations + linhas de nós. Toda lógica condicional
 * (ok/danger) vive aqui — o componente só mapeia.
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

/** Formata uma razão 0–1 como percentual com `digits` casas. */
export function formatPercent(value: number, digits = 3): string {
  return `${(value * 100).toFixed(digits)}%`;
}

/**
 * Magnitude (|r|+|w|+|a|) de um `Flow` do engine — o quanto de fluxo aquela
 * edge carrega, usado para normalizar a cor/espessura visual no modo run.
 */
function flowMagnitude(flow: { read: number; write: number; async: number }) {
  return flow.read + flow.write + flow.async;
}

/**
 * Deriva o `RunState` visual a partir do `Verdict` + grafo RF: qual é o
 * bottleneck (max ρ, excluindo a camada client — o usuário raciocina sobre o
 * sistema, não sobre o cliente), quais nós estão saturados, e o estado de
 * cada edge (magnitude normalizada pelo pico, e se a origem está saturada →
 * edge "quente" em wf-destructive). Puríssima, sem React — testável isolada.
 *
 * `running` só sinaliza lock/animação; `hasVerdict` (running OU congelado
 * pós-stop) gatinga os destaques. Sem veredito → estado "vazio" (nada
 * destacado), mantendo `running` para o lock caso seja chamado assim.
 */
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

  // client layer não entra no raciocínio de sistema (mesmo critério do
  // `nodeRows`) — não é candidata a bottleneck nem a destaque de saturado.
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
  // Se nenhum nó não-cliente tem resultado, bottleneckId fica null (bem).
  if (maxRho === Number.NEGATIVE_INFINITY) {
    bottleneckId = null;
  }

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
      // edge "quente": o nó de origem está saturado (o gargalo está esgotando
      // esta saída).
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
