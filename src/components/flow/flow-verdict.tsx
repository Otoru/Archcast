"use client";

import type { BlockNode as BlockNodeType } from "@/components/flow/block-node";
import {
  formatPercent,
  type MetricStatus,
  summarizeVerdict,
  violationBadgeVariant,
} from "@/components/flow/flow-editor-helpers";
import { useFlowEditor } from "@/components/flow/flow-editor-state";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { H4, List, Muted, Small } from "@/components/ui/typography";
import { type ChallengeParams, getPreset, type Verdict } from "@/engine";

function metricBadgeVariant(status: MetricStatus) {
  return status === "ok" ? "success" : "destructive";
}

/**
 * Formata o load (ρ) como porcentagem. Capacidades grandes geram ρ pequeno
 * (ex.: 1000/200000 = 0.005); como "%" mostra "0.5%" em vez de "0.00", que
 * parecia zerado. Saturado (ρ ≥ 1, possivelmente Infinity) vira "≥100%".
 */
function formatLoad(rho: number): string {
  if (!Number.isFinite(rho) || rho >= 1) {
    return "≥100%";
  }
  const pct = rho * 100;
  return `${pct < 1 && pct > 0 ? pct.toFixed(1) : pct.toFixed(0)}%`;
}

/** Par rótulo/valor das métricas de cada nó (load, latency, instances, dropped). */
function NodeStat({
  label,
  value,
}: Readonly<{ label: string; value: string }>) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="wf-text-caption text-wf-ink-soft">{label}</span>
      <span className="wf-text-small font-semibold text-wf-ink tabular-nums">
        {value}
      </span>
    </div>
  );
}

function MetricRow({
  label,
  value,
  threshold,
  status,
}: Readonly<{
  label: string;
  value: string;
  threshold: string;
  status: MetricStatus;
}>) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="wf-text-small text-wf-ink-soft">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className="wf-text-small font-semibold text-wf-ink tabular-nums">
          {value}
        </span>
        <span className="wf-text-caption text-wf-ink-soft tabular-nums">
          / {threshold}
        </span>
        <Badge variant={metricBadgeVariant(status)} size="sm">
          {status === "ok" ? "ok" : "fail"}
        </Badge>
      </div>
    </div>
  );
}

/**
 * Painel de veredito: mostra o resultado da última `runSimulation` —
 * latência/availability frente aos SLOs, lista de violations e tabela de nós
 * (ρ, saturação, latência, provisionados, drops). Estados: vazio (pré-Run),
 * erro (ciclo/exception) e veredito. O botão Run vive na top-bar (e abre esta
 * seção), não aqui.
 *
 * Presentational: recebe tudo por props para stories sem o provider.
 */
export function FlowVerdict({
  verdict,
  verdictError,
  params,
  nodes,
}: Readonly<{
  verdict: Verdict | null;
  verdictError: string | null;
  params: ChallengeParams;
  nodes: BlockNodeType[];
}>) {
  if (verdictError) {
    return (
      <div className="flex flex-col gap-3 p-3">
        <div className="flex items-center gap-2">
          <Badge variant="destructive" size="sm">
            Error
          </Badge>
          <H4>Could not run</H4>
        </div>
        <Small className="text-wf-ink-soft">{verdictError}</Small>
      </div>
    );
  }

  if (!verdict) {
    return (
      <div className="flex flex-col gap-3 p-3">
        <H4>Verdict</H4>
        <Muted>
          Build the graph, tune the parameters and run the simulation to see the
          verdict (latency, availability, violations).
        </Muted>
      </div>
    );
  }

  const summary = summarizeVerdict(verdict, params, nodes);

  // nodeId → rótulo humano do preset (ex.: "Web Client"), para mostrar nas
  // violations em vez do id cru (ex.: "web-client-eea4f5c3-..."). O id
  // completo fica acessível via o ícone de info (tooltip).
  const labelById = new Map(
    nodes.map((node) => [node.id, getPreset(node.data.kind)?.label ?? node.id]),
  );

  return (
    <div className="flex flex-col gap-5 p-4">
      <div className="flex flex-col gap-2">
        <MetricRow
          label="Latency p99"
          value={`${verdict.endToEndLatency.toFixed(0)} ms`}
          threshold={`${params.latencySlo.toFixed(0)} ms`}
          status={summary.latency.status}
        />
        <MetricRow
          label="Availability"
          value={formatPercent(summary.availability.value)}
          threshold={formatPercent(params.availabilitySlo)}
          status={summary.availability.status}
        />
      </div>

      <Separator />

      <div className="flex flex-col gap-3">
        <Small className="font-semibold">Violations</Small>
        {summary.violations.length === 0 ? (
          <Muted>No violations.</Muted>
        ) : (
          <List className="gap-4">
            {summary.violations.map((violation, index) => (
              <List.Item
                key={`${violation.type}-${violation.nodeId ?? ""}-${index}`}
                className="flex flex-col gap-1 pl-0 before:hidden"
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant={violationBadgeVariant(violation)} size="sm">
                    {violation.type}
                  </Badge>
                  {violation.nodeId ? (
                    <Badge variant="outline" size="sm">
                      {labelById.get(violation.nodeId) ?? violation.nodeId}
                    </Badge>
                  ) : null}
                </div>
                <Small className="text-wf-ink-soft">{violation.detail}</Small>
              </List.Item>
            ))}
          </List>
        )}
      </div>

      <Separator />

      <div className="flex flex-col gap-3">
        <Small className="font-semibold">Nodes</Small>
        <div className="flex flex-col gap-4">
          {summary.nodeRows.map((row) => (
            <div key={row.id} className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <span className="wf-text-small font-semibold text-wf-ink">
                  {row.label}
                </span>
                {row.saturated ? (
                  <Badge variant="destructive" size="sm">
                    saturated
                  </Badge>
                ) : null}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                <NodeStat label="Load" value={formatLoad(row.rho)} />
                <NodeStat
                  label="Latency"
                  value={`${row.latency.toFixed(0)} ms`}
                />
                <NodeStat label="Instances" value={String(row.provisioned)} />
                {row.dropped > 0 ? (
                  <NodeStat
                    label="Dropped"
                    value={`${Math.round(row.dropped)} rps`}
                  />
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Conectado ao `FlowEditorProvider`: lê veredito/params/nodes. */
export function FlowVerdictConnected() {
  const { verdict, verdictError, params, nodes } = useFlowEditor();
  return (
    <FlowVerdict
      verdict={verdict}
      verdictError={verdictError}
      params={params}
      nodes={nodes}
    />
  );
}
