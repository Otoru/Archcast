import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fireEvent, userEvent, waitFor } from "storybook/test";

import {
  FileDropzone,
  useFileDropzoneContext,
} from "@/components/ui/file-dropzone";

const meta = {
  component: FileDropzone,
  tags: ["ai-generated"],
} satisfies Meta<typeof FileDropzone>;

export default meta;
type Story = StoryObj<typeof meta>;

function DropzoneContent() {
  const { selected } = useFileDropzoneContext();

  return (
    <>
      <FileDropzone.Icon />
      <FileDropzone.Title>
        {selected
          ? "Arquivo selecionado"
          : "Arraste e solte ou clique para enviar"}
      </FileDropzone.Title>
      <FileDropzone.Hint />
    </>
  );
}

function getDropzoneRoot(canvasElement: HTMLElement) {
  const root = canvasElement.querySelector('[data-slot="file-dropzone"]');
  if (!(root instanceof HTMLElement)) {
    throw new TypeError("Dropzone root not found");
  }
  return root;
}

function createPdfFile(name = "design-spec.pdf") {
  return new File(["content"], name, { type: "application/pdf" });
}

export const Dropzone: Story = {
  name: "Default",
  render: () => (
    <FileDropzone className="max-w-md">
      <DropzoneContent />
    </FileDropzone>
  ),
  play: async ({ canvasElement, canvas }) => {
    const root = getDropzoneRoot(canvasElement);
    const input = root.querySelector('input[type="file"]');
    if (!(input instanceof HTMLInputElement)) {
      throw new TypeError("File input not found");
    }

    await userEvent.upload(input, createPdfFile());

    await waitFor(() => {
      expect(canvas.getByText("design-spec.pdf")).toBeInTheDocument();
    });
    await expect(root).toHaveAttribute("data-selected", "true");
  },
};

export const DropzoneSelected: Story = {
  name: "Selected",
  render: () => (
    <FileDropzone selected className="max-w-md">
      <FileDropzone.Icon />
      <FileDropzone.Title>Arquivo selecionado</FileDropzone.Title>
      <FileDropzone.Hint>design-spec.pdf</FileDropzone.Hint>
    </FileDropzone>
  ),
};

export const DropzoneInvalid: Story = {
  name: "Invalid",
  render: () => (
    <FileDropzone invalid className="max-w-md">
      <FileDropzone.Icon />
      <FileDropzone.Title>Arquivo inválido</FileDropzone.Title>
      <FileDropzone.Hint>
        Arquivo inválido. Tente PNG ou JPG até 10MB.
      </FileDropzone.Hint>
    </FileDropzone>
  ),
  play: async ({ canvas }) => {
    await expect(
      canvas.getByText(/Arquivo inválido. Tente PNG ou JPG/i),
    ).toHaveClass("text-wf-destructive");
  },
};

export const DropzoneDisabled: Story = {
  name: "Disabled",
  render: () => (
    <FileDropzone disabled className="max-w-md">
      <FileDropzone.Icon />
      <FileDropzone.Title>Envio indisponível</FileDropzone.Title>
      <FileDropzone.Hint>PDF, PNG ou JPG até 10MB</FileDropzone.Hint>
    </FileDropzone>
  ),
  play: async ({ canvasElement, canvas }) => {
    const root = getDropzoneRoot(canvasElement);
    const input = root.querySelector('input[type="file"]');

    await expect(input).toBeDisabled();
    await expect(root).toHaveAttribute("aria-disabled", "true");

    const file = createPdfFile();
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    fireEvent.dragEnter(root, { dataTransfer });
    fireEvent.drop(root, { dataTransfer });

    await expect(canvas.queryByText("design-spec.pdf")).not.toBeInTheDocument();
  },
};

export const DropzoneDragAndDrop: Story = {
  name: "DragAndDrop",
  render: () => (
    <FileDropzone className="max-w-md">
      <DropzoneContent />
    </FileDropzone>
  ),
  play: async ({ canvasElement }) => {
    const root = getDropzoneRoot(canvasElement);
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(createPdfFile());

    fireEvent.dragEnter(root, { dataTransfer });
    expect(root.className.split(/\s+/)).toContain("bg-wf-breadcrumb-hover");

    fireEvent.dragLeave(root, { dataTransfer });
    expect(root.className.split(/\s+/)).not.toContain("bg-wf-breadcrumb-hover");

    fireEvent.drop(root, { dataTransfer });
  },
};
