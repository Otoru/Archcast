import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import {
  Combobox,
  type ComboboxOption,
  comboboxItemVariants,
  comboboxTriggerVariants,
} from "@/components/ui/combobox";

const items: ComboboxOption[] = [
  { value: "design", label: "Sistema de Design" },
  { value: "react", label: "React" },
  { value: "vue", label: "Vue" },
];

const groupedItems = [
  {
    value: "FRONTEND",
    items: [
      { value: "react", label: "React" },
      { value: "vue", label: "Vue" },
    ],
  },
  {
    value: "BACKEND",
    items: [{ value: "go", label: "Go", disabled: true }],
  },
];

describe("comboboxTriggerVariants", () => {
  it("includes mono-paper trigger styles", () => {
    const classes = comboboxTriggerVariants();
    expect(classes).toContain("h-10");
    expect(classes).toContain("border-2");
    expect(classes).toContain("rounded-wf");
    expect(classes).toContain("border-wf-border");
  });

  it("invalid variant uses destructive border", () => {
    expect(comboboxTriggerVariants({ invalid: true })).toContain(
      "border-wf-destructive",
    );
  });

  it("multi variant uses flexible height", () => {
    expect(comboboxTriggerVariants({ multiple: true })).toContain("min-h-10");
  });
});

describe("comboboxItemVariants", () => {
  it("includes option row styles", () => {
    const classes = comboboxItemVariants();
    expect(classes).toContain("h-9");
    expect(classes).toContain("px-3");
  });

  it("disabled variant reduces opacity", () => {
    expect(comboboxItemVariants({ disabled: true })).toContain("opacity-55");
  });
});

describe("Combobox", () => {
  it("renders trigger placeholder", () => {
    render(
      <Combobox items={items}>
        <Combobox.Trigger>
          <Combobox.Value placeholder="Selecionar..." />
          <Combobox.Actions />
        </Combobox.Trigger>
        <Combobox.Content>
          <Combobox.List />
        </Combobox.Content>
      </Combobox>,
    );
    expect(screen.getByText("Selecionar...")).toBeInTheDocument();
  });

  it("shows selected value in trigger", async () => {
    render(
      <Combobox items={items} defaultValue={items[0]}>
        <Combobox.Trigger>
          <Combobox.Value placeholder="Selecionar..." />
          <Combobox.Actions />
        </Combobox.Trigger>
        <Combobox.Content>
          <Combobox.List />
        </Combobox.Content>
      </Combobox>,
    );
    expect(screen.getByText("Sistema de Design")).toBeInTheDocument();
  });

  it("shows clear button when clearable and has value", () => {
    render(
      <Combobox items={items} defaultValue={items[0]}>
        <Combobox.Trigger clearable>
          <Combobox.Value placeholder="Selecionar..." />
          <Combobox.Actions />
        </Combobox.Trigger>
        <Combobox.Content>
          <Combobox.List />
        </Combobox.Content>
      </Combobox>,
    );
    expect(screen.getByRole("button", { name: /limpar/i })).toBeInTheDocument();
  });

  it("marks invalid trigger with aria-invalid", () => {
    render(
      <Combobox items={items} invalid defaultValue={items[0]}>
        <Combobox.Trigger>
          <Combobox.Value placeholder="Selecionar..." />
          <Combobox.Actions />
        </Combobox.Trigger>
        <Combobox.Content>
          <Combobox.List />
        </Combobox.Content>
      </Combobox>,
    );
    expect(screen.getByRole("combobox")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("disables trigger when disabled", () => {
    render(
      <Combobox items={items} disabled>
        <Combobox.Trigger>
          <Combobox.Value placeholder="Selecionar..." />
          <Combobox.Actions />
        </Combobox.Trigger>
        <Combobox.Content>
          <Combobox.List />
        </Combobox.Content>
      </Combobox>,
    );
    // Trigger renders as <div role="combobox"> (not <button>) so it can nest
    // the Clear/ChipRemove buttons, therefore the disabled state comes via
    // `aria-disabled`, not the native `disabled` attribute.
    expect(screen.getByRole("combobox")).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("renders multi chips for selected values", () => {
    render(
      <Combobox items={items} multiple defaultValue={[items[0], items[1]]}>
        <Combobox.Trigger clearable>
          <Combobox.Chips />
          <Combobox.Actions />
        </Combobox.Trigger>
        <Combobox.Content>
          <Combobox.List />
        </Combobox.Content>
      </Combobox>,
    );
    expect(screen.getByText("Sistema de Design")).toBeInTheDocument();
    expect(screen.getByText("React")).toBeInTheDocument();
  });

  it("renders group labels", async () => {
    const user = userEvent.setup();
    render(
      <Combobox items={groupedItems} defaultOpen>
        <Combobox.Trigger>
          <Combobox.Value placeholder="Selecionar..." />
          <Combobox.Actions />
        </Combobox.Trigger>
        <Combobox.Content>
          <Combobox.List />
        </Combobox.Content>
      </Combobox>,
    );
    await waitFor(() => {
      expect(screen.getByText("FRONTEND")).toBeInTheDocument();
    });
    expect(screen.getByText("BACKEND")).toBeInTheDocument();
    await user.click(screen.getByRole("option", { name: "React" }));
    expect(screen.getByText("React")).toBeInTheDocument();
  });

  it("filters options when searching", async () => {
    const user = userEvent.setup();
    render(
      <Combobox items={items} defaultOpen>
        <Combobox.Trigger>
          <Combobox.Value placeholder="Selecionar..." />
          <Combobox.Actions />
        </Combobox.Trigger>
        <Combobox.Content>
          <Combobox.Search placeholder="Buscar..." />
          <Combobox.List />
        </Combobox.Content>
      </Combobox>,
    );
    const search = await screen.findByPlaceholderText("Buscar...");
    await user.type(search, "Vue");
    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Vue" })).toBeInTheDocument();
    });
    expect(
      screen.queryByRole("option", { name: "React" }),
    ).not.toBeInTheDocument();
  });

  it("selects option on click", async () => {
    const user = userEvent.setup();
    render(
      <Combobox items={items} defaultOpen>
        <Combobox.Trigger>
          <Combobox.Value placeholder="Selecionar..." />
          <Combobox.Actions />
        </Combobox.Trigger>
        <Combobox.Content>
          <Combobox.List />
        </Combobox.Content>
      </Combobox>,
    );
    await user.click(await screen.findByRole("option", { name: "React" }));
    expect(screen.getByText("React")).toBeInTheDocument();
  });

  it("clears value when clear is clicked", async () => {
    const user = userEvent.setup();
    render(
      <Combobox items={items} defaultValue={items[0]}>
        <Combobox.Trigger clearable>
          <Combobox.Value placeholder="Selecionar..." />
          <Combobox.Actions />
        </Combobox.Trigger>
        <Combobox.Content>
          <Combobox.List />
        </Combobox.Content>
      </Combobox>,
    );
    await user.click(screen.getByRole("button", { name: /limpar/i }));
    expect(screen.getByText("Selecionar...")).toBeInTheDocument();
  });
});
