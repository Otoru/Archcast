import type { Edge } from "@xyflow/react";
import type { BlockNode as BlockNodeType } from "@/components/flow/block-node";
import {
  applyClipboardEntry,
  copySelection,
  duplicateSelection,
  pasteSelection,
} from "@/components/flow/clipboard";
import type { HistoryApi } from "@/components/flow/use-editor-history";

/**
 * Estado/ações que os atalhos de teclado consomem. É um snapshot lido por
 * referência no `flow-shell` para o listener ver sempre o estado fresco.
 */
export interface ShortcutHandlers {
  running: boolean;
  nodes: BlockNodeType[];
  edges: Edge[];
  history: HistoryApi;
  setNodes: (updater: (nodes: BlockNodeType[]) => BlockNodeType[]) => void;
  setEdges: (updater: (edges: Edge[]) => Edge[]) => void;
  handleRun: () => void;
  stopRun: () => void;
  setHelpOpen: (open: boolean) => void;
}

/** Descrição mínima da tecla pressionada (desacoplada do KeyboardEvent do DOM). */
export interface ShortcutKey {
  key: string;
  mod: boolean;
  shift: boolean;
}

/**
 * Despacha um atalho de teclado. Retorna `true` se a tecla foi consumida (o
 * chamador então dá `preventDefault`), `false` caso contrário. Lógica pura,
 * testável sem DOM — o `flow-shell` só traduz o `KeyboardEvent` em
 * `ShortcutKey` e registra o listener.
 */
export function handleShortcutKey(
  k: ShortcutKey,
  s: ShortcutHandlers,
): boolean {
  if (!k.mod) {
    if (k.key === "?") {
      s.setHelpOpen(true);
      return true;
    }
    return false;
  }

  const key = k.key.toLowerCase();
  switch (key) {
    case "enter":
      if (s.running) {
        s.stopRun();
      } else {
        s.handleRun();
      }
      return true;
    case "z":
      if (k.shift) {
        s.history.redo();
      } else {
        s.history.undo();
      }
      return true;
    case "c":
      copySelection(s.nodes, s.edges);
      return true;
    case "v": {
      if (s.running) {
        return true;
      }
      const entry = pasteSelection();
      if (entry) {
        applyClipboardEntry(entry, s.setNodes, s.setEdges);
      }
      return true;
    }
    case "d": {
      if (s.running) {
        return true;
      }
      const entry = duplicateSelection(s.nodes, s.edges);
      if (entry) {
        applyClipboardEntry(entry, s.setNodes, s.setEdges);
      }
      return true;
    }
    default:
      return false;
  }
}
