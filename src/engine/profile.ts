import type { ChallengeParams } from "@/engine/types";

export interface ProfileConfig {
  horizonSec: number;
  tickSec: number;
}

export interface ProfilePoint {
  tSec: number;
  rps: number;
}

export interface SpikyOptions {
  spikeMultiplier?: number;
  burstWindowSec?: number;
}

export const STEADY_HORIZON_SEC = 1;
export const STEADY_TICK_SEC = 1;

export const SPIKY_HORIZON_SEC = 300;
export const SPIKY_TICK_SEC = 1;
export const SPIKY_MULTIPLIER = 10;
export const SPIKY_BURST_WINDOW_SEC = 30;

export const DIURNAL_HORIZON_SEC = 86_400;
export const DIURNAL_TICK_SEC = 300;
export const DIURNAL_AMPLITUDE = 0.5;

function tickCount(cfg: ProfileConfig): number {
  return Math.max(1, Math.ceil(cfg.horizonSec / cfg.tickSec));
}

/**
 * `params.rps` is the reference load:
 * - steady: constant = rps.
 * - spiky: baseline = rps, with a burst of `SPIKY_MULTIPLIER`× during the window.
 * - diurnal: oscillates around rps (mean = rps), peak (1+amplitude)×, trough (1-amplitude)×.
 */
export function steadyProfile(
  baseRps: number,
  cfg: ProfileConfig,
): ProfilePoint[] {
  const points: ProfilePoint[] = [];
  for (let i = 0; i < tickCount(cfg); i++) {
    points.push({ tSec: i * cfg.tickSec, rps: baseRps });
  }
  return points;
}

export function spikyProfile(
  baseRps: number,
  cfg: ProfileConfig,
  opts: SpikyOptions = {},
): ProfilePoint[] {
  const spikeMultiplier = opts.spikeMultiplier ?? SPIKY_MULTIPLIER;
  const burstWindowSec = opts.burstWindowSec ?? SPIKY_BURST_WINDOW_SEC;
  const center = cfg.horizonSec / 2;
  const half = burstWindowSec / 2;
  const points: ProfilePoint[] = [];
  for (let i = 0; i < tickCount(cfg); i++) {
    const t = i * cfg.tickSec;
    const inBurst = t >= center - half && t <= center + half;
    const factor = inBurst ? spikeMultiplier : 1;
    points.push({ tSec: t, rps: baseRps * factor });
  }
  return points;
}

export function diurnalProfile(
  baseRps: number,
  cfg: ProfileConfig,
): ProfilePoint[] {
  const amplitude = DIURNAL_AMPLITUDE;
  const points: ProfilePoint[] = [];
  for (let i = 0; i < tickCount(cfg); i++) {
    const t = i * cfg.tickSec;
    const phase = 2 * Math.PI * (t / DIURNAL_HORIZON_SEC - 0.25);
    const factor = 1 + amplitude * Math.sin(phase);
    points.push({ tSec: t, rps: baseRps * factor });
  }
  return points;
}

export function resolveProfile(params: ChallengeParams): ProfilePoint[] {
  const base = params.rps;
  switch (params.trafficPattern) {
    case "spiky":
      return spikyProfile(base, {
        horizonSec: SPIKY_HORIZON_SEC,
        tickSec: SPIKY_TICK_SEC,
      });
    case "diurnal":
      return diurnalProfile(base, {
        horizonSec: DIURNAL_HORIZON_SEC,
        tickSec: DIURNAL_TICK_SEC,
      });
    default:
      return steadyProfile(base, {
        horizonSec: STEADY_HORIZON_SEC,
        tickSec: STEADY_TICK_SEC,
      });
  }
}
