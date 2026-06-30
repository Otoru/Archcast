"use client";

import { Slider as SliderPrimitive } from "@base-ui/react/slider";

import { cn } from "@/lib/utils";

type SliderRootProps = SliderPrimitive.Root.Props<number>;

/**
 * base-ui slider (single-thumb). `value`/`onValueChange` operate on a single
 * number (`Props<number>`). The geometry (thumb position and indicator width)
 * is controlled by base-ui via inline styles — here we only provide the
 * wireframe look (`wf-*`). `Slider.Control` is `relative` to anchor the
 * absolute thumb; `Slider.Track` is the rail and `Slider.Indicator` is the
 * filled portion.
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
        className="relative flex h-5 w-full items-center focus-wf-ring rounded-wf data-[disabled]:cursor-not-allowed data-[disabled]:opacity-55"
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
