"use client";

import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import { cva } from "class-variance-authority";
import { Check, ChevronDown, CircleAlert, Search, X } from "lucide-react";
import {
  type ComponentProps,
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useId,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";

import { badgeVariants } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type ComboboxOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type ComboboxGroupOption = {
  value: string;
  items: ComboboxOption[];
};

type ComboboxItemsProp =
  | readonly ComboboxOption[]
  | readonly ComboboxGroupOption[];

type ComboboxContextValue = {
  items: ComboboxItemsProp;
  invalid?: boolean;
  clearable?: boolean;
  multiple?: boolean;
  valueLabelId?: string;
  registerValueLabelId?: (id: string) => void;
};

const ComboboxContext = createContext<ComboboxContextValue | null>(null);

function useComboboxContext() {
  const context = useContext(ComboboxContext);
  if (!context) {
    throw new Error("Combobox subcomponents must be used within Combobox");
  }
  return context;
}

const comboboxTriggerVariants = cva(
  "flex w-full min-w-0 cursor-pointer items-center gap-2 rounded-wf border-2 border-wf-border bg-wf-surface px-3 font-wf-body text-sm transition-[border-color] outline-none select-none focus-visible:border-wf-focus focus-visible:[border-width:3px] data-popup-open:border-wf-focus data-popup-open:[border-width:3px] data-[disabled]:cursor-not-allowed data-[disabled]:border-wf-border-soft data-[disabled]:bg-wf-disabled-surface data-[disabled]:opacity-55",
  {
    variants: {
      invalid: {
        true: "border-wf-destructive focus-visible:border-wf-destructive data-popup-open:border-wf-destructive",
        false: "",
      },
      multiple: {
        true: "min-h-10 h-auto py-1.5",
        false: "h-10",
      },
    },
    defaultVariants: {
      invalid: false,
      multiple: false,
    },
  },
);

const comboboxPopupVariants = cva(
  "z-50 max-h-72 w-(--anchor-width) overflow-hidden rounded-wf border-2 border-wf-border bg-wf-surface shadow-none outline-none",
);

const comboboxItemVariants = cva(
  "flex h-9 cursor-pointer items-center gap-2 px-3 text-sm text-wf-ink outline-none select-none data-highlighted:bg-wf-breadcrumb-hover",
  {
    variants: {
      disabled: {
        true: "cursor-not-allowed opacity-55",
        false: "",
      },
    },
    defaultVariants: {
      disabled: false,
    },
  },
);

const comboboxGroupLabelVariants = cva(
  "px-3 pt-2 pb-1 wf-text-caption font-semibold text-wf-ink-soft uppercase",
);

function isGroupedItems(
  items: ComboboxItemsProp,
): items is readonly ComboboxGroupOption[] {
  return items.length > 0 && "items" in items[0];
}

type ComboboxRootProps<
  Value,
  Multiple extends boolean | undefined = false,
> = ComboboxPrimitive.Root.Props<Value, Multiple> & {
  items: ComboboxItemsProp;
  invalid?: boolean;
  className?: string;
};

function ComboboxRoot<Value, Multiple extends boolean | undefined = false>({
  items,
  invalid = false,
  multiple,
  className,
  children,
  ...props
}: Readonly<ComboboxRootProps<Value, Multiple>>) {
  const filter = ComboboxPrimitive.useFilter({
    multiple: Boolean(multiple),
    value: props.value,
  });
  const [valueLabelId, setValueLabelId] = useState<string>();
  const registerValueLabelId = useCallback((id: string) => {
    setValueLabelId(id);
  }, []);

  const contextValue = useMemo(
    () => ({
      items,
      invalid,
      clearable: false,
      multiple: Boolean(multiple),
      valueLabelId,
      registerValueLabelId,
    }),
    [items, invalid, multiple, valueLabelId, registerValueLabelId],
  );

  return (
    <ComboboxContext.Provider value={contextValue}>
      <ComboboxPrimitive.Root
        filter={filter.contains}
        multiple={multiple}
        items={items as ComboboxPrimitive.Root.Props<Value, Multiple>["items"]}
        {...props}
      >
        <div data-slot="combobox" className={cn("relative w-full", className)}>
          {children}
        </div>
      </ComboboxPrimitive.Root>
    </ComboboxContext.Provider>
  );
}

type ComboboxTriggerProps = ComponentProps<typeof ComboboxPrimitive.Trigger> & {
  clearable?: boolean;
};

function ComboboxTrigger({
  className,
  clearable = false,
  children,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  ...props
}: Readonly<ComboboxTriggerProps>) {
  const context = useComboboxContext();

  return (
    <ComboboxContext.Provider
      value={{ ...context, clearable: clearable || context.clearable }}
    >
      <ComboboxPrimitive.Trigger
        data-slot="combobox-trigger"
        nativeButton={false}
        aria-invalid={context.invalid || undefined}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy ?? context.valueLabelId}
        // Render as a `<div>` (not a `<button>`) so interactive children like
        // `Combobox.Clear` and `Combobox.ChipRemove` (which render `<button>`s)
        // are valid HTML — a `<button>` cannot contain nested `<button>`s.
        // `nativeButton={false}` tells base-ui we intentionally drop native
        // button semantics; it still merges `role="combobox"`, aria and the
        // open-on-click/keyboard behavior onto the div.
        render={<div />}
        className={(state) =>
          cn(
            comboboxTriggerVariants({
              invalid: context.invalid,
              multiple: context.multiple,
            }),
            typeof className === "function" ? className(state) : className,
          )
        }
        {...props}
      >
        {children}
      </ComboboxPrimitive.Trigger>
    </ComboboxContext.Provider>
  );
}

