"use client";

import {
  Handle,
  type Node,
  type NodeProps,
  Position,
  useReactFlow,
} from "@xyflow/react";
import {
  Database,
  type LucideIcon,
  MessageSquare,
  Network,
  Server,
  Smartphone,
  Wrench,
  X,
} from "lucide-react";
import {
  createContext,
  type MouseEvent,
  type ReactNode,
  useContext,
} from "react";

import { Badge } from "@/components/ui/badge";
import { type BlockPreset, getPreset, type Layer } from "@/engine";
import type { EdgeChannel } from "@/engine/types";
import { cn } from "@/lib/utils";

export type BlockNodeData = { kind: string; attrs?: Record<string, number> };
export type BlockNode = Node<BlockNodeData, "block">;

/**
 * Conjunto de ids de nós atualmente inválidos (em ciclo, ou fonte de aresta
 * estruturalmente inválida). O `FlowCanvas` publica o conjunto derivado da
 * validação ao vivo e cada `BlockNode` o consome para acender a borda
 * `--wf-destructive` — sem mutar `data`, evitando loop de effect. Default
 * vazio para o fantasma de drag e para stories isolados.
 */
export const InvalidNodesContext = createContext<Set<string>>(
  new Set<string>(),
);

/**
 * Estado visual de uma edge durante o run: magnitude normalizada (0–1) do
 * fluxo que ela carrega (relativo ao pico do grafo), se o nó de origem está
 * saturado (edge "quente" → wf-destructive) e o fluxo absoluto para escalar
 * a espessura.
 */
export type RunEdgeState = {
  magnitude: number;
  saturated: boolean;
  flow: number;
};

/**
 * Estado de run publicado pelo `FlowCanvas` e consumido por cada `BlockNode` e
 * pela edge custom (`FlowEdge`): se o modo run está ativo (lock + animação),
 * se há veredito (running OU congelado pós-stop), o id do bottleneck (max ρ),
 * o conjunto de nós saturados e o estado por edge. Derivação pura do veredito
 * — sem mutar `data`, evitando loop de effect (mesmo padrão do
 * `InvalidNodesContext`). Default seguro para o fantasma de drag e stories
 * isolados (sem provider, nada destacado, nada animado).
 */
export type RunState = {
  running: boolean;
  hasVerdict: boolean;
  bottleneckId: string | null;
  saturatedNodeIds: Set<string>;
  edgeStateById: Map<string, RunEdgeState>;
  maxFlow: number;
};

export const defaultRunState: RunState = {
  running: false,
  hasVerdict: false,
  bottleneckId: null,
  saturatedNodeIds: new Set<string>(),
  edgeStateById: new Map<string, RunEdgeState>(),
  maxFlow: 0,
};

export const RunStateContext = createContext<RunState>(defaultRunState);

export type LayerMeta = { label: string; icon: LucideIcon };

export const LAYER_META: Record<Layer, LayerMeta> = {
  client: { label: "Clients", icon: Smartphone },
  edge: { label: "Edge", icon: Network },
  compute: { label: "Compute", icon: Server },
  data: { label: "Data", icon: Database },
  messaging: { label: "Messaging", icon: MessageSquare },
  platform: { label: "Platform", icon: Wrench },
};

export const HANDLE_CLASS =
  "!size-2.5 !rounded-full !border-2 !border-wf-border !bg-wf-surface";

/** Renderiza o "ponto" de uma porta — `Handle` real no canvas, span estático na imagem de drag. */
export type DotRenderer = (
  channel: EdgeChannel,
  side: "in" | "out",
) => ReactNode;

/**
 * Corpo visual do nó, sem dependência de React Flow: ícone da camada +
 * rótulo do bloco + Badge da camada + uma linha por porta (read/write/async).
 * O "ponto" de cada porta vem de `renderDot` — `Handle` no canvas, span
 * estático na imagem de drag — mantendo uma fonte visual única entre o nó
 * real e o ghost do drag-and-drop.
 */
