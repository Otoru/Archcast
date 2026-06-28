import type {
  ChallengeParams,
  EdgeChannel,
  NodeResult,
  PrimitiveHandler,
  ResolvedNode,
} from "@/engine/types";

export const structuralHandler: PrimitiveHandler = {
  primitive: "structural",
  roleFor: (_channel: EdgeChannel, _resolved: ResolvedNode) => null,
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
