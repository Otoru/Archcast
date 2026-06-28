import { computeQueue } from "@/engine/queue";
import type {
  ChallengeParams,
  EdgeChannel,
  NodeResult,
  PrimitiveHandler,
  ResolvedNode,
} from "@/engine/types";

export const broadcasterHandler: PrimitiveHandler = {
  primitive: "broadcaster",
  roleFor: (_channel: EdgeChannel, _resolved: ResolvedNode) => ({
    kind: "broadcaster" as const,
  }),
  compute: (
    deliveredLambda: number,
    resolved: ResolvedNode,
    _ctx: { params: ChallengeParams },
  ): NodeResult => {
    const { attrs } = resolved;
    const capacity = attrs.capacity ?? 0;
    const latBase = attrs.latBase ?? 0;
    const instances = attrs.instances ?? 1;

    if (capacity <= 0) {
      return { rho: 0, latency: latBase, saturated: false };
    }

    return computeQueue(deliveredLambda, capacity, latBase, instances);
  },
};
