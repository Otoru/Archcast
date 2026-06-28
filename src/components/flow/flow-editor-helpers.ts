import type { VariantProps } from "class-variance-authority";
import type { BlockNode as BlockNodeType } from "@/components/flow/block-node";
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

/** Constrói as linhas da tabela de nós: junta `verdict.nodes` com os nós do RF para rótulo, ordenadas por ρ desc. */
export function nodeRows(verdict: Verdict, nodes: BlockNodeType[]): NodeRow[] {
  const labelById = new Map<string, string>();
  const instancesById = new Map<string, number>();
  for (const node of nodes) {
    const preset = getPreset(node.data.kind);
    labelById.set(node.id, preset?.label ?? node.data.kind);
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

  return {
    passed: verdict.passed,
    latency,
    availability,
    violations: verdict.violations,
    nodeRows: nodeRows(verdict, nodes),
  };
}

/** Formata uma razão 0–1 como percentual com `digits` casas. */
export function formatPercent(value: number, digits = 3): string {
  return `${(value * 100).toFixed(digits)}%`;
}
