"use client";

import { PanelRightIcon } from "lucide-react";
import { useState } from "react";
import { FlowParamsFormConnected } from "@/components/flow/flow-params-form";
import { FlowVerdictConnected } from "@/components/flow/flow-verdict";
import {
  NodeAccordionLabel,
  NodeAttrsFormConnected,
} from "@/components/flow/node-attrs-form";
import { Accordion } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PANEL_WIDTH = "22rem";

/**
 * Right-hand inspector panel: a single-open accordion with three sections —
 * Node (its trigger title becomes the selected node's name via
 * `NodeAccordionLabel`), Challenge params and the Verdict. Controlled by `open`
 * (shell state) — when closed it collapses to width 0 with `inert`
 * (non-interactive, out of the a11y tree). It's a flex sibling of the canvas
 * `<main>` inside the `SidebarProvider`, so it pushes the canvas instead of
 * overlaying. Independent of the left sidebar (shell-owned state, no shared
 * Cmd+B toggle). No header row: the floating `FlowInspectorToggle` in the
 * top-right already opens/closes the panel — we don't duplicate a close button.
 *
 * The accordion is controllable from the shell: pass `value`/`onValueChange`
 * to drive it (e.g. the top-bar Run button opens the Verdict section). Omit
 * them and it manages its own single-open state (handy for stories/tests).
 */
export function FlowInspector({
  open,
  value: valueProp,
  onValueChange,
}: Readonly<{
  open: boolean;
  value?: string[];
  onValueChange?: (value: string[]) => void;
}>) {
  const [internalValue, setInternalValue] = useState<string[]>(["node"]);
  const controlled = valueProp !== undefined;
  const value = controlled ? valueProp : internalValue;
  const handleValueChange = (next: string[]) => {
    onValueChange?.(next);
    if (!controlled) {
      setInternalValue(next);
    }
  };

  return (
    <aside
      className={cn(
        "h-full shrink-0 overflow-hidden border-l-2 border-wf-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-linear",
        open ? "" : "border-l-0",
      )}
      style={{ width: open ? PANEL_WIDTH : 0 }}
      inert={!open || undefined}
      aria-hidden={!open || undefined}
    >
      <div
        className="no-scrollbar h-full overflow-auto"
        style={{ width: PANEL_WIDTH }}
      >
        <Accordion.Root
          value={value}
          onValueChange={handleValueChange}
          className="flex flex-col"
        >
          <Accordion.Item value="node">
            <Accordion.Header>
              <Accordion.Trigger>
                <NodeAccordionLabel />
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Panel>
              <NodeAttrsFormConnected />
            </Accordion.Panel>
          </Accordion.Item>
          <Accordion.Item value="challenge">
            <Accordion.Header>
              <Accordion.Trigger>Challenge</Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Panel>
              <FlowParamsFormConnected />
            </Accordion.Panel>
          </Accordion.Item>
          <Accordion.Item value="verdict">
            <Accordion.Header>
              <Accordion.Trigger>Verdict</Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Panel>
              <FlowVerdictConnected />
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion.Root>
      </div>
    </aside>
  );
}

/**
 * Panel toggle button: opens/closes the inspector. Sits in the top-right of the
 * canvas, next to the ThemeToggle.
 */
export function FlowInspectorToggle({
  open,
  onToggle,
}: Readonly<{ open: boolean; onToggle: () => void }>) {
  return (
    <Button
      variant="outline"
      size="icon"
      className="rounded-full bg-background shadow-md"
      onClick={onToggle}
      aria-label={open ? "Close panel" : "Open panel"}
      aria-pressed={open}
    >
      <PanelRightIcon />
    </Button>
  );
}
