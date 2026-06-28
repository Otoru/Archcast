import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { fieldControlVariants, Input } from "@/components/ui/input";

describe("fieldControlVariants", () => {
  it("includes mono-paper input base styles", () => {
    const classes = fieldControlVariants();
    expect(classes).toContain("border-2");
    expect(classes).toContain("rounded-wf");
    expect(classes).toContain("bg-wf-surface");
    expect(classes).toContain("border-wf-border");
    expect(classes).toContain("placeholder:text-wf-ink-soft");
    expect(classes).toContain("focus-wf-ring");
    expect(classes).toContain("disabled:opacity-55");
    expect(classes).toContain("disabled:bg-wf-disabled-surface");
    expect(classes).toContain("aria-invalid:border-wf-destructive");
  });
});

describe("Input", () => {
  it("renders with placeholder", () => {
    render(<Input placeholder="Digite aqui..." />);
    expect(screen.getByPlaceholderText("Digite aqui...")).toBeInTheDocument();
  });

  it("applies field control classes", () => {
    render(<Input data-testid="input" />);
    expect(screen.getByTestId("input").className).toContain("h-10");
  });

  it("marks invalid state via aria-invalid", () => {
    render(<Input aria-invalid data-testid="input" />);
    expect(screen.getByTestId("input")).toHaveAttribute("aria-invalid", "true");
  });
});
