"use client";

import { BaseEdge, type EdgeProps, getBezierPath } from "@xyflow/react";
import { useContext } from "react";
import { RunStateContext } from "@/components/flow/block-node";
import { strokeByMagnitude } from "@/components/flow/flow-edge-style";

/**
 * Custom edge for run mode: derives color and thickness from `RunStateContext`
 * (flow magnitude normalized by the graph's peak) and animates the dash when
 * the run is active and there is flow. An edge whose source is saturated
 * becomes `--wf-destructive` ("hot" edge). With no verdict (idle), it renders
 * the neutral edge — a visual compatible with React Flow's default.
 *
 * The edge's channel remains encoded in the handles (`out-read` → `in-read`),
 * same as default edges; nothing changes in the model, only in the visual.
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

  // Idle (no verdict) or edge with no recorded flow: neutral edge.
  if (!runState.hasVerdict || !edgeState) {
    return (
      <BaseEdge
        id={id}
        path={edgePath}
        style={{ stroke: "var(--color-wf-border-soft)", strokeWidth: 1.5 }}
      />
    );
  }

  // The saturation red is a "live" alarm: only during the run. On pressing
  // Stop, the edge returns to the neutral color by magnitude (the verdict
  // stays frozen in the panel, but the alarm disappears — same as the node's
  // red border).
  const saturatedNow = runState.running && edgeState.saturated;
  const stroke = saturatedNow
    ? "var(--color-wf-destructive)"
    : strokeByMagnitude(edgeState.magnitude);
  const strokeWidth = saturatedNow ? 2.5 : 1.5 + edgeState.magnitude * 1.5;
  // Animates the dash only in active run mode (stopped/frozen keeps the
  // color, no movement — the "freezing" of Stop).
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
