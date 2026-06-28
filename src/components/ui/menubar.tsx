"use client";

import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { Menubar as MenubarPrimitive } from "@base-ui/react/menubar";
import { cva } from "class-variance-authority";
import { Check, ChevronRight, Circle, CircleDot } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

const menubarMenuSideOffset = 8;

const menubarFrameVariants = cva(
  "rounded-wf border-2 border-wf-border bg-wf-surface",
);

const menubarVariants = cva(
  cn(
    menubarFrameVariants(),
    "flex w-fit items-center gap-0.5 p-1 font-wf-body outline-none",
  ),
);

const menubarTriggerVariants = cva(
  "inline-flex h-8 shrink-0 cursor-pointer items-center rounded-wf border-0 bg-transparent px-3 text-sm font-semibold leading-none text-wf-ink outline-none select-none hover:bg-wf-disabled-surface focus-visible:border-2 focus-visible:border-wf-focus focus-visible:[border-width:3px] data-popup-open:border-2 data-popup-open:border-wf-border data-popup-open:bg-wf-secondary disabled:cursor-not-allowed disabled:opacity-55",
);

const menubarContentVariants = cva(
  cn(
    menubarFrameVariants(),
    "z-50 flex min-w-[220px] flex-col overflow-hidden shadow-none outline-none",
  ),
);

const menubarItemVariants = cva(
  "relative flex h-8 w-full cursor-pointer select-none items-center gap-2 rounded-wf-checkbox px-3 text-sm text-wf-ink outline-none data-highlighted:bg-wf-disabled-surface",
  {
    variants: {
      disabled: {
        true: "cursor-not-allowed text-wf-ink-soft",
        false: "",
      },
    },
    defaultVariants: {
      disabled: false,
    },
  },
);

const menubarLabelVariants = cva(
  "px-3 pt-2 pb-1 wf-text-caption font-semibold uppercase text-wf-ink-soft",
);

const menubarShortcutVariants = cva(
  "ml-auto shrink-0 text-[11px] font-normal text-wf-ink-soft",
);

function MenubarRoot({
  className,
  ...props
}: Readonly<ComponentProps<typeof MenubarPrimitive>>) {
  return (
    <MenubarPrimitive
      data-slot="menubar"
      className={(state) =>
        cn(
          menubarVariants(),
          typeof className === "function" ? className(state) : className,
        )
      }
      {...props}
    />
  );
}

function MenubarMenu(
  props: Readonly<ComponentProps<typeof MenuPrimitive.Root>>,
) {
  return <MenuPrimitive.Root {...props} />;
}

function MenubarTrigger({
  className,
  children,
  ...props
}: Readonly<ComponentProps<typeof MenuPrimitive.Trigger>>) {
  return (
    <MenuPrimitive.Trigger
      data-slot="menubar-trigger"
      className={(state) =>
        cn(
          menubarTriggerVariants(),
          typeof className === "function" ? className(state) : className,
        )
      }
      {...props}
    >
      {children}
    </MenuPrimitive.Trigger>
  );
}

function MenubarContent({
  className,
  children,
  ...props
}: Readonly<ComponentProps<typeof MenuPrimitive.Popup>>) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        className="z-50 outline-none"
        sideOffset={menubarMenuSideOffset}
      >
        <MenuPrimitive.Popup
          data-slot="menubar-content"
          className={(state) =>
            cn(
              menubarContentVariants(),
              typeof className === "function" ? className(state) : className,
            )
          }
          {...props}
        >
          {children}
        </MenuPrimitive.Popup>
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}

function MenubarShortcut({
  className,
  children,
}: Readonly<{ className?: string; children: ReactNode }>) {
  return (
    <span
      data-slot="menubar-shortcut"
      className={cn(menubarShortcutVariants(), className)}
    >
      {children}
    </span>
  );
}

type MenubarItemProps = ComponentProps<typeof MenuPrimitive.Item> & {
  shortcut?: string;
};

function MenubarItem({
  className,
  children,
  shortcut,
  ...props
}: Readonly<MenubarItemProps>) {
  return (
    <MenuPrimitive.Item
      data-slot="menubar-item"
      render={(itemProps, state) => (
        <div
          {...itemProps}
          className={cn(
            menubarItemVariants({ disabled: state.disabled }),
            className,
            itemProps.className,
          )}
        >
          <span className="min-w-0 flex-1 truncate">{children}</span>
          {shortcut ? <MenubarShortcut>{shortcut}</MenubarShortcut> : null}
        </div>
      )}
      {...props}
    />
  );
}

function MenubarSeparator({
  className,
  ...props
}: Readonly<ComponentProps<typeof MenuPrimitive.Separator>>) {
  return (
    <MenuPrimitive.Separator
      data-slot="menubar-separator"
      className={cn("my-1 h-px w-full bg-wf-border-soft", className)}
      {...props}
    />
  );
}

