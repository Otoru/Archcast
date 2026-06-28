import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import {
  Checkbox,
  CheckboxField,
  checkboxVariants,
} from "@/components/ui/checkbox";

describe("checkboxVariants", () => {
  it("unchecked includes wf border and surface", () => {
    expect(checkboxVariants({ invalid: false })).toContain("border-wf-border");
    expect(checkboxVariants({ invalid: false })).toContain("bg-wf-surface");
    expect(checkboxVariants({ invalid: false })).toContain("size-4");
  });

  it("invalid variant uses destructive fill when checked", () => {
    expect(checkboxVariants({ invalid: true })).toContain(
      "border-wf-destructive",
    );
    expect(checkboxVariants({ invalid: true })).toContain("bg-wf-surface");
    expect(checkboxVariants({ invalid: true })).toContain(
      "data-checked:bg-wf-destructive",
    );
    expect(checkboxVariants({ invalid: true })).toContain(
      "data-checked:text-white",
    );
  });
});

describe("Checkbox", () => {
  it("renders unchecked by default", () => {
    render(<Checkbox aria-label="Aceito os termos" />);
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });

  it("renders checked when defaultChecked", () => {
    render(<Checkbox defaultChecked aria-label="Marcado" />);
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("applies invalid border when invalid prop is set", () => {
    render(<Checkbox invalid aria-label="Inválido" />);
    expect(screen.getByRole("checkbox").className).toContain(
      "border-wf-destructive",
    );
  });

  it("invalid checked uses destructive fill", () => {
    render(<Checkbox invalid defaultChecked aria-label="Inválido marcado" />);
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox.className).toContain("data-checked:bg-wf-destructive");
    expect(checkbox.className).toContain("data-checked:text-white");
  });

  it("preserves position when checked", () => {
    const { rerender } = render(
      <Checkbox data-testid="box" aria-label="Teste" />,
    );
    const box = screen.getByTestId("box");
    const topBefore = box.getBoundingClientRect().top;

    rerender(<Checkbox data-testid="box" defaultChecked aria-label="Teste" />);

    expect(box.getBoundingClientRect().top).toBe(topBefore);
  });

  it("preserves box size when checked", () => {
    const { rerender } = render(
      <Checkbox data-testid="box" aria-label="Teste" />,
    );
    const box = screen.getByTestId("box");
    const widthBefore = box.getBoundingClientRect().width;
    const heightBefore = box.getBoundingClientRect().height;

    rerender(<Checkbox data-testid="box" defaultChecked aria-label="Teste" />);

    expect(box.getBoundingClientRect().width).toBe(widthBefore);
    expect(box.getBoundingClientRect().height).toBe(heightBefore);
  });
});

describe("CheckboxField", () => {
  it("associates label with checkbox", async () => {
    const user = userEvent.setup();
    render(<CheckboxField label="Padrão" id="terms" />);

    const checkbox = screen.getByRole("checkbox", { name: "Padrão" });
    expect(checkbox).not.toBeChecked();

    await user.click(screen.getByText("Padrão"));
    expect(checkbox).toBeChecked();
  });

  it("disabled field has reduced opacity wrapper", () => {
    render(<CheckboxField label="Desabilitado" disabled />);
    const wrapper = screen.getByText("Desabilitado").closest("div");
    expect(wrapper?.className).toContain("opacity-55");
    expect(screen.getByRole("checkbox")).toHaveAttribute("data-disabled");
  });

  it("shows CircleAlert when invalid and showInvalidIcon", () => {
    render(
      <CheckboxField
        label="Estado inválido"
        invalid
        showInvalidIcon
        id="invalid"
      />,
    );
    expect(screen.getByRole("checkbox")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(document.querySelector(".lucide-circle-alert")).toBeInTheDocument();
  });

  it("uses destructive label color when invalid and checked", async () => {
    const user = userEvent.setup();
    render(
      <CheckboxField label="Estado inválido" invalid id="invalid-checked" />,
    );

    const label = screen.getByText("Estado inválido");
    expect(label.className).toContain("peer-data-checked:text-wf-destructive");

    await user.click(label);
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("hides CircleAlert when showInvalidIcon is false", () => {
    render(
      <CheckboxField label="Estado inválido" invalid id="invalid-no-icon" />,
    );
    expect(
      document.querySelector(".lucide-circle-alert"),
    ).not.toBeInTheDocument();
  });
});
