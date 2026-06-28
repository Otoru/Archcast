import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FileInput, fileInputVariants } from "@/components/ui/file-input";

describe("fileInputVariants", () => {
  it("includes container styles", () => {
    const classes = fileInputVariants();
    expect(classes).toContain("h-10");
    expect(classes).toContain("border-2");
    expect(classes).toContain("rounded-wf");
  });

  it("invalid variant uses destructive border", () => {
    expect(fileInputVariants({ invalid: true })).toContain(
      "border-wf-destructive",
    );
  });

  it("statusIcon variant adds trailing inset", () => {
    expect(fileInputVariants({ statusIcon: true })).toContain("pr-3");
    expect(fileInputVariants({ statusIcon: false })).not.toContain("pr-3");
  });
});

describe("FileInput", () => {
  it("renders trigger and default file name", () => {
    render(
      <FileInput id="file">
        <FileInput.Trigger>Escolher arquivo</FileInput.Trigger>
        <FileInput.Name>nenhum_arquivo.pdf</FileInput.Name>
      </FileInput>,
    );
    expect(screen.getByText("Escolher arquivo")).toBeInTheDocument();
    expect(screen.getByText("nenhum_arquivo.pdf")).toBeInTheDocument();
  });

  it("shows loading state on trigger", () => {
    render(
      <FileInput loading id="file">
        <FileInput.Trigger>Enviando</FileInput.Trigger>
        <FileInput.Name>enviando...</FileInput.Name>
      </FileInput>,
    );
    expect(
      document.querySelector(
        "[data-testid='file'] .lucide-loader-circle, [data-slot='file-input'] .animate-spin",
      ),
    ).toBeTruthy();
  });

  it("renders selected icon when selected", () => {
    render(
      <FileInput selected id="file">
        <FileInput.Trigger>Escolher arquivo</FileInput.Trigger>
        <FileInput.Name>design-spec.pdf</FileInput.Name>
        <FileInput.Icon />
      </FileInput>,
    );
    expect(document.querySelector(".lucide-circle-check")).toBeInTheDocument();
  });
});
