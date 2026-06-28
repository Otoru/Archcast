import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  Blockquote,
  H1,
  InlineCode,
  List,
  Table,
  typographyVariants,
} from "@/components/ui/typography";

describe("typographyVariants", () => {
  it("h1 variant includes heading font and ink color", () => {
    const classes = typographyVariants({ variant: "h1" });
    expect(classes).toContain("font-wf-heading");
    expect(classes).toContain("wf-text-h1");
    expect(classes).toContain("font-bold");
    expect(classes).toContain("text-wf-ink");
  });

  it("lead variant uses soft ink and lead size", () => {
    const classes = typographyVariants({ variant: "lead" });
    expect(classes).toContain("text-wf-ink-soft");
    expect(classes).toContain("wf-text-lead");
  });

  it("muted variant uses soft ink and small size", () => {
    const classes = typographyVariants({ variant: "muted" });
    expect(classes).toContain("text-wf-ink-soft");
    expect(classes).toContain("wf-text-small");
  });

  it("code variant uses code surface and heading font", () => {
    const classes = typographyVariants({ variant: "code" });
    expect(classes).toContain("bg-wf-code-surface");
    expect(classes).toContain("font-wf-heading");
    expect(classes).toContain("wf-text-code");
    expect(classes).toContain("rounded-wf-code");
  });
});

describe("Typography components", () => {
  it("H1 renders h1 with variant classes", () => {
    render(<H1>Título</H1>);
    const heading = screen.getByRole("heading", { level: 1, name: "Título" });
    expect(heading.tagName).toBe("H1");
    expect(heading.className).toContain("wf-text-h1");
  });

  it("InlineCode renders code element", () => {
    render(<InlineCode>@radix-ui/react-alert-dialog</InlineCode>);
    const code = screen.getByText("@radix-ui/react-alert-dialog");
    expect(code.tagName).toBe("CODE");
    expect(code.className).toContain("bg-wf-code-surface");
  });

  it("Blockquote contains decorative bar", () => {
    render(<Blockquote>Citação</Blockquote>);
    expect(screen.getByText("Citação")).toBeInTheDocument();
    expect(
      document.querySelector("blockquote [aria-hidden='true']"),
    ).toBeInTheDocument();
  });

  it("List renders styled list items", () => {
    render(
      <List>
        <List.Item>Item 1</List.Item>
        <List.Item>Item 2</List.Item>
      </List>,
    );
    const list = screen.getByRole("list");
    expect(list.tagName).toBe("UL");
    expect(list.className).toContain("wf-text-p");
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("Table renders accessible table structure", () => {
    render(
      <Table>
        <thead>
          <tr>
            <Table.Head>Coluna A</Table.Head>
            <Table.Head>Coluna B</Table.Head>
          </tr>
        </thead>
        <tbody>
          <tr>
            <Table.Cell>A1</Table.Cell>
            <Table.Cell>B1</Table.Cell>
          </tr>
        </tbody>
      </Table>,
    );
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("table").className).toContain(
      "[&_th]:wf-table-cell",
    );
    expect(screen.getByRole("cell", { name: "A1" })).toBeInTheDocument();
  });
});
