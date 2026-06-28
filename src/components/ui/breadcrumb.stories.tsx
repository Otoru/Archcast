import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Folder, Home, Settings } from "lucide-react";
import { expect } from "storybook/test";

import { Breadcrumb } from "@/components/ui/breadcrumb";

const meta = {
  tags: ["ai-generated"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const ThreeItems: Story = {
  render: () => (
    <Breadcrumb.Root>
      <Breadcrumb.List>
        <Breadcrumb.Item>
          <Breadcrumb.Link href="/">
            <Home aria-hidden="true" />
            Início
          </Breadcrumb.Link>
        </Breadcrumb.Item>
        <Breadcrumb.Separator />
        <Breadcrumb.Item>
          <Breadcrumb.Link href="/projects">Projetos</Breadcrumb.Link>
        </Breadcrumb.Item>
        <Breadcrumb.Separator />
        <Breadcrumb.Item>
          <Breadcrumb.Page>Configurações</Breadcrumb.Page>
        </Breadcrumb.Item>
      </Breadcrumb.List>
    </Breadcrumb.Root>
  ),
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("link", { name: /início/i }),
    ).toBeInTheDocument();
    await expect(canvas.getByText("Configurações")).toHaveAttribute(
      "aria-current",
      "page",
    );
  },
};

export const TwoItems: Story = {
  render: () => (
    <Breadcrumb.Root>
      <Breadcrumb.List>
        <Breadcrumb.Item>
          <Breadcrumb.Link href="/dashboard">Painel</Breadcrumb.Link>
        </Breadcrumb.Item>
        <Breadcrumb.Separator />
        <Breadcrumb.Item>
          <Breadcrumb.Page>Perfil</Breadcrumb.Page>
        </Breadcrumb.Item>
      </Breadcrumb.List>
    </Breadcrumb.Root>
  ),
};

export const OneItem: Story = {
  render: () => (
    <Breadcrumb.Root>
      <Breadcrumb.List>
        <Breadcrumb.Item>
          <Breadcrumb.Page>Início</Breadcrumb.Page>
        </Breadcrumb.Item>
      </Breadcrumb.List>
    </Breadcrumb.Root>
  ),
};

export const WithIcons: Story = {
  render: () => (
    <Breadcrumb.Root>
      <Breadcrumb.List>
        <Breadcrumb.Item>
          <Breadcrumb.Link href="/">
            <Home aria-hidden="true" />
            Início
          </Breadcrumb.Link>
        </Breadcrumb.Item>
        <Breadcrumb.Separator />
        <Breadcrumb.Item>
          <Breadcrumb.Link href="/projects">
            <Folder aria-hidden="true" />
            Projetos
          </Breadcrumb.Link>
        </Breadcrumb.Item>
        <Breadcrumb.Separator />
        <Breadcrumb.Item>
          <Breadcrumb.Page>
            <Settings aria-hidden="true" />
            Configurações
          </Breadcrumb.Page>
        </Breadcrumb.Item>
      </Breadcrumb.List>
    </Breadcrumb.Root>
  ),
};

export const NoIcons: Story = {
  render: () => (
    <Breadcrumb.Root>
      <Breadcrumb.List>
        <Breadcrumb.Item>
          <Breadcrumb.Link href="/docs">Documentação</Breadcrumb.Link>
        </Breadcrumb.Item>
        <Breadcrumb.Separator />
        <Breadcrumb.Item>
          <Breadcrumb.Page>Autenticação</Breadcrumb.Page>
        </Breadcrumb.Item>
      </Breadcrumb.List>
    </Breadcrumb.Root>
  ),
};

export const DisabledLink: Story = {
  render: () => (
    <Breadcrumb.Root>
      <Breadcrumb.List>
        <Breadcrumb.Item>
          <Breadcrumb.Link href="/">Início</Breadcrumb.Link>
        </Breadcrumb.Item>
        <Breadcrumb.Separator />
        <Breadcrumb.Item>
          <Breadcrumb.Link href="/projects" aria-disabled="true">
            Projetos
          </Breadcrumb.Link>
        </Breadcrumb.Item>
        <Breadcrumb.Separator />
        <Breadcrumb.Item>
          <Breadcrumb.Page>Configurações</Breadcrumb.Page>
        </Breadcrumb.Item>
      </Breadcrumb.List>
    </Breadcrumb.Root>
  ),
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("link", { name: "Projetos" }),
    ).toHaveAttribute("aria-disabled", "true");
  },
};
