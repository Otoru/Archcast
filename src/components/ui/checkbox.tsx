"use client";

import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { cva, type VariantProps } from "class-variance-authority";
import { Check, CircleAlert } from "lucide-react";
import { useId } from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const checkboxVariants = cva(
  "peer relative inline-flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-wf-checkbox border-2 bg-wf-surface transition-colors outline-none disabled:cursor-not-allowed disabled:border-wf-border-soft disabled:bg-wf-disabled-surface focus-visible:outline-2 focus-visible:outline-offset-1",
  {
    variants: {
      invalid: {
        false:
          "border-wf-border focus-visible:outline-wf-ink data-checked:border-wf-ink data-checked:bg-wf-ink data-checked:text-white",
        true: "border-wf-destructive focus-visible:outline-wf-destructive data-checked:border-wf-destructive data-checked:bg-wf-destructive data-checked:text-white",
      },
    },
    defaultVariants: {
      invalid: false,
    },
  },
);

type CheckboxProps = CheckboxPrimitive.Root.Props &
  VariantProps<typeof checkboxVariants> & {
    invalid?: boolean;
  };

function Checkbox({
  className,
  invalid = false,
  ...props
}: Readonly<CheckboxProps>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(checkboxVariants({ invalid }), className)}
      aria-invalid={invalid || props["aria-invalid"] || undefined}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="absolute inset-0 flex items-center justify-center text-current"
      >
        <Check className="size-wf-check-icon" aria-hidden="true" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

type CheckboxFieldProps = Omit<CheckboxProps, "invalid"> & {
  label: string;
  id?: string;
  invalid?: boolean;
  showInvalidIcon?: boolean;
};

function CheckboxField({
  label,
  id,
  invalid = false,
  showInvalidIcon = false,
  disabled,
  className,
  ...props
}: Readonly<CheckboxFieldProps>) {
  const generatedId = useId();
  const checkboxId = id ?? generatedId;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2",
        disabled && "opacity-55",
        className,
      )}
    >
      <Checkbox
        id={checkboxId}
        invalid={invalid}
        disabled={disabled}
        {...props}
      />
      <Label
        htmlFor={checkboxId}
        className={cn(
          invalid && "peer-data-checked:text-wf-destructive",
          disabled && "cursor-not-allowed text-wf-ink-soft",
        )}
      >
        {label}
      </Label>
      {invalid && showInvalidIcon ? (
        <CircleAlert
          className="size-wf-check-icon shrink-0 text-wf-destructive"
          aria-hidden="true"
        />
      ) : null}
    </div>
  );
}

export { Checkbox, CheckboxField, checkboxVariants };
