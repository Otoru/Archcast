import { cva } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const typographyVariants = cva("", {
  variants: {
    variant: {
      h1: "font-wf-heading wf-text-h1 font-bold text-wf-ink",
      h2: "font-wf-heading wf-text-h2 font-bold text-wf-ink",
      h3: "font-wf-heading wf-text-h3 font-semibold text-wf-ink",
      h4: "font-wf-heading wf-text-h4 font-semibold text-wf-ink",
      p: "font-wf-body wf-text-p font-normal text-wf-ink",
      lead: "font-wf-body wf-text-lead font-normal text-wf-ink-soft",
      large: "font-wf-body wf-text-large font-semibold text-wf-ink",
      small: "font-wf-body wf-text-small font-medium text-wf-ink",
      muted: "font-wf-body wf-text-small font-normal text-wf-ink-soft",
      code: "inline-flex items-center rounded-wf-code border border-wf-border-soft bg-wf-code-surface px-2 py-1 font-wf-heading wf-text-code font-semibold text-wf-ink",
      blockquote: "font-wf-body wf-text-p font-normal text-wf-ink-soft",
      list: "flex flex-col gap-1 font-wf-body wf-text-p font-normal text-wf-ink",
      listItem:
        "relative pl-4 before:absolute before:left-0 before:content-['•']",
    },
  },
});

function H1({ className, children, ...props }: Readonly<ComponentProps<"h1">>) {
  return (
    <h1
      className={cn(typographyVariants({ variant: "h1" }), className)}
      {...props}
    >
      {children}
    </h1>
  );
}

function H2({ className, children, ...props }: Readonly<ComponentProps<"h2">>) {
  return (
    <h2
      className={cn(typographyVariants({ variant: "h2" }), className)}
      {...props}
    >
      {children}
    </h2>
  );
}

function H3({ className, children, ...props }: Readonly<ComponentProps<"h3">>) {
  return (
    <h3
      className={cn(typographyVariants({ variant: "h3" }), className)}
      {...props}
    >
      {children}
    </h3>
  );
}

function H4({ className, children, ...props }: Readonly<ComponentProps<"h4">>) {
  return (
    <h4
      className={cn(typographyVariants({ variant: "h4" }), className)}
      {...props}
    >
      {children}
    </h4>
  );
}

function P({ className, ...props }: Readonly<ComponentProps<"p">>) {
  return (
    <p
      className={cn(typographyVariants({ variant: "p" }), className)}
      {...props}
    />
  );
}

function Lead({ className, ...props }: Readonly<ComponentProps<"p">>) {
  return (
    <p
      className={cn(typographyVariants({ variant: "lead" }), className)}
      {...props}
    />
  );
}

function Large({ className, ...props }: Readonly<ComponentProps<"p">>) {
  return (
    <p
      className={cn(typographyVariants({ variant: "large" }), className)}
      {...props}
    />
  );
}

function Small({ className, ...props }: Readonly<ComponentProps<"p">>) {
  return (
    <p
      className={cn(typographyVariants({ variant: "small" }), className)}
      {...props}
    />
  );
}

function Muted({ className, ...props }: Readonly<ComponentProps<"p">>) {
  return (
    <p
      className={cn(typographyVariants({ variant: "muted" }), className)}
      {...props}
    />
  );
}

function InlineCode({ className, ...props }: Readonly<ComponentProps<"code">>) {
  return (
    <code
      className={cn(typographyVariants({ variant: "code" }), className)}
      {...props}
    />
  );
}

function Blockquote({
  className,
  children,
  ...props
}: Readonly<ComponentProps<"blockquote">>) {
  return (
    <blockquote className={cn("flex items-start gap-2", className)} {...props}>
      <span
        className="mt-0.5 h-[18px] w-0.5 shrink-0 bg-wf-border"
        aria-hidden="true"
      />
      <span className={typographyVariants({ variant: "blockquote" })}>
        {children}
      </span>
    </blockquote>
  );
}

function ListRoot({ className, ...props }: Readonly<ComponentProps<"ul">>) {
  return (
    <ul
      data-slot="list"
      className={cn(
        typographyVariants({ variant: "list" }),
        "list-none",
        className,
      )}
      {...props}
    />
  );
}

function ListItem({ className, ...props }: Readonly<ComponentProps<"li">>) {
  return (
    <li
      data-slot="list-item"
      className={cn(typographyVariants({ variant: "listItem" }), className)}
      {...props}
    />
  );
}

function TableRoot({ className, ...props }: Readonly<ComponentProps<"table">>) {
  return (
    <div className="w-full overflow-hidden rounded-wf-code border border-wf-border bg-wf-surface">
      <table
        data-slot="table"
        className={cn(
          "w-full table-fixed border-collapse font-wf-body wf-text-small text-wf-ink",
          "[&_th]:border-0 [&_th]:wf-table-cell [&_th]:text-left [&_th]:font-semibold",
          "[&_th:first-child]:border-r [&_th:first-child]:border-wf-border-soft",
          "[&_td]:border-0 [&_td]:wf-table-cell [&_td]:font-normal",
          "[&_td:first-child]:border-r [&_td:first-child]:border-wf-border-soft",
          "[&_tbody_td]:border-t [&_tbody_td]:border-wf-border-soft",
          className,
        )}
        {...props}
      />
    </div>
  );
}

function TableHead({ className, ...props }: Readonly<ComponentProps<"th">>) {
  return <th data-slot="table-head" className={cn(className)} {...props} />;
}

function TableCell({ className, ...props }: Readonly<ComponentProps<"td">>) {
  return <td data-slot="table-cell" className={cn(className)} {...props} />;
}

const List = Object.assign(ListRoot, { Item: ListItem });

const Table = Object.assign(TableRoot, {
  Head: TableHead,
  Cell: TableCell,
});

export {
  Blockquote,
  H1,
  H2,
  H3,
  H4,
  InlineCode,
  Large,
  Lead,
  List,
  ListItem,
  Muted,
  P,
  Small,
  Table,
  TableCell,
  TableHead,
  typographyVariants,
};