function MenubarGroup(
  props: Readonly<ComponentProps<typeof MenuPrimitive.Group>>,
) {
  return <MenuPrimitive.Group data-slot="menubar-group" {...props} />;
}

function MenubarLabel({
  className,
  ...props
}: Readonly<ComponentProps<typeof MenuPrimitive.GroupLabel>>) {
  return (
    <MenuPrimitive.GroupLabel
      data-slot="menubar-label"
      className={cn(menubarLabelVariants(), className)}
      {...props}
    />
  );
}

function MenubarCheckboxItem({
  className,
  children,
  ...props
}: Readonly<ComponentProps<typeof MenuPrimitive.CheckboxItem>>) {
  return (
    <MenuPrimitive.CheckboxItem
      data-slot="menubar-checkbox-item"
      render={(itemProps, state) => (
        <div
          {...itemProps}
          className={cn(
            menubarItemVariants({ disabled: state.disabled }),
            className,
            itemProps.className,
          )}
        >
          <MenuPrimitive.CheckboxItemIndicator
            keepMounted
            className="inline-flex size-4 shrink-0 items-center justify-center"
          >
            {state.checked ? (
              <Check className="size-4" aria-hidden="true" />
            ) : null}
          </MenuPrimitive.CheckboxItemIndicator>
          <span className="min-w-0 flex-1 truncate">{children}</span>
        </div>
      )}
      {...props}
    />
  );
}

function MenubarRadioGroup(
  props: Readonly<ComponentProps<typeof MenuPrimitive.RadioGroup>>,
) {
  return (
    <MenuPrimitive.RadioGroup data-slot="menubar-radio-group" {...props} />
  );
}

function MenubarRadioItem({
  className,
  children,
  ...props
}: Readonly<ComponentProps<typeof MenuPrimitive.RadioItem>>) {
  return (
    <MenuPrimitive.RadioItem
      data-slot="menubar-radio-item"
      render={(itemProps, state) => (
        <div
          {...itemProps}
          className={cn(
            menubarItemVariants({ disabled: state.disabled }),
            className,
            itemProps.className,
          )}
        >
          <span
            className="inline-flex size-4 shrink-0 items-center justify-center"
            aria-hidden="true"
          >
            {state.checked ? (
              <CircleDot className="size-3.5 text-wf-ink" />
            ) : (
              <Circle className="size-3.5 text-wf-border-soft" />
            )}
          </span>
          <span className="min-w-0 flex-1 truncate">{children}</span>
        </div>
      )}
      {...props}
    />
  );
}

function MenubarSub(
  props: Readonly<ComponentProps<typeof MenuPrimitive.SubmenuRoot>>,
) {
  return <MenuPrimitive.SubmenuRoot {...props} />;
}

function MenubarSubTrigger({
  className,
  children,
  ...props
}: Readonly<ComponentProps<typeof MenuPrimitive.SubmenuTrigger>>) {
  return (
    <MenuPrimitive.SubmenuTrigger
      data-slot="menubar-sub-trigger"
      render={(itemProps, state) => (
        <div
          {...itemProps}
          className={cn(
            menubarItemVariants({ disabled: state.disabled }),
            className,
            itemProps.className,
          )}
        >
          <span className="min-w-0 flex-1 truncate">{children}</span>
          <ChevronRight
            className="size-3.5 shrink-0 text-wf-ink-soft"
            aria-hidden="true"
          />
        </div>
      )}
      {...props}
    />
  );
}

function MenubarSubContent({
  className,
  children,
  ...props
}: Readonly<ComponentProps<typeof MenuPrimitive.Popup>>) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner className="z-50 outline-none" sideOffset={6}>
        <MenuPrimitive.Popup
          data-slot="menubar-sub-content"
          className={(state) =>
            cn(
              menubarContentVariants(),
              typeof className === "function" ? className(state) : className,
            )
          }
          {...props}
        >
          {children}
        </MenuPrimitive.Popup>
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}

const Menubar = Object.assign(MenubarRoot, {
  Menu: MenubarMenu,
  Trigger: MenubarTrigger,
  Content: MenubarContent,
  Item: MenubarItem,
  Shortcut: MenubarShortcut,
  Separator: MenubarSeparator,
  Label: MenubarLabel,
  Group: MenubarGroup,
  CheckboxItem: MenubarCheckboxItem,
  RadioGroup: MenubarRadioGroup,
  RadioItem: MenubarRadioItem,
  Sub: MenubarSub,
  SubTrigger: MenubarSubTrigger,
  SubContent: MenubarSubContent,
});

export {
  Menubar,
  menubarContentVariants,
  menubarItemVariants,
  menubarLabelVariants,
  menubarShortcutVariants,
  menubarTriggerVariants,
  menubarVariants,
};
