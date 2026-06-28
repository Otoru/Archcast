import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

describe("Field", () => {
  it("associates label with input", () => {
    render(
      <Field>
        <Field.Label htmlFor="email">E-mail</Field.Label>
        <Input id="email" />
      </Field>,
    );
    expect(screen.getByLabelText("E-mail")).toBeInTheDocument();
  });

  it("renders required asterisk", () => {
    render(
      <Field>
        <Field.Label htmlFor="name" required>
          Nome
        </Field.Label>
        <Input id="name" />
      </Field>,
    );
    expect(screen.getByText("*")).toHaveClass("text-wf-destructive");
  });

  it("renders description with caption styles", () => {
    render(
      <Field>
        <Field.Label htmlFor="user">Nome de usuário</Field.Label>
        <Field.Content>
          <Input id="user" />
          <Field.Description>Use 3+ caracteres, sem espaços.</Field.Description>
        </Field.Content>
      </Field>,
    );
    const description = screen.getByText("Use 3+ caracteres, sem espaços.");
    expect(description.className).toContain("wf-text-caption");
    expect(description.className).toContain("text-wf-ink-soft");
    expect(description.className).toContain("m-0");
  });

  it("renders error message", () => {
    render(
      <Field>
        <Field.Label htmlFor="email">E-mail</Field.Label>
        <Field.Content>
          <Input id="email" aria-invalid />
          <Field.Error>E-mail inválido</Field.Error>
        </Field.Content>
      </Field>,
    );
    const error = screen.getByText("E-mail inválido");
    expect(error.className).toContain("text-wf-destructive");
  });
});
