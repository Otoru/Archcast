import type { Edge } from "@xyflow/react";
import type { BlockNode as BlockNodeType } from "@/components/flow/block-node";

export type ClipboardEntry = {
  nodes: BlockNodeType[];
  edges: Edge[];
};

// Clipboard de módulo (sem React) — sobrevive entre renders. Não persiste ao
// refresh (clipboard de SO é async/naível p/ JSON); é o "Ctrl+C/Ctrl+V" interno.
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
 * Recria a seleção com ids novos, posições deslocadas em (+dx, +dy) e arestas
 * remapeadas. Os novos nós vêm com `selected: true`; o chamador desmarca os
 * antigos no array substituído (para o anel de seleção acompanhar o colado).
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

/** Copia nós selecionados + arestas entre eles para o clipboard interno. */
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
 * Cola o clipboard com ids novos e offset +20/+20. Retorna null se o clipboard
 * estiver vazio. Novos nós já vêm selecionados; o chamador desmarca os antigos.
 */
export function pasteSelection(): ClipboardEntry | null {
  if (!clipboard) {
    return null;
  }
  return rebindSelection(clipboard, 20, 20);
}

/**
 * Duplica a seleção atual imediatamente (sem passar pelo clipboard). Offset
 * +20/+20, ids novos. Retorna null se nada estiver selecionado.
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

/** Há algo no clipboard pronto para colar? */
export function hasClipboard(): boolean {
  return clipboard !== null;
}

/**
 * Aplica um `ClipboardEntry` via setters do React Flow: desmarca os nós
 * existentes (o anel de seleção acompanha o colado) e adiciona os novos (já
 * vêm `selected:true`) + as arestas novas. Reutilizado pelo toolbar e pelos
 * atalhos de teclado da shell.
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
