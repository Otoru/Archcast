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
  useMemo,
  useState,
} from "react";
import type { BlockNode as BlockNodeType } from "@/components/flow/block-node";
import { defaultChallengeParams } from "@/components/flow/flow-editor-helpers";
import { buildGraph } from "@/components/flow/validate-graph";
import {
  type ChallengeParams,
  CycleError,
  runSimulation,
  type Verdict,
} from "@/engine";

export type FlowEditorState = {
  nodes: BlockNodeType[];
  setNodes: Dispatch<SetStateAction<BlockNodeType[]>>;
  onNodesChange: OnNodesChange<BlockNodeType>;
  edges: Edge[];
  setEdges: Dispatch<SetStateAction<Edge[]>>;
  onEdgesChange: OnEdgesChange<Edge>;
  selectedNodeId: string | null;
  setSelectedNodeId: Dispatch<SetStateAction<string | null>>;
  params: ChallengeParams;
  setParams: Dispatch<SetStateAction<ChallengeParams>>;
  verdict: Verdict | null;
  verdictError: string | null;
  isRunning: boolean;
  run: () => void;
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
};

/**
 * Dono do estado do editor de fluxo: estado do React Flow (nodes/edges +
 * handlers de change), nó selecionado, parâmetros do desafio e veredito da
 * última simulação. Envolva a shell inteira (paleta + canvas + inspector) para
 * que todos compartilhem a mesma fonte de verdade — o canvas lê/escreve nodes
 * e edges, o inspector lê/escreve attrs/params e dispara `run()`.
 *
 * `useNodesState`/`useEdgesState` são `useState` puro (não precisam de
 * `ReactFlowProvider`); o `useReactFlow()` do canvas continua dentro do
 * provider do RF em `FlowCanvas`, então nada muda lá.
 */
export function FlowEditorProvider({
  children,
  initialNodes,
  initialEdges,
  initialParams,
  initialVerdict = null,
  initialVerdictError = null,
  initialSelectedNodeId = null,
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
  const [params, setParams] = useState<ChallengeParams>(
    initialParams ?? defaultChallengeParams(),
  );
  const [verdict, setVerdict] = useState<Verdict | null>(initialVerdict);
  const [verdictError, setVerdictError] = useState<string | null>(
    initialVerdictError,
  );
  const [isRunning, setIsRunning] = useState(false);

  // `runSimulation` é síncrono e, em modo spiky/diurnal, roda multi-tick —
  // pode ser pesado. O `setTimeout` adia a computação um tick para permitir
  // que o estado `isRunning=true` pinte o spinner do botão Run antes do
  // bloqueio da thread. `runSimulation` lança `CycleError` antes de qualquer
  // computação se o grafo tiver ciclo — capturamos e viramos estado de erro.
  const run = useCallback(() => {
    setIsRunning(true);
    setTimeout(() => {
      try {
        const result = runSimulation(buildGraph(nodes, edges), params);
        setVerdict(result);
        setVerdictError(null);
      } catch (err) {
        setVerdict(null);
        if (err instanceof CycleError) {
          setVerdictError(
            "Graph has a cycle — remove an edge to run the simulation.",
          );
        } else {
          setVerdictError(
            err instanceof Error
              ? err.message
              : "Failed to run the simulation.",
          );
        }
      } finally {
        setIsRunning(false);
      }
    }, 0);
  }, [nodes, edges, params]);

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
      params,
      setParams,
      verdict,
      verdictError,
      isRunning,
      run,
    }),
    [
      nodes,
      setNodes,
      onNodesChange,
      edges,
      setEdges,
      onEdgesChange,
      selectedNodeId,
      params,
      verdict,
      verdictError,
      isRunning,
      run,
    ],
  );

  return (
    <FlowEditorContext.Provider value={value}>
      {children}
    </FlowEditorContext.Provider>
  );
}
