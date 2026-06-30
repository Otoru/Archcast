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
import {
  type BlockPreset,
  DEFAULT_INSTANCES,
  getPreset,
  type Layer,
} from "@/engine";
import type { EdgeChannel } from "@/engine/types";
import { cn } from "@/lib/utils";

export type BlockNodeData = { kind: string; attrs?: Record<string, number> };
export type BlockNode = Node<BlockNodeData, "block">;

/**
 * Set of ids of currently invalid nodes (in a cycle, or the source of a
 * structurally invalid edge). `FlowCanvas` publishes the set derived from live
 * validation and each `BlockNode` consumes it to light up the
 * `--wf-destructive` border — without mutating `data`, avoiding an effect
 * loop. Empty default for the drag ghost and for isolated stories.
 */
export const InvalidNodesContext = createContext<Set<string>>(
  new Set<string>(),
);

/**
 * Visual state of an edge during a run: normalized magnitude (0–1) of the
 * flow it carries (relative to the graph peak), whether the source node is
 * saturated ("hot" edge → wf-destructive) and the absolute flow to scale
 * the thickness.
 */
export type RunEdgeState = {
  magnitude: number;
  saturated: boolean;
  flow: number;
};

/**
 * Run state published by `FlowCanvas` and consumed by each `BlockNode` and
 * by the custom edge (`FlowEdge`): whether run mode is active (lock +
 * animation), whether there is a verdict (running OR frozen post-stop), the
 * bottleneck id (max ρ), the set of saturated nodes and the per-edge state.
 * Pure derivation from the verdict — no `data` mutation, avoiding an effect
 * loop (same pattern as `InvalidNodesContext`). Safe default for the drag
 * ghost and isolated stories (no provider, nothing highlighted, nothing
 * animated).
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

/**
 * Maximum number of ghost cards rendered behind the node to suggest stacking.
 * Beyond that the `×N` badge carries the exact value — larger stacks would
 * look visually grotesque (large cumulative offset) with no clarity gain.
 */
const MAX_STACK_GHOSTS = 2;
/** Offset (px) of each ghost card relative to the previous one. */
const STACK_OFFSET_PX = 6;

/** Renders a port "dot" — real `Handle` on the canvas, static span in the drag image. */
export type DotRenderer = (
  channel: EdgeChannel,
  side: "in" | "out",
) => ReactNode;

/**
 * Border of the stack's ghost cards. Same color as the main card's state,
 * EXCEPT on the bottleneck, where the focus stroke drops to 1px (`border`)
 * — the 2px black on every card of the stack felt heavy. Mutually exclusive
 * priority: (invalid|saturated) > bottleneck > selected > neutral.
 */
function ghostBorderClassFor(state: {
  invalid: boolean;
  saturated: boolean;
  bottleneck: boolean;
  selected: boolean;
}): string {
  if (state.invalid || state.saturated) {
    return "border-2 border-wf-destructive ring-wf-destructive";
  }
  if (state.bottleneck) {
    return "border border-wf-focus";
  }
  if (state.selected) {
    return "border-2 border-wf-focus ring-wf-focus";
  }
  return "border-2 border-wf-border";
}

