import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  Textarea,
  textareaControlVariants,
  textareaShellVariants,
} from "@/components/ui/textarea";

describe("textareaShellVariants", () => {
  it("includes mono-paper shell styles", () => {
    const classes = textareaShellVariants();
    expect(classes).toContain("min-h-24");
    expect(classes).toContain("border-2");
    expect(classes).toContain("p-3");
    expect(classes).toContain("border-wf-destructive");
  });
});

describe("textareaControlVariants", () => {
  it("includes resize inset control styles", () => {
    const classes = textareaControlVariants();
    expect(classes).toContain("-m-2");
    expect(classes).toContain("resize-y");
    expect(classes).toContain("min-h-[5.5rem]");
  });
});

describe("Textarea", () => {
  it("renders with placeholder", () => {
    render(<Textarea placeholder="Escreva sua mensagem..." />);
    expect(
      screen.getByPlaceholderText("Escreva sua mensagem..."),
    ).toBeInTheDocument();
  });

  it("applies shell and control structure", () => {
    render(<Textarea data-testid="textarea-control" className="max-w-md" />);
    expect(screen.getByTestId("textarea-control")).toHaveAttribute(
      "data-slot",
      "textarea-control",
    );
    expect(screen.getByTestId("textarea-control").className).toContain(
      "resize-y",
    );
    expect(
      screen.getByTestId("textarea-control").closest("[data-slot=textarea]"),
    ).toHaveClass("max-w-md");
  });
});
