"use client";

import "@xyflow/react/dist/style.css";

import type { NodeOrigin, Viewport } from "@xyflow/react";
import {
  Background,
  BackgroundVariant,
  Controls,
  type Edge,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import { useTheme } from "next-themes";
import { type DragEvent, useCallback, useEffect } from "react";
import { setCanvasZoom } from "@/components/flow/block-drag-image";
import {
  BlockNode,
  type BlockNode as BlockNodeType,
} from "@/components/flow/block-node";
import { BLOCK_DND_MIME } from "@/components/flow/dnd";

const nodeTypes = { block: BlockNode };
// Origem do nó no centro: a `position` vira o centro do nó (não o top-left),
// então o nó solta com o cursor no meio — igual ao ghost do drag.
const NODE_ORIGIN: NodeOrigin = [0.5, 0.5];

function FlowInner() {
  const { resolvedTheme } = useTheme();
  const colorMode = resolvedTheme === "dark" ? "dark" : "light";
  const { screenToFlowPosition, getViewport } = useReactFlow<
    BlockNodeType,
    Edge
  >();
  const [nodes, setNodes, onNodesChange] = useNodesState<BlockNodeType>([]);
  const [edges, , onEdgesChange] = useEdgesState<Edge>([]);

  // Publica o zoom atual do canvas no store da imagem de drag, para o ghost
  // aparecer no mesmo tamanho do nó na tela. Inicial no mount + atualizado a
  // cada mudança de viewport (pan/zoom/fitView).
  useEffect(() => {
    setCanvasZoom(getViewport().zoom ?? 1);
  }, [getViewport]);
  const onViewportChange = useCallback((viewport: Viewport) => {
    setCanvasZoom(viewport.zoom ?? 1);
  }, []);

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
        data: { kind },
      };
      setNodes((current) => [...current, node]);
    },
    [screenToFlowPosition, setNodes],
  );

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: zona de drop do canvas (drag-and-drop, não é widget de teclado)
    <div className="h-full w-full" onDragOver={onDragOver} onDrop={onDrop}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        nodeOrigin={NODE_ORIGIN}
        colorMode={colorMode}
        onViewportChange={onViewportChange}
        fitView
        proOptions={{ hideAttribution: true }}
        className="h-full w-full bg-background"
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        <Controls />
        <MiniMap pannable zoomable />
      </ReactFlow>
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
