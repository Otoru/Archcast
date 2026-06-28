"use client";

import "@xyflow/react/dist/style.css";

import type { Connection, NodeOrigin, Viewport } from "@xyflow/react";
import {
  addEdge,
  Background,
  BackgroundVariant,
  Controls,
  type Edge,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react";
import { useTheme } from "next-themes";
import { type DragEvent, useCallback, useEffect, useMemo } from "react";
import { setCanvasZoom } from "@/components/flow/block-drag-image";
import {
  BlockNode,
  type BlockNode as BlockNodeType,
  InvalidNodesContext,
} from "@/components/flow/block-node";
import { BLOCK_DND_MIME } from "@/components/flow/dnd";
import { useFlowEditor } from "@/components/flow/flow-editor-state";
import {
  buildGraph,
  findInvalidNodeIds,
  isConnectionValid,
} from "@/components/flow/validate-graph";

const nodeTypes = { block: BlockNode };
// Origem do nó no centro: a `position` vira o centro do nó (não o top-left),
// então o nó solta com o cursor no meio — igual ao ghost do drag.
const NODE_ORIGIN: NodeOrigin = [0.5, 0.5];
// Viewport inicial em zoom 1:1. Sem `fitView` no canvas vazio: o RF adia o
// fit inicial e, ao soltar o primeiro nó, enquadraria esse único nó dando um
// zoom abrupto. Fixar zoom 1 mantém o tamanho previsível desde o início.
const DEFAULT_VIEWPORT: Viewport = { x: 0, y: 0, zoom: 1 };

function FlowInner() {
  const { resolvedTheme } = useTheme();
  const colorMode = resolvedTheme === "dark" ? "dark" : "light";
  const { screenToFlowPosition, getViewport, getNode } = useReactFlow<
    BlockNodeType,
    Edge
  >();
  // Estado do editor (nodes/edges/seleção) vive no `FlowEditorProvider` da
  // shell — assim o inspector e o botão Run enxergam o mesmo grafo. Os
  // handlers de change são repassados direto ao `<ReactFlow>`; `getNode`
  // segue do store do RF (`useReactFlow`), evitando closure stale.
  const {
    nodes,
    setNodes,
    onNodesChange,
    edges,
    setEdges,
    onEdgesChange,
    setSelectedNodeId,
  } = useFlowEditor();

  // Publica o zoom atual do canvas no store da imagem de drag, para o ghost
  // aparecer no mesmo tamanho do nó na tela. Inicial no mount + atualizado a
  // cada mudança de viewport (pan/zoom/fitView).
  useEffect(() => {
    setCanvasZoom(getViewport().zoom ?? 1);
  }, [getViewport]);
  const onViewportChange = useCallback((viewport: Viewport) => {
    setCanvasZoom(viewport.zoom ?? 1);
  }, []);

  // Cria a aresta ao soltar uma conexão entre handles. O canal fica
  // codificado nos `sourceHandle`/`targetHandle` (`out-read` → `in-read`);
  // `addEdge` dedupe por par de handles.
  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges],
  );

  // Recusa o drop de conexões inválidas já no arraste (canal incompatível,
  // self-loop, preset sem o canal) — a linha de conexão fica vermelha e a
  // aresta não chega a ser criada. `getNode` vem do store do RF, evitando
  // closure stale sobre os nós.
  const isValidConnection = useCallback(
    (connection: Connection | Edge) => isConnectionValid(connection, getNode),
    [getNode],
  );

  // Validação ao vivo: deriva o conjunto de nós inválidos (em ciclo, ou fonte
  // de aresta estruturalmente inválida) do grafo do motor — pura, sem mutar
  // estado, então não há loop de effect. Recomputado a cada connect/move/
  // delete e entregue aos nós via `InvalidNodesContext`.
  const invalidNodeIds = useMemo(
    () => findInvalidNodeIds(buildGraph(nodes, edges)),
    [nodes, edges],
  );

  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const kind =
        event.dataTransfer.getData(BLOCK_DND_MIME) ||
        event.dataTransfer.getData("text/plain");
      if (!kind) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      const node: BlockNodeType = {
        id: `${kind}-${crypto.randomUUID()}`,
        type: "block",
        position,
        data: { kind, attrs: {} },
      };
      setNodes((current) => [...current, node]);
    },
    [screenToFlowPosition, setNodes],
  );

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: zona de drop do canvas (drag-and-drop, não é widget de teclado)
    <div className="h-full w-full" onDragOver={onDragOver} onDrop={onDrop}>
      <InvalidNodesContext.Provider value={invalidNodeIds}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onSelectionChange={({ nodes: selected }) =>
            setSelectedNodeId(selected.length === 1 ? selected[0].id : null)
          }
          isValidConnection={isValidConnection}
          nodeTypes={nodeTypes}
          nodeOrigin={NODE_ORIGIN}
          colorMode={colorMode}
          onViewportChange={onViewportChange}
          defaultViewport={DEFAULT_VIEWPORT}
          proOptions={{ hideAttribution: true }}
          className="h-full w-full bg-background"
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
          <Controls />
          <MiniMap pannable zoomable />
        </ReactFlow>
      </InvalidNodesContext.Provider>
    </div>
  );
}

/**
 * Canvas React Flow em tela cheia com drag-and-drop da sidebar: arrasta um
 * bloco do catálogo e solta no canvas para criar um nó daquele kind na
 * posição exata. Estado apenas em memória — some no refresh (sem
 * persistência nesta iteração).
 */
export function FlowCanvas() {
  return (
    <ReactFlowProvider>
      <FlowInner />
    </ReactFlowProvider>
  );
}
