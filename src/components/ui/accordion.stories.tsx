import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Database, Settings, ShieldCheck } from "lucide-react";

import { Accordion } from "@/components/ui/accordion";

const meta = {
  title: "UI/Accordion",
  tags: ["ai-generated"],
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const SingleOpen: Story = {
  render: () => (
    <Accordion.Root defaultValue={["node"]} className="max-w-sm">
      <Accordion.Item value="node">
        <Accordion.Header>
          <Accordion.Trigger>
            <Database aria-hidden="true" />
            Nó
          </Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Panel>
          <p className="p-3 text-wf-ink-soft">
            Parâmetros do bloco selecionado no canvas.
          </p>
        </Accordion.Panel>
      </Accordion.Item>
      <Accordion.Item value="params">
        <Accordion.Header>
          <Accordion.Trigger>
            <Settings aria-hidden="true" />
            Desafio
          </Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Panel>
          <p className="p-3 text-wf-ink-soft">
            RPS, padrão de tráfego e SLOs do desafio.
          </p>
        </Accordion.Panel>
      </Accordion.Item>
      <Accordion.Item value="verdict">
        <Accordion.Header>
          <Accordion.Trigger>
            <ShieldCheck aria-hidden="true" />
            Veredito
          </Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Panel>
          <p className="p-3 text-wf-ink-soft">
            Latência, availability, custo e violations do último Run.
          </p>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion.Root>
  ),
};

export const OneOpenAtATime: Story = {
  render: () => (
    <Accordion.Root defaultValue={["node"]} className="max-w-sm">
      <Accordion.Item value="node">
        <Accordion.Header>
          <Accordion.Trigger>Nó</Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Panel>
          <p className="p-3 text-wf-ink-soft">Inspector do nó selecionado.</p>
        </Accordion.Panel>
      </Accordion.Item>
      <Accordion.Item value="params">
        <Accordion.Header>
          <Accordion.Trigger>Desafio</Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Panel>
          <p className="p-3 text-wf-ink-soft">Parâmetros do desafio.</p>
        </Accordion.Panel>
      </Accordion.Item>
      <Accordion.Item value="verdict">
        <Accordion.Header>
          <Accordion.Trigger>Veredito</Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Panel>
          <p className="p-3 text-wf-ink-soft">Resultado da simulação.</p>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion.Root>
  ),
};

export const AllClosed: Story = {
  render: () => (
    <Accordion.Root defaultValue={[]} className="max-w-sm">
      <Accordion.Item value="node">
        <Accordion.Header>
          <Accordion.Trigger>Nó</Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Panel>Conteúdo do nó.</Accordion.Panel>
      </Accordion.Item>
      <Accordion.Item value="params">
        <Accordion.Header>
          <Accordion.Trigger>Desafio</Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Panel>Conteúdo do desafio.</Accordion.Panel>
      </Accordion.Item>
    </Accordion.Root>
  ),
};

export const Disabled: Story = {
  render: () => (
    <Accordion.Root defaultValue={["node"]} className="max-w-sm">
      <Accordion.Item value="node">
        <Accordion.Header>
          <Accordion.Trigger>Nó</Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Panel>Conteúdo do nó.</Accordion.Panel>
      </Accordion.Item>
      <Accordion.Item value="params" disabled>
        <Accordion.Header>
          <Accordion.Trigger>Desafio</Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Panel>Conteúdo do desafio.</Accordion.Panel>
      </Accordion.Item>
    </Accordion.Root>
  ),
};
