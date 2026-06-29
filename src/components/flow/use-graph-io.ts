"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import {
  deserializeGraph,
  type GraphDocument,
  type LoadedGraph,
  serializeGraph,
} from "@/components/flow/graph-serialization";

export type GraphIO = {
  /** Serializa o grafo atual e baixa `wireframe-graph.json`. */
  exportGraph: () => void;
  /** Abre um seletor de arquivo; carrega o JSON escolhido (undoable via onLoad). */
  importGraph: () => void;
};

/**
 * I/O de grafo via arquivo: export e import de JSON. Um `GraphDocument` (plano,
 * serializável, via `graph-serialization`) é o que `getSnapshot` devolve e o que
 * `exportGraph` escreve; `deserializeGraph` faz a ponte plano→`LoadedGraph`
 * (shape RF, pronto pra `applyGraph`) no import, validando cada `kind`.
 * `onLoad` é a callback de aplicação user-initiated: a toolbar passa uma função
 * que faz apply + fitView (vira um passo de undo naturalmente via o efeito
 * observador do histórico).
 */
export function useGraphIO(
  getSnapshot: () => GraphDocument,
  onLoad: (doc: LoadedGraph) => void,
): GraphIO {
  const exportGraph = useCallback(() => {
    const doc = getSnapshot();
    const blob = new Blob([JSON.stringify(doc, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "wireframe-graph.json";
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Exported graph as wireframe-graph.json");
  }, [getSnapshot]);

  const importGraph = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        return;
      }
      file
        .text()
        .then((text) => {
          const doc = deserializeGraph(JSON.parse(text));
          onLoad(doc);
          toast.success(`Imported graph (${doc.nodes.length} blocks)`);
        })
        .catch((err: unknown) => {
          toast.error(
            err instanceof Error ? err.message : "Failed to import graph",
          );
        });
    };
    input.click();
  }, [onLoad]);

  return { exportGraph, importGraph };
}

// Re-exporta a serialização pra quem usa I/O precisar montar snapshots.
export { serializeGraph };
