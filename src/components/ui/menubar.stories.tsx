import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { expect, waitFor, within } from "storybook/test";

import { Menubar, menubarItemVariants } from "@/components/ui/menubar";
import { cn } from "@/lib/utils";

const interactionParameters = {
  a11y: { test: "off" as const },
};

const meta = {
  component: Menubar,
  tags: ["ai-generated"],
} satisfies Meta<typeof Menubar>;

export default meta;
type Story = StoryObj<typeof meta>;

function DefaultBar() {
  return (
    <Menubar>
      <Menubar.Menu>
        <Menubar.Trigger>Arquivo</Menubar.Trigger>
        <Menubar.Content>
          <Menubar.Item shortcut="⌘N">Nova aba</Menubar.Item>
        </Menubar.Content>
      </Menubar.Menu>
      <Menubar.Menu>
        <Menubar.Trigger>Editar</Menubar.Trigger>
        <Menubar.Content>
          <Menubar.Item shortcut="⌘Z">Desfazer</Menubar.Item>
        </Menubar.Content>
      </Menubar.Menu>
      <Menubar.Menu>
        <Menubar.Trigger>Visualizar</Menubar.Trigger>
        <Menubar.Content>
          <Menubar.Item>Zoom</Menubar.Item>
        </Menubar.Content>
      </Menubar.Menu>
      <Menubar.Menu>
        <Menubar.Trigger>Ajuda</Menubar.Trigger>
        <Menubar.Content>
          <Menubar.Item>Documentação</Menubar.Item>
        </Menubar.Content>
      </Menubar.Menu>
    </Menubar>
  );
}

function FileMenuContent() {
  return (
    <>
      <Menubar.Item shortcut="⌘N">Nova aba</Menubar.Item>
      <Menubar.Item shortcut="⌘O">Abrir arquivo</Menubar.Item>
      <Menubar.Separator />
      <Menubar.Group>
        <Menubar.Label>Recentes</Menubar.Label>
        <Menubar.Item>design-spec.pdf</Menubar.Item>
        <Menubar.Item disabled>Importar</Menubar.Item>
      </Menubar.Group>
    </>
  );
}

export const BarDefault: Story = {
  render: () => <DefaultBar />,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("menubar")).toBeInTheDocument();
    await expect(
      canvas.getByRole("menuitem", { name: "Arquivo" }),
    ).toBeInTheDocument();
  },
};

export const TriggerDisabled: Story = {
  render: () => (
    <Menubar>
      <Menubar.Menu>
        <Menubar.Trigger>Arquivo</Menubar.Trigger>
        <Menubar.Content>
          <Menubar.Item>Nova aba</Menubar.Item>
        </Menubar.Content>
      </Menubar.Menu>
      <Menubar.Menu>
        <Menubar.Trigger disabled>Ajuda</Menubar.Trigger>
        <Menubar.Content>
          <Menubar.Item>Documentação</Menubar.Item>
        </Menubar.Content>
      </Menubar.Menu>
    </Menubar>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("menuitem", { name: "Ajuda" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  },
};

export const ItemStates: Story = {
  render: () => (
    <div className="flex w-[220px] flex-col rounded-wf border-2 border-wf-border bg-wf-surface">
      <div className={menubarItemVariants()}>Nova aba</div>
      <div className={cn(menubarItemVariants(), "bg-wf-disabled-surface")}>
        Abrir arquivo
      </div>
      <div className={menubarItemVariants({ disabled: true })}>Importar</div>
    </div>
  ),
};

export const MenuWithItems: Story = {
  parameters: interactionParameters,
  render: () => (
    <Menubar>
      <Menubar.Menu>
        <Menubar.Trigger>Arquivo</Menubar.Trigger>
        <Menubar.Content>
          <FileMenuContent />
        </Menubar.Content>
      </Menubar.Menu>
    </Menubar>
  ),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("menuitem", { name: "Arquivo" }));

    await waitFor(() => {
      expect(
        within(document.body).getByRole("menuitem", { name: /Nova aba/i }),
      ).toBeVisible();
    });

    await expect(within(document.body).getByText("Recentes")).toBeVisible();
    await expect(within(document.body).getByRole("separator")).toBeVisible();
    await expect(within(document.body).getByText("⌘N")).toBeVisible();
    await expect(
      within(document.body).getByRole("menuitem", { name: "Importar" }),
    ).toHaveAttribute("aria-disabled", "true");
  },
};

