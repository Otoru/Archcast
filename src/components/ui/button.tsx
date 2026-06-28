import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-wf border-2 font-wf-body font-semibold whitespace-nowrap transition-colors outline-none select-none focus-wf-ring disabled:cursor-not-allowed disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "border-wf-ink bg-wf-ink text-wf-ink-foreground hover:border-wf-hover hover:bg-wf-hover active:border-wf-pressed active:bg-wf-pressed [&_svg]:text-wf-ink-foreground",
        secondary:
          "border-wf-border-soft bg-wf-secondary text-wf-ink hover:border-wf-border hover:bg-wf-secondary active:border-wf-border active:bg-wf-secondary [&_svg]:text-wf-ink",
        outline:
          "border-wf-border bg-wf-surface text-wf-ink hover:border-wf-ink hover:bg-wf-secondary active:border-wf-pressed active:bg-wf-secondary [&_svg]:text-wf-ink",
        ghost:
          "border-transparent bg-transparent text-wf-ink hover:bg-wf-secondary active:bg-wf-secondary [&_svg]:text-wf-ink",
        destructive:
          "border-wf-destructive bg-wf-destructive text-white hover:border-wf-destructive-hover hover:bg-wf-destructive-hover active:border-wf-destructive-pressed active:bg-wf-destructive-pressed [&_svg]:text-white",
        link: "border-transparent bg-transparent text-wf-ink hover:underline active:text-wf-ink [&_svg]:text-wf-ink",
        rounded:
          "rounded-wf-pill border-wf-ink bg-wf-ink text-wf-ink-foreground hover:border-wf-hover hover:bg-wf-hover active:border-wf-pressed active:bg-wf-pressed [&_svg]:text-wf-ink-foreground",
      },
      size: {
        icon: "size-8 [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm": "size-7 [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-8 px-3 text-xs [&_svg:not([class*='size-'])]:size-3.5",
        default: "h-10 px-4 text-sm [&_svg:not([class*='size-'])]:size-4",
        lg: "h-12 px-5 text-base [&_svg:not([class*='size-'])]:size-wf-icon-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ButtonProps = ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & {
    loading?: boolean;
  };

function Button({
  className,
  variant = "default",
  size = "default",
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(
        buttonVariants({ variant, size, className }),
        loading && "relative",
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <span className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="animate-spin" aria-hidden="true" />
        </span>
      ) : null}
      <span
        className={cn("inline-flex items-center gap-2", loading && "opacity-0")}
      >
        {children}
      </span>
    </ButtonPrimitive>
  );
}

export { Button, buttonVariants };
