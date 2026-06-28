"use client";

import { Input as InputPrimitive } from "@base-ui/react/input";
import { cva, type VariantProps } from "class-variance-authority";
import {
  type ComponentProps,
  createContext,
  type HTMLAttributes,
  useContext,
  useId,
  useMemo,
} from "react";

import { Button } from "@/components/ui/button";
import { inputGroupControlVariants } from "@/components/ui/input";
import { textareaGroupControlVariants } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type InputGroupContextValue = {
  controlId: string;
};

const InputGroupContext = createContext<InputGroupContextValue | null>(null);

const inputGroupVariants = cva(
  "group/input-group relative m-0 flex h-10 w-full min-w-0 items-center gap-0 rounded-wf border-2 border-wf-border bg-wf-surface p-1 transition-[border-color] has-disabled:pointer-events-none has-disabled:border-wf-border-soft has-disabled:bg-wf-disabled-surface has-disabled:opacity-55 has-[[data-slot=input-group-control][aria-invalid=true]]:border-wf-destructive has-[[data-slot=input-group-control]:focus-visible]:[border-width:3px] has-[[data-slot=input-group-control][aria-invalid=true]:focus-visible]:border-wf-destructive has-[[data-slot=input-group-control]:not([aria-invalid=true]):focus-visible]:border-wf-focus has-[>[data-slot=input-group-button][data-action=inline]]:gap-1.5 has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-start]]:h-auto has-[>textarea]:block has-[>textarea]:h-auto has-[>textarea]:min-h-24 has-[>textarea]:p-3",
);

function InputGroupRoot({
  className,
  ...props
}: Readonly<ComponentProps<"fieldset">>) {
  const controlId = useId();
  const contextValue = useMemo(() => ({ controlId }), [controlId]);

  return (
    <InputGroupContext.Provider value={contextValue}>
      <fieldset
        data-slot="input-group"
        className={cn(inputGroupVariants(), className)}
        {...props}
      />
    </InputGroupContext.Provider>
  );
}

function InputGroupContent({
  className,
  ...props
}: Readonly<ComponentProps<"div">>) {
  return (
    <div
      data-slot="input-group-content"
      className={cn("flex min-w-0 flex-1 items-center gap-2", className)}
      {...props}
    />
  );
}

const inputGroupAddonVariants = cva(
  "flex shrink-0 items-center justify-center self-center text-wf-ink-soft select-none [&>svg:not([class*='size-'])]:block [&>svg:not([class*='size-'])]:size-4",
  {
    variants: {
      align: {
        "inline-start": "size-7 cursor-text",
        "inline-end": "size-7 cursor-default",
        "block-start": "w-full cursor-text justify-start self-auto",
        "block-end":
          "pointer-events-none absolute right-3 bottom-2 z-10 flex w-auto shrink-0 cursor-default justify-end",
      },
    },
    defaultVariants: {
      align: "inline-start",
    },
  },
);

type InputGroupAddonAlign = NonNullable<
  VariantProps<typeof inputGroupAddonVariants>["align"]
>;

type InputGroupAddonProps = HTMLAttributes<HTMLElement> &
  VariantProps<typeof inputGroupAddonVariants>;

function isFocusTargetAlign(
  align: InputGroupAddonAlign,
): align is "inline-start" | "block-start" {
  return align === "inline-start" || align === "block-start";
}

function InputGroupAddon({
  className,
  align = "inline-start",
  children,
  ...props
}: Readonly<InputGroupAddonProps>) {
  const context = useContext(InputGroupContext);
  const resolvedAlign: InputGroupAddonAlign = align ?? "inline-start";
  const addonClassName = cn(
    inputGroupAddonVariants({ align: resolvedAlign }),
    className,
  );

  if (isFocusTargetAlign(resolvedAlign) && context) {
    return (
      <label
        htmlFor={context.controlId}
        data-slot="input-group-addon"
        data-align={resolvedAlign}
        className={addonClassName}
        {...props}
      >
        {children}
      </label>
    );
  }

  return (
    <div
      data-slot="input-group-addon"
      data-align={resolvedAlign}
      className={addonClassName}
      {...props}
    />
  );
}

function InputGroupSeparator({
  className,
  ...props
}: Readonly<ComponentProps<"hr">>) {
  return (
    <hr
      data-slot="input-group-separator"
      aria-orientation="vertical"
      className={cn(
        "h-6 w-px shrink-0 self-center border-0 bg-wf-border-soft",
        className,
      )}
      {...props}
    />
  );
}

function InputGroupInput({
  className,
  type,
  id,
  ...props
}: Readonly<InputPrimitive.Props>) {
  const context = useContext(InputGroupContext);

  return (
    <InputPrimitive
      type={type}
      id={id ?? context?.controlId}
      data-slot="input-group-control"
      className={cn(inputGroupControlVariants(), className)}
      {...props}
    />
  );
}

function InputGroupTextarea({
  className,
  id,
  ...props
}: Readonly<ComponentProps<"textarea">>) {
  const context = useContext(InputGroupContext);

  return (
    <textarea
      id={id ?? context?.controlId}
      data-slot="input-group-control"
      className={cn(textareaGroupControlVariants(), className)}
      {...props}
    />
  );
}

function InputGroupButton({
  className,
  size = "sm",
  ...props
}: Readonly<ComponentProps<typeof Button>>) {
  return (
    <Button
      data-slot="input-group-button"
      data-action="inline"
      size={size}
      className={cn(
        "h-7 shrink-0 self-center rounded-wf-checkbox focus-visible:[border-width:2px]",
        className,
      )}
      {...props}
    />
  );
}

function InputGroupIconButton({
  className,
  children,
  ...props
}: Readonly<ComponentProps<typeof Button>>) {
  return (
    <Button
      data-slot="input-group-icon-button"
      variant="ghost"
      size="icon"
      className={cn(
        "size-7 shrink-0 self-center rounded-wf-checkbox focus-visible:[border-width:2px] [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      {children}
    </Button>
  );
}

function InputGroupText({
  className,
  ...props
}: Readonly<ComponentProps<"span">>) {
  return (
    <span
      data-slot="input-group-text"
      className={cn(
        "flex items-center gap-2 text-sm text-wf-ink-soft [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

const InputGroup = Object.assign(InputGroupRoot, {
  Content: InputGroupContent,
  Addon: InputGroupAddon,
  Separator: InputGroupSeparator,
  Input: InputGroupInput,
  Textarea: InputGroupTextarea,
  Button: InputGroupButton,
  IconButton: InputGroupIconButton,
  Text: InputGroupText,
});

export {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupContent,
  InputGroupIconButton,
  InputGroupInput,
  InputGroupRoot,
  InputGroupSeparator,
  InputGroupText,
  InputGroupTextarea,
  inputGroupAddonVariants,
  inputGroupVariants,
};
