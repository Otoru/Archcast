import type {
  ComputeContext,
  EdgeChannel,
  NodeResult,
  PrimitiveHandler,
  ResolvedNode,
} from "@/engine/types";

/**
 * async-buffer = fila/mensageria.
 *
 * - Steady (sem `tickState`): modelo instantâneo M/M/1-like — satura quando
 *   `rho >= 1` e o backlog excede `maxDepth`. Não emite `outboundFlow`, então
 *   o fluxo é repassado integro (comportamento legado, byte-identical).
 * - Event-loop (com `tickState`): carrega o backlog entre ticks, drena a
 *   `effectiveDrain` por tick e emite `outboundFlow = drained` adiante — ou
 *   seja, o downstream enxerga a drainRate (média), não o burst. Satura quando
 *   o backlog acumulado excede `maxDepth`. `latency: 0` mantém o caminho async
 *   fora da cadeia de latência síncrona.
 */
export const asyncBufferHandler: PrimitiveHandler = {
  primitive: "async-buffer",
  roleFor: (_channel: EdgeChannel, _resolved: ResolvedNode) => ({
    kind: "server" as const,
  }),
  compute: (
    deliveredLambda: number,
    resolved: ResolvedNode,
    ctx: ComputeContext,
  ): NodeResult => {
    const drainRate = resolved.attrs.drainRate ?? 0;
    const maxDepth = resolved.attrs.maxDepth ?? Number.POSITIVE_INFINITY;
    const instances = resolved.attrs.instances ?? 1;
    const effectiveDrain = drainRate * instances;

    if (!ctx.tickState) {
      const rho =
        effectiveDrain > 0
          ? deliveredLambda / effectiveDrain
          : Number.POSITIVE_INFINITY;
      if (rho >= 1) {
        const backlog = deliveredLambda - effectiveDrain;
        return {
          rho,
          latency: 0,
          saturated: backlog > maxDepth,
        };
      }
      return { rho, latency: 0, saturated: false };
    }

    const backlogPrev = ctx.tickState.backlog[resolved.id] ?? 0;
    const available = backlogPrev + deliveredLambda;
    const drained = Math.min(available, effectiveDrain);
    const newBacklog = Math.max(0, available - effectiveDrain);
    const rho =
      effectiveDrain > 0
        ? available / effectiveDrain
        : Number.POSITIVE_INFINITY;
    const saturated = newBacklog > maxDepth;

    return {
      rho,
      latency: 0,
      saturated,
      backlog: newBacklog,
      outboundFlow: drained,
    };
  },
};