function CheckboxMenu() {
  const [sidebar, setSidebar] = useState(true);
  const [toolbar, setToolbar] = useState(false);

  return (
    <Menubar>
      <Menubar.Menu>
        <Menubar.Trigger>Visualizar</Menubar.Trigger>
        <Menubar.Content>
          <Menubar.CheckboxItem checked={sidebar} onCheckedChange={setSidebar}>
            Mostrar barra lateral
          </Menubar.CheckboxItem>
          <Menubar.CheckboxItem checked={toolbar} onCheckedChange={setToolbar}>
            Mostrar barra de ferramentas
          </Menubar.CheckboxItem>
        </Menubar.Content>
      </Menubar.Menu>
    </Menubar>
  );
}

export const CheckboxItems: Story = {
  parameters: interactionParameters,
  render: () => <CheckboxMenu />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("menuitem", { name: "Visualizar" }));

    const item = await waitFor(() =>
      within(document.body).getByRole("menuitemcheckbox", {
        name: "Mostrar barra lateral",
      }),
    );

    await expect(item).toHaveAttribute("aria-checked", "true");
    await userEvent.click(item);
    await expect(item).toHaveAttribute("aria-checked", "false");
  },
};

function RadioMenu() {
  const [zoom, setZoom] = useState("100");

  return (
    <Menubar>
      <Menubar.Menu>
        <Menubar.Trigger>Visualizar</Menubar.Trigger>
        <Menubar.Content>
          <Menubar.RadioGroup value={zoom} onValueChange={setZoom}>
            <Menubar.RadioItem value="125">125%</Menubar.RadioItem>
            <Menubar.RadioItem value="100">100%</Menubar.RadioItem>
            <Menubar.RadioItem value="75">75%</Menubar.RadioItem>
          </Menubar.RadioGroup>
        </Menubar.Content>
      </Menubar.Menu>
    </Menubar>
  );
}

export const RadioItems: Story = {
  parameters: interactionParameters,
  render: () => <RadioMenu />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("menuitem", { name: "Visualizar" }));

    const selected = await waitFor(() =>
      within(document.body).getByRole("menuitemradio", { name: "100%" }),
    );

    await expect(selected).toHaveAttribute("aria-checked", "true");
    await userEvent.click(
      within(document.body).getByRole("menuitemradio", { name: "125%" }),
    );
    await expect(
      within(document.body).getByRole("menuitemradio", { name: "125%" }),
    ).toHaveAttribute("aria-checked", "true");
  },
};

export const SubmenuOpen: Story = {
  parameters: interactionParameters,
  render: () => (
    <Menubar>
      <Menubar.Menu>
        <Menubar.Trigger>Editar</Menubar.Trigger>
        <Menubar.Content>
          <Menubar.Item>Copiar</Menubar.Item>
          <Menubar.Sub>
            <Menubar.SubTrigger>Compartilhar</Menubar.SubTrigger>
            <Menubar.SubContent>
              <Menubar.Item>Copiar link</Menubar.Item>
              <Menubar.Item>E-mail</Menubar.Item>
            </Menubar.SubContent>
          </Menubar.Sub>
          <Menubar.Item>Colar</Menubar.Item>
        </Menubar.Content>
      </Menubar.Menu>
    </Menubar>
  ),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("menuitem", { name: "Editar" }));

    const shareItem = await waitFor(() =>
      within(document.body).getByRole("menuitem", { name: "Compartilhar" }),
    );

    await userEvent.hover(shareItem);

    await waitFor(() => {
      expect(
        within(document.body).getByRole("menuitem", { name: "Copiar link" }),
      ).toBeVisible();
    });
  },
};
