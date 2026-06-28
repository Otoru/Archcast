import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Badge, badgeVariants } from "@/components/ui/badge";

const VARIANTS = [
  "default",
  "secondary",
  "destructive",
  "outline",
  "success",
  "warning",
] as const;

describe("badgeVariants", () => {
  it("default variant includes wf-ink background and 2px border", () => {
    const classes = badgeVariants({ variant: "default" });
    expect(classes).toContain("bg-wf-ink");
    expect(classes).toContain("text-wf-ink-foreground");
    expect(classes).toContain("border-wf-ink");
    expect(classes).toContain("border-2");
  });

  it("secondary variant uses 1px soft border and bold default size", () => {
    const classes = badgeVariants({ variant: "secondary", size: "default" });
    expect(classes).toContain("border-wf-border-soft");
    expect(classes).toContain("bg-wf-secondary");
    expect(classes).toContain("text-wf-ink");
    expect(classes).not.toContain("border-2");
    expect(classes).toContain("font-bold");
  });

  it("destructive variant uses destructive ink text", () => {
    const classes = badgeVariants({ variant: "destructive" });
    expect(classes).toContain("bg-wf-destructive");
    expect(classes).toContain("text-wf-destructive-ink");
    expect(classes).toContain("border-2");
  });

  it("success variant uses success surface and text", () => {
    const classes = badgeVariants({ variant: "success" });
    expect(classes).toContain("bg-wf-success-surface");
    expect(classes).toContain("text-wf-success");
    expect(classes).toContain("border-wf-success");
  });

  it("warning variant uses warning surface and text", () => {
    const classes = badgeVariants({ variant: "warning" });
    expect(classes).toContain("bg-wf-warning-surface");
    expect(classes).toContain("text-wf-warning");
    expect(classes).toContain("border-wf-warning");
  });

  it("outline variant uses surface background and ink border", () => {
    const classes = badgeVariants({ variant: "outline" });
    expect(classes).toContain("bg-wf-surface");
    expect(classes).toContain("border-wf-border");
    expect(classes).toContain("text-wf-ink");
  });

  it("sm size uses smaller text and padding", () => {
    const classes = badgeVariants({ size: "sm" });
    expect(classes).toContain("badge-text-sm");
    expect(classes).toContain("px-1.5");
    expect(classes).toContain("py-0.5");
    expect(classes).toContain("font-bold");
  });
});

describe("Badge", () => {
  it.each(VARIANTS)("renders %s variant", (variant) => {
    render(<Badge variant={variant}>Label</Badge>);
    expect(screen.getByText("Label")).toBeInTheDocument();
  });

  it("renders dot when showDot is true", () => {
    render(
      <Badge showDot data-testid="badge">
        Online
      </Badge>,
    );
    const badge = screen.getByTestId("badge");
    const dot = badge.querySelector("[aria-hidden='true']");
    expect(dot).toBeInTheDocument();
    expect(dot?.className).toContain("size-wf-badge-dot");
    expect(dot?.className).toContain("rounded-full");
    expect(dot?.className).toContain("bg-current");
  });

  it("hides dot when showDot is false", () => {
    render(<Badge data-testid="badge">Online</Badge>);
    expect(
      screen.getByTestId("badge").querySelector("[aria-hidden='true']"),
    ).not.toBeInTheDocument();
  });

  it("success with dot keeps success text color class", () => {
    render(
      <Badge variant="success" showDot data-testid="badge">
        Online
      </Badge>,
    );
    expect(screen.getByTestId("badge").className).toContain("text-wf-success");
  });
});
