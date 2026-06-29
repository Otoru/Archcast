import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, waitFor } from "storybook/test";

import { ThemeToggle } from "@/components/theme-toggle";

const meta = {
  component: ThemeToggle,
  tags: ["ai-generated"],
} satisfies Meta<typeof ThemeToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ToggleInteraction: Story = {
  play: async ({ canvas, userEvent }) => {
    const toggle = canvas.getByRole("button", {
      name: /switch to (light|dark) theme/i,
    });

    await waitFor(() => {
      expect(toggle).toBeEnabled();
    });

    if (document.documentElement.classList.contains("dark")) {
      await userEvent.click(toggle);
      await waitFor(() => {
        expect(document.documentElement).toHaveClass("light");
      });
    }

    await userEvent.click(toggle);
    await waitFor(() => {
      expect(document.documentElement).toHaveClass("dark");
    });
  },
};
