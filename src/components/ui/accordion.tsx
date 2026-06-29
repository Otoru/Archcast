"use client";

import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion";
import { ChevronDownIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type AccordionRootProps = AccordionPrimitive.Root.Props;

function AccordionRoot({ className, ...props }: Readonly<AccordionRootProps>) {
  return (
    <AccordionPrimitive.Root
      data-slot="accordion"
      className={cn("w-full", className)}
      {...props}
    />
  );
}

type AccordionItemProps = AccordionPrimitive.Item.Props;

function AccordionItem({ className, ...props }: Readonly<AccordionItemProps>) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn("border-b-2 border-wf-border last:border-b-0", className)}
      {...props}
    />
  );
}

type AccordionHeaderProps = AccordionPrimitive.Header.Props;

function AccordionHeader({
  className,
  ...props
}: Readonly<AccordionHeaderProps>) {
  return (
    <AccordionPrimitive.Header
      data-slot="accordion-header"
      className={cn("flex", className)}
      {...props}
    />
  );
}

type AccordionTriggerProps = AccordionPrimitive.Trigger.Props;

function AccordionTrigger({
  className,
  children,
  ...props
}: Readonly<AccordionTriggerProps>) {
  return (
    <AccordionPrimitive.Trigger
      data-slot="accordion-trigger"
      className={cn(
        "group focus-wf-ring flex w-full flex-1 cursor-pointer items-center justify-between gap-2 bg-transparent px-3 py-3 text-left text-sm font-semibold text-wf-ink transition-colors outline-none select-none hover:bg-wf-breadcrumb-hover data-disabled:pointer-events-none data-disabled:cursor-not-allowed data-disabled:opacity-45 disabled:cursor-not-allowed disabled:opacity-45 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:text-wf-ink-soft [&_svg]:transition-transform [&_svg]:duration-300 [&_svg]:ease-out",
        className,
      )}
      {...props}
    >
      {children}
      <ChevronDownIcon className="group-data-[panel-open]:rotate-180" />
    </AccordionPrimitive.Trigger>
  );
}

type AccordionPanelProps = AccordionPrimitive.Panel.Props;

function AccordionPanel({
  className,
  ...props
}: Readonly<AccordionPanelProps>) {
  return (
    <AccordionPrimitive.Panel
      data-slot="accordion-panel"
      className={cn(
        "h-[var(--accordion-panel-height)] overflow-hidden text-sm text-wf-ink opacity-100 transition-[height,opacity] duration-300 ease-out data-disabled:opacity-45 data-[starting-style]:h-0 data-[starting-style]:opacity-0 data-[ending-style]:h-0 data-[ending-style]:opacity-0",
        className,
      )}
      {...props}
    />
  );
}

const Accordion = {
  Root: AccordionRoot,
  Item: AccordionItem,
  Header: AccordionHeader,
  Trigger: AccordionTrigger,
  Panel: AccordionPanel,
};

export {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  AccordionRoot,
  AccordionTrigger,
};
export type {
  AccordionHeaderProps,
  AccordionItemProps,
  AccordionPanelProps,
  AccordionRootProps,
  AccordionTriggerProps,
};
