"use client";

import "@xyflow/react/dist/style.css";

import {
  addEdge,
  Background,
  BackgroundVariant,
  type Connection,
  Controls,
  type Edge,
  MiniMap,
  type NodeOrigin,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Viewport,
} from "@xyflow/react";
import { useTheme } from "next-themes";
import { type DragEvent, useCallback, useEffect, useMemo } from "react";
import { setCanvasZoom } from "@/components/flow/block-drag-image";
import {
  BlockNode,
  type BlockNode as BlockNodeType,
  InvalidNodesContext,
  RunStateContext,
} from "@/components/flow/block-node";
import { BLOCK_DND_MIME } from "@/components/flow/dnd";
import { FlowEdge } from "@/components/flow/flow-edge";
import { deriveRunState } from "@/components/flow/flow-editor-helpers";
import { useFlowEditor } from "@/components/flow/flow-editor-state";
import {
  buildGraph,
  findInvalidNodeIds,
  isConnectionValid,
} from "@/components/flow/validate-graph";

const nodeTypes = { block: BlockNode };
const edgeTypes = { wf: FlowEdge };
// Node origin at the center: `position` becomes the node center (not top-left),
// so the node drops with the cursor in the middle — matching the drag ghost.
const NODE_ORIGIN: NodeOrigin = [0.5, 0.5];
// Initial viewport at 1:1 zoom. No `fitView` on an empty canvas: RF defers the
// initial fit and, when the first node is dropped, would frame that single
// node causing an abrupt zoom. Pinning zoom 1 keeps the size predictable from the start.
const DEFAULT_VIEWPORT: Viewport = { x: 0, y: 0, zoom: 1 };

