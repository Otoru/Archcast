import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import { Slider } from "@/components/ui/slider";

function SliderHarness({
  initial,
  min = 0,
  max = 1,
  step = 0.01,
}: {
  initial: number;
  min?: number;
  max?: number;
  step?: number;
}) {
  const [value, setValue] = useState(initial);
  return (
    <div className="flex w-80 items-center gap-3 border-2 border-wf-border bg-wf-surface p-4">
      <Slider.Root
        className="flex-1"
        value={value}
        min={min}
        max={max}
        step={step}
        onValueChange={setValue}
      />
      <span className="wf-text-small tabular-nums text-wf-ink-soft w-12 text-right">
        {value.toFixed(2)}
      </span>
    </div>
  );
}

const meta = {
  title: "UI/Slider",
  tags: ["ai-generated"],
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const HitRatio: Story = {
  render: () => <SliderHarness initial={0.85} />,
};

export const Zero: Story = {
  render: () => <SliderHarness initial={0} />,
};

export const Full: Story = {
  render: () => <SliderHarness initial={1} />,
};

export const Discrete: Story = {
  render: () => <SliderHarness initial={3} min={1} max={10} step={1} />,
};
