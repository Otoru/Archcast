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
 * State/actions consumed by keyboard shortcuts. This is a snapshot read by
 * reference in `flow-shell` so the listener always sees fresh state.
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

/** Minimal description of the pressed key (decoupled from the DOM KeyboardEvent). */
export interface ShortcutKey {
  key: string;
  mod: boolean;
  shift: boolean;
}

/**
 * Dispatches a keyboard shortcut. Returns `true` if the key was consumed (the
 * caller then calls `preventDefault`), `false` otherwise. Pure logic,
 * testable without the DOM — `flow-shell` only translates the `KeyboardEvent`
 * into a `ShortcutKey` and registers the listener.
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
