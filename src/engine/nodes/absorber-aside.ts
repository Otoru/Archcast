import { computeQueue } from "@/engine/queue";
import type {
  ChallengeParams,
  EdgeChannel,
  NodeResult,
  PrimitiveHandler,
  ResolvedNode,
} from "@/engine/types";

export const absorberAsideHandler: PrimitiveHandler = {
  primitive: "absorber-aside",
  roleFor: (channel: EdgeChannel, resolved: ResolvedNode) => {
    if (channel === "write") {
      return null;
    }
    const hitRatio = resolved.attrs.hitRatio ?? 0;
    return { kind: "absorber" as const, passThrough: 1 - hitRatio };
  },
  compute: (
    deliveredLambda: number,
    resolved: ResolvedNode,
    _ctx: { params: ChallengeParams },
  ): NodeResult => {
    const { attrs } = resolved;
    const capacity = attrs.capacity ?? 0;
    const latBase = attrs.latBase ?? 0;
    const instances = attrs.instances ?? 1;
    return computeQueue(deliveredLambda, capacity, latBase, instances);
  },
};
