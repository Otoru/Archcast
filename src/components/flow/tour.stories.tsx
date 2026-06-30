import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TourOverlay } from "@/components/flow/tour";

const meta = {
  tags: ["ai-generated"],
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function Harness({ step }: Readonly<{ step: number }>) {
  return (
    <div className="relative h-dvh w-full bg-wf-bg">
      <div
        data-tour="palette"
        className="absolute top-0 left-0 h-full w-64 border-r-2 border-wf-border bg-wf-surface"
      />
      <div
        data-tour="canvas"
        className="absolute top-0 right-0 bottom-0 left-64"
      />
      <TourOverlay
        step={step}
        onNext={() => {}}
        onPrev={() => {}}
        onEnd={() => {}}
        onLoadExample={() => {}}
      />
    </div>
  );
}

export const Intro: Story = { render: () => <Harness step={0} /> };

export const PaletteStep: Story = { render: () => <Harness step={1} /> };

export const CanvasStep: Story = { render: () => <Harness step={2} /> };

export const End: Story = { render: () => <Harness step={6} /> };
