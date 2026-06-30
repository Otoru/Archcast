"use client";

import dynamic from "next/dynamic";
import {
  type DragEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppSidebar } from "@/components/flow/app-sidebar";
import { BLOCK_DND_MIME } from "@/components/flow/dnd";
import {
  FlowEditorProvider,
  useFlowEditor,
} from "@/components/flow/flow-editor-state";
import { FlowInspector } from "@/components/flow/flow-inspector";
import { handleShortcutKey } from "@/components/flow/flow-shortcuts";
import { FlowToolbar } from "@/components/flow/flow-toolbar";
import {
  readStoredGraph,
  writeStoredGraph,
} from "@/components/flow/graph-persistence";
import { SidebarProvider } from "@/components/ui/sidebar";

// Canvas mede o viewport; carrega só no cliente (Next 16 exige ssr:false
// dentro de um Client Component — esta shell é client).
const FlowCanvas = dynamic(
  () => import("@/components/flow/flow-canvas").then((m) => m.FlowCanvas),
  { ssr: false },
);

const AUTOSAVE_DEBOUNCE_MS = 400;

/**
 * Layout interno (dentro do `FlowEditorProvider`): header com toolbar + canvas
 * (sidebar esquerda de paleta + painel direito inspector são siblings do
 * `<main>` dentro do `SidebarProvider`). Consome `useFlowEditor` para disparar a
 * simulação (Run/Stop), orquestrar o inspector e persistir o grafo.
 */