function ComboboxValue({
  className,
  placeholder,
  ...props
}: Readonly<
  ComponentProps<typeof ComboboxPrimitive.Value> & { className?: string }
>) {
  const { registerValueLabelId } = useComboboxContext();
  const valueLabelId = useId();

  useLayoutEffect(() => {
    registerValueLabelId?.(valueLabelId);
  }, [registerValueLabelId, valueLabelId]);

  return (
    <span
      id={valueLabelId}
      className={cn(
        "min-w-0 flex-1 truncate text-left text-sm text-wf-ink",
        className,
      )}
    >
      <ComboboxPrimitive.Value
        placeholder={
          placeholder != null ? (
            <span className="text-wf-ink-soft">{placeholder}</span>
          ) : undefined
        }
        {...props}
      />
    </span>
  );
}

function ComboboxActions({ className }: Readonly<{ className?: string }>) {
  const { invalid, clearable } = useComboboxContext();

  return (
    <div
      data-slot="combobox-actions"
      className={cn("flex shrink-0 items-center gap-2", className)}
    >
      {invalid ? (
        <span
          data-slot="combobox-invalid-icon"
          className="inline-flex size-5 shrink-0 items-center justify-center"
          aria-hidden="true"
        >
          <CircleAlert className="size-4 text-wf-destructive" />
        </span>
      ) : clearable ? (
        <ComboboxPrimitive.Clear
          data-slot="combobox-clear"
          aria-label="Limpar seleção"
          className="inline-flex size-5 cursor-pointer items-center justify-center rounded-wf text-wf-ink-soft transition-colors outline-none hover:bg-wf-breadcrumb-hover hover:text-wf-ink focus-visible:ring-2 focus-visible:ring-wf-focus"
        >
          <X className="size-4" aria-hidden="true" />
        </ComboboxPrimitive.Clear>
      ) : null}
      <ChevronDown className="size-4 text-wf-ink-soft" aria-hidden="true" />
    </div>
  );
}

