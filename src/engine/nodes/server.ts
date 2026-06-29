import { computeQueue } from "@/engine/queue";
import type {
  ChallengeParams,
  EdgeChannel,
  NodeResult,
  PrimitiveHandler,
  ResolvedNode,
} from "@/engine/types";
import { ELASTIC_TARGET_RHO } from "@/engine/types";

export const serverHandler: PrimitiveHandler = {
  primitive: "server",
  roleFor: (_channel: EdgeChannel, _resolved: ResolvedNode) => ({
    kind: "server" as const,
  }),
  compute: (
    deliveredLambda: number,
    resolved: ResolvedNode,
    ctx: { params: ChallengeParams; distributed?: boolean },
  ): NodeResult => {
    const { attrs, flags } = resolved;
    const capacity = attrs.capacity ?? 0;
    const latBase = attrs.latBase ?? 0;
    const rateCap = attrs.rateCap;

    let servedLambda = deliveredLambda;
    let rejectedRps = 0;

    if (rateCap !== undefined && deliveredLambda > rateCap) {
      servedLambda = rateCap;
      rejectedRps = deliveredLambda - rateCap;
    }

    if (flags.elastic) {
      const capUnit = capacity > 0 ? capacity : 1;
      const provisioned = Math.ceil(
        deliveredLambda / (ELASTIC_TARGET_RHO * capUnit),
      );
      const effectiveCap = provisioned * capUnit;
      const rho =
        effectiveCap > 0
          ? deliveredLambda / effectiveCap
          : Number.POSITIVE_INFINITY;
      const safeRho = Math.min(rho, ELASTIC_TARGET_RHO);
      return {
        rho: safeRho,
        latency: latBase / (1 - safeRho),
        saturated: false,
        provisioned,
      };
    }

    // Sem distribuidor upstream, `instances` não escala capacidade (só
    // disponibilidade) — não há como dividir tráfego entre as instâncias. O
    // elástico acima se auto-provisiona, então não depende de distribuidor.
    const distributed = ctx.distributed ?? false;
    const instances = distributed ? (attrs.instances ?? 1) : 1;

    const result = computeQueue(servedLambda, capacity, latBase, instances);
    if (rejectedRps > 0) {
      return { ...result, rejectedRps };
    }
    return result;
  },
};
