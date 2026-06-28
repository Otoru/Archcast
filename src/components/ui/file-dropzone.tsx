"use client";

import { cva } from "class-variance-authority";
import { CircleAlert, Upload } from "lucide-react";
import {
  type ChangeEvent,
  type ComponentProps,
  createContext,
  type DragEvent,
  useContext,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import { cn } from "@/lib/utils";

const fileDropzoneVariants = cva(
  "flex min-h-[120px] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-wf border-2 border-wf-border bg-wf-surface p-4 text-center font-wf-body transition-colors outline-none hover:bg-wf-breadcrumb-hover focus-visible:border-wf-focus focus-visible:[border-width:3px] data-[invalid=true]:hover:bg-wf-surface data-[selected=true]:hover:bg-wf-surface aria-disabled:pointer-events-none aria-disabled:opacity-55 aria-disabled:hover:bg-wf-surface",
  {
    variants: {
      selected: {
        true: "border-wf-focus [border-width:3px]",
        false: "",
      },
      invalid: {
        true: "border-wf-destructive",
        false: "",
      },
      dragging: {
        true: "bg-wf-breadcrumb-hover",
        false: "",
      },
    },
    defaultVariants: {
      selected: false,
      invalid: false,
      dragging: false,
    },
  },
);

type FileDropzoneContextValue = {
  inputId: string;
  invalid?: boolean;
  selected: boolean;
  disabled?: boolean;
  fileName: string | null;
};

const FileDropzoneContext = createContext<FileDropzoneContextValue | null>(
  null,
);

function useFileDropzoneContext() {
  const context = useContext(FileDropzoneContext);
  if (!context) {
    throw new Error(
      "FileDropzone subcomponents must be used within FileDropzone",
    );
  }
  return context;
}

function assignFilesToInput(input: HTMLInputElement, files: FileList): void {
  const dataTransfer = new DataTransfer();
  for (const file of files) {
    dataTransfer.items.add(file);
  }
  input.files = dataTransfer.files;
}

type FileDropzoneRootProps = Omit<ComponentProps<"label">, "htmlFor"> & {
  selected?: boolean;
  invalid?: boolean;
  disabled?: boolean;
  onFileChange?: ComponentProps<"input">["onChange"];
  accept?: string;
};

function FileDropzoneRoot({
  className,
  children,
  selected,
  invalid = false,
  disabled = false,
  onFileChange,
  accept,
  onDragEnter,
  onDragLeave,
  onDrop,
  ...props
}: Readonly<FileDropzoneRootProps>) {
  const generatedId = useId();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [internalSelected, setInternalSelected] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const isSelected = selected ?? internalSelected;

  const syncFiles = (files: FileList | null) => {
    const hasFiles = (files?.length ?? 0) > 0;
    const nextFileName = hasFiles ? (files?.[0]?.name ?? null) : null;

    if (selected === undefined) {
      setInternalSelected(hasFiles);
    }
    setFileName(nextFileName);
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    syncFiles(event.target.files);
    onFileChange?.(event);
  };

  const handleDragEnter = (event: DragEvent<HTMLLabelElement>) => {
    if (disabled) {
      return;
    }
    event.preventDefault();
    setDragging(true);
    onDragEnter?.(event);
  };

  const handleDragLeave = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    onDragLeave?.(event);
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    if (disabled) {
      return;
    }
    event.preventDefault();
    setDragging(false);

    if (inputRef.current && event.dataTransfer.files.length > 0) {
      assignFilesToInput(inputRef.current, event.dataTransfer.files);
      inputRef.current.dispatchEvent(new Event("change", { bubbles: true }));
    }

    onDrop?.(event);
  };

  const contextValue = useMemo(
    () => ({
      inputId,
      invalid,
      selected: isSelected,
      disabled,
      fileName,
    }),
    [inputId, invalid, isSelected, disabled, fileName],
  );

  return (
    <FileDropzoneContext.Provider value={contextValue}>
      <label
        data-slot="file-dropzone"
        data-selected={isSelected ? "true" : undefined}
        data-invalid={invalid ? "true" : undefined}
        htmlFor={disabled ? undefined : inputId}
        aria-disabled={disabled || undefined}
        aria-describedby={generatedId}
        className={cn(
          fileDropzoneVariants({ selected: isSelected, invalid, dragging }),
          disabled && "pointer-events-none",
          className,
        )}
        onDragEnter={handleDragEnter}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        {...props}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={accept}
          disabled={disabled}
          className="sr-only"
          onChange={handleInputChange}
          tabIndex={-1}
        />
        <div id={generatedId} className="flex flex-col items-center gap-2">
          {children}
        </div>
      </label>
    </FileDropzoneContext.Provider>
  );
}

function FileDropzoneIcon({ className }: Readonly<{ className?: string }>) {
  const { invalid } = useFileDropzoneContext();

  if (invalid) {
    return (
      <CircleAlert
        className={cn("size-5 text-wf-destructive", className)}
        aria-hidden="true"
      />
    );
  }

  return (
    <Upload
      className={cn("size-5 text-wf-ink", className)}
      aria-hidden="true"
    />
  );
}

function FileDropzoneTitle({
  className,
  ...props
}: Readonly<ComponentProps<"p">>) {
  return (
    <p
      data-slot="file-dropzone-title"
      className={cn("wf-text-small font-semibold text-wf-ink", className)}
      {...props}
    />
  );
}

function FileDropzoneHint({
  className,
  children,
  ...props
}: Readonly<ComponentProps<"p">>) {
  const { invalid, selected, fileName } = useFileDropzoneContext();

  return (
    <p
      data-slot="file-dropzone-hint"
      className={cn(
        "wf-text-caption font-normal",
        invalid ? "text-wf-destructive" : "text-wf-ink-soft",
        className,
      )}
      {...props}
    >
      {children ??
        (selected && fileName ? fileName : "PDF, PNG ou JPG até 10MB")}
    </p>
  );
}

const FileDropzone = Object.assign(FileDropzoneRoot, {
  Icon: FileDropzoneIcon,
  Title: FileDropzoneTitle,
  Hint: FileDropzoneHint,
});

export {
  FileDropzone,
  FileDropzoneContext,
  FileDropzoneHint,
  FileDropzoneIcon,
  FileDropzoneRoot,
  FileDropzoneTitle,
  fileDropzoneVariants,
  useFileDropzoneContext,
};
export type { FileDropzoneContextValue, FileDropzoneRootProps };
