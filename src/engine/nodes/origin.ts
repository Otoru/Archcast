import type {
  ChallengeParams,
  NodeResult,
  PrimitiveHandler,
  ResolvedNode,
} from "@/engine/types";

export const originHandler: PrimitiveHandler = {
  primitive: "origin",
  roleFor: () => null,
  compute: (
    _deliveredLambda: number,
    _resolved: ResolvedNode,
    _ctx: { params: ChallengeParams },
  ): NodeResult => ({
    rho: 0,
    latency: 0,
    saturated: false,
  }),
};