export function BlockNodeShell({
  preset,
  meta,
  renderDot,
  selected = false,
  invalid = false,
  bottleneck = false,
  bottleneckPulse = false,
  saturated = false,
  saturatedPulse = false,
  onDelete,
}: {
  preset: BlockPreset;
  meta: LayerMeta;
  renderDot: DotRenderer;
  selected?: boolean;
  invalid?: boolean;
  /** Destaque do bottleneck (max ρ): borda foco. Permanece no veredito congelado. */
  bottleneck?: boolean;
  /** Pulso do bottleneck: só anima com o run ativo (para de piscar no Stop). */
  bottleneckPulse?: boolean;
  /** Node saturado (ρ ≥ 1) durante o run — borda vermelha. */
  saturated?: boolean;
  /** Pisca o node saturado em vermelho: só anima com o run ativo (para no Stop). */
  saturatedPulse?: boolean;
  /** Quando presente, mostra um X no canto superior direito que apaga o nó. */
  onDelete?: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  const Icon = meta.icon;
  const ins = preset.edges.in;
  const outs = preset.edges.out;
  const hasPorts = ins.length > 0 || outs.length > 0;

  return (
    <div
      className={cn(
        "relative w-52 rounded-wf border-2 border-wf-border bg-wf-surface text-wf-ink",
        // Prioridade da borda (mutuamente exclusiva, para não depender da ordem
        // do CSS gerado): invalid > saturated > bottleneck > selected.
        // `invalid` só ocorre fora do run; `saturated`/`bottleneck` só no run.
        selected &&
          !invalid &&
          !saturated &&
          !bottleneck &&
          "border-wf-focus ring-wf-focus",
        // bottleneck (max ρ) ainda não saturado: borda foco, pulso suave.
        bottleneck && !invalid && !saturated && "border-wf-focus",
        bottleneckPulse && !saturated && "wf-bottleneck-pulse",
        // saturated (ρ ≥ 1) vence sobre o bottleneck: vermelho e piscando,
        // presente só durante o run (some ao apertar Stop).
        saturated && !invalid && "border-wf-destructive ring-wf-destructive",
        saturatedPulse && "wf-saturated-pulse",
        // `invalid` (ciclo/aresta inválida) sinaliza mesmo selecionado.
        invalid && "border-wf-destructive ring-wf-destructive",
      )}
    >
      {onDelete ? (
        <button
          type="button"
          aria-label={`Delete ${preset.label}`}
          onClick={onDelete}
          // nodrag: impede o RF de iniciar o arraste do nó ao clicar no X.
          className="nodrag absolute -right-2 -top-2 z-10 inline-flex size-5 cursor-pointer items-center justify-center rounded-full border-2 border-wf-border bg-wf-surface text-wf-ink-soft shadow-sm transition-colors hover:border-wf-destructive hover:text-wf-destructive focus-visible:ring-2 focus-visible:ring-wf-focus"
        >
          <X className="size-3" aria-hidden="true" />
        </button>
      ) : null}
      <div className="flex items-center gap-2 px-3 pt-2">
        <Icon className="size-4 shrink-0 text-wf-ink-soft" aria-hidden="true" />
        <span className="truncate font-wf-heading text-sm text-wf-ink">
          {preset.label}
        </span>
      </div>
      <div className="px-3 pb-2 pt-1">
        <Badge variant="secondary" size="sm">
          {meta.label}
        </Badge>
      </div>

      {hasPorts && (
        <div className="pb-2">
          {ins.map((channel) => (
            <div
              key={`in-${channel}`}
              className="relative flex h-5 items-center justify-start pl-3"
            >
              {renderDot(channel, "in")}
              <span className="wf-text-caption font-wf-heading text-wf-ink-soft">
                {channel}
              </span>
            </div>
          ))}
          {outs.map((channel) => (
            <div
              key={`out-${channel}`}
              className="relative flex h-5 items-center justify-end pr-3"
            >
              <span className="wf-text-caption font-wf-heading text-wf-ink-soft">
                {channel}
              </span>
              {renderDot(channel, "out")}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Único nó de canvas do workflow: deriva tudo (rótulo, camada, ícone,
 * portas) do preset do bloco recebido em `data.kind`. Cada canal em
 * `preset.edges.in`/`out` vira uma "porta" — uma linha com o Handle na
 * borda do nó e o rótulo do canal (read/write/async) ao lado, indicando
 * visualmente quais conexões aquele ponto aceita. O `id` do handle
 * codifica o canal (`in-read`, `out-write`, `out-async`...) para casar com
 * arestas por `EdgeChannel` no futuro.
 */
export function BlockNode({ id, data, selected }: NodeProps<BlockNode>) {
  const invalid = useContext(InvalidNodesContext).has(id);
  const runState = useContext(RunStateContext);
  const { deleteElements } = useReactFlow();
  const preset = getPreset(data.kind);
  if (!preset) {
    return (
      <div
        className={cn(
          "w-52 rounded-wf border-2 border-wf-border-soft bg-wf-secondary px-3 py-2 text-wf-ink-soft wf-text-caption",
          selected && "border-wf-focus",
        )}
      >
        unknown: {data.kind}
      </div>
    );
  }

  const meta = LAYER_META[preset.layer];
  // Destaques do modo run. O alarme de saturação (ρ ≥ 1) é vermelho e piscando,
  // e existe SÓ enquanto o run está ativo — ao apertar Stop o vermelho some
  // (não fica congelado, ao contrário do bottleneck). `saturated` vence sobre
  // `bottleneck` (max ρ): um nó saturado pisca em vermelho; o bottleneck ainda
  // não saturado recebe a borda foco (que permanece no veredito congelado) e o
  // pulso suave (que para no Stop).
  const bottleneck = runState.hasVerdict && runState.bottleneckId === id;
  const saturated = runState.running && runState.saturatedNodeIds.has(id);
  const bottleneckPulse = runState.running && bottleneck && !saturated;
  const saturatedPulse = saturated;

  const renderDot: DotRenderer = (channel, side) =>
    side === "in" ? (
      <Handle
        type="target"
        position={Position.Left}
        id={`in-${channel}`}
        className={HANDLE_CLASS}
      />
    ) : (
      <Handle
        type="source"
        position={Position.Right}
        id={`out-${channel}`}
        className={HANDLE_CLASS}
      />
    );

  return (
    <BlockNodeShell
      preset={preset}
      meta={meta}
      renderDot={renderDot}
      selected={selected}
      invalid={invalid}
      bottleneck={bottleneck}
      bottleneckPulse={bottleneckPulse}
      saturated={saturated}
      saturatedPulse={saturatedPulse}
      // Durante o run a estrutura está travada — esconde o botão de apagar.
      onDelete={
        runState.running
          ? undefined
          : (event) => {
              event.stopPropagation();
              void deleteElements({ nodes: [{ id }] });
            }
      }
    />
  );
}
