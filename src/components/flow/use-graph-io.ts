"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import {
  deserializeGraph,
  type GraphDocument,
  type LoadedGraph,
} from "@/components/flow/graph-serialization";

export type GraphIO = {
  /** Serializes the current graph and downloads `archcast-graph.json`. */
  exportGraph: () => void;
  /** Opens a file picker; loads the chosen JSON (undoable via onLoad). */
  importGraph: () => void;
};

/**
 * File-based graph I/O: JSON export and import. A `GraphDocument` (flat,
 * serializable, via `graph-serialization`) is what `getSnapshot` returns and
 * what `exportGraph` writes; `deserializeGraph` bridges flat→`LoadedGraph`
 * (RF shape, ready for `applyGraph`) on import, validating each `kind`.
 * `onLoad` is the user-initiated apply callback: the toolbar passes a function
 * that does apply + fitView (becomes a natural undo step via the history
 * observer effect).
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
    anchor.download = "archcast-graph.json";
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Exported graph as archcast-graph.json");
  }, [getSnapshot]);

  const importGraph = useCallback(() => {
    if (typeof globalThis.window === "undefined") {
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

// Re-exports serialization so I/O consumers can build snapshots.
export { serializeGraph } from "@/components/flow/graph-serialization";
