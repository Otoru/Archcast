import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ArrowRight, Plus } from "lucide-react";
import { expect } from "storybook/test";

import { Button } from "@/components/ui/button";

const meta = {
  component: Button,
  tags: ["ai-generated"],
  argTypes: {
    variant: {
      control: "select",
      options: [
        "default",
        "secondary",
        "outline",
        "ghost",
        "destructive",
        "link",
        "rounded",
      ],
    },
    size: {
      control: "select",
      options: ["icon", "sm", "default", "lg"],
    },
    loading: { control: "boolean" },
    disabled: { control: "boolean" },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "Começar",
    variant: "default",
    size: "default",
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("button", { name: /começar/i }),
    ).toHaveTextContent("Começar");
  },
};

export const Secondary: Story = {
  args: { children: "Secundário", variant: "secondary" },
};

export const Outline: Story = {
  args: { children: "Outline", variant: "outline" },
};

export const Ghost: Story = {
  args: { children: "Fantasma", variant: "ghost" },
};

export const Destructive: Story = {
  args: { children: "Destrutivo", variant: "destructive" },
};

export const WithIcons: Story = {
  args: {
    children: (
      <>
        <Plus />
        Padrão
        <ArrowRight />
      </>
    ),
    variant: "default",
    size: "default",
  },
};

export const Icon: Story = {
  args: {
    children: <Plus aria-hidden="true" />,
    variant: "default",
    size: "icon",
    "aria-label": "Adicionar",
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("button", { name: /adicionar/i }),
    ).toHaveAttribute("aria-label", "Adicionar");
  },
};

export const Loading: Story = {
  args: {
    children: "Carregando",
    loading: true,
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button")).toHaveAttribute(
      "aria-busy",
      "true",
    );
  },
};

export const Disabled: Story = {
  args: {
    children: "Desabilitado",
    disabled: true,
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button")).toBeDisabled();
  },
};
