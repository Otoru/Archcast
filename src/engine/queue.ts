import type { NodeResult } from "@/engine/types";

export function computeQueue(
  lambda: number,
  capacity: number,
  latBase: number,
  instances = 1,
): NodeResult {
  const effectiveCap = capacity * instances;
  const rho =
    effectiveCap > 0 ? lambda / effectiveCap : Number.POSITIVE_INFINITY;

  if (rho >= 1) {
    // Saturado: o nó só consegue atender até `effectiveCap`; o excedente
    // (tudo que chega além da capacidade) é descartado. Com capacidade zero,
    // todo o tráfego cai.
    const dropped = effectiveCap > 0 ? lambda - effectiveCap : lambda;
    return {
      rho,
      latency: Number.POSITIVE_INFINITY,
      saturated: true,
      dropped,
    };
  }

  return {
    rho,
    latency: latBase / (1 - rho),
    saturated: false,
  };
}
