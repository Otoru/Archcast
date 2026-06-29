"use client";

import { BaseEdge, type EdgeProps, getBezierPath } from "@xyflow/react";
import { useContext } from "react";
import { RunStateContext } from "@/components/flow/block-node";

/**
 * Edge custom do modo run: deriva cor e espessura do `RunStateContext`
 * (magnitude do fluxo normalizada pelo pico do grafo) e anima o tracejado
 * quando o run está ativo e há fluxo. Edge cuja origem está saturada fica
 * `--wf-destructive` (edge "quente"). Sem veredito (idle), renderiza a edge
 * neutra — visual compatível com o default do React Flow.
 *
 * O canal da edge continua codificado nos handles (`out-read` → `in-read`),
 * igual às edges default; nada muda no modelo, só no visual.
 */
export function FlowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
}: EdgeProps) {
  const runState = useContext(RunStateContext);
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const edgeState = runState.edgeStateById.get(id);

  // Idle (sem veredito) ou edge sem fluxo registrado: edge neutra.
  if (!runState.hasVerdict || !edgeState) {
    return (
      <BaseEdge
        id={id}
        path={edgePath}
        style={{ stroke: "var(--color-wf-border-soft)", strokeWidth: 1.5 }}
      />
    );
  }

  // O vermelho de saturação é alarme "ao vivo": só durante o run. Ao apertar
  // Stop, a edge volta à cor neutra por magnitude (o veredito segue congelado
  // no painel, mas o alarme some — igual à borda vermelha do nó).
  const saturatedNow = runState.running && edgeState.saturated;
  const stroke = saturatedNow
    ? "var(--color-wf-destructive)"
    : edgeState.magnitude < 0.33
      ? "var(--color-wf-border-soft)"
      : edgeState.magnitude < 0.66
        ? "var(--color-wf-border)"
        : "var(--color-wf-focus)";
  const strokeWidth = saturatedNow ? 2.5 : 1.5 + edgeState.magnitude * 1.5;
  // Anima o tracejado só no modo run ativo (parado/frozen mantém a cor, sem
  // movimento — o "congelamento" do Stop).
  const animated = runState.running && edgeState.flow > 0;

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      className={animated ? "wf-edge-flow" : undefined}
      style={{ stroke, strokeWidth }}
    />
  );
}
