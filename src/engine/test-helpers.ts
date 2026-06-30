import { getPreset, registerPreset } from "@/engine/catalog";
import type {
  ChallengeParams,
  Edge,
  Graph,
  NodeInstance,
} from "@/engine/types";

/** Test preset for absorber-aside — not part of the production catalog. */
export const TEST_CACHE_KIND = "test-cache";

export function ensureTestCachePreset(): void {
  if (getPreset(TEST_CACHE_KIND)) {
    return;
  }
  registerPreset({
    kind: TEST_CACHE_KIND,
    label: "Test Cache",
    primitive: "absorber-aside",
    layer: "data",
    defaults: { hitRatio: 0.8, capacity: 1e5, latBase: 0.5 },
    edges: { in: ["read"], out: [] },
  });
}

export function defaultParams(
  overrides: Partial<ChallengeParams> = {},
): ChallengeParams {
  return {
    rps: 100,
    trafficPattern: "steady",
    readWriteRatio: 0.8,
    latencySlo: 1000,
    availabilitySlo: 0.99,
    ...overrides,
  };
}

export function makeGraph(nodes: NodeInstance[], edges: Edge[]): Graph {
  return { nodes, edges };
}

export function serverNode(
  id: string,
  attrs: Record<string, number>,
): NodeInstance {
  return { id, kind: "app-server", attrs };
}

export function sourceNode(id: string): NodeInstance {
  return { id, kind: "web-client", attrs: {} };
}

export function cacheNode(
  id: string,
  attrs: Record<string, number>,
): NodeInstance {
  ensureTestCachePreset();
  return { id, kind: TEST_CACHE_KIND, attrs };
}

export function presetNode(
  id: string,
  kind: string,
  attrs: Record<string, number> = {},
): NodeInstance {
  return { id, kind, attrs };
}
