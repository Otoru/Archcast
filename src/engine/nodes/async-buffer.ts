import type {
  ChallengeParams,
  EdgeChannel,
  NodeResult,
  PrimitiveHandler,
  ResolvedNode,
} from "@/engine/types";

export const asyncBufferHandler: PrimitiveHandler = {
  primitive: "async-buffer",
  roleFor: (_channel: EdgeChannel, _resolved: ResolvedNode) => ({
    kind: "server" as const,
  }),
  compute: (
    deliveredLambda: number,
    resolved: ResolvedNode,
    _ctx: { params: ChallengeParams },
  ): NodeResult => {
    const drainRate = resolved.attrs.drainRate ?? 0;
    const maxDepth = resolved.attrs.maxDepth ?? Number.POSITIVE_INFINITY;
    const instances = resolved.attrs.instances ?? 1;
    const effectiveDrain = drainRate * instances;

    const rho =
      effectiveDrain > 0
        ? deliveredLambda / effectiveDrain
        : Number.POSITIVE_INFINITY;

    if (rho >= 1) {
      const backlog = deliveredLambda - effectiveDrain;
      const saturated = backlog > maxDepth;
      return {
        rho,
        latency: 0,
        saturated,
      };
    }

    return { rho, latency: 0, saturated: false };
  },
};
