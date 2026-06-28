import { Input as InputPrimitive } from "@base-ui/react/input";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

const fieldControlVariants = cva(
  "w-full min-w-0 rounded-wf border-2 border-wf-border bg-wf-surface px-3 font-wf-body text-sm font-normal text-wf-ink transition-colors outline-none placeholder:text-wf-ink-soft focus-wf-ring disabled:cursor-not-allowed disabled:border-wf-border-soft disabled:bg-wf-disabled-surface disabled:opacity-55 aria-invalid:border-wf-destructive",
);

const inputVariants = cva(cn(fieldControlVariants(), "h-10"));

const inputGroupControlVariants = cva(
  "min-h-0 min-w-0 flex-1 self-center border-0 bg-transparent px-0 py-0 font-wf-body text-sm font-normal leading-normal text-wf-ink shadow-none outline-none appearance-none placeholder:text-wf-ink-soft focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-55 aria-invalid:text-wf-ink",
);

type InputProps = InputPrimitive.Props;

function Input({ className, type, ...props }: Readonly<InputProps>) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(inputVariants(), className)}
      {...props}
    />
  );
}

export {
  Input,
  fieldControlVariants,
  inputGroupControlVariants,
  inputVariants,
};