/**
 * Visual body of the node, with no React Flow dependency: layer icon +
 * block label + layer Badge + one row per port (read/write/async). The "dot"
 * of each port comes from `renderDot` — `Handle` on the canvas, static span
 * in the drag image — keeping a single visual source between the real node
 * and the drag-and-drop ghost.
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
  instances = DEFAULT_INSTANCES,
  onDelete,
}: Readonly<{
  preset: BlockPreset;
  meta: LayerMeta;
  renderDot: DotRenderer;
  selected?: boolean;
  invalid?: boolean;
  /** Bottleneck highlight (max ρ): focus border. Persists in the frozen verdict. */
  bottleneck?: boolean;
  /** Bottleneck pulse: only animates with an active run (stops flashing on Stop). */
  bottleneckPulse?: boolean;
  /** Saturated node (ρ ≥ 1) during a run — red border. */
  saturated?: boolean;
  /** Flashes the saturated node red: only animates with an active run (stops on Stop). */
  saturatedPulse?: boolean;
  /** Parallel copies of the block (`instances`). >1 enables the visual stacking. */
  instances?: number;
  /** When present, shows an X in the top-right corner that deletes the node. */
  onDelete?: (event: MouseEvent<HTMLButtonElement>) => void;
}>) {
  const Icon = meta.icon;
  const ins = preset.edges.in;
  const outs = preset.edges.out;
  const hasPorts = ins.length > 0 || outs.length > 0;
  // Stacking: number of ghost cards behind the node (capped at MAX_STACK_GHOSTS).
  const ghostCount = Math.max(0, Math.min(instances - 1, MAX_STACK_GHOSTS));
  const showStack = ghostCount > 0;

  // Border/ring of the current state (mutually exclusive priority, so it does
  // not depend on generated CSS order): invalid > saturated > bottleneck >
  // selected. Applied to the main card. Shared with the ghosts (except on the
  // bottleneck — see `ghostBorderClass`) so the whole stack paints the run
  // state instead of only the top. `invalid` only outside a run;
  // `saturated`/`bottleneck` only during a run.
  const stateBorderClass = cn(
    selected &&
      !invalid &&
      !saturated &&
      !bottleneck &&
      "border-wf-focus ring-wf-focus",
    bottleneck && !invalid && !saturated && "border-wf-focus",
    saturated && !invalid && "border-wf-destructive ring-wf-destructive",
    invalid && "border-wf-destructive ring-wf-destructive",
  );
  // Ghost border: same color as the state, EXCEPT on the bottleneck, where the
  // focus stroke drops to 1px (`border`) — the 2px black on every card of the
  // stack looked heavy/ugly. Ternary instead of layers to emit a single
  // width+color pair (avoids `border`/`border-2` conflict decided by CSS
  // order). Saturated/invalid/selected follow the main card (red/focus at
  // 2px — red is an alarm and not bothersome).
  const ghostBorderClass = ghostBorderClassFor({
    invalid,
    saturated,
    bottleneck,
    selected,
  });
  // Pulse (ring animation) only on the main card: replicating it across all
  // ghosts would become visual noise (several rings pulsing out of phase due
  // to the offset). The colored border already covers the whole stack; only
  // the top flashes.
  const pulseClass = cn(
    bottleneckPulse && !saturated && "wf-bottleneck-pulse",
    saturatedPulse && "wf-saturated-pulse",
  );

  return (
    <div className="relative">
      {showStack
        ? Array.from({ length: ghostCount }, (_, k) => {
            // DESCENDING offset order: the farthest ghost enters the DOM first
            // and stays at the bottom; the closest one (smaller offset) enters
            // last and paints on top — forming the correct cascade (without
            // this, the larger-offset ghost covers the smaller one and a card
            // disappears).
            const offset = (ghostCount - k) * STACK_OFFSET_PX;
            return (
              <div
                key={`stack-${offset}`}
                aria-hidden="true"
                className={cn(
                  "pointer-events-none absolute inset-0 -z-10 rounded-wf bg-wf-surface",
                  ghostBorderClass,
                )}
                style={{
                  transform: `translate(${offset}px, ${offset}px)`,
                }}
              />
            );
          })
        : null}
      <div
        className={cn(
          "relative z-0 w-52 rounded-wf border-2 border-wf-border bg-wf-surface text-wf-ink",
          stateBorderClass,
          pulseClass,
        )}
      >
        {onDelete ? (
          <button
            type="button"
            aria-label={`Delete ${preset.label}`}
            onClick={onDelete}
            // nodrag: prevents RF from starting a node drag when clicking the X.
            className="nodrag absolute -right-2 -top-2 z-10 inline-flex size-5 cursor-pointer items-center justify-center rounded-full border-2 border-wf-border bg-wf-surface text-wf-ink-soft shadow-sm transition-colors hover:border-wf-destructive hover:text-wf-destructive focus-visible:ring-2 focus-visible:ring-wf-focus"
          >
            <X className="size-3" aria-hidden="true" />
          </button>
        ) : null}
        <div className="flex items-center gap-2 px-3 pt-2">
          <Icon
            className="size-4 shrink-0 text-wf-ink-soft"
            aria-hidden="true"
          />
          <span className="truncate font-wf-heading text-sm text-wf-ink">
            {preset.label}
          </span>
          {instances > 1 ? (
            <Badge
              variant="secondary"
              size="sm"
              className="ml-auto shrink-0 tabular-nums"
              title={`${instances} instances`}
            >
              ×{instances}
            </Badge>
          ) : null}
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
    </div>
  );
}

/**
 * The workflow's single canvas node: derives everything (label, layer, icon,
 * ports) from the block preset received in `data.kind`. Each channel in
 * `preset.edges.in`/`out` becomes a "port" — a row with the Handle on the
 * node border and the channel label (read/write/async) next to it, visually
 * indicating which connections that point accepts. The handle `id` encodes
 * the channel (`in-read`, `out-write`, `out-async`...) to match edges by
 * `EdgeChannel` in the future.
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
  // Same fallback as the inspector (`node-attrs-form.tsx`): node override →
  // preset default → constant. Client-layer does not expose instances, but
  // the fallback resolves 1 and no stacking is rendered.
  const instances =
    data.attrs?.instances ?? preset.defaults.instances ?? DEFAULT_INSTANCES;
  // Run-mode highlights. The saturation alarm (ρ ≥ 1) is red and flashing,
  // and exists ONLY while the run is active — on Stop the red disappears
  // (not frozen, unlike the bottleneck). `saturated` wins over `bottleneck`
  // (max ρ): a saturated node flashes red; the bottleneck that is not yet
  // saturated gets the focus border (which persists in the frozen verdict)
  // and the soft pulse (which stops on Stop).
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
      instances={instances}
      // During a run the structure is locked — hide the delete button.
      onDelete={
        runState.running
          ? undefined
          : (event) => {
              event.stopPropagation();
              deleteElements({ nodes: [{ id }] }).catch(() => {
                // RF rejects only if the node is already gone — no action needed.
              });
            }
      }
    />
  );
}
