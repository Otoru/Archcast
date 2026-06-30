"use client";

import { ArrowLeftIcon, Boxes, MousePointerClickIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Muted } from "@/components/ui/typography";

/**
 * Overlay over the empty canvas: points to the left palette and offers
 * shortcuts (load an example / take the tour). Non-blocking — the background
 * is `pointer-events-none`, only the buttons capture clicks. The shell
 * controls visibility (`visible` = hydrated && empty graph && no run && no tour).
 */
export function EmptyCanvasHint({
  visible,
  onLoadExample,
  onTakeTour,
}: Readonly<{
  visible: boolean;
  onLoadExample: () => void;
  onTakeTour: () => void;
}>) {
  if (!visible) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 text-center"
      aria-hidden="true"
    >
      <MousePointerClickIcon
        className="size-8 text-wf-ink-soft"
        aria-hidden="true"
      />
      <Muted className="max-w-xs">
        Drag a block from the left palette to start
      </Muted>
      <div className="flex items-center gap-1 text-wf-ink-soft">
        <ArrowLeftIcon className="size-4" aria-hidden="true" />
        <span className="wf-text-caption">block palette</span>
      </div>
      <div className="pointer-events-auto mt-2 flex gap-2">
        <Button variant="default" size="sm" onClick={onLoadExample}>
          <Boxes />
          Load example
        </Button>
        <Button variant="ghost" size="sm" onClick={onTakeTour}>
          Take the tour
        </Button>
      </div>
    </div>
  );
}
