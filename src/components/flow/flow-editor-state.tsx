"use client";

import {
  type Edge,
  type OnEdgesChange,
  type OnNodesChange,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import {
  createContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { BlockNode as BlockNodeType } from "@/components/flow/block-node";
import { defaultChallengeParams } from "@/components/flow/flow-editor-helpers";
import type {
  GraphDocument,
  LoadedGraph,
} from "@/components/flow/graph-serialization";
import {
  type HistoryApi,
  useEditorHistory,
} from "@/components/flow/use-editor-history";
import { useSimulateWorker } from "@/components/flow/use-simulate-worker";
import { buildGraph } from "@/components/flow/validate-graph";
import type { ChallengeParams, Verdict } from "@/engine";

/** Shape aplicável: nós + arestas (RF) + params. Mesmo shape do `LoadedGraph` (grafo carregado). */
export type ApplyableGraph = LoadedGraph;

export type FlowEditorState = {
  nodes: BlockNodeType[];
  setNodes: Dispatch<SetStateAction<BlockNodeType[]>>;
  onNodesChange: OnNodesChange<BlockNodeType>;
  edges: Edge[];
  setEdges: Dispatch<SetStateAction<Edge[]>>;
  onEdgesChange: OnEdgesChange<Edge>;
  selectedNodeId: string | null;
  setSelectedNodeId: Dispatch<SetStateAction<string | null>>;
  /**
   * Contador que incrementa a cada clique em um nó no canvas — mesmo quando o
   * nó clicado já era o selecionado. A shell observa isto para reabrir o
   * inspector na seção de atributos a cada clique (mudar só `selectedNodeId`
   * não dispararia, já que clicar no mesmo nó não muda o id).
   */
  nodeClickNonce: number;
  notifyNodeClick: () => void;
  params: ChallengeParams;
  setParams: Dispatch<SetStateAction<ChallengeParams>>;
  verdict: Verdict | null;
  verdictError: string | null;
  /**
   * Modo run ativo: estrutura travada, edges com efeito, veredito recalcula a
   * cada mudança de attrs. `false` em idle ou após Stop (veredito congelado).
   */
  running: boolean;
  /** True durante a computação do veredito no worker (spinner do botão). */
  computing: boolean;
  startRun: () => void;
  stopRun: () => void;
  /** Histórico undo/redo (snapshot completo, incluindo posições). */
  history: HistoryApi;
  /** Aplica um grafo (nós/arestas/params) de uma vez — usado por undo/redo, loaders e Clear. */
  applyGraph: (graph: ApplyableGraph) => void;
  /** Sinal monótono que dispara `fitView()` no canvas (que está dentro do ReactFlowProvider). */
  fitViewSignal: number;
  requestFitView: () => void;
};

const FlowEditorContext = createContext<FlowEditorState | null>(null);

export function useFlowEditor(): FlowEditorState {
  const ctx = useContext(FlowEditorContext);
  if (!ctx) {
    throw new Error(
      "useFlowEditor deve ser usado dentro de FlowEditorProvider",
    );
  }
  return ctx;
}

type FlowEditorProviderProps = {
  children: ReactNode;
  initialNodes?: BlockNodeType[];
  initialEdges?: Edge[];
  initialParams?: ChallengeParams;
  initialVerdict?: Verdict | null;
  initialVerdictError?: string | null;
  initialSelectedNodeId?: string | null;
  initialRunning?: boolean;
};

/**
 * Dono do estado do editor de fluxo: estado do React Flow (nodes/edges +
 * handlers de change), nó selecionado, parâmetros do desafio, veredito da
 * última simulação e modo run (`running`/`computing` + `startRun`/`stopRun`).
 * Envolva a shell inteira (paleta + canvas + inspector) para que todos
 * compartilhem a mesma fonte de verdade — o canvas lê/escreve nodes e edges,
 * o inspector lê/escreve attrs/params, a shell dispara `startRun`/`stopRun`.
 *
 * `useNodesState`/`useEdgesState` são `useState` puro (não precisam de
 * `ReactFlowProvider`); o `useReactFlow()` do canvas continua dentro do
 * provider do RF em `FlowCanvas`, então nada muda lá.
 *
 * A simulação roda num **web worker** (`useSimulateWorker`) fora da main thread
 * — o spinner (`computing`) aparece antes do bloqueio e grafos grandes não
 * travam a UI. `buildGraph` fica na main thread (barato, já calculado por
 * render na validação ao vivo). O histórico (`useEditorHistory`) snapshotia o
 * grafo completo (com posições) e expõe undo/redo; `applyGraph` é a entrada
 * única para undo/redo, loaders (import/preset/share) e Clear.
 */
export function FlowEditorProvider({
  children,
  initialNodes,
  initialEdges,
  initialParams,
  initialVerdict = null,
  initialVerdictError = null,
  initialSelectedNodeId = null,
  initialRunning = false,
}: Readonly<FlowEditorProviderProps>) {
  const [nodes, setNodes, onNodesChange] = useNodesState<BlockNodeType>(
    initialNodes ?? [],
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(
    initialEdges ?? [],
  );
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
    initialSelectedNodeId,
  );
  const [nodeClickNonce, setNodeClickNonce] = useState(0);
  const notifyNodeClick = useCallback(() => {
    setNodeClickNonce((n) => n + 1);
  }, []);
  const [params, setParams] = useState<ChallengeParams>(
    initialParams ?? defaultChallengeParams(),
  );
  const [verdict, setVerdict] = useState<Verdict | null>(initialVerdict);
  const [verdictError, setVerdictError] = useState<string | null>(
    initialVerdictError,
  );
  const [running, setRunning] = useState(initialRunning);
  const [computing, setComputing] = useState(false);
  const [fitViewSignal, setFitViewSignal] = useState(0);

  const startRun = useCallback(() => setRunning(true), []);
  const stopRun = useCallback(() => setRunning(false), []);
  const requestFitView = useCallback(() => setFitViewSignal((n) => n + 1), []);

  // Aplica um grafo (nós/arestas/params) de uma vez. Estável — usado como dep de
  // undo/redo (useEditorHistory) e pelos loaders/Clear da shell. `setSelected`
  // não é tocado: o snapshot já vem com `selected:false` (descartado no commit
  // do histórico / no deserialize), deixando o canvas sem anel após aplicar.
  const applyGraph = useCallback(
    (graph: ApplyableGraph) => {
      setNodes(graph.nodes);
      setEdges(graph.edges);
      setParams(graph.params);
    },
    [setNodes, setEdges],
  );

  const history = useEditorHistory(applyGraph);

  // Assinatura do grafo + params: recálculo ao vivo só dispara quando o que
  // importa muda (kind/attrs/edges/params). Seleção e posição (que mutam o
  // array de nodes sem mudar o grafo) NÃO entram na assinatura — evita
  // recalcular o veredito ao clicar/mover um nó durante o run.
  const runSignature = useMemo(() => {
    const ns = nodes
      .map(
        (n) => `${n.id}|${n.data.kind}|${JSON.stringify(n.data.attrs ?? {})}`,
      )
      .join(";");
    const es = edges
      .map(
        (e) =>
          `${e.id}|${e.source}|${e.target}|${e.sourceHandle ?? ""}|${e.targetHandle ?? ""}`,
      )
      .join(";");
    return `${ns}||${es}||${JSON.stringify(params)}`;
  }, [nodes, edges, params]);

  // Worker de simulação: singleton preguiçoso, fallback síncrono em SSR/build/
  // jsdom. `CycleError` chega como flag `isCycle` (a classe não atravessa a
  // fronteira de clone estrutural). Os callbacks são lidos via ref no hook, então
  // sempre veem o estado mais fresco apesar do efeito capturar `run` (estável).
  const simulateWorker = useSimulateWorker({
    onResult: (next) => {
      setVerdict(next);
      setVerdictError(null);
    },
    onError: (message, isCycle) => {
      setVerdict(null);
      setVerdictError(
        isCycle
          ? "Graph has a cycle — remove an edge to run the simulation."
          : message,
      );
      setRunning(false);
    },
    onSettled: () => setComputing(false),
  });

  // Recálculo ao vivo: enquanto `running`, qualquer mudança na assinatura
  // (edit de attrs, nova estrutura) recalcula o veredito **no worker**.
  // `setComputing(true)` pinta o spinner antes do postMessage; `onSettled`
  // desliga. `reqId` no hook descarta resultados de execuções superseded.
  // CycleError sai do modo run — estrutura inválida não dá pra "rodar".
  //
  // A assinatura (não os arrays crus) é o gatilho: ela exclui seleção/posição,
  // então clicar ou mover um nó (muta o array de `nodes` mas não o grafo) NÃO
  // dispara recálculo. Grafo e params ficam em refs (sempre frescos, lidos só
  // quando o efeito dispara). O guard `lastPostedSigRef` evita postar de novo
  // pra a mesma assinatura (ex.: Stop→Run sem edits) — o veredito exibido já é
  // o correto praquela assinatura, então re-postar seria trabalho descartável.
  const { run: runSim } = simulateWorker;
  const graphRef = useRef<ReturnType<typeof buildGraph>>(
    buildGraph(nodes, edges),
  );
  graphRef.current = buildGraph(nodes, edges);
  const paramsRef = useRef(params);
  paramsRef.current = params;
  const lastPostedSigRef = useRef<string | null>(null);
  useEffect(() => {
    if (!running) {
      return;
    }
    if (lastPostedSigRef.current === runSignature) {
      return;
    }
    lastPostedSigRef.current = runSignature;
    setComputing(true);
    runSim(graphRef.current, paramsRef.current);
  }, [running, runSignature, runSim]);

  // Observador do histórico: a cada mudança real em nodes/edges/params, agenda
  // um commit debounced (rajadas de arraste coalescem num passo). `commit`
  // descarta echoes (pós-apply/undo/restore o snapshot é idêntico ao present) e
  // mudanças só de seleção (selected é descartado do snapshot) — então não há
  // passo fantasma. O mount vira baseline (presentRef null → sem push).
  const { pushHistory } = history;
  useEffect(() => {
    pushHistory({ nodes, edges, params });
  }, [nodes, edges, params, pushHistory]);

  const value = useMemo<FlowEditorState>(
    () => ({
      nodes,
      setNodes,
      onNodesChange,
      edges,
      setEdges,
      onEdgesChange,
      selectedNodeId,
      setSelectedNodeId,
      nodeClickNonce,
      notifyNodeClick,
      params,
      setParams,
      verdict,
      verdictError,
      running,
      computing,
      startRun,
      stopRun,
      history,
      applyGraph,
      fitViewSignal,
      requestFitView,
    }),
    [
      nodes,
      setNodes,
      onNodesChange,
      edges,
      setEdges,
      onEdgesChange,
      selectedNodeId,
      nodeClickNonce,
      notifyNodeClick,
      params,
      verdict,
      verdictError,
      running,
      computing,
      startRun,
      stopRun,
      history,
      applyGraph,
      fitViewSignal,
      requestFitView,
    ],
  );

  return (
    <FlowEditorContext.Provider value={value}>
      {children}
    </FlowEditorContext.Provider>
  );
}

// Re-exportado pra consumidores que montam snapshots de GraphDocument.
export type { GraphDocument };
