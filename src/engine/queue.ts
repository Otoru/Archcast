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
    // Saturated: the node can only serve up to `effectiveCap`; the excess
    // (everything arriving beyond capacity) is dropped. With zero capacity,
    // all traffic drops.
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
