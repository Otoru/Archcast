import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Folder, LayoutDashboard } from "lucide-react";
import { describe, expect, it } from "vitest";

import {
  Tabs,
  tabsListVariants,
  tabsTriggerVariants,
} from "@/components/ui/tabs";

describe("tabsListVariants", () => {
  it("pill shape includes pill radius and container styles", () => {
    const classes = tabsListVariants({ shape: "pill" });
    expect(classes).toContain("rounded-wf-pill");
    expect(classes).toContain("bg-wf-breadcrumb-hover");
    expect(classes).toContain("border-wf-border");
    expect(classes).toContain("p-2");
    expect(classes).toContain("gap-2");
  });

  it("square shape includes default radius", () => {
    const classes = tabsListVariants({ shape: "square" });
    expect(classes).toContain("rounded-wf");
    expect(classes).not.toContain("rounded-wf-pill");
  });

  it("disabled state reduces opacity and blocks interaction", () => {
    const classes = tabsListVariants();
    expect(classes).toContain("data-disabled:opacity-45");
    expect(classes).toContain("data-disabled:pointer-events-none");
  });
});

describe("tabsTriggerVariants", () => {
  it("includes base segment styles", () => {
    const classes = tabsTriggerVariants({ shape: "pill" });
    expect(classes).toContain("h-10");
    expect(classes).toContain("border-2");
    expect(classes).toContain(
      "[&:not([data-active])]:hover:bg-wf-disabled-surface",
    );
    expect(classes).toContain("data-active:bg-wf-ink");
    expect(classes).toContain("data-active:text-wf-ink-foreground");
    expect(classes).toContain("data-active:hover:bg-wf-ink");
  });

  it("pill shape applies pill radius on triggers", () => {
    expect(tabsTriggerVariants({ shape: "pill" })).toContain("rounded-wf-pill");
  });

  it("square shape applies default radius on triggers", () => {
    expect(tabsTriggerVariants({ shape: "square" })).toContain("rounded-wf");
  });
});

describe("Tabs", () => {
  it("renders tablist with accessible label", () => {
    render(
      <Tabs.Root defaultValue="overview">
        <Tabs.List aria-label="Seção">
          <Tabs.Trigger value="overview">Visão geral</Tabs.Trigger>
          <Tabs.Trigger value="files">Arquivos</Tabs.Trigger>
        </Tabs.List>
      </Tabs.Root>,
    );
    expect(screen.getByRole("tablist", { name: "Seção" })).toBeInTheDocument();
  });

  it("marks defaultValue tab as selected", () => {
    render(
      <Tabs.Root defaultValue="overview">
        <Tabs.List aria-label="Seção">
          <Tabs.Trigger value="overview">Visão geral</Tabs.Trigger>
          <Tabs.Trigger value="files">Arquivos</Tabs.Trigger>
        </Tabs.List>
      </Tabs.Root>,
    );
    expect(screen.getByRole("tab", { name: "Visão geral" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "Arquivos" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("switches selection on click (single select)", async () => {
    const user = userEvent.setup();
    render(
      <Tabs.Root defaultValue="overview">
        <Tabs.List aria-label="Seção">
          <Tabs.Trigger value="overview">Visão geral</Tabs.Trigger>
          <Tabs.Trigger value="files">Arquivos</Tabs.Trigger>
        </Tabs.List>
      </Tabs.Root>,
    );

    await user.click(screen.getByRole("tab", { name: "Arquivos" }));

    expect(screen.getByRole("tab", { name: "Arquivos" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "Visão geral" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("prevents selection changes when list is disabled", async () => {
    const user = userEvent.setup();
    render(
      <Tabs.Root defaultValue="overview">
        <Tabs.List disabled aria-label="Seção">
          <Tabs.Trigger value="overview">Visão geral</Tabs.Trigger>
          <Tabs.Trigger value="files">Arquivos</Tabs.Trigger>
        </Tabs.List>
      </Tabs.Root>,
    );

    await user.click(screen.getByRole("tab", { name: "Arquivos" }));

    expect(screen.getByRole("tab", { name: "Visão geral" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "Arquivos" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("renders icons with text without breaking tab labels", () => {
    render(
      <Tabs.Root defaultValue="overview">
        <Tabs.List aria-label="Seção">
          <Tabs.Trigger value="overview">
            <LayoutDashboard aria-hidden="true" />
            Visão geral
          </Tabs.Trigger>
          <Tabs.Trigger value="files">
            <Folder aria-hidden="true" />
            Arquivos
          </Tabs.Trigger>
        </Tabs.List>
      </Tabs.Root>,
    );

    expect(
      screen.getByRole("tab", { name: "Visão geral" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Arquivos" })).toBeInTheDocument();
  });

  it("shows matching content panel for active tab", () => {
    render(
      <Tabs.Root defaultValue="overview">
        <Tabs.List aria-label="Seção">
          <Tabs.Trigger value="overview">Visão geral</Tabs.Trigger>
          <Tabs.Trigger value="files">Arquivos</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="overview">Painel geral</Tabs.Content>
        <Tabs.Content value="files">Painel de arquivos</Tabs.Content>
      </Tabs.Root>,
    );

    expect(screen.getByRole("tabpanel")).toHaveTextContent("Painel geral");
  });
});
