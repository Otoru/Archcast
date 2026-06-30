import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { EmptyCanvasHint } from "@/components/flow/empty-canvas-hint";

const meta = {
  tags: ["ai-generated"],
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function Canvas({ visible }: Readonly<{ visible: boolean }>) {
  return (
    <div className="relative h-dvh w-full bg-wf-bg">
      <EmptyCanvasHint
        visible={visible}
        onLoadExample={() => {}}
        onTakeTour={() => {}}
      />
    </div>
  );
}

export const Visible: Story = {
  render: () => <Canvas visible />,
};

export const Hidden: Story = {
  render: () => <Canvas visible={false} />,
};
