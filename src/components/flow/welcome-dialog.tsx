"use client";

import { Boxes, PlayIcon, SparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Lead } from "@/components/ui/typography";

/**
 * First-visit welcome modal. Controlled (`open`/`onDismiss`) by the shell,
 * which decides when to open it (the `wireframe:onboarded` flag is absent) and
 * sets the flag on close. Three paths: take the guided tour, load an example
 * (preset), or start from scratch.
 */
export function WelcomeDialog({
  open,
  onTakeTour,
  onLoadExample,
  onDismiss,
}: Readonly<{
  open: boolean;
  onTakeTour: () => void;
  onLoadExample: () => void;
  onDismiss: () => void;
}>) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onDismiss();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SparklesIcon className="size-5" aria-hidden="true" />
            Welcome to Archcast
          </DialogTitle>
          <DialogDescription>
            Sketch a system-design graph and simulate it.
          </DialogDescription>
        </DialogHeader>

        <Lead>
          Drag blocks onto the canvas, wire them up, then hit{" "}
          <strong className="font-semibold text-wf-ink">Run</strong> to get a
          verdict on latency, saturation, availability and single points of
          failure.
        </Lead>

        <div className="flex flex-col gap-2">
          <Button variant="default" onClick={onTakeTour}>
            <PlayIcon />
            Take the tour
          </Button>
          <Button variant="outline" onClick={onLoadExample}>
            <Boxes />
            Load an example
          </Button>
          <Button variant="ghost" onClick={onDismiss}>
            Start from scratch
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
