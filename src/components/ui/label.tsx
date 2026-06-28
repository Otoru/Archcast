"use client";

import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

type LabelProps = Omit<ComponentProps<"label">, "htmlFor"> & {
  htmlFor: string;
};

function Label({
  className,
  htmlFor,
  children,
  ...props
}: Readonly<LabelProps>) {
  return (
    <label
      data-slot="label"
      htmlFor={htmlFor}
      className={cn(
        "font-wf-body text-sm font-normal text-wf-ink cursor-pointer select-none peer-disabled:cursor-not-allowed peer-disabled:text-wf-ink-soft",
        className,
      )}
      {...props}
    >
      {children}
    </label>
  );
}

export { Label };
