import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  FileDropzone,
  fileDropzoneVariants,
} from "@/components/ui/file-dropzone";

describe("fileDropzoneVariants", () => {
  it("includes base dropzone styles", () => {
    const classes = fileDropzoneVariants();
    expect(classes).toContain("min-h-[120px]");
    expect(classes).toContain("border-2");
    expect(classes).toContain("rounded-wf");
    expect(classes).toContain("bg-wf-surface");
    expect(classes).toContain("hover:bg-wf-breadcrumb-hover");
  });

  it("selected variant uses focus border width", () => {
    expect(fileDropzoneVariants({ selected: true })).toContain(
      "border-wf-focus",
    );
  });

  it("invalid variant uses destructive border", () => {
    expect(fileDropzoneVariants({ invalid: true })).toContain(
      "border-wf-destructive",
    );
  });
});

describe("FileDropzone", () => {
  it("renders title and hint", () => {
    render(
      <FileDropzone>
        <FileDropzone.Icon />
        <FileDropzone.Title>
          Arraste e solte ou clique para enviar
        </FileDropzone.Title>
        <FileDropzone.Hint>PDF, PNG ou JPG até 10MB</FileDropzone.Hint>
      </FileDropzone>,
    );
    expect(
      screen.getByText("Arraste e solte ou clique para enviar"),
    ).toBeInTheDocument();
    expect(screen.getByText("PDF, PNG ou JPG até 10MB")).toBeInTheDocument();
  });

  it("associates label with hidden file input", () => {
    render(
      <FileDropzone>
        <FileDropzone.Title>Enviar arquivo</FileDropzone.Title>
      </FileDropzone>,
    );
    const dropzone = screen.getByText("Enviar arquivo").closest("label");
    const input = screen.getByLabelText("Enviar arquivo", {
      selector: "input",
    });

    expect(dropzone).toHaveAttribute("data-slot", "file-dropzone");
    expect(input).toHaveAttribute("type", "file");
  });

  it("enters selected state after choosing a file", () => {
    render(
      <FileDropzone data-testid="dropzone">
        <FileDropzone.Title>Enviar arquivo</FileDropzone.Title>
        <FileDropzone.Hint />
      </FileDropzone>,
    );

    const input = document.querySelector(
      "[data-slot=file-dropzone] input[type=file]",
    ) as HTMLInputElement;
    const file = new File(["content"], "design-spec.pdf", {
      type: "application/pdf",
    });

    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByTestId("dropzone")).toHaveAttribute(
      "data-selected",
      "true",
    );
    expect(screen.getByTestId("dropzone").className).toContain(
      "border-wf-focus",
    );
    expect(screen.getByText("design-spec.pdf")).toBeInTheDocument();
  });
});
