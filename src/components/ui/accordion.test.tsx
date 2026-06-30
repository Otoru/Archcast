import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Accordion } from "@/components/ui/accordion";

describe("Accordion", () => {
  it("renderiza gatilhos com rótulos acessíveis", () => {
    render(
      <Accordion.Root defaultValue={[]}>
        <Accordion.Item value="a">
          <Accordion.Header>
            <Accordion.Trigger>Seção A</Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Panel>Conteúdo A</Accordion.Panel>
        </Accordion.Item>
        <Accordion.Item value="b">
          <Accordion.Header>
            <Accordion.Trigger>Seção B</Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Panel>Conteúdo B</Accordion.Panel>
        </Accordion.Item>
      </Accordion.Root>,
    );
    expect(screen.getByRole("button", { name: "Seção A" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Seção B" })).toBeInTheDocument();
  });

  it("marca o item do defaultValue como expandido", () => {
    render(
      <Accordion.Root defaultValue={["a"]}>
        <Accordion.Item value="a">
          <Accordion.Header>
            <Accordion.Trigger>Seção A</Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Panel>Conteúdo A</Accordion.Panel>
        </Accordion.Item>
        <Accordion.Item value="b">
          <Accordion.Header>
            <Accordion.Trigger>Seção B</Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Panel>Conteúdo B</Accordion.Panel>
        </Accordion.Item>
      </Accordion.Root>,
    );
    expect(screen.getByRole("button", { name: "Seção A" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByRole("button", { name: "Seção B" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("abre e fecha o item ao clicar, só um por vez", async () => {
    const user = userEvent.setup();
    render(
      <Accordion.Root defaultValue={[]}>
        <Accordion.Item value="a">
          <Accordion.Header>
            <Accordion.Trigger>Seção A</Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Panel>Conteúdo A</Accordion.Panel>
        </Accordion.Item>
        <Accordion.Item value="b">
          <Accordion.Header>
            <Accordion.Trigger>Seção B</Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Panel>Conteúdo B</Accordion.Panel>
        </Accordion.Item>
      </Accordion.Root>,
    );

    const a = screen.getByRole("button", { name: "Seção A" });
    const b = screen.getByRole("button", { name: "Seção B" });

    await user.click(a);
    expect(a).toHaveAttribute("aria-expanded", "true");
    expect(b).toHaveAttribute("aria-expanded", "false");

    await user.click(b);
    expect(a).toHaveAttribute("aria-expanded", "false");
    expect(b).toHaveAttribute("aria-expanded", "true");

    await user.click(b);
    expect(a).toHaveAttribute("aria-expanded", "false");
    expect(b).toHaveAttribute("aria-expanded", "false");
  });

  it("expõe o conteúdo do painel quando aberto", () => {
    render(
      <Accordion.Root defaultValue={["a"]}>
        <Accordion.Item value="a">
          <Accordion.Header>
            <Accordion.Trigger>Seção A</Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Panel>Conteúdo A</Accordion.Panel>
        </Accordion.Item>
      </Accordion.Root>,
    );
    expect(screen.getByText("Conteúdo A")).toBeInTheDocument();
  });

  it("desabilita o gatilho quando o item está disabled", () => {
    render(
      <Accordion.Root defaultValue={[]}>
        <Accordion.Item value="a" disabled>
          <Accordion.Header>
            <Accordion.Trigger>Seção A</Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Panel>Conteúdo A</Accordion.Panel>
        </Accordion.Item>
      </Accordion.Root>,
    );
    // base-ui keeps the button focusable (does not use native `disabled`) and
    // exposes the state via `aria-disabled` + `data-disabled`.
    expect(screen.getByRole("button", { name: "Seção A" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });
});
