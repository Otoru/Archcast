/**
 * Cor neutra da edge por faixa de magnitude do fluxo (não-saturada). Pura, sem
 * dependência do React Flow — separada de `flow-edge.tsx` para ser testável
 * sem montar o canvas.
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
