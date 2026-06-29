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
 * Lê o último grafo salvo do localStorage. Retorna null se nada salvo, se
 * estamos no SSR, ou se o conteúdo está corrompido (parse/shape inválido) —
 * nunca lança; o editor parte do canvas vazio nesse caso.
 */
export function readStoredGraph(): LoadedGraph | null {
  if (typeof window === "undefined") {
    return null;
  }
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
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

/** Salva o grafo no localStorage. Tudo em try/catch — quota/private mode nunca quebram o editor. */
export function writeStoredGraph(
  nodes: BlockNodeType[],
  edges: Edge[],
  params: ChallengeParams,
): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    const doc = serializeGraph(nodes, edges, params);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
  } catch {
    // quota cheia / modo privado — silencioso.
  }
}

/** Remove o grafo salvo (usado pelo Clear pra um reset limpo). */
export function clearStoredGraph(): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
