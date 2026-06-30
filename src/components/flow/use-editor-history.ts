"use client";

import type { Edge } from "@xyflow/react";
import { useCallback, useRef, useState } from "react";
import type { BlockNode as BlockNodeType } from "@/components/flow/block-node";
import type { ChallengeParams } from "@/engine";

export type EditorSnapshot = {
  nodes: BlockNodeType[];
  edges: Edge[];
  params: ChallengeParams;
};

export type HistoryApi = {
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  /** Schedules a debounced commit (300ms) — the last snapshot of a burst wins, coalescing position drags. */
  pushHistory: (snapshot: EditorSnapshot) => void;
  /** Immediate baseline reset (clears past/future) — used on mount/share restore so undo doesn't clear the restored graph. */
  replaceCurrent: (snapshot: EditorSnapshot) => void;
};

const DEBOUNCE_MS = 300;
const MAX_PAST = 50;

/** Drops `selected` (ephemeral UI state) so selection changes don't become undo steps. */
function stripSelected(nodes: BlockNodeType[]): BlockNodeType[] {
  return nodes.map((node) => ({ ...node, selected: false }));
}

/** Snapshot signature without `selected` — same idea as the provider's `runSignature`. */
function snapshotSignature(snap: EditorSnapshot): string {
  const ns = snap.nodes
    .map(
      (n) =>
        `${n.id}|${n.data.kind}|${JSON.stringify(n.data.attrs ?? {})}|${n.position.x}|${n.position.y}`,
    )
    .join(";");
  const es = snap.edges
    .map(
      (e) =>
        `${e.id}|${e.source}|${e.target}|${e.sourceHandle ?? ""}|${e.targetHandle ?? ""}`,
    )
    .join(";");
  return `${ns}||${es}||${JSON.stringify(snap.params)}`;
}

/**
 * Snapshot undo/redo history (full state, including positions). `past`/
 * `present`/`future` model with `present` kept in a ref (does not re-render
 * the tree on every commit). `pushHistory` is debounced: a burst of changes
 * (drag, attrs edit) becomes ONE step — the last snapshot of the burst is
 * committed, pushing the previous `present` onto `past`. `commit` compares the
 * snapshot with `present` (via signature) and discards echoes: after `undo`/
 * `apply`/restore, the provider's observer effect fires `pushHistory` with the
 * just-applied state, which is identical to the new `present` → no-op (no
 * phantom step is created and the pre-restore state is not pushed to `past`).
 *
 * `replaceCurrent` clears past/future and sets the baseline — called on mount
 * restore (localStorage) so the restored state is the origin of undo, not an
 * intermediate step that undo would revert to an empty canvas.
 */
export function useEditorHistory(
  apply: (snapshot: EditorSnapshot) => void,
): HistoryApi {
  const pastRef = useRef<EditorSnapshot[]>([]);
  const futureRef = useRef<EditorSnapshot[]>([]);
  const presentRef = useRef<EditorSnapshot | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const syncFlags = useCallback(() => {
    setCanUndo(pastRef.current.length > 0);
    setCanRedo(futureRef.current.length > 0);
  }, []);

  const commit = useCallback(
    (snapshot: EditorSnapshot) => {
      const present = presentRef.current;
      if (
        present &&
        snapshotSignature(present) === snapshotSignature(snapshot)
      ) {
        return; // echo (post-apply/undo/restore) or selection-only change — discard.
      }
      if (!present) {
        // First commit (mount): becomes baseline, without pushing anything to past.
        presentRef.current = snapshot;
        syncFlags();
        return;
      }
      pastRef.current.push(present);
      if (pastRef.current.length > MAX_PAST) {
        pastRef.current.shift();
      }
      presentRef.current = snapshot;
      futureRef.current = [];
      syncFlags();
    },
    [syncFlags],
  );

  const pushHistory = useCallback(
    (snapshot: EditorSnapshot) => {
      const stripped: EditorSnapshot = {
        ...snapshot,
        nodes: stripSelected(snapshot.nodes),
      };
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        commit(stripped);
      }, DEBOUNCE_MS);
    },
    [commit],
  );

  const replaceCurrent = useCallback(
    (snapshot: EditorSnapshot) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      presentRef.current = {
        ...snapshot,
        nodes: stripSelected(snapshot.nodes),
      };
      pastRef.current = [];
      futureRef.current = [];
      syncFlags();
    },
    [syncFlags],
  );

  const undo = useCallback(() => {
    if (pastRef.current.length === 0) {
      return;
    }
    const present = presentRef.current;
    const previous = pastRef.current.pop();
    if (!previous) {
      return;
    }
    if (present) {
      futureRef.current.push(present);
    }
    presentRef.current = previous;
    apply(previous);
    syncFlags();
  }, [apply, syncFlags]);

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) {
      return;
    }
    const present = presentRef.current;
    const next = futureRef.current.pop();
    if (!next) {
      return;
    }
    if (present) {
      pastRef.current.push(present);
    }
    presentRef.current = next;
    apply(next);
    syncFlags();
  }, [apply, syncFlags]);

  return { canUndo, canRedo, undo, redo, pushHistory, replaceCurrent };
}
