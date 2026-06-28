"use client";

import { Slider as SliderPrimitive } from "@base-ui/react/slider";

import { cn } from "@/lib/utils";

type SliderRootProps = SliderPrimitive.Root.Props<number>;

/**
 * Slider base-ui (single-thumb). O `value`/`onValueChange` operam sobre um
 * número único (`Props<number>`). A geometria (posição do thumb e largura do
 * indicator) é controlada pelo base-ui via estilos inline — aqui só damos a
 * aparência wireframe (`wf-*`). O `Slider.Control` é `relative` para ancorar o
 * thumb absoluto; o `Slider.Track` é o trilho e o `Slider.Indicator` o trecho
 * preenchido.
 */
function SliderRoot({ className, ...props }: Readonly<SliderRootProps>) {
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      className={cn("flex w-full items-center", className)}
      {...props}
    >
      <SliderPrimitive.Control
        data-slot="slider-control"
        className="relative flex h-5 w-full items-center focus-wf-ring rounded-wf"
      >
        <SliderPrimitive.Track
          data-slot="slider-track"
          className="relative h-1.5 w-full rounded-full bg-wf-border-soft"
        >
          <SliderPrimitive.Indicator
            data-slot="slider-indicator"
            className="h-full rounded-full bg-wf-ink"
          />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          className="size-4 rounded-full border-2 border-wf-ink bg-wf-surface shadow-sm focus-wf-ring"
        />
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
}

const Slider = {
  Root: SliderRoot,
};

export { Slider, SliderRoot };
export type { SliderRootProps };