function ComboboxChips({
  placeholder = "Selecionar...",
  className,
}: Readonly<{ placeholder?: string; className?: string }>) {
  const { registerValueLabelId } = useComboboxContext();
  const valueLabelId = useId();

  useLayoutEffect(() => {
    registerValueLabelId?.(valueLabelId);
  }, [registerValueLabelId, valueLabelId]);

  return (
    <div
      id={valueLabelId}
      data-slot="combobox-chips"
      className={cn("min-w-0 flex-1", className)}
    >
      <ComboboxPrimitive.Value>
        {(selected: ComboboxOption | ComboboxOption[] | null) => {
          const values = Array.isArray(selected) ? selected : [];

          if (values.length === 0) {
            return (
              <span className="truncate text-sm text-wf-ink-soft">
                {placeholder}
              </span>
            );
          }

          return (
            <ComboboxPrimitive.Chips className="flex flex-wrap gap-1.5">
              {values.map((item) => (
                <ComboboxPrimitive.Chip
                  key={item.value}
                  aria-label={item.label}
                  render={(chipProps) => (
                    <span
                      {...chipProps}
                      className={cn(
                        badgeVariants({ variant: "secondary", size: "sm" }),
                        "max-w-full",
                        chipProps.className,
                      )}
                    >
                      <span className="min-w-0 truncate">{item.label}</span>
                      <ComboboxPrimitive.ChipRemove
                        aria-label={`Remover ${item.label}`}
                        className="-mr-0.5 inline-flex size-3.5 shrink-0 cursor-pointer items-center justify-center rounded-full text-wf-ink-soft transition-colors outline-none hover:bg-black/5 hover:text-wf-ink focus-visible:ring-2 focus-visible:ring-wf-focus"
                      >
                        <X className="size-2.5" aria-hidden="true" />
                      </ComboboxPrimitive.ChipRemove>
                    </span>
                  )}
                />
              ))}
            </ComboboxPrimitive.Chips>
          );
        }}
      </ComboboxPrimitive.Value>
    </div>
  );
}

function ComboboxContent({
  className,
  children,
  "aria-label": ariaLabel = "Opções",
  ...props
}: Readonly<ComponentProps<typeof ComboboxPrimitive.Popup>>) {
  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner
        className="z-50 outline-none"
        sideOffset={4}
      >
        <ComboboxPrimitive.Popup
          data-slot="combobox-content"
          aria-label={ariaLabel}
          className={(state) =>
            cn(
              comboboxPopupVariants(),
              typeof className === "function" ? className(state) : className,
            )
          }
          {...props}
        >
          {children}
        </ComboboxPrimitive.Popup>
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  );
}

function ComboboxSearch({
  className,
  placeholder = "Buscar...",
  ...props
}: Readonly<ComponentProps<typeof ComboboxPrimitive.Input>>) {
  return (
    <div
      data-slot="combobox-search"
      className={cn("border-b border-wf-border-soft", className)}
    >
      <div className="flex h-9 cursor-text items-center gap-2 px-3">
        <Search
          className="size-4 shrink-0 text-wf-ink-soft"
          aria-hidden="true"
        />
        <ComboboxPrimitive.Input
          placeholder={placeholder}
          aria-label={placeholder}
          className="min-w-0 flex-1 cursor-text border-0 bg-transparent font-wf-body text-sm text-wf-ink outline-none placeholder:text-wf-ink-soft"
          {...props}
        />
      </div>
    </div>
  );
}

