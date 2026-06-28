"use client";

import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

function FieldRoot({ className, ...props }: Readonly<ComponentProps<"div">>) {
  return (
    <div
      data-slot="field"
      className={cn("flex w-full flex-col gap-1.5 font-wf-body", className)}
      {...props}
    />
  );
}

type FieldLabelProps = ComponentProps<"label"> & {
  required?: boolean;
};

function FieldLabel({
  className,
  children,
  required,
  ...props
}: Readonly<FieldLabelProps>) {
  return (
    <label
      data-slot="field-label"
      className={cn("wf-text-small font-semibold text-wf-ink", className)}
      {...props}
    >
      {children}
      {required ? (
        <span className="ml-1 font-bold text-wf-destructive" aria-hidden="true">
          *
        </span>
      ) : null}
    </label>
  );
}

function FieldDescription({
  className,
  ...props
}: Readonly<ComponentProps<"p">>) {
  return (
    <p
      data-slot="field-description"
      className={cn(
        "m-0 wf-text-caption font-normal text-wf-ink-soft",
        className,
      )}
      {...props}
    />
  );
}

function FieldError({
  className,
  children,
  ...props
}: Readonly<ComponentProps<"p">>) {
  if (!children) {
    return null;
  }

  return (
    <p
      data-slot="field-error"
      role="alert"
      className={cn(
        "m-0 wf-text-caption font-normal text-wf-destructive",
        className,
      )}
      {...props}
    >
      {children}
    </p>
  );
}

function FieldContent({
  className,
  ...props
}: Readonly<ComponentProps<"div">>) {
  return (
    <div
      data-slot="field-content"
      className={cn("flex flex-col gap-1", className)}
      {...props}
    />
  );
}

const Field = Object.assign(FieldRoot, {
  Label: FieldLabel,
  Description: FieldDescription,
  Error: FieldError,
  Content: FieldContent,
});

export {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldRoot,
};
export type { FieldLabelProps };
