import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { WelcomeDialog } from "@/components/flow/welcome-dialog";

const meta = {
  tags: ["ai-generated"],
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <WelcomeDialog
      open
      onTakeTour={() => {}}
      onLoadExample={() => {}}
      onDismiss={() => {}}
    />
  ),
};