function FlowInner() {
  const { resolvedTheme } = useTheme();
  const colorMode = resolvedTheme === "dark" ? "dark" : "light";
  const { screenToFlowPosition, getViewport, getNode, fitView } = useReactFlow<
    BlockNodeType,
    Edge
  >();
  // Editor state (nodes/edges/selection) lives in the shell's
  // `FlowEditorProvider` — so the inspector and the Run button see the same
  // graph. Change handlers are forwarded straight to `<ReactFlow>`; `getNode`
  // comes from the RF store (`useReactFlow`), avoiding stale closures.
  const {
    nodes,
    setNodes,
    onNodesChange,
    edges,
    setEdges,
    onEdgesChange,
    setSelectedNodeId,
    notifyNodeClick,
    verdict,
    running,
    fitViewSignal,
  } = useFlowEditor();

  // Publishes the current canvas zoom to the drag-image store, so the ghost
  // appears at the same size as the node on screen. Set on mount + updated on
  // every viewport change (pan/zoom/fitView).
  useEffect(() => {
    setCanvasZoom(getViewport().zoom ?? 1);
  }, [getViewport]);
  const onViewportChange = useCallback((viewport: Viewport) => {
    setCanvasZoom(viewport.zoom ?? 1);
  }, []);

  // Creates the edge when a connection between handles is dropped. The channel
  // is encoded in `sourceHandle`/`targetHandle` (`out-read` → `in-read`);
  // `addEdge` dedupes by handle pair. Locked during a run (`nodesConnectable`
  // already blocks the drag; this guard is a safety net).
  const onConnect = useCallback(
    (connection: Connection) => {
      if (running) {
        return;
      }
      setEdges((eds) => addEdge(connection, eds));
    },
    [running, setEdges],
  );

  // Rejects dropping invalid connections during the drag (incompatible
  // channel, self-loop, preset without the channel) — the connection line
  // turns red and the edge is never created. `getNode` comes from the RF
  // store, avoiding stale closures over nodes.
  const isValidConnection = useCallback(
    (connection: Connection | Edge) => isConnectionValid(connection, getNode),
    [getNode],
  );

  // Live validation: derives the set of invalid nodes (in a cycle, or the
  // source of a structurally invalid edge) from the engine graph — pure, no
  // state mutation, so there is no effect loop. Recomputed on every connect/
  // move/delete and delivered to nodes via `InvalidNodesContext`.
  const invalidNodeIds = useMemo(
    () => findInvalidNodeIds(buildGraph(nodes, edges)),
    [nodes, edges],
  );

  // Run state (bottleneck, saturated nodes, edge state) derived from the
  // verdict — pure, no `data` mutation, same philosophy as `invalidNodeIds`.
  // Published via `RunStateContext` to nodes (highlight) and the custom edge
  // (color/animation). Recomputed on every verdict change (live recalculation
  // in the provider) or graph change.
  const runState = useMemo(
    () => deriveRunState(verdict, nodes, edges, running),
    [verdict, nodes, edges, running],
  );

  // On entering a run, clear the RF selection (`selected` ring). Since
  // `elementsSelectable={!running}`, RF no longer changes the selection during
  // the run, and clicking a node (via `onNodeClick`) would only update the
  // inspector — leaving the ring frozen on the old node, out of sync. Clearing
  // on entry leaves the canvas ring-free during the run (the inspector indicates
  // the active node). `selected` is not part of `runSignature`, so this does
  // not trigger recalculation.
  useEffect(() => {
    if (!running) return;
    setNodes((current) =>
      current.some((n) => n.selected)
        ? current.map((n) => (n.selected ? { ...n, selected: false } : n))
        : current,
    );
  }, [running, setNodes]);

  // `fitViewSignal` rises from the `FlowEditorProvider` (toolbar/shell) — the
  // toolbar is outside the `ReactFlowProvider`, so it cannot call `fitView`
  // directly; it increments the signal and the canvas (inside the provider) fits.
  // Skips the initial 0 signal to avoid re-framing on mount.
  useEffect(() => {
    if (fitViewSignal <= 0) return;
    fitView({ duration: 200 });
  }, [fitViewSignal, fitView]);

  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (running) {
        return;
      }
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
    [running, screenToFlowPosition, setNodes],
  );

  // Ctrl/Cmd+A selects all nodes. RF does not provide this shortcut natively,
  // so we mark `selected: true` on all of them. Skipped when focus is in a text
  // field (let Ctrl+A select the text, not the nodes).
  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a") {
        const target = event.target as HTMLElement | null;
        const tag = target?.tagName;
        if (
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          target?.isContentEditable
        ) {
          return;
        }
        event.preventDefault();
        setNodes((current) =>
          current.map((node) => ({ ...node, selected: true })),
        );
      }
    },
    [setNodes],
  );

  useEffect(() => {
    globalThis.addEventListener("keydown", onKeyDown);
    return () => globalThis.removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: canvas drop zone (drag-and-drop, not a keyboard widget)
    <div className="h-full w-full" onDragOver={onDragOver} onDrop={onDrop}>
      <InvalidNodesContext.Provider value={invalidNodeIds}>
        <RunStateContext.Provider value={runState}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onSelectionChange={({ nodes: selected }) =>
              setSelectedNodeId(selected.length === 1 ? selected[0].id : null)
            }
            onNodeClick={(_event, node) => {
              // Fires on every click (even on an already-selected node) so the
              // shell reopens/scrolls the inspector to the attributes section —
              // `onSelectionChange` is not enough because re-clicking the same
              // node does not change the selection.
              setSelectedNodeId(node.id);
              notifyNodeClick();
            }}
            isValidConnection={isValidConnection}
            // Run mode locks the structure: no dragging nodes, no starting
            // connections, no keyboard deletion, no selection. The `<Controls>`
            // padlock reflects `isInteractive = nodesDraggable ||
            // nodesConnectable || elementsSelectable` — locking all three
            // closes the padlock (LockIcon). Selection for the inspector
            // continues via `onNodeClick` (does not depend on `elementsSelectable`).
            nodesDraggable={!running}
            nodesConnectable={!running}
            elementsSelectable={!running}
            deleteKeyCode={running ? null : ["Delete", "Backspace"]}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            defaultEdgeOptions={{ type: "wf" }}
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
        </RunStateContext.Provider>
      </InvalidNodesContext.Provider>
    </div>
  );
}

/**
 * Full-screen React Flow canvas with sidebar drag-and-drop: drag a block from
 * the catalog and drop it on the canvas to create a node of that kind at the
 * exact position. State lives in `FlowEditorProvider` and persists via
 * localStorage / JSON export-import (managed by the shell).
 */
export function FlowCanvas() {
  return (
    <ReactFlowProvider>
      <FlowInner />
    </ReactFlowProvider>
  );
}
