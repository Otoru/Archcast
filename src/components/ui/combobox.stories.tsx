import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { ComponentProps } from "react";

import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Field } from "@/components/ui/field";

const items: ComboboxOption[] = [
  { value: "design", label: "Sistema de Design" },
  { value: "react", label: "React" },
  { value: "vue", label: "Vue" },
];

const groupedItems = [
  {
    value: "FRONTEND",
    items: [
      { value: "react", label: "React" },
      { value: "vue", label: "Vue" },
    ],
  },
  {
    value: "BACKEND",
    items: [
      { value: "go", label: "Go", disabled: true },
      { value: "node", label: "Node.js" },
    ],
  },
];

function ComboboxSingle({
  id,
  ...props
}: ComponentProps<typeof Combobox> & { id?: string }) {
  return (
    <Combobox className="max-w-[270px]" {...props}>
      <Combobox.Trigger id={id}>
        <Combobox.Value placeholder="Selecionar..." />
        <Combobox.Actions />
      </Combobox.Trigger>
      <Combobox.Content>
        <Combobox.List />
      </Combobox.Content>
    </Combobox>
  );
}

function ComboboxMulti({
  id,
  ...props
}: ComponentProps<typeof Combobox> & { id?: string }) {
  return (
    <Combobox className="max-w-[270px]" {...props}>
      <Combobox.Trigger id={id}>
        <Combobox.Chips />
        <Combobox.Actions />
      </Combobox.Trigger>
      <Combobox.Content>
        <Combobox.List />
      </Combobox.Content>
    </Combobox>
  );
}

const meta = {
  tags: ["ai-generated"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const TriggerDefault: Story = {
  render: () => <ComboboxSingle items={items} />,
};

export const TriggerSelected: Story = {
  render: () => <ComboboxSingle items={items} defaultValue={items[0]} />,
};

export const TriggerClearable: Story = {
  render: () => (
    <Combobox className="max-w-[270px]" items={items} defaultValue={items[1]}>
      <Combobox.Trigger clearable>
        <Combobox.Value placeholder="Selecionar..." />
        <Combobox.Actions />
      </Combobox.Trigger>
      <Combobox.Content>
        <Combobox.List />
      </Combobox.Content>
    </Combobox>
  ),
};

export const TriggerInvalid: Story = {
  render: () => (
    <ComboboxSingle items={items} invalid defaultValue={items[0]} />
  ),
};

export const TriggerDisabled: Story = {
  render: () => <ComboboxSingle items={items} disabled />,
};

export const TriggerMulti: Story = {
  render: () => (
    <ComboboxMulti items={items} multiple defaultValue={[items[0], items[1]]} />
  ),
};

export const WithLabel: Story = {
  render: () => (
    <Field className="max-w-[270px]">
      <Field.Label htmlFor="framework">Framework</Field.Label>
      <ComboboxSingle id="framework" items={items} />
    </Field>
  ),
};

export const WithDescription: Story = {
  render: () => (
    <Field className="max-w-[270px]">
      <Field.Label htmlFor="framework-desc">Framework</Field.Label>
      <Field.Content>
        <ComboboxSingle id="framework-desc" items={items} />
        <Field.Description>Escolha um framework da lista.</Field.Description>
      </Field.Content>
    </Field>
  ),
};

export const Invalid: Story = {
  render: () => (
    <Field className="max-w-[270px]">
      <Field.Label htmlFor="framework-invalid">Framework</Field.Label>
      <Field.Content>
        <ComboboxSingle
          id="framework-invalid"
          items={items}
          invalid
          defaultValue={items[0]}
        />
        <Field.Error>Selecione uma opção válida.</Field.Error>
      </Field.Content>
    </Field>
  ),
};

export const SingleOpenGrouped: Story = {
  render: () => (
    <Combobox className="max-w-[270px]" items={groupedItems} defaultOpen>
      <Combobox.Trigger>
        <Combobox.Value placeholder="Selecionar..." />
        <Combobox.Actions />
      </Combobox.Trigger>
      <Combobox.Content>
        <Combobox.List />
      </Combobox.Content>
    </Combobox>
  ),
};

export const MultiOpenGrouped: Story = {
  render: () => (
    <Combobox
      className="max-w-[270px]"
      items={groupedItems}
      multiple
      defaultOpen
      defaultValue={[groupedItems[0].items[0]]}
    >
      <Combobox.Trigger>
        <Combobox.Chips />
        <Combobox.Actions />
      </Combobox.Trigger>
      <Combobox.Content>
        <Combobox.List />
      </Combobox.Content>
    </Combobox>
  ),
};

export const SearchOpenGrouped: Story = {
  render: () => (
    <Combobox className="max-w-[270px]" items={groupedItems} defaultOpen>
      <Combobox.Trigger>
        <Combobox.Value placeholder="Selecionar..." />
        <Combobox.Actions />
      </Combobox.Trigger>
      <Combobox.Content>
        <Combobox.Search placeholder="Buscar..." />
        <Combobox.List />
      </Combobox.Content>
    </Combobox>
  ),
};
