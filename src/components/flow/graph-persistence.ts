import type { Edge } from "@xyflow/react";
import type { BlockNode as BlockNodeType } from "@/components/flow/block-node";
import {
  deserializeGraph,
  type LoadedGraph,
  serializeGraph,
} from "@/components/flow/graph-serialization";
import type { ChallengeParams } from "@/engine";

const STORAGE_KEY = "wireframe:graph";

/**
 * Reads the last saved graph from localStorage. Returns null if nothing is
 * saved, if we're in SSR, or if the content is corrupt (invalid parse/shape) —
 * never throws; the editor starts from an empty canvas in that case.
 */
export function readStoredGraph(): LoadedGraph | null {
  if (globalThis.window === undefined) {
    return null;
  }
  let raw: string | null;
  try {
    raw = globalThis.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) {
    return null;
  }
  try {
    return deserializeGraph(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** Saves the graph to localStorage. Everything in try/catch — quota/private mode never break the editor. */
export function writeStoredGraph(
  nodes: BlockNodeType[],
  edges: Edge[],
  params: ChallengeParams,
): void {
  if (globalThis.window === undefined) {
    return;
  }
  try {
    const doc = serializeGraph(nodes, edges, params);
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
  } catch {
    // quota full / private mode — silent.
  }
}

/** Removes the saved graph (used by Clear for a clean reset). */
export function clearStoredGraph(): void {
  if (globalThis.window === undefined) {
    return;
  }
  try {
    globalThis.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