function ComboboxList({
  className,
  children,
  "aria-label": ariaLabel = "Opções disponíveis",
  ...props
}: Readonly<ComponentProps<typeof ComboboxPrimitive.List>>) {
  const { items } = useComboboxContext();

  if (children) {
    return (
      <ComboboxPrimitive.List
        data-slot="combobox-list"
        aria-label={ariaLabel}
        className={cn("max-h-60 overflow-y-auto outline-none", className)}
        {...props}
      >
        {children}
      </ComboboxPrimitive.List>
    );
  }

  if (isGroupedItems(items)) {
    return (
      <ComboboxPrimitive.List
        data-slot="combobox-list"
        aria-label={ariaLabel}
        className={cn("max-h-60 overflow-y-auto outline-none", className)}
        {...props}
      >
        {(group: ComboboxGroupOption) => (
          <ComboboxPrimitive.Group key={group.value} items={group.items}>
            <ComboboxGroupLabel>{group.value}</ComboboxGroupLabel>
            <ComboboxPrimitive.Collection>
              {(item: ComboboxOption) => (
                <ComboboxItem key={item.value} value={item} />
              )}
            </ComboboxPrimitive.Collection>
          </ComboboxPrimitive.Group>
        )}
      </ComboboxPrimitive.List>
    );
  }

  return (
    <ComboboxPrimitive.List
      data-slot="combobox-list"
      aria-label={ariaLabel}
      className={cn("max-h-60 overflow-y-auto outline-none", className)}
      {...props}
    >
      {(item: ComboboxOption) => <ComboboxItem key={item.value} value={item} />}
    </ComboboxPrimitive.List>
  );
}

function ComboboxItems() {
  return null;
}

function ComboboxGroup({
  className,
  ...props
}: Readonly<ComponentProps<typeof ComboboxPrimitive.Group>>) {
  return (
    <ComboboxPrimitive.Group
      data-slot="combobox-group"
      className={cn("outline-none", className)}
      {...props}
    />
  );
}

function ComboboxGroupLabel({
  className,
  ...props
}: Readonly<ComponentProps<typeof ComboboxPrimitive.GroupLabel>>) {
  return (
    <ComboboxPrimitive.GroupLabel
      data-slot="combobox-group-label"
      className={cn(comboboxGroupLabelVariants(), className)}
      {...props}
    />
  );
}

type ComboboxItemProps = {
  value: ComboboxOption;
  className?: string;
  children?: ReactNode;
};

function ComboboxItem({
  value,
  className,
  children,
}: Readonly<ComboboxItemProps>) {
  const { multiple } = useComboboxContext();

  return (
    <ComboboxPrimitive.Item
      value={value}
      disabled={value.disabled}
      aria-label={value.label}
      render={(props, state) => (
        <div
          {...props}
          data-slot="combobox-item"
          className={cn(
            comboboxItemVariants({ disabled: state.disabled }),
            className,
            props.className,
          )}
        >
          {multiple ? (
            <span
              aria-hidden="true"
              data-selected={state.selected || undefined}
              className={cn(
                "inline-flex size-4 shrink-0 items-center justify-center rounded-wf-checkbox border-2 bg-wf-surface",
                state.selected
                  ? "border-wf-ink bg-wf-ink text-wf-ink-foreground"
                  : "border-wf-border",
              )}
            >
              {state.selected ? (
                <Check className="size-3" aria-hidden="true" />
              ) : null}
            </span>
          ) : null}
          <span className="min-w-0 flex-1 truncate">
            {children ?? value.label}
          </span>
          {!multiple && state.selected ? (
            <Check className="size-4 shrink-0" aria-hidden="true" />
          ) : null}
        </div>
      )}
    />
  );
}

const Combobox = Object.assign(ComboboxRoot, {
  Trigger: ComboboxTrigger,
  Value: ComboboxValue,
  Actions: ComboboxActions,
  Chips: ComboboxChips,
  Content: ComboboxContent,
  Search: ComboboxSearch,
  List: ComboboxList,
  Items: ComboboxItems,
  Group: ComboboxGroup,
  GroupLabel: ComboboxGroupLabel,
  Item: ComboboxItem,
});

export {
  Combobox,
  comboboxGroupLabelVariants,
  comboboxItemVariants,
  comboboxPopupVariants,
  comboboxTriggerVariants,
};
export type {
  ComboboxGroupOption,
  ComboboxItemProps,
  ComboboxOption,
  ComboboxRootProps,
};
