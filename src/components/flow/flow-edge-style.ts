/**
 * Neutral edge color by flow magnitude band (non-saturated). Pure, with no
 * React Flow dependency — separated from `flow-edge.tsx` so it can be tested
 * without mounting the canvas.
 */
export function strokeByMagnitude(magnitude: number): string {
  if (magnitude < 0.33) {
    return "var(--color-wf-border-soft)";
  }
  if (magnitude < 0.66) {
    return "var(--color-wf-border)";
  }
  return "var(--color-wf-focus)";
}
