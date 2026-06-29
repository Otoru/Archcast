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
  /** Agenda um commit debounced (300ms) — o último snapshot de uma rajada vence, coalescentando arrastes de posição. */
  pushHistory: (snapshot: EditorSnapshot) => void;
  /** Reset imediato do baseline (zera past/future) — usado no restore de mount/share pra que undo não limpe o grafo restaurado. */
  replaceCurrent: (snapshot: EditorSnapshot) => void;
};

const DEBOUNCE_MS = 300;
const MAX_PAST = 50;

/** Descarta `selected` (estado efêmero de UI) pra que trocas de seleção não virem passos de undo. */
function stripSelected(nodes: BlockNodeType[]): BlockNodeType[] {
  return nodes.map((node) => ({ ...node, selected: false }));
}

/** Assinatura do snapshot sem `selected` — mesma ideia da `runSignature` do provider. */
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
 * Histórico undo/redo de snapshot (estado completo, incluindo posições). Modelo
 * `past`/`present`/`future` com `present` guardado num ref (não re-renderiza a
 * árvore a cada commit). `pushHistory` é debounced: uma rajada de mudanças
 * (arraste, edição de attrs) vira UM passo — o último snapshot da rajada é
 * commitado, empurrando o `present` anterior pro `past`. `commit` compara o
 * snapshot com o `present` (via assinatura) e descarta echoes: após `undo`/
 * `apply`/restore, o efeito observador do provider dispara `pushHistory` com o
 * estado recém-aplicado, que é idêntico ao novo `present` → no-op (não cria
 * passo fantasma nem empurra o estado pré-restore pro `past`).
 *
 * `replaceCurrent` zera past/future e define o baseline — chamado no restore de
 * mount (localStorage) pra que o estado restaurado seja a origem do undo, não
 * um passo intermediário que undo reverteria pra tela vazia.
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
        return; // echo (pós-apply/undo/restore) ou mudança só de seleção — descarta.
      }
      if (!present) {
        // Primeiro commit (mount): vira baseline, sem empurrar nada pro past.
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
