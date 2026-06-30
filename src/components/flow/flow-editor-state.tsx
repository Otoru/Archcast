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
import type { LoadedGraph } from "@/components/flow/graph-serialization";
import {
  type HistoryApi,
  useEditorHistory,
} from "@/components/flow/use-editor-history";
import { useSimulateWorker } from "@/components/flow/use-simulate-worker";
import { buildGraph } from "@/components/flow/validate-graph";
import type { ChallengeParams, Verdict } from "@/engine";

/** Applicable shape: nodes + edges (RF) + params. Same shape as `LoadedGraph` (loaded graph). */
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
   * Counter that increments on every click on a canvas node — even when the
   * clicked node was already the selected one. The shell observes this to
   * reopen the inspector's attributes section on every click (changing only
   * `selectedNodeId` would not fire, since clicking the same node does not
   * change the id).
   */
  nodeClickNonce: number;
  notifyNodeClick: () => void;
  params: ChallengeParams;
  setParams: Dispatch<SetStateAction<ChallengeParams>>;
  verdict: Verdict | null;
  verdictError: string | null;
  /**
   * Active run mode: structure locked, edges with effects, verdict recalculates
   * on every attr change. `false` when idle or after Stop (frozen verdict).
   */
  running: boolean;
  /** True while the verdict is being computed in the worker (button spinner). */
  computing: boolean;
  startRun: () => void;
  stopRun: () => void;
  /** Undo/redo history (full snapshot, including positions). */
  history: HistoryApi;
  /** Applies a graph (nodes/edges/params) at once — used by undo/redo, loaders and Clear. */
  applyGraph: (graph: ApplyableGraph) => void;
  /** Monotonic signal that triggers `fitView()` on the canvas (which is inside the ReactFlowProvider). */
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
 * Owner of the flow editor state: React Flow state (nodes/edges + change
 * handlers), selected node, challenge parameters, the verdict from the last
 * simulation and run mode (`running`/`computing` + `startRun`/`stopRun`).
 * Wrap the entire shell (palette + canvas + inspector) so that everyone
 * shares the same source of truth — the canvas reads/writes nodes and edges,
 * the inspector reads/writes attrs/params, the shell triggers `startRun`/`stopRun`.
 *
 * `useNodesState`/`useEdgesState` are plain `useState` (no `ReactFlowProvider`
 * needed); the canvas's `useReactFlow()` stays inside the RF provider in
 * `FlowCanvas`, so nothing changes there.
 *
 * The simulation runs in a **web worker** (`useSimulateWorker`) off the main
 * thread — the spinner (`computing`) appears before the block and large graphs
 * do not freeze the UI. `buildGraph` stays on the main thread (cheap, already
 * computed per render during live validation). The history (`useEditorHistory`)
 * snapshots the full graph (with positions) and exposes undo/redo; `applyGraph`
 * is the single entry point for undo/redo, loaders (import/preset/share) and
 * Clear.
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

  // Applies a graph (nodes/edges/params) at once. Stable — used as a dep by
  // undo/redo (useEditorHistory) and by the shell's loaders/Clear. `setSelected`
  // is not touched: the snapshot already comes with `selected:false` (dropped
  // on history commit / on deserialize), leaving the canvas ring-free after applying.
  const applyGraph = useCallback(
    (graph: ApplyableGraph) => {
      setNodes(graph.nodes);
      setEdges(graph.edges);
      setParams(graph.params);
    },
    [setNodes, setEdges],
  );

  const history = useEditorHistory(applyGraph);

  // Graph + params signature: live recalculation only fires when what matters
  // changes (kind/attrs/edges/params). Selection and position (which mutate the
  // nodes array without changing the graph) are NOT part of the signature —
  // avoiding recomputing the verdict when clicking/moving a node during a run.
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

  // Simulation worker: lazy singleton, synchronous fallback in SSR/build/
  // jsdom. `CycleError` arrives as an `isCycle` flag (the class does not cross
  // the structured-clone boundary). Callbacks are read via ref in the hook, so
  // they always see the freshest state even though the effect captures `run`
  // (which is stable).
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

  // Live recalculation: while `running`, any change to the signature
  // (attr edit, new structure) recomputes the verdict **in the worker**.
  // `setComputing(true)` paints the spinner before the postMessage; `onSettled`
  // turns it off. `reqId` in the hook discards results from superseded runs.
  // CycleError exits run mode — invalid structure cannot be "run".
  //
  // The signature (not the raw arrays) is the trigger: it excludes
  // selection/position, so clicking or moving a node (mutates the `nodes`
  // array but not the graph) does NOT trigger recalculation. Graph and params
  // are kept in refs (always fresh, read only when the effect fires). The
  // `lastPostedSigRef` guard avoids re-posting for the same signature (e.g.
  // Stop→Run with no edits) — the displayed verdict is already correct for
  // that signature, so re-posting would be wasted work.
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

  // History observer: on every real change to nodes/edges/params, schedules a
  // debounced commit (bursts of drags coalesce into one step). `commit` drops
  // echoes (post-apply/undo/restore the snapshot is identical to present) and
  // selection-only changes (selected is dropped from the snapshot) — so there
  // is no phantom step. Mount becomes the baseline (presentRef null → no push).
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

// Re-exported for consumers that build GraphDocument snapshots.
export type { GraphDocument } from "@/components/flow/graph-serialization";
