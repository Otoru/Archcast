"use client";

import { Handle, type Node, type NodeProps, Position } from "@xyflow/react";
import {
  Database,
  type LucideIcon,
  MessageSquare,
  Network,
  Server,
  Smartphone,
  Wrench,
} from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { type BlockPreset, getPreset, type Layer } from "@/engine";
import type { EdgeChannel } from "@/engine/types";
import { cn } from "@/lib/utils";

export type BlockNodeData = { kind: string; attrs?: Record<string, number> };
export type BlockNode = Node<BlockNodeData, "block">;

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
}: {
  preset: BlockPreset;
  meta: LayerMeta;
  renderDot: DotRenderer;
  selected?: boolean;
}) {
  const Icon = meta.icon;
  const ins = preset.edges.in;
  const outs = preset.edges.out;
  const hasPorts = ins.length > 0 || outs.length > 0;

  return (
    <div
      className={cn(
        "relative w-52 rounded-wf border-2 border-wf-border bg-wf-surface text-wf-ink",
        selected && "border-wf-focus ring-wf-focus",
      )}
    >
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
export function BlockNode({ data, selected }: NodeProps<BlockNode>) {
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
    />
  );
}
