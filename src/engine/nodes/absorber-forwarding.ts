import { computeQueue } from "@/engine/queue";
import type {
  ChallengeParams,
  EdgeChannel,
  NodeResult,
  PrimitiveHandler,
  ResolvedNode,
} from "@/engine/types";

export const absorberForwardingHandler: PrimitiveHandler = {
  primitive: "absorber-forwarding",
  roleFor: (_channel: EdgeChannel, _resolved: ResolvedNode) => ({
    kind: "server" as const,
  }),
  compute: (
    deliveredLambda: number,
    resolved: ResolvedNode,
    _ctx: { params: ChallengeParams },
  ): NodeResult => {
    const { attrs, flags } = resolved;
    const capacity = attrs.capacity ?? 0;
    const latBase = attrs.latBase ?? 0;
    const instances = attrs.instances ?? 1;
    const hitRatio = attrs.hitRatio ?? 0;
    const passThrough = 1 - hitRatio;

    const result = computeQueue(deliveredLambda, capacity, latBase, instances);

    const dropped =
      flags.drop && hitRatio > 0
        ? deliveredLambda * (1 - passThrough)
        : undefined;

    return dropped !== undefined ? { ...result, dropped } : result;
  },
  outboundMultiplier(resolved: ResolvedNode): number {
    const hitRatio = resolved.attrs.hitRatio ?? 0;
    return 1 - hitRatio;
  },
};
