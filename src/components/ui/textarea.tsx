import { cva } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const textareaShellVariants = cva(
  "block w-full min-w-0 rounded-wf border-2 border-wf-border bg-wf-surface p-3 transition-[border-color] has-[:disabled]:pointer-events-none has-[:disabled]:border-wf-border-soft has-[:disabled]:bg-wf-disabled-surface has-[:disabled]:opacity-55 has-[[data-slot=textarea-control][aria-invalid=true]]:border-wf-destructive has-[[data-slot=textarea-control]:focus-visible]:[border-width:3px] has-[[data-slot=textarea-control][aria-invalid=true]:focus-visible]:border-wf-destructive has-[[data-slot=textarea-control]:not([aria-invalid=true]):focus-visible]:border-wf-focus min-h-24",
);

const textareaControlBaseVariants = cva(
  "-m-2 box-border block min-h-[5.5rem] w-[calc(100%+1rem)] max-w-none min-w-0 resize-y border-0 bg-transparent font-wf-body text-sm font-normal leading-normal text-wf-ink shadow-none outline-none appearance-none placeholder:text-wf-ink-soft focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-55 field-sizing-content",
);

const textareaControlVariants = cva(cn(textareaControlBaseVariants(), "p-3"));

const textareaGroupControlVariants = cva(
  cn(textareaControlBaseVariants(), "p-3 pr-8 pb-8"),
);

function Textarea({
  className,
  ...props
}: Readonly<ComponentProps<"textarea">>) {
  return (
    <div
      data-slot="textarea"
      className={cn(textareaShellVariants(), className)}
    >
      <textarea
        data-slot="textarea-control"
        className={textareaControlVariants()}
        {...props}
      />
    </div>
  );
}

export {
  Textarea,
  textareaControlVariants,
  textareaGroupControlVariants,
  textareaShellVariants,
};
