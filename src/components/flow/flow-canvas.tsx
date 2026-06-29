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
  const { screenToFlowPosition, getViewport, getNode, fitView } = useReactFlow<
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
    notifyNodeClick,
    verdict,
    running,
    fitViewSignal,
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
  // `addEdge` dedupe por par de handles. Travado durante o run (`nodesConnect
  // able` já bloqueia o arraste; o guard é rede de segurança).
  const onConnect = useCallback(
    (connection: Connection) => {
      if (running) {
        return;
      }
      setEdges((eds) => addEdge(connection, eds));
    },
    [running, setEdges],
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

  // Estado de run (bottleneck, saturados, estado das edges) derivado do
  // veredito — pura, sem mutar `data`, mesma filosofia do `invalidNodeIds`.
  // Publicado via `RunStateContext` para os nós (destaque) e a edge custom
  // (cor/animação). Recomputado a cada mudança de veredito (recálculo ao vivo
  // do provider) ou de grafo.
  const runState = useMemo(
    () => deriveRunState(verdict, nodes, edges, running),
    [verdict, nodes, edges, running],
  );

  // Ao entrar no run, limpa a seleção do RF (anel `selected`). Como
  // `elementsSelectable={!running}`, o RF não troca mais a seleção durante o
  // run, e clicar um nó (via `onNodeClick`) mudaria só o inspector — deixando
  // o anel congelado no nó antigo, fora de sincronia. Limpar na entrada deixa
  // o canvas sem anel durante o run (o inspector indica o nó ativo). `selected`
  // não entra na `runSignature`, então não dispara recálculo.
  useEffect(() => {
    if (!running) return;
    setNodes((current) =>
      current.some((n) => n.selected)
        ? current.map((n) => (n.selected ? { ...n, selected: false } : n))
        : current,
    );
  }, [running, setNodes]);

  // `fitViewSignal` sobe do `FlowEditorProvider` (toolbar/shell) — a toolbar
  // está fora do `ReactFlowProvider`, então ela não pode chamar `fitView`
  // diretamente; incrementa o sinal e o canvas (dentro do provider) enquadra.
  // Pula o sinal inicial 0 pra não re-enquadrar no mount.
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

  // Ctrl/Cmd+A seleciona todos os nós. O RF não traz esse atalho nativo, então
  // marcamos `selected: true` em todos. Ignora quando o foco está num campo de
  // texto (deixa o Ctrl+A selecionar o texto, não os nós).
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
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: zona de drop do canvas (drag-and-drop, não é widget de teclado)
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
              // Dispara a cada clique (mesmo no nó já selecionado) para a shell
              // reabrir/rolar o inspector na seção de atributos — `onSelection
              // Change` não basta porque reclicar o mesmo nó não muda a seleção.
              setSelectedNodeId(node.id);
              notifyNodeClick();
            }}
            isValidConnection={isValidConnection}
            // Modo run trava a estrutura: sem arrastar nodes, sem iniciar
            // conexões, sem apagar por teclado, sem selecionar. O cadeado do
            // `<Controls>` reflete `isInteractive = nodesDraggable ||
            // nodesConnectable || elementsSelectable` — travar os três fecha o
            // cadeado (LockIcon). A seleção para o inspector continua via
            // `onNodeClick` (não depende de `elementsSelectable`).
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
 * Canvas React Flow em tela cheia com drag-and-drop da sidebar: arrasta um
 * bloco do catálogo e solta no canvas para criar um nó daquele kind na
 * posição exata. O estado vive no `FlowEditorProvider` e persiste via
 * localStorage / export-import JSON (gerenciado pela shell).
 */
export function FlowCanvas() {
  return (
    <ReactFlowProvider>
      <FlowInner />
    </ReactFlowProvider>
  );
}
