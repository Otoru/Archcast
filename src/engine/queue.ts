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
    return {
      rho,
      latency: Number.POSITIVE_INFINITY,
      saturated: true,
    };
  }

  return {
    rho,
    latency: latBase / (1 - rho),
    saturated: false,
  };
}
