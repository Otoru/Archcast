import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import {
  Menubar,
  menubarItemVariants,
  menubarTriggerVariants,
  menubarVariants,
} from "@/components/ui/menubar";

function FileMenu({
  defaultOpen = false,
}: Readonly<{ defaultOpen?: boolean }>) {
  return (
    <Menubar.Menu defaultOpen={defaultOpen}>
      <Menubar.Trigger>Arquivo</Menubar.Trigger>
      <Menubar.Content>
        <Menubar.Item shortcut="⌘N">Nova aba</Menubar.Item>
        <Menubar.Item shortcut="⌘O">Abrir arquivo</Menubar.Item>
        <Menubar.Separator />
        <Menubar.Group>
          <Menubar.Label>Recentes</Menubar.Label>
          <Menubar.Item disabled>Importar</Menubar.Item>
        </Menubar.Group>
      </Menubar.Content>
    </Menubar.Menu>
  );
}

describe("menubarVariants", () => {
  it("includes mono-paper bar styles", () => {
    const classes = menubarVariants();
    expect(classes).toContain("w-fit");
    expect(classes).toContain("p-1");
    expect(classes).toContain("gap-0.5");
    expect(classes).toContain("border-2");
    expect(classes).toContain("rounded-wf");
  });
});

describe("menubarTriggerVariants", () => {
  it("includes open and focus styles", () => {
    const classes = menubarTriggerVariants();
    expect(classes).toContain("data-popup-open:bg-wf-secondary");
    expect(classes).toContain("focus-visible:border-wf-focus");
  });

  it("includes disabled opacity", () => {
    expect(menubarTriggerVariants()).toContain("disabled:opacity-55");
  });
});

describe("menubarItemVariants", () => {
  it("includes item row styles", () => {
    const classes = menubarItemVariants();
    expect(classes).toContain("h-8");
    expect(classes).toContain("data-highlighted:bg-wf-disabled-surface");
  });

  it("disabled variant uses soft ink for contrast", () => {
    expect(menubarItemVariants({ disabled: true })).toContain(
      "text-wf-ink-soft",
    );
  });
});

describe("Menubar", () => {
  it("renders menubar with triggers", () => {
    render(
      <Menubar>
        <FileMenu />
        <Menubar.Menu>
          <Menubar.Trigger>Editar</Menubar.Trigger>
          <Menubar.Content>
            <Menubar.Item>Desfazer</Menubar.Item>
          </Menubar.Content>
        </Menubar.Menu>
      </Menubar>,
    );
    expect(screen.getByRole("menubar")).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: "Arquivo" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: "Editar" }),
    ).toBeInTheDocument();
  });

  it("shows menu items when open", async () => {
    render(
      <Menubar>
        <FileMenu defaultOpen />
      </Menubar>,
    );
    await waitFor(() => {
      expect(
        screen.getByRole("menuitem", { name: /Nova aba/i }),
      ).toBeInTheDocument();
    });
    expect(screen.getByText("⌘N")).toBeInTheDocument();
  });

  it("renders separator and label", async () => {
    render(
      <Menubar>
        <FileMenu defaultOpen />
      </Menubar>,
    );
    await waitFor(() => {
      expect(screen.getByText("Recentes")).toBeInTheDocument();
    });
    expect(screen.getByRole("separator")).toBeInTheDocument();
  });

  it("disables menu item", async () => {
    render(
      <Menubar>
        <FileMenu defaultOpen />
      </Menubar>,
    );
    await waitFor(() => {
      expect(
        screen.getByRole("menuitem", { name: "Importar" }),
      ).toHaveAttribute("aria-disabled", "true");
    });
  });

  it("disables trigger when disabled", () => {
    render(
      <Menubar>
        <Menubar.Menu>
          <Menubar.Trigger disabled>Ajuda</Menubar.Trigger>
          <Menubar.Content>
            <Menubar.Item>Documentação</Menubar.Item>
          </Menubar.Content>
        </Menubar.Menu>
      </Menubar>,
    );
    expect(screen.getByRole("menuitem", { name: "Ajuda" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("toggles checkbox item", async () => {
    const user = userEvent.setup();
    render(
      <Menubar>
        <Menubar.Menu defaultOpen>
          <Menubar.Trigger>Visualizar</Menubar.Trigger>
          <Menubar.Content>
            <Menubar.CheckboxItem defaultChecked>
              Mostrar barra lateral
            </Menubar.CheckboxItem>
          </Menubar.Content>
        </Menubar.Menu>
      </Menubar>,
    );
    const item = await screen.findByRole("menuitemcheckbox", {
      name: "Mostrar barra lateral",
    });
    expect(item).toHaveAttribute("aria-checked", "true");
    await user.click(item);
    expect(item).toHaveAttribute("aria-checked", "false");
  });

  it("selects radio item", async () => {
    const user = userEvent.setup();
    render(
      <Menubar>
        <Menubar.Menu defaultOpen>
          <Menubar.Trigger>Visualizar</Menubar.Trigger>
          <Menubar.Content>
            <Menubar.RadioGroup defaultValue="100">
              <Menubar.RadioItem value="100">100%</Menubar.RadioItem>
              <Menubar.RadioItem value="125">125%</Menubar.RadioItem>
            </Menubar.RadioGroup>
          </Menubar.Content>
        </Menubar.Menu>
      </Menubar>,
    );
    const selected = await screen.findByRole("menuitemradio", { name: "100%" });
    expect(selected).toHaveAttribute("aria-checked", "true");
    await user.click(screen.getByRole("menuitemradio", { name: "125%" }));
    expect(screen.getByRole("menuitemradio", { name: "125%" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("renders submenu items when open", async () => {
    render(
      <Menubar>
        <Menubar.Menu defaultOpen>
          <Menubar.Trigger>Editar</Menubar.Trigger>
          <Menubar.Content>
            <Menubar.Item>Copiar</Menubar.Item>
            <Menubar.Sub defaultOpen>
              <Menubar.SubTrigger>Compartilhar</Menubar.SubTrigger>
              <Menubar.SubContent>
                <Menubar.Item>Copiar link</Menubar.Item>
              </Menubar.SubContent>
            </Menubar.Sub>
          </Menubar.Content>
        </Menubar.Menu>
      </Menubar>,
    );
    await waitFor(() => {
      expect(
        screen.getByRole("menuitem", { name: "Copiar link" }),
      ).toBeInTheDocument();
    });
  });
});
