import type {
  ComputeContext,
  EdgeChannel,
  NodeResult,
  PrimitiveHandler,
  ResolvedNode,
} from "@/engine/types";

/**
 * async-buffer = queue/messaging.
 *
 * - Steady (no `tickState`): instant M/M/1-like model — saturates when
 *   `rho >= 1` and backlog exceeds `maxDepth`. Does not emit `outboundFlow`, so
 *   the flow is forwarded in full (legacy behavior, byte-identical).
 * - Event-loop (with `tickState`): carries backlog across ticks, drains
 *   `effectiveDrain` per tick and emits `outboundFlow = drained` downstream —
 *   that is, downstream sees the drainRate (average), not the burst. Saturates
 *   when accumulated backlog exceeds `maxDepth`. `latency: 0` keeps the async
 *   path out of the synchronous latency chain.
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
