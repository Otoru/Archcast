import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { CircleAlert, Copy, Search } from "lucide-react";
import { expect } from "storybook/test";

import { Badge } from "@/components/ui/badge";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup } from "@/components/ui/input-group";

const meta = {
  tags: ["ai-generated"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const StateDefault: Story = {
  render: () => <Input placeholder="Digite aqui..." />,
};

export const StateFocus: Story = {
  render: () => <Input autoFocus placeholder="Digite aqui..." />,
  play: async ({ canvas }) => {
    await expect(canvas.getByPlaceholderText("Digite aqui...")).toHaveFocus();
  },
};

export const StateInvalid: Story = {
  render: () => (
    <InputGroup>
      <InputGroup.Input
        aria-invalid
        defaultValue="Digite aqui..."
        aria-label="Campo inválido"
      />
      <InputGroup.Addon align="inline-end">
        <CircleAlert className="text-wf-destructive" aria-hidden="true" />
      </InputGroup.Addon>
    </InputGroup>
  ),
};

export const StateDisabled: Story = {
  render: () => <Input disabled placeholder="Digite aqui..." />,
};

export const WithLabel: Story = {
  render: () => (
    <Field className="max-w-[270px]">
      <Field.Label htmlFor="email">E-mail</Field.Label>
      <Input id="email" placeholder="Digite aqui..." />
    </Field>
  ),
};

export const WithDescription: Story = {
  render: () => (
    <Field className="max-w-[270px]">
      <Field.Label htmlFor="username">Nome de usuário</Field.Label>
      <Field.Content>
        <Input id="username" placeholder="Digite aqui..." />
        <Field.Description>Use 3+ caracteres, sem espaços.</Field.Description>
      </Field.Content>
    </Field>
  ),
};

export const Required: Story = {
  render: () => (
    <Field className="max-w-[270px]">
      <Field.Label htmlFor="name" required>
        Nome
      </Field.Label>
      <Input id="name" placeholder="Digite aqui..." required />
    </Field>
  ),
};

export const InvalidWithError: Story = {
  render: () => (
    <Field className="max-w-[270px]">
      <Field.Label htmlFor="invalid-email">E-mail</Field.Label>
      <Field.Content>
        <InputGroup>
          <InputGroup.Input
            id="invalid-email"
            aria-invalid
            defaultValue="Digite aqui..."
          />
          <InputGroup.Addon align="inline-end">
            <CircleAlert className="text-wf-destructive" aria-hidden="true" />
          </InputGroup.Addon>
        </InputGroup>
        <Field.Error>E-mail inválido</Field.Error>
      </Field.Content>
    </Field>
  ),
};

export const WithBadge: Story = {
  render: () => (
    <Field className="max-w-[270px]">
      <div className="flex items-center justify-between gap-1.5">
        <Field.Label htmlFor="api-key">Chave de API</Field.Label>
        <Badge variant="secondary" size="sm">
          Beta
        </Badge>
      </div>
      <InputGroup>
        <InputGroup.Input id="api-key" defaultValue="Digite aqui..." />
        <InputGroup.IconButton aria-label="Copiar chave de API">
          <Copy className="text-wf-border" aria-hidden="true" />
        </InputGroup.IconButton>
      </InputGroup>
    </Field>
  ),
};

export const WithButtonInline: Story = {
  render: () => (
    <Field className="max-w-xs">
      <Field.Label htmlFor="search">Buscar</Field.Label>
      <InputGroup>
        <InputGroup.Content>
          <InputGroup.Addon>
            <Search aria-hidden="true" />
          </InputGroup.Addon>
          <InputGroup.Input id="search" placeholder="Pesquisar..." />
        </InputGroup.Content>
        <InputGroup.Separator />
        <InputGroup.Button>Buscar</InputGroup.Button>
      </InputGroup>
    </Field>
  ),
};
