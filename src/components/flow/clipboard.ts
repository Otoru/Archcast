import type { Edge } from "@xyflow/react";
import type { BlockNode as BlockNodeType } from "@/components/flow/block-node";

export type ClipboardEntry = {
  nodes: BlockNodeType[];
  edges: Edge[];
};

// Module-level clipboard (no React) — survives across renders. It doesn't
// persist across refresh (the OS clipboard is async/clunky for JSON); this is
// the internal "Ctrl+C/Ctrl+V".
let clipboard: ClipboardEntry | null = null;

function selectedNodes(nodes: BlockNodeType[]): BlockNodeType[] {
  return nodes.filter((node) => node.selected);
}

function edgesWithinSelection(edges: Edge[], ids: Set<string>): Edge[] {
  return edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target));
}

function newIdFor(kind: string): string {
  return `${kind}-${crypto.randomUUID()}`;
}

/**
 * Rebuilds the selection with fresh ids, positions offset by (+dx, +dy) and
 * remapped edges. New nodes come with `selected: true`; the caller deselects
 * the old ones in the replaced array (so the selection ring follows the paste).
 */
function rebindSelection(
  entry: ClipboardEntry,
  dx: number,
  dy: number,
): ClipboardEntry {
  const idMap = new Map<string, string>();
  const nodes = entry.nodes.map((node) => {
    const id = newIdFor(node.data.kind);
    idMap.set(node.id, id);
    return {
      ...node,
      id,
      position: { x: node.position.x + dx, y: node.position.y + dy },
      selected: true,
      data: { ...node.data },
    } as BlockNodeType;
  });
  const edges = entry.edges.map((edge, index) => ({
    ...edge,
    id: `e-${crypto.randomUUID()}-${index}`,
    source: idMap.get(edge.source) ?? edge.source,
    target: idMap.get(edge.target) ?? edge.target,
    selected: false,
  })) as Edge[];
  return { nodes, edges };
}

/** Copies selected nodes + the edges between them into the internal clipboard. */
export function copySelection(nodes: BlockNodeType[], edges: Edge[]): void {
  const selected = selectedNodes(nodes);
  if (selected.length === 0) {
    clipboard = null;
    return;
  }
  const ids = new Set(selected.map((node) => node.id));
  const selectedEdges = edgesWithinSelection(edges, ids);
  clipboard = { nodes: selected, edges: selectedEdges };
}

/**
 * Pastes the clipboard with fresh ids and a +20/+20 offset. Returns null if the
 * clipboard is empty. New nodes arrive already selected; the caller deselects
 * the old ones.
 */
export function pasteSelection(): ClipboardEntry | null {
  if (!clipboard) {
    return null;
  }
  return rebindSelection(clipboard, 20, 20);
}

/**
 * Duplicates the current selection in place (bypassing the clipboard).
 * +20/+20 offset, fresh ids. Returns null if nothing is selected.
 */
export function duplicateSelection(
  nodes: BlockNodeType[],
  edges: Edge[],
): ClipboardEntry | null {
  const selected = selectedNodes(nodes);
  if (selected.length === 0) {
    return null;
  }
  const ids = new Set(selected.map((node) => node.id));
  const selectedEdges = edgesWithinSelection(edges, ids);
  return rebindSelection({ nodes: selected, edges: selectedEdges }, 20, 20);
}

/** Is there anything in the clipboard ready to paste? */
export function hasClipboard(): boolean {
  return clipboard !== null;
}

/**
 * Applies a `ClipboardEntry` via React Flow setters: deselects the existing
 * nodes (the selection ring follows the paste) and adds the new ones (already
 * `selected: true`) + the new edges. Reused by the toolbar and the shell's
 * keyboard shortcuts.
 */
export function applyClipboardEntry(
  entry: ClipboardEntry,
  setNodes: (updater: (nodes: BlockNodeType[]) => BlockNodeType[]) => void,
  setEdges: (updater: (edges: Edge[]) => Edge[]) => void,
): void {
  setNodes((ns) => [
    ...ns.map((node) => ({ ...node, selected: false })),
    ...entry.nodes,
  ]);
  setEdges((es) => [...es, ...entry.edges]);
}
