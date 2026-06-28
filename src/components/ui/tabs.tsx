"use client";

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { cva, type VariantProps } from "class-variance-authority";
import { createContext, useContext } from "react";

import { cn } from "@/lib/utils";

const tabsListVariants = cva(
  "inline-flex w-fit items-center gap-2 border border-wf-border bg-wf-breadcrumb-hover p-2 font-wf-body data-disabled:pointer-events-none data-disabled:opacity-45",
  {
    variants: {
      shape: {
        pill: "rounded-wf-pill",
        square: "rounded-wf",
      },
    },
    defaultVariants: {
      shape: "pill",
    },
  },
);

const tabsTriggerVariants = cva(
  "inline-flex h-10 cursor-pointer items-center justify-center gap-2 border-2 border-wf-border bg-wf-surface px-4 text-sm font-semibold text-wf-ink transition-colors outline-none select-none focus-wf-ring [&:not([data-active])]:hover:bg-wf-disabled-surface data-active:border-wf-ink data-active:bg-wf-ink data-active:text-wf-ink-foreground data-active:hover:border-wf-ink data-active:hover:bg-wf-ink data-active:hover:text-wf-ink-foreground data-disabled:pointer-events-none data-disabled:cursor-not-allowed [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0 data-active:[&_svg]:text-wf-ink-foreground data-active:hover:[&_svg]:text-wf-ink-foreground [&_svg]:text-wf-ink",
  {
    variants: {
      shape: {
        pill: "rounded-wf-pill",
        square: "rounded-wf",
      },
    },
    defaultVariants: {
      shape: "pill",
    },
  },
);

type TabsShape = NonNullable<VariantProps<typeof tabsListVariants>["shape"]>;

type TabsListContextValue = {
  shape: TabsShape;
  disabled?: boolean;
};

const TabsListContext = createContext<TabsListContextValue>({ shape: "pill" });

type TabsRootProps = TabsPrimitive.Root.Props;

function TabsRoot({ className, ...props }: Readonly<TabsRootProps>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  );
}

type TabsListProps = TabsPrimitive.List.Props &
  VariantProps<typeof tabsListVariants> & {
    disabled?: boolean;
  };

function TabsList({
  className,
  shape = "pill",
  disabled,
  ...props
}: Readonly<TabsListProps>) {
  return (
    <TabsListContext.Provider value={{ shape: shape ?? "pill", disabled }}>
      <TabsPrimitive.List
        data-slot="tabs-list"
        data-disabled={disabled ? "" : undefined}
        className={cn(tabsListVariants({ shape }), className)}
        {...props}
      />
    </TabsListContext.Provider>
  );
}

type TabsTriggerProps = TabsPrimitive.Tab.Props;

function TabsTrigger({
  className,
  disabled,
  ...props
}: Readonly<TabsTriggerProps>) {
  const { shape, disabled: listDisabled } = useContext(TabsListContext);

  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      disabled={disabled ?? listDisabled}
      className={cn(tabsTriggerVariants({ shape }), className)}
      {...props}
    />
  );
}

type TabsContentProps = TabsPrimitive.Panel.Props;

function TabsContent({ className, ...props }: Readonly<TabsContentProps>) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn("text-sm text-wf-ink outline-none", className)}
      {...props}
    />
  );
}

const Tabs = {
  Root: TabsRoot,
  List: TabsList,
  Trigger: TabsTrigger,
  Content: TabsContent,
};

export {
  Tabs,
  TabsContent,
  TabsList,
  TabsListContext,
  TabsRoot,
  TabsTrigger,
  tabsListVariants,
  tabsTriggerVariants,
};
export type { TabsListContextValue, TabsListProps, TabsShape };
