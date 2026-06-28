import { describe, expect, it } from "vitest";

import { computeQueue } from "@/engine/queue";

describe("computeQueue", () => {
  it("returns W≈latBase at low load", () => {
    const result = computeQueue(10, 1000, 5);

    expect(result.saturated).toBe(false);
    expect(result.rho).toBeCloseTo(0.01);
    expect(result.latency).toBeCloseTo(5 / (1 - 0.01));
    expect(result.latency).toBeCloseTo(5, 0);
  });

  it("returns latency≈10×latBase when rho≈0.9", () => {
    const capacity = 100;
    const latBase = 2;
    const lambda = 90;

    const result = computeQueue(lambda, capacity, latBase);

    expect(result.saturated).toBe(false);
    expect(result.rho).toBeCloseTo(0.9);
    expect(result.latency).toBeCloseTo(latBase / (1 - 0.9));
    expect(result.latency).toBeCloseTo(10 * latBase);
  });

  it("marks node saturated when lambda exceeds capacity", () => {
    const result = computeQueue(150, 100, 5);

    expect(result.saturated).toBe(true);
    expect(result.rho).toBeGreaterThanOrEqual(1);
    expect(result.latency).toBe(Number.POSITIVE_INFINITY);
  });

  it("applies instances multiplier to effective capacity", () => {
    const single = computeQueue(100, 100, 2, 1);
    const triple = computeQueue(90, 100, 2, 3);

    expect(single.saturated).toBe(true);
    expect(triple.saturated).toBe(false);
    expect(triple.rho).toBeCloseTo(0.3);
  });
});
