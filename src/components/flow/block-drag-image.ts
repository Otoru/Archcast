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

/** "Ponto" de porta estático para a imagem de drag — espelha o `Handle` do canvas. */
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
 * Zoom atual do viewport do canvas, publicado pelo `FlowCanvas` via
 * `onViewportChange`. A imagem de drag é escalada por esse valor para que o
 * ghost apareça no mesmo tamanho em que o nó vai ficar na tela — sem isso,
 * o zoom do canvas gera uma desorientação entre o que se arrasta e o que se
 * solta.
 */
let canvasZoom = 1;

export function setCanvasZoom(zoom: number): void {
  canvasZoom = Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
}

/**
 * Define a imagem do drag-and-drop como o próprio nó do bloco (cabeçalho +
 * Badge da camada + portas), em vez do item da sidebar. Monta o
 * `BlockNodeShell` num host fora da tela com `createRoot` + `flushSync`
 * (render síncrono, obrigatório para o `setDragImage` durante o
 * `dragstart`) e escala o ghost pelo `zoom` atual do canvas para ele ter o
 * mesmo tamanho que o nó terá na tela. O escalonamento vai num `transform`
 * no filho (o nó) e o host — o elemento passado ao `setDragImage` — recebe
 * `width`/`height` já no tamanho escalado, sem transform: assim o snapshot
 * e o ponto de ancoragem ficam no mesmo espaço de coordenadas e o cursor
 * fica no centro do ghost em qualquer zoom (CSS `zoom` direto no elemento do
 * setDragImage desloca a ancoragem conforme o zoom em vários navegadores).
 * O host e o root permanecem vivos até `clearBlockDragImage` (chamado no
 * `dragend`) — alguns navegadores exigem o elemento no DOM durante todo o
 * arraste.
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
  // Mede o tamanho natural ANTES de escalonar: `transform` não altera
  // `offsetWidth`/`offsetHeight`.
  const naturalW = node.offsetWidth;
  const naturalH = node.offsetHeight;
  if (canvasZoom !== 1) {
    // Escala o conteúdo no filho; o host (passado ao setDragImage) fica com
    // tamanho explícito já escalado e sem transform — snapshot e ancoragem
    // no mesmo espaço de coordenadas.
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

/** Remove o host e o root da imagem de drag criados por `setBlockDragImage`. */
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
