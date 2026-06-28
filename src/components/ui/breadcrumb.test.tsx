import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  Breadcrumb,
  breadcrumbLinkVariants,
  breadcrumbPageVariants,
} from "@/components/ui/breadcrumb";

describe("breadcrumbLinkVariants", () => {
  it("includes mono-paper link styles and states", () => {
    const classes = breadcrumbLinkVariants();
    expect(classes).toContain("h-8");
    expect(classes).toContain("px-3");
    expect(classes).toContain("text-wf-ink-soft");
    expect(classes).toContain("font-semibold");
    expect(classes).toContain("hover:text-wf-ink");
    expect(classes).toContain("hover:bg-wf-breadcrumb-hover");
    expect(classes).toContain("focus-visible:border-wf-focus");
    expect(classes).toContain("disabled:opacity-45");
  });
});

describe("breadcrumbPageVariants", () => {
  it("includes current page styles", () => {
    const classes = breadcrumbPageVariants();
    expect(classes).toContain("text-wf-ink");
    expect(classes).toContain("font-bold");
  });
});

describe("Breadcrumb", () => {
  it("renders nav with breadcrumb label", () => {
    render(
      <Breadcrumb.Root>
        <Breadcrumb.List>
          <Breadcrumb.Item>
            <Breadcrumb.Page>Início</Breadcrumb.Page>
          </Breadcrumb.Item>
        </Breadcrumb.List>
      </Breadcrumb.Root>,
    );
    expect(
      screen.getByRole("navigation", { name: "breadcrumb" }),
    ).toBeInTheDocument();
  });

  it("marks current page with aria-current", () => {
    render(<Breadcrumb.Page>Configurações</Breadcrumb.Page>);
    expect(screen.getByText("Configurações")).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("applies disabled styles on link", () => {
    render(
      <Breadcrumb.Link href="#" aria-disabled="true">
        Projetos
      </Breadcrumb.Link>,
    );
    expect(screen.getByRole("link", { name: "Projetos" }).className).toContain(
      "disabled:opacity-45",
    );
  });

  it("renders chevron separator", () => {
    render(
      <Breadcrumb.List>
        <Breadcrumb.Separator data-testid="sep" />
      </Breadcrumb.List>,
    );
    expect(
      document.querySelector("[data-testid='sep'] .lucide-chevron-right"),
    ).toBeInTheDocument();
  });

  it("composes three-item breadcrumb", () => {
    render(
      <Breadcrumb.Root>
        <Breadcrumb.List>
          <Breadcrumb.Item>
            <Breadcrumb.Link href="/">Início</Breadcrumb.Link>
          </Breadcrumb.Item>
          <Breadcrumb.Separator />
          <Breadcrumb.Item>
            <Breadcrumb.Link href="/projects">Projetos</Breadcrumb.Link>
          </Breadcrumb.Item>
          <Breadcrumb.Separator />
          <Breadcrumb.Item>
            <Breadcrumb.Page>Configurações</Breadcrumb.Page>
          </Breadcrumb.Item>
        </Breadcrumb.List>
      </Breadcrumb.Root>,
    );
    expect(screen.getByRole("link", { name: "Início" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Projetos" })).toBeInTheDocument();
    expect(screen.getByText("Configurações")).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
