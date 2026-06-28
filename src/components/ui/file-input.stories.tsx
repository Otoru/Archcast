import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";

import { Field } from "@/components/ui/field";
import { FileInput } from "@/components/ui/file-input";

const meta = {
  tags: ["ai-generated"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const File: Story = {
  name: "Default",
  render: () => (
    <Field className="max-w-md">
      <Field.Label htmlFor="file-default">Anexo</Field.Label>
      <FileInput id="file-default">
        <FileInput.Trigger>Escolher arquivo</FileInput.Trigger>
        <FileInput.Name>nenhum_arquivo.pdf</FileInput.Name>
      </FileInput>
    </Field>
  ),
};

export const FileLoading: Story = {
  name: "Loading",
  render: () => (
    <Field className="max-w-md">
      <Field.Label htmlFor="file-loading">Anexo</Field.Label>
      <FileInput id="file-loading" loading>
        <FileInput.Trigger>Enviando</FileInput.Trigger>
        <FileInput.Name>enviando...</FileInput.Name>
      </FileInput>
    </Field>
  ),
  play: async () => {
    await expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  },
};

export const FileSelected: Story = {
  name: "Selected",
  render: () => (
    <Field className="max-w-md">
      <Field.Label htmlFor="file-selected">Anexo</Field.Label>
      <FileInput id="file-selected" selected>
        <FileInput.Trigger>Escolher arquivo</FileInput.Trigger>
        <FileInput.Name>design-spec.pdf</FileInput.Name>
        <FileInput.Icon />
      </FileInput>
    </Field>
  ),
};

export const FileInvalid: Story = {
  name: "Invalid",
  render: () => (
    <Field className="max-w-md">
      <Field.Label htmlFor="file-invalid">Anexo</Field.Label>
      <Field.Content>
        <FileInput id="file-invalid" invalid>
          <FileInput.Trigger>Escolher arquivo</FileInput.Trigger>
          <FileInput.Name>arquivo_invalido.exe</FileInput.Name>
          <FileInput.Icon />
        </FileInput>
        <Field.Error>Formato não suportado.</Field.Error>
      </Field.Content>
    </Field>
  ),
};
