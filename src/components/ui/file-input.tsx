"use client";

import { cva } from "class-variance-authority";
import { CircleAlert, CircleCheck, Loader2 } from "lucide-react";
import {
  type ComponentProps,
  createContext,
  useContext,
  useId,
  useMemo,
  useRef,
} from "react";

import { cn } from "@/lib/utils";

const fileInputVariants = cva(
  "flex h-10 w-full cursor-default items-center gap-1 rounded-wf border-2 border-wf-border bg-wf-surface p-1 font-wf-body data-[disabled=true]:pointer-events-none data-[disabled=true]:cursor-not-allowed data-[disabled=true]:border-wf-border-soft data-[disabled=true]:bg-wf-disabled-surface data-[disabled=true]:opacity-55",
  {
    variants: {
      invalid: {
        true: "border-wf-destructive",
        false: "",
      },
      statusIcon: {
        true: "pr-3",
        false: "",
      },
    },
    defaultVariants: {
      invalid: false,
      statusIcon: false,
    },
  },
);

type FileInputContextValue = {
  inputId: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  loading?: boolean;
  selected?: boolean;
  invalid?: boolean;
  disabled?: boolean;
};

const FileInputContext = createContext<FileInputContextValue | null>(null);

function useFileInputContext() {
  const context = useContext(FileInputContext);
  if (!context) {
    throw new Error("FileInput subcomponents must be used within FileInput");
  }
  return context;
}

type FileInputRootProps = ComponentProps<"div"> & {
  loading?: boolean;
  selected?: boolean;
  invalid?: boolean;
  disabled?: boolean;
  id?: string;
  onFileChange?: ComponentProps<"input">["onChange"];
  accept?: string;
};

function FileInputRoot({
  className,
  children,
  loading = false,
  selected = false,
  invalid = false,
  disabled = false,
  id,
  onFileChange,
  accept,
  ...props
}: Readonly<FileInputRootProps>) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const inputRef = useRef<HTMLInputElement>(null);

  const contextValue = useMemo(
    () => ({ inputId, inputRef, loading, selected, invalid, disabled }),
    [inputId, loading, selected, invalid, disabled],
  );

  return (
    <FileInputContext.Provider value={contextValue}>
      <div
        data-slot="file-input"
        data-testid={id}
        data-disabled={disabled ? "true" : undefined}
        className={cn(
          fileInputVariants({ invalid, statusIcon: selected || invalid }),
          className,
        )}
        {...props}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={accept}
          disabled={disabled || loading}
          className="sr-only"
          onChange={onFileChange}
        />
        {children}
      </div>
    </FileInputContext.Provider>
  );
}

type FileInputTriggerProps = ComponentProps<"button">;

function FileInputTrigger({
  className,
  children,
  ...props
}: Readonly<FileInputTriggerProps>) {
  const { inputId, inputRef, loading, disabled } = useFileInputContext();

  return (
    <button
      type="button"
      data-slot="file-input-trigger"
      disabled={disabled || loading}
      className={cn(
        "inline-flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-wf-code border border-wf-border-soft bg-wf-code-surface px-2.5 wf-text-caption font-semibold text-wf-ink transition-colors hover:bg-wf-secondary disabled:cursor-not-allowed",
        className,
      )}
      onClick={() => inputRef.current?.click()}
      aria-controls={inputId}
      {...props}
    >
      {loading ? (
        <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
      ) : null}
      {children}
    </button>
  );
}

function FileInputName({
  className,
  ...props
}: Readonly<ComponentProps<"span">>) {
  return (
    <span
      data-slot="file-input-name"
      className={cn(
        "min-w-0 flex-1 cursor-default truncate select-none wf-text-caption font-normal text-wf-ink",
        className,
      )}
      {...props}
    />
  );
}

function FileInputIcon({ className }: Readonly<{ className?: string }>) {
  const { selected, invalid, loading } = useFileInputContext();

  if (loading) {
    return null;
  }

  if (invalid) {
    return (
      <span
        data-slot="file-input-status-icon"
        className={cn("inline-flex shrink-0", className)}
      >
        <CircleAlert
          className="size-4 text-wf-destructive"
          aria-hidden="true"
        />
      </span>
    );
  }

  if (selected) {
    return (
      <span
        data-slot="file-input-status-icon"
        className={cn("inline-flex shrink-0", className)}
      >
        <CircleCheck className="size-4 text-wf-ink" aria-hidden="true" />
      </span>
    );
  }

  return null;
}

const FileInput = Object.assign(FileInputRoot, {
  Trigger: FileInputTrigger,
  Name: FileInputName,
  Icon: FileInputIcon,
});

export {
  FileInput,
  FileInputContext,
  FileInputIcon,
  FileInputName,
  FileInputRoot,
  FileInputTrigger,
  fileInputVariants,
};
export type { FileInputContextValue, FileInputRootProps };
