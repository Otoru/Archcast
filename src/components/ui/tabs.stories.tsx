import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Folder, LayoutDashboard, Users } from "lucide-react";
import { expect } from "storybook/test";

import { Tabs } from "@/components/ui/tabs";

const meta = {
  tags: ["ai-generated"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const tabItems = (
  <>
    <Tabs.Trigger value="overview">
      <LayoutDashboard aria-hidden="true" />
      Visão geral
    </Tabs.Trigger>
    <Tabs.Trigger value="files">
      <Folder aria-hidden="true" />
      Arquivos
    </Tabs.Trigger>
    <Tabs.Trigger value="members">
      <Users aria-hidden="true" />
      Membros
    </Tabs.Trigger>
  </>
);

export const SegmentedPill: Story = {
  render: () => (
    <Tabs.Root defaultValue="overview">
      <Tabs.List shape="pill" aria-label="Seção">
        {tabItems}
      </Tabs.List>
      <Tabs.Content value="overview">Conteúdo da visão geral.</Tabs.Content>
      <Tabs.Content value="files">Conteúdo de arquivos.</Tabs.Content>
      <Tabs.Content value="members">Conteúdo de membros.</Tabs.Content>
    </Tabs.Root>
  ),
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("tab", { name: /visão geral/i }),
    ).toHaveAttribute("aria-selected", "true");
  },
};

export const SegmentedSquare: Story = {
  render: () => (
    <Tabs.Root defaultValue="files">
      <Tabs.List shape="square" aria-label="Seção">
        {tabItems}
      </Tabs.List>
      <Tabs.Content value="overview">Conteúdo da visão geral.</Tabs.Content>
      <Tabs.Content value="files">Conteúdo de arquivos.</Tabs.Content>
      <Tabs.Content value="members">Conteúdo de membros.</Tabs.Content>
    </Tabs.Root>
  ),
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("tab", { name: /arquivos/i }),
    ).toHaveAttribute("aria-selected", "true");
  },
};

export const WithIcons: Story = {
  render: () => (
    <Tabs.Root defaultValue="overview">
      <Tabs.List shape="pill" aria-label="Seção">
        {tabItems}
      </Tabs.List>
    </Tabs.Root>
  ),
};

export const TextOnly: Story = {
  render: () => (
    <Tabs.Root defaultValue="overview">
      <Tabs.List shape="pill" aria-label="Seção">
        <Tabs.Trigger value="overview">Visão geral</Tabs.Trigger>
        <Tabs.Trigger value="files">Arquivos</Tabs.Trigger>
        <Tabs.Trigger value="members">Membros</Tabs.Trigger>
      </Tabs.List>
    </Tabs.Root>
  ),
};

export const Disabled: Story = {
  render: () => (
    <Tabs.Root defaultValue="overview">
      <Tabs.List shape="pill" disabled aria-label="Seção">
        {tabItems}
      </Tabs.List>
    </Tabs.Root>
  ),
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("tab", { name: /visão geral/i }),
    ).toHaveAttribute("aria-selected", "true");
  },
};