function ShellLayout() {
  const {
    running,
    startRun,
    stopRun,
    selectedNodeId,
    nodeClickNonce,
    history,
    applyGraph,
    requestFitView,
    nodes,
    edges,
    params,
    setNodes,
    setEdges,
  } = useFlowEditor();

  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [inspectorValue, setInspectorValue] = useState<string[]>(["node"]);
  const [helpOpen, setHelpOpen] = useState(false);
  // Contador incrementado a cada Run: alimenta `scrollToVerdictSignal` do
  // inspector, que rola a seção Verdict para dentro da vista ao rodar.
  const [runStartNonce, setRunStartNonce] = useState(0);
  // `running` e `selectedNodeId` lidos via ref dentro do efeito de clique-em-nó:
  // durante o run o inspector fica travado no Verdict, então clicar num nó (que
  // ainda seleciona no canvas) NÃO reabre a seção Node. Refs em vez de deps pra o
  // efeito só rodar no clique (nonce), não quando `running`/`selectedNodeId` mudem.
  const runningRef = useRef(running);
  runningRef.current = running;
  const selectedNodeIdRef = useRef(selectedNodeId);
  selectedNodeIdRef.current = selectedNodeId;

  // Run inicia o modo run (lock + efeito nas edges + recálculo ao vivo) E
  // abre o inspector já na seção Verdict — a toolbar mora no header (fora do
  // painel), então puxamos o painel pra mostrar o resultado sem o usuário
  // precisar abrir/rolar manualmente. O `runStartNonce` dispara a rolagem até o
  // Verdict (caso o painel estivesse rolado lá embaixo).
  const handleRun = useCallback(() => {
    setInspectorOpen(true);
    setInspectorValue(["verdict"]);
    setRunStartNonce((n) => n + 1);
    startRun();
  }, [startRun]);

  // Durante o run o accordion fica travado no Verdict: a shell ignora qualquer
  // troca de seção vinda do `onValueChange` (valor controlado não muda). Em
  // idle repassa normalmente.
  const handleInspectorValueChange = useCallback(
    (next: string[]) => {
      if (running) return;
      setInspectorValue(next);
    },
    [running],
  );

  // Clicar num nó no canvas abre o inspector já na seção de atributos (Node).
  // Observa `nodeClickNonce` (não só `selectedNodeId`) para reagir a CADA
  // clique — reclicar o nó já selecionado não muda o id, mas deve reabrir a
  // seção Node mesmo assim (ex.: depois de um Run que mudou para Verdict). No
  // run o efeito é no-op (ficamos no Verdict travado). `nodeClickNonce === 0`
  // é o mount (sem clique) — aí não abrimos nada.
  useEffect(() => {
    if (nodeClickNonce === 0) return;
    if (runningRef.current) return;
    if (selectedNodeIdRef.current) {
      setInspectorOpen(true);
      setInspectorValue(["node"]);
    }
  }, [nodeClickNonce]);

  // Restore de mount — recupera o último grafo salvo do localStorage (auto-save)
  // e faz dele o **baseline** do histórico (`replaceCurrent`), então undo não
  // reverte pra tela vazia. `applyGraph` dispara o efeito observador do
  // histórico, mas o commit echo é descartado (snapshot == present após o
  // replaceCurrent). Todas as deps são callbacks estáveis (useCallback), então
  // o efeito roda só no mount.
  const { replaceCurrent } = history;
  useEffect(() => {
    const doc = readStoredGraph();
    if (!doc) return;
    applyGraph(doc);
    replaceCurrent({
      nodes: doc.nodes,
      edges: doc.edges,
      params: doc.params,
    });
    requestFitView();
  }, [applyGraph, replaceCurrent, requestFitView]);

  // Auto-save debounced: 400ms após qualquer mudança (nó/aresta/param/posição),
  // grava no localStorage. Não salva durante o run (evita churn do recálculo).
  useEffect(() => {
    if (running) return;
    const timer = setTimeout(() => {
      writeStoredGraph(nodes, edges, params);
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [nodes, edges, params, running]);

  // Atalhos de teclado (undo/redo/copy/paste/duplicate/run-toggle/help). Lidos
  // via ref pra o listener ser registrado uma vez só e sempre ver estado fresco.
  // Ctrl+A e Delete continuam no `FlowCanvas` (teclas diferentes, sem conflito).
  const shortcutsRef = useRef({
    running,
    nodes,
    edges,
    history,
    setNodes,
    setEdges,
    handleRun,
    stopRun,
    setHelpOpen,
  });
  shortcutsRef.current = {
    running,
    nodes,
    edges,
    history,
    setNodes,
    setEdges,
    handleRun,
    stopRun,
    setHelpOpen,
  };
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) {
        return;
      }
      const consumed = handleShortcutKey(
        {
          key: event.key,
          mod: event.ctrlKey || event.metaKey,
          shift: event.shiftKey,
        },
        shortcutsRef.current,
      );
      if (consumed) {
        event.preventDefault();
      }
    };
    globalThis.addEventListener("keydown", onKeyDown);
    return () => globalThis.removeEventListener("keydown", onKeyDown);
  }, []);

  // Aceita o drop-effect "move" em toda a shell durante o arraste de um bloco
  // — sem isso, o cursor vira 🚫 (no-drop) ao cruzar a sidebar/header, já que
  // só o canvas dá `preventDefault` no `dragover`. A criação do nó continua só
  // no `onDrop` do canvas; aqui só mantemos o cursor de "mover" consistente.
  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (event.dataTransfer.types.includes(BLOCK_DND_MIME)) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    }
  }, []);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: cursor do drag-and-drop (não é widget de teclado)
    <div className="h-dvh w-full overflow-hidden" onDragOver={onDragOver}>
      <SidebarProvider className="h-full w-full" style={{ minHeight: 0 }}>
        <AppSidebar />
        <main className="flex h-full flex-1 flex-col overflow-hidden">
          <FlowToolbar
            inspectorOpen={inspectorOpen}
            onToggleInspector={() => setInspectorOpen((v) => !v)}
            onRun={handleRun}
            helpOpen={helpOpen}
            onHelpChange={setHelpOpen}
          />
          <div className="relative flex-1 overflow-hidden">
            <FlowCanvas />
          </div>
        </main>
        <FlowInspector
          open={inspectorOpen}
          value={inspectorValue}
          onValueChange={handleInspectorValueChange}
          scrollTopSignal={nodeClickNonce}
          locked={running}
          scrollToVerdictSignal={runStartNonce}
        />
      </SidebarProvider>
    </div>
  );
}

/**
 * Shell de layout da home: header com toolbar (File/Presets/Edit/Help +
 * Run/Stop + toggles) + canvas React Flow em tela cheia + sidebar shadcn
 * esquerda (paleta, colapsável offcanvas) + painel direito (inspector de
 * attrs/params/veredito). O `FlowEditorProvider` envolve tudo para que paleta,
 * canvas, inspector e toolbar compartilhem o mesmo estado. O grafo persiste
 * automaticamente no localStorage ao refresh; export/import de JSON trocam
 * grafos entre sessões.
 */
export function FlowShell() {
  return (
    <FlowEditorProvider>
      <ShellLayout />
    </FlowEditorProvider>
  );
}
