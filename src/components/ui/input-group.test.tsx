import { render, screen } from "@testing-library/react";
import { Search } from "lucide-react";
import { describe, expect, it } from "vitest";

import { InputGroup, inputGroupVariants } from "@/components/ui/input-group";

describe("inputGroupVariants", () => {
  it("includes mono-paper group container styles", () => {
    const classes = inputGroupVariants();
    expect(classes).toContain("h-10");
    expect(classes).toContain("border-2");
    expect(classes).toContain("rounded-wf");
    expect(classes).toContain("border-wf-border");
    expect(classes).toContain("bg-wf-surface");
    expect(classes).toContain("p-1");
  });
});

describe("InputGroup", () => {
  it("composes addon and input", () => {
    render(
      <InputGroup>
        <InputGroup.Content>
          <InputGroup.Addon>
            <Search aria-hidden="true" />
          </InputGroup.Addon>
          <InputGroup.Input placeholder="Pesquisar..." aria-label="Pesquisar" />
        </InputGroup.Content>
      </InputGroup>,
    );
    expect(screen.getByRole("group")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Pesquisar...")).toBeInTheDocument();
  });

  it("renders separator between input and button slot", () => {
    render(
      <InputGroup data-testid="group">
        <InputGroup.Input aria-label="Buscar" />
        <InputGroup.Separator data-testid="sep" />
        <InputGroup.Button>Buscar</InputGroup.Button>
      </InputGroup>,
    );
    expect(screen.getByTestId("sep").className).toContain("bg-wf-border-soft");
  });

  it("renders borderless inner control without focus ring", () => {
    render(
      <InputGroup>
        <InputGroup.Input aria-label="Buscar" />
      </InputGroup>,
    );
    const control = screen.getByRole("textbox");
    expect(control.className).toContain("border-0");
    expect(control.className).toContain("bg-transparent");
    expect(control.className).toContain("appearance-none");
    expect(control.className).not.toContain("focus-wf-ring");
    expect(control.className).not.toContain("border-2");
  });
});
