import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { FlowShell } from "@/components/flow/flow-shell";

const meta = {
  component: FlowShell,
  parameters: { layout: "fullscreen" },
  tags: ["ai-generated"],
} satisfies Meta<typeof FlowShell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
