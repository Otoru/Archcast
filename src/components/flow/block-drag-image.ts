import { createElement } from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";

import {
  BlockNodeShell,
  type DotRenderer,
  HANDLE_CLASS,
  LAYER_META,
} from "@/components/flow/block-node";
import { getPreset } from "@/engine";
import { cn } from "@/lib/utils";

/** Static handle "dot" for the drag image — mirrors the canvas `Handle`. */
const plainDot: DotRenderer = (_channel, side) =>
  createElement("span", {
    "aria-hidden": true,
    className: cn(
      HANDLE_CLASS,
      "absolute top-1/2 -translate-y-1/2",
      side === "in" ? "left-0 -translate-x-1/2" : "right-0 translate-x-1/2",
    ),
  });

let previewRoot: Root | null = null;
let previewHost: HTMLElement | null = null;

/**
 * Current canvas viewport zoom, published by `FlowCanvas` via
 * `onViewportChange`. The drag image is scaled by this value so the ghost
 * appears at the same size the node will have on screen — without this,
 * the canvas zoom creates a mismatch between what is dragged and what is
 * dropped.
 */
let canvasZoom = 1;

export function setCanvasZoom(zoom: number): void {
  canvasZoom = Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
}

/**
 * Sets the drag-and-drop image as the block node itself (header + layer
 * Badge + handles), instead of the sidebar item. Mounts the `BlockNodeShell`
 * in an off-screen host with `createRoot` + `flushSync` (synchronous render,
 * required for `setDragImage` during `dragstart`) and scales the ghost by the
 * current canvas `zoom` so it has the same size the node will have on screen.
 * The scaling goes on a `transform` on the child (the node) and the host —
 * the element passed to `setDragImage` — receives `width`/`height` already
 * at the scaled size, with no transform: this keeps the snapshot and the
 * anchor point in the same coordinate space, and the cursor stays at the
 * center of the ghost at any zoom (CSS `zoom` directly on the setDragImage
 * element shifts the anchor depending on zoom in several browsers).
 * The host and root stay alive until `clearBlockDragImage` (called on
 * `dragend`) — some browsers require the element to remain in the DOM
 * throughout the drag.
 */
export function setBlockDragImage(
  dataTransfer: DataTransfer,
  kind: string,
): void {
  clearBlockDragImage();
  const preset = getPreset(kind);
  if (!preset) {
    return;
  }
  const meta = LAYER_META[preset.layer];
  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.top = "-10000px";
  host.style.left = "-10000px";
  host.style.pointerEvents = "none";
  document.body.appendChild(host);
  const root = createRoot(host);
  flushSync(() => {
    root.render(
      createElement(BlockNodeShell, {
        preset,
        meta,
        renderDot: plainDot,
        selected: false,
        invalid: false,
      }),
    );
  });
  const node = (host.firstElementChild as HTMLElement | null) ?? host;
  // Measure the natural size BEFORE scaling: `transform` does not change
  // `offsetWidth`/`offsetHeight`.
  const naturalW = node.offsetWidth;
  const naturalH = node.offsetHeight;
  if (canvasZoom !== 1) {
    // Scale the content on the child; the host (passed to setDragImage) gets
    // an explicit already-scaled size and no transform — snapshot and anchor
    // in the same coordinate space.
    node.style.transform = `scale(${canvasZoom})`;
    node.style.transformOrigin = "0 0";
    host.style.width = `${Math.round(naturalW * canvasZoom)}px`;
    host.style.height = `${Math.round(naturalH * canvasZoom)}px`;
  }
  dataTransfer.setDragImage(
    host,
    Math.round(host.offsetWidth / 2),
    Math.round(host.offsetHeight / 2),
  );
  previewRoot = root;
  previewHost = host;
}

/** Removes the drag image host and root created by `setBlockDragImage`. */
export function clearBlockDragImage(): void {
  if (previewRoot) {
    previewRoot.unmount();
    previewRoot = null;
  }
  if (previewHost) {
    previewHost.remove();
    previewHost = null;
  }
}
