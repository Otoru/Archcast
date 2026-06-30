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
 * Formats the load (ρ) as a percentage. Large capacities yield small ρ
 * (e.g. 1000/200000 = 0.005); as "%" it shows "0.5%" instead of "0.00",
 * which looked zeroed out. Saturated (ρ ≥ 1, possibly Infinity) becomes "≥100%".
 */
function formatLoad(rho: number): string {
  if (!Number.isFinite(rho) || rho >= 1) {
    return "≥100%";
  }
  const pct = rho * 100;
  return `${pct < 1 && pct > 0 ? pct.toFixed(1) : pct.toFixed(0)}%`;
}

/**
 * Formats storage usage as a percentage of capacity (used / cap). Same style
 * as `Load`: saturates at ">100%" on overflow (the absolute number lives in
 * the storage violation). Keeps the stat on a single line, no wrap.
 */
function formatStorageUsage(usedGB: number, capGB: number): string {
  if (capGB <= 0) {
    return "0%";
  }
  const pct = (usedGB / capGB) * 100;
  if (pct > 100) {
    return ">100%";
  }
  return `${pct < 1 && pct > 0 ? pct.toFixed(1) : pct.toFixed(0)}%`;
}

/** Label/value pair for each node's metrics (load, latency, instances, dropped, storage). */
function NodeStat({
  label,
  value,
  danger = false,
}: Readonly<{ label: string; value: string; danger?: boolean }>) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="wf-text-caption text-wf-ink-soft">{label}</span>
      <span
        className={`wf-text-small font-semibold tabular-nums ${danger ? "text-wf-destructive" : "text-wf-ink"}`}
      >
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
 * Verdict panel: shows the result of the last `runSimulation` —
 * latency/availability against the SLOs, list of violations and a node table
 * (ρ, saturation, latency, provisioned, drops). States: empty (pre-Run),
 * error (cycle/exception) and verdict. The Run button lives in the top bar
 * (and opens this section), not here.
 *
 * Presentational: receives everything via props for stories without the provider.
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

  // nodeId → human-readable preset label (e.g. "Web Client"), to show in
  // violations instead of the raw id (e.g. "web-client-eea4f5c3-..."). The
  // full id remains available via the info icon (tooltip).
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
          value={formatPercent(summary.availability.value, 2)}
          threshold={formatPercent(params.availabilitySlo, 2)}
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
                  label="Latency p99"
                  value={
                    Number.isFinite(row.latency)
                      ? `${row.latency.toFixed(0)} ms`
                      : "∞ ms"
                  }
                />
                <NodeStat label="Instances" value={String(row.provisioned)} />
                {row.dropped > 0 ? (
                  <NodeStat
                    label="Dropped"
                    value={`${Math.round(row.dropped)} rps`}
                  />
                ) : null}
                {row.storageCap > 0 ? (
                  <NodeStat
                    label="Storage"
                    value={formatStorageUsage(row.storageUsed, row.storageCap)}
                    danger={row.storageUsed > row.storageCap}
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

/** Connected to `FlowEditorProvider`: reads verdict/params/nodes. */
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
