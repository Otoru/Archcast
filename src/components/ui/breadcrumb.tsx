import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva } from "class-variance-authority";
import { ChevronRight, MoreHorizontal } from "lucide-react";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const breadcrumbLinkVariants = cva(
  "inline-flex h-8 items-center gap-1.5 rounded-wf border-2 border-transparent px-3 font-wf-body wf-text-small font-semibold text-wf-ink-soft transition-colors hover:bg-wf-breadcrumb-hover hover:text-wf-ink focus-visible:outline-none focus-visible:border-wf-focus disabled:pointer-events-none disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45 [&_svg]:size-wf-breadcrumb-icon [&_svg]:shrink-0 [&_svg]:text-wf-ink-soft hover:[&_svg]:text-wf-ink",
);

const breadcrumbPageVariants = cva(
  "inline-flex h-8 items-center gap-1.5 rounded-wf px-3 font-wf-body wf-text-small font-bold text-wf-ink [&_svg]:size-wf-breadcrumb-icon [&_svg]:shrink-0 [&_svg]:text-wf-ink",
);

function BreadcrumbRoot({
  className,
  ...props
}: Readonly<ComponentProps<"nav">>) {
  return (
    <nav
      aria-label="breadcrumb"
      data-slot="breadcrumb"
      className={cn(className)}
      {...props}
    />
  );
}

function BreadcrumbList({
  className,
  ...props
}: Readonly<ComponentProps<"ol">>) {
  return (
    <ol
      data-slot="breadcrumb-list"
      className={cn(
        "flex flex-wrap items-center gap-2 font-wf-body",
        className,
      )}
      {...props}
    />
  );
}

function BreadcrumbItem({
  className,
  ...props
}: Readonly<ComponentProps<"li">>) {
  return (
    <li
      data-slot="breadcrumb-item"
      className={cn("inline-flex items-center gap-2", className)}
      {...props}
    />
  );
}

function BreadcrumbLink({
  className,
  render,
  ...props
}: useRender.ComponentProps<"a">) {
  return useRender({
    defaultTagName: "a",
    props: mergeProps<"a">(
      {
        className: cn(breadcrumbLinkVariants(), className),
      },
      props,
    ),
    render,
    state: {
      slot: "breadcrumb-link",
    },
  });
}

function BreadcrumbPage({
  className,
  ...props
}: Readonly<ComponentProps<"span">>) {
  return (
    <span
      data-slot="breadcrumb-page"
      aria-current="page"
      className={cn(breadcrumbPageVariants(), className)}
      {...props}
    />
  );
}

function BreadcrumbSeparator({
  children,
  className,
  ...props
}: Readonly<ComponentProps<"li">>) {
  return (
    <li
      data-slot="breadcrumb-separator"
      aria-hidden="true"
      className={cn(
        "text-wf-border-soft [&>svg]:size-wf-breadcrumb-icon",
        className,
      )}
      {...props}
    >
      {children ?? <ChevronRight aria-hidden="true" />}
    </li>
  );
}

function BreadcrumbEllipsis({
  className,
  ...props
}: Readonly<ComponentProps<"span">>) {
  return (
    <span
      data-slot="breadcrumb-ellipsis"
      className={cn(
        "flex size-5 items-center justify-center [&>svg]:size-4",
        className,
      )}
      {...props}
    >
      <MoreHorizontal aria-hidden="true" />
      <span className="sr-only">More</span>
    </span>
  );
}

const Breadcrumb = {
  Root: BreadcrumbRoot,
  List: BreadcrumbList,
  Item: BreadcrumbItem,
  Link: BreadcrumbLink,
  Page: BreadcrumbPage,
  Separator: BreadcrumbSeparator,
  Ellipsis: BreadcrumbEllipsis,
};

export {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbRoot,
  BreadcrumbSeparator,
  breadcrumbLinkVariants,
  breadcrumbPageVariants,
};
