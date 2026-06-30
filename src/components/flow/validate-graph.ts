import type { Connection, Edge } from "@xyflow/react";
import type { BlockNode as BlockNodeType } from "@/components/flow/block-node";
import { getPreset, validateEdges } from "@/engine";
import type { EdgeChannel, Graph } from "@/engine/types";

const CHANNELS: readonly EdgeChannel[] = ["read", "write", "async"];

/**
 * Extrai o `EdgeChannel` codificado no `id` de um Handle (`in-read`,
 * `out-write`, `out-async`...). Devolve `undefined` se o handle não existir
 * ou o sufixo não for um canal válido — sinalizando uma conexão que não
 * pertence ao modelo do motor.
 */
export function channelFromHandle(
  handleId: string | null | undefined,
): EdgeChannel | undefined {
  if (!handleId) {
    return undefined;
  }
  let suffix = handleId;
  if (handleId.startsWith("in-")) {
    suffix = handleId.slice(3);
  } else if (handleId.startsWith("out-")) {
    suffix = handleId.slice(4);
  }
  return CHANNELS.find((channel) => channel === suffix);
}

/**
 * Traduz o estado do React Flow para o `Graph` do motor: RF node →
 * `NodeInstance` (kind em `data.kind`), RF edge → `Edge` (canal derivado do
 * `sourceHandle`). Arestas cujo canal não resolvable são descartadas — elas
 * não representam um fluxo modelado e não devem ir à validação.
 */
export function buildGraph(nodes: BlockNodeType[], edges: Edge[]): Graph {
  return {
    nodes: nodes.map((node) => ({
      id: node.id,
      kind: node.data.kind,
      attrs: node.data.attrs ?? {},
    })),
    edges: edges
      .map((edge) => {
        const kind = channelFromHandle(edge.sourceHandle);
        if (!kind) {
          return null;
        }
        return {
          id: edge.id,
          from: edge.source,
          to: edge.target,
          kind,
        };
      })
      .filter((edge): edge is NonNullable<typeof edge> => edge !== null),
  };
}

/**
 * Decide se uma conexão em andamento pode ser completada, consultando os
 * presets dos nós envolvidos — usado pelo `isValidConnection` do React Flow
 * para recusar o drop (linha vermelha) **antes** de criar a aresta.
 *
 * Regras: sem self-loop; canal do source (`out-foo`) deve existir e igualar o
 * do target (`in-foo`); ambos os presets devem existir; o canal deve estar em
 * `fromPreset.edges.out` E em `toPreset.edges.in`.
 */
export function isConnectionValid(
  connection: Connection | Edge,
  getNode: (id: string) => BlockNodeType | undefined,
): boolean {
  const { source, target, sourceHandle, targetHandle } = connection;
  if (!source || !target || source === target) {
    return false;
  }

  const outChannel = channelFromHandle(sourceHandle);
  const inChannel = channelFromHandle(targetHandle);
  if (!outChannel || !inChannel || outChannel !== inChannel) {
    return false;
  }

  const srcNode = getNode(source);
  const tgtNode = getNode(target);
  if (!srcNode || !tgtNode) {
    return false;
  }

  const srcPreset = getPreset(srcNode.data.kind);
  const tgtPreset = getPreset(tgtNode.data.kind);
  if (!srcPreset || !tgtPreset) {
    return false;
  }

  return (
    srcPreset.edges.out.includes(outChannel) &&
    tgtPreset.edges.in.includes(inChannel)
  );
}

/**
 * Encontra o conjunto de nós que participam de um ciclo via SCC de Tarjan
 * (componentes fortemente conexos de tamanho ≥ 2 = ciclo). Self-loops
 * (`from === to`) também marcam o nó. O(V+E), suficiente para um canvas.
 */
function findCycleNodeIds(graph: Graph): Set<string> {
  const ids = graph.nodes.map((node) => node.id);
  const adj = new Map<string, string[]>(ids.map((id) => [id, []]));
  for (const edge of graph.edges) {
    if (!adj.has(edge.from) || !adj.has(edge.to)) {
      continue;
    }
    adj.get(edge.from)?.push(edge.to);
  }

  const indexMap = new Map<string, number>();
  const lowlink = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  let index = 0;
  const cyclic = new Set<string>();

  const strongconnect = (v: string) => {
    indexMap.set(v, index);
    lowlink.set(v, index);
    index += 1;
    stack.push(v);
    onStack.add(v);

    for (const w of adj.get(v) ?? []) {
      if (w === v) {
        cyclic.add(v); // self-loop explícito
        continue;
      }
      if (!indexMap.has(w)) {
        strongconnect(w);
        lowlink.set(v, Math.min(lowlink.get(v) ?? 0, lowlink.get(w) ?? 0));
      } else if (onStack.has(w)) {
        lowlink.set(v, Math.min(lowlink.get(v) ?? 0, indexMap.get(w) ?? 0));
      }
    }

    if (lowlink.get(v) === indexMap.get(v)) {
      const component: string[] = [];
      let w: string;
      do {
        w = stack.pop() as string;
        onStack.delete(w);
        component.push(w);
      } while (w !== v);
      if (component.length > 1) {
        for (const id of component) {
          cyclic.add(id);
        }
      }
    }
  };

  for (const id of ids) {
    if (!indexMap.has(id)) {
      strongconnect(id);
    }
  }

  return cyclic;
}

/**
 * Conjunto de nós a marcar como inválidos no canvas: (1) nós-fonte de arestas
 * estruturalmente inválidas segundo o motor (`validateEdges`, rede de
 * segurança — normalmente vazio porque `isValidConnection` já bloqueou o
 * drop) e (2) nós que participam de um ciclo. Derivação pura, sem efeitos
 * colaterais — segura para rodar num `useMemo` a cada mudança de estado.
 */
export function findInvalidNodeIds(graph: Graph): Set<string> {
  const invalid = new Set<string>();
  for (const violation of validateEdges(graph)) {
    if (violation.nodeId) {
      invalid.add(violation.nodeId);
    }
  }
  for (const id of findCycleNodeIds(graph)) {
    invalid.add(id);
  }
  return invalid;
}
