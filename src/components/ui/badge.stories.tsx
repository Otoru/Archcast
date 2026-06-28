import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";

import { Badge } from "@/components/ui/badge";

const meta = {
  component: Badge,
  tags: ["ai-generated"],
  argTypes: {
    variant: {
      control: "select",
      options: [
        "default",
        "secondary",
        "destructive",
        "outline",
        "success",
        "warning",
      ],
    },
    size: {
      control: "select",
      options: ["default", "sm"],
    },
    showDot: { control: "boolean" },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "Novo",
    variant: "default",
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Novo")).toBeInTheDocument();
  },
};

export const Secondary: Story = {
  args: {
    children: "Beta",
    variant: "secondary",
  },
};

export const Destructive: Story = {
  args: {
    children: "Erro",
    variant: "destructive",
  },
};

export const Outline: Story = {
  args: {
    children: "Rascunho",
    variant: "outline",
  },
};

export const Success: Story = {
  args: {
    children: "Ativo",
    variant: "success",
  },
};

export const Warning: Story = {
  args: {
    children: "Pendente",
    variant: "warning",
  },
};

export const DefaultWithDot: Story = {
  args: {
    children: "Ao vivo",
    variant: "default",
    showDot: true,
  },
};

export const SuccessWithDot: Story = {
  args: {
    children: "Online",
    variant: "success",
    showDot: true,
  },
};

export const WarningWithDot: Story = {
  args: {
    children: "Pendente",
    variant: "warning",
    showDot: true,
  },
};

export const Small: Story = {
  args: {
    children: "Beta",
    variant: "secondary",
    size: "sm",
  },
  play: async ({ canvas }) => {
    const badge = canvas.getByText("Beta");
    await expect(getComputedStyle(badge).fontSize).toBe("10px");
  },
};
