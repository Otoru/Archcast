import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";

import { CheckboxField } from "@/components/ui/checkbox";

const meta = {
  component: CheckboxField,
  tags: ["ai-generated"],
  argTypes: {
    invalid: { control: "boolean" },
    showInvalidIcon: { control: "boolean" },
    disabled: { control: "boolean" },
  },
} satisfies Meta<typeof CheckboxField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: "Padrão",
    id: "checkbox-default",
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("checkbox", { name: /padrão/i }),
    ).not.toBeChecked();
  },
};

export const Checked: Story = {
  args: {
    label: "Marcado",
    id: "checkbox-checked",
    defaultChecked: true,
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("checkbox", { name: /marcado/i }),
    ).toBeChecked();
  },
};

export const Invalid: Story = {
  args: {
    label: "Estado inválido",
    id: "checkbox-invalid",
    invalid: true,
  },
  play: async ({ canvas }) => {
    const checkbox = canvas.getByRole("checkbox");
    await expect(checkbox).toHaveAttribute("aria-invalid", "true");
    await expect(getComputedStyle(checkbox).borderColor).toBe(
      "rgb(159, 29, 29)",
    );
  },
};

export const InvalidChecked: Story = {
  args: {
    label: "Estado inválido",
    id: "checkbox-invalid-checked",
    invalid: true,
    defaultChecked: true,
  },
  play: async ({ canvas }) => {
    const checkbox = canvas.getByRole("checkbox");
    await expect(checkbox).toBeChecked();
    await expect(getComputedStyle(checkbox).backgroundColor).toBe(
      "rgb(159, 29, 29)",
    );
    await expect(getComputedStyle(checkbox).borderColor).toBe(
      "rgb(159, 29, 29)",
    );
    await expect(getComputedStyle(checkbox).color).toBe("rgb(255, 255, 255)");
    await expect(
      getComputedStyle(canvas.getByText("Estado inválido")).color,
    ).toBe("rgb(159, 29, 29)");
  },
};

export const WithInvalidIcon: Story = {
  args: {
    label: "Estado inválido",
    id: "checkbox-invalid-icon",
    invalid: true,
    showInvalidIcon: true,
  },
};

export const Disabled: Story = {
  args: {
    label: "Desabilitado",
    id: "checkbox-disabled",
    disabled: true,
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("checkbox")).toHaveAttribute("data-disabled");
  },
};
