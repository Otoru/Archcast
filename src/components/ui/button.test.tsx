import { render, screen } from "@testing-library/react";
import { ArrowRight, Plus } from "lucide-react";
import { describe, expect, it } from "vitest";

import { Button, buttonVariants } from "@/components/ui/button";

const VARIANTS = [
  "default",
  "secondary",
  "outline",
  "ghost",
  "destructive",
  "link",
  "rounded",
] as const;

describe("buttonVariants", () => {
  it("default variant includes wf-ink background", () => {
    expect(buttonVariants({ variant: "default" })).toContain("bg-wf-ink");
  });

  it("rounded variant includes pill radius", () => {
    expect(buttonVariants({ variant: "rounded" })).toContain("rounded-wf-pill");
  });

  it("outline variant has visible hover background", () => {
    expect(buttonVariants({ variant: "outline" })).toContain(
      "hover:bg-wf-secondary",
    );
  });

  it("destructive variant has distinct hover colors", () => {
    const classes = buttonVariants({ variant: "destructive" });
    expect(classes).toContain("hover:bg-wf-destructive-hover");
    expect(classes).toContain("active:bg-wf-destructive-pressed");
  });
});

describe("Button", () => {
  it.each(VARIANTS)("renders %s variant", (variant) => {
    render(<Button variant={variant}>Label</Button>);
    expect(screen.getByRole("button", { name: "Label" })).toBeInTheDocument();
  });

  it("icon size is square 32px", () => {
    render(
      <Button size="icon" aria-label="Add">
        <Plus />
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Add" });
    expect(button.className).toMatch(/size-8|h-8.*w-8|w-8.*h-8/);
  });

  it("sm size has height 32", () => {
    render(<Button size="sm">Small</Button>);
    expect(screen.getByRole("button").className).toContain("h-8");
  });

  it("default size has height 40", () => {
    render(<Button size="default">Default</Button>);
    expect(screen.getByRole("button").className).toContain("h-10");
  });

  it("lg size has height 48", () => {
    render(<Button size="lg">Large</Button>);
    expect(screen.getByRole("button").className).toContain("h-12");
  });

  it("disabled sets disabled attribute and reduced opacity", () => {
    render(<Button disabled>Disabled</Button>);
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button.className).toContain("disabled:opacity-45");
  });

  it("loading shows spinner and keeps content for layout", () => {
    render(<Button loading>Label</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toBeDisabled();
    expect(button.querySelector(".opacity-0")).toHaveTextContent("Label");
    expect(button.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("loading keeps accessible name for screen readers", () => {
    render(<Button loading>Carregando</Button>);
    expect(
      screen.getByRole("button", { name: "Carregando" }),
    ).toBeInTheDocument();
  });

  it("loading preserves button width", () => {
    const { rerender } = render(
      <Button data-testid="btn">
        <Plus />
        Label
        <ArrowRight />
      </Button>,
    );
    const button = screen.getByTestId("btn");
    const widthBefore = button.getBoundingClientRect().width;

    rerender(
      <Button data-testid="btn" loading>
        <Plus />
        Label
        <ArrowRight />
      </Button>,
    );

    expect(button.getBoundingClientRect().width).toBe(widthBefore);
  });

  it("renders with left and right icons", () => {
    render(
      <Button>
        <Plus data-testid="left-icon" />
        Label
        <ArrowRight data-testid="right-icon" />
      </Button>,
    );
    expect(screen.getByTestId("left-icon")).toBeInTheDocument();
    expect(screen.getByTestId("right-icon")).toBeInTheDocument();
    expect(screen.getByText("Label")).toBeInTheDocument();
  });
});
