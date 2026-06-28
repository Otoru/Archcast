import { describe, expect, it } from "vitest";

import {
  DIURNAL_HORIZON_SEC,
  DIURNAL_TICK_SEC,
  diurnalProfile,
  resolveProfile,
  SPIKY_BURST_WINDOW_SEC,
  SPIKY_HORIZON_SEC,
  SPIKY_MULTIPLIER,
  SPIKY_TICK_SEC,
  spikyProfile,
  steadyProfile,
} from "@/engine/profile";
import { defaultParams } from "@/engine/test-helpers";

describe("steadyProfile", () => {
  it("emits a single constant point by default", () => {
    const points = steadyProfile(1000, { horizonSec: 1, tickSec: 1 });
    expect(points).toHaveLength(1);
    expect(points[0].rps).toBe(1000);
  });
});

describe("spikyProfile", () => {
  it("emits one point per tick over the horizon", () => {
    const points = spikyProfile(100, {
      horizonSec: SPIKY_HORIZON_SEC,
      tickSec: SPIKY_TICK_SEC,
    });
    expect(points).toHaveLength(SPIKY_HORIZON_SEC / SPIKY_TICK_SEC);
  });

  it("spikes to the multiplier inside the burst window and stays at baseline outside", () => {
    const base = 100;
    const points = spikyProfile(base, {
      horizonSec: SPIKY_HORIZON_SEC,
      tickSec: SPIKY_TICK_SEC,
    });
    const center = SPIKY_HORIZON_SEC / 2;
    const half = SPIKY_BURST_WINDOW_SEC / 2;

    const inside = points.find((p) => p.tSec === center);
    const outside = points.find((p) => p.tSec === 0);
    expect(inside).toBeDefined();
    expect(outside).toBeDefined();

    expect(inside?.rps).toBe(base * SPIKY_MULTIPLIER);
    expect(outside?.rps).toBe(base);
    expect(inside?.tSec).toBeGreaterThanOrEqual(center - half);
    expect(inside?.tSec).toBeLessThanOrEqual(center + half);
  });

  it("is deterministic", () => {
    const cfg = { horizonSec: SPIKY_HORIZON_SEC, tickSec: SPIKY_TICK_SEC };
    expect(spikyProfile(100, cfg)).toEqual(spikyProfile(100, cfg));
  });
});

describe("diurnalProfile", () => {
  it("emits 288 points (5-min ticks over a day)", () => {
    const points = diurnalProfile(100, {
      horizonSec: DIURNAL_HORIZON_SEC,
      tickSec: DIURNAL_TICK_SEC,
    });
    expect(points).toHaveLength(DIURNAL_HORIZON_SEC / DIURNAL_TICK_SEC);
  });

  it("oscillates around base: vale at t=0, peak at noon, average ~= base", () => {
    const base = 1000;
    const points = diurnalProfile(base, {
      horizonSec: DIURNAL_HORIZON_SEC,
      tickSec: DIURNAL_TICK_SEC,
    });
    const vale = points[0];
    const noon = points.find((p) => p.tSec === 12 * 3600);
    expect(noon).toBeDefined();

    // amplitude 0.5 → vale 0.5×, peak 1.5×
    expect(vale.rps).toBeCloseTo(base * 0.5, 5);
    expect(noon?.rps).toBeCloseTo(base * 1.5, 5);

    const avg = points.reduce((s, p) => s + p.rps, 0) / points.length;
    expect(avg).toBeCloseTo(base, 0);
  });

  it("is deterministic", () => {
    const cfg = { horizonSec: DIURNAL_HORIZON_SEC, tickSec: DIURNAL_TICK_SEC };
    expect(diurnalProfile(100, cfg)).toEqual(diurnalProfile(100, cfg));
  });
});

describe("resolveProfile", () => {
  it("dispatches by trafficPattern", () => {
    const spiky = resolveProfile(
      defaultParams({ rps: 100, trafficPattern: "spiky" }),
    );
    const diurnal = resolveProfile(
      defaultParams({ rps: 100, trafficPattern: "diurnal" }),
    );
    const steady = resolveProfile(
      defaultParams({ rps: 100, trafficPattern: "steady" }),
    );

    expect(spiky).toHaveLength(SPIKY_HORIZON_SEC / SPIKY_TICK_SEC);
    expect(diurnal).toHaveLength(DIURNAL_HORIZON_SEC / DIURNAL_TICK_SEC);
    expect(steady).toHaveLength(1);
  });
});
