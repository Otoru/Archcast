import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center rounded-wf-pill border font-wf-body font-semibold whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "border-2 border-wf-ink bg-wf-ink text-wf-ink-foreground",
        secondary: "border-wf-border-soft bg-wf-secondary text-wf-ink",
        destructive:
          "border-2 border-wf-destructive bg-wf-destructive text-wf-destructive-ink",
        outline: "border-2 border-wf-border bg-wf-surface text-wf-ink",
        success:
          "border-2 border-wf-success bg-wf-success-surface text-wf-success",
        warning:
          "border-2 border-wf-warning bg-wf-warning-surface text-wf-warning",
      },
      size: {
        default: "badge-text gap-1 px-2 py-1",
        sm: "badge-text-sm gap-1 px-1.5 py-0.5 font-bold",
      },
    },
    compoundVariants: [
      {
        variant: "secondary",
        size: "default",
        class: "font-bold",
      },
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type BadgeProps = useRender.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & {
    showDot?: boolean;
  };

function Badge({
  className,
  variant = "default",
  size = "default",
  showDot = false,
  render,
  children,
  ...props
}: Readonly<BadgeProps>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant, size }), className),
        children: (
          <>
            {showDot ? (
              <span
                className="size-wf-badge-dot shrink-0 rounded-full bg-current"
                aria-hidden="true"
              />
            ) : null}
            {children}
          </>
        ),
      },
      props,
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  });
}

export { Badge, badgeVariants };
