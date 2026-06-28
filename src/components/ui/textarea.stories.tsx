import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { CircleAlert } from "lucide-react";

import { Field } from "@/components/ui/field";
import { InputGroup } from "@/components/ui/input-group";
import { Textarea } from "@/components/ui/textarea";

const meta = {
  tags: ["ai-generated"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const StateDefault: Story = {
  render: () => (
    <Textarea placeholder="Escreva sua mensagem aqui..." className="max-w-md" />
  ),
};

export const StateFocus: Story = {
  render: () => (
    <Textarea
      autoFocus
      placeholder="Mensagem em edição..."
      className="max-w-md"
    />
  ),
};

export const StateInvalid: Story = {
  render: () => (
    <InputGroup className="max-w-md">
      <InputGroup.Textarea
        aria-invalid
        defaultValue="Texto com erro..."
        aria-label="Textarea inválida"
      />
      <InputGroup.Addon align="block-end">
        <CircleAlert className="text-wf-destructive" aria-hidden="true" />
      </InputGroup.Addon>
    </InputGroup>
  ),
};

export const StateDisabled: Story = {
  render: () => (
    <Textarea
      disabled
      defaultValue="Campo desabilitado"
      aria-label="Campo desabilitado"
      className="max-w-md"
    />
  ),
};

export const WithLabel: Story = {
  render: () => (
    <Field className="max-w-md">
      <Field.Label htmlFor="message">Mensagem</Field.Label>
      <Field.Content>
        <Textarea id="message" placeholder="Escreva sua mensagem aqui..." />
        <Field.Description>Suporta múltiplas linhas.</Field.Description>
      </Field.Content>
    </Field>
  ),
};
