"use client";

import { PanelRightIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { FlowParamsFormConnected } from "@/components/flow/flow-params-form";
import { FlowVerdictConnected } from "@/components/flow/flow-verdict";
import {
  NodeAccordionLabel,
  NodeAttrsFormConnected,
} from "@/components/flow/node-attrs-form";
import { Accordion } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  scrollTopSignal,
  locked = false,
  scrollToVerdictSignal,
}: Readonly<{
  open: boolean;
  value?: string[];
  onValueChange?: (value: string[]) => void;
  /**
   * Sempre que este número muda, o painel rola de volta ao topo. A shell passa
   * o `nodeClickNonce` aqui, então clicar num nó traz a seção Node à vista
   * mesmo que o usuário tivesse rolado para baixo.
   */
  scrollTopSignal?: number;
  /**
   * Modo run: trava o painel na seção Verdict — Node e Challenge ficam com o
   * trigger desabilitado (não abrem), e o Verdict não fecha (a shell ignora
   * `onValueChange` enquanto `locked`). O scroll do painel segue funcionando.
   */
  locked?: boolean;
  /**
   * Quando muda, rola a seção Verdict para dentro da vista. A shell incrementa
   * um contador ao apertar Run, garantindo que o Verdict apareça mesmo que o
   * painel estivesse rolado lá embaixo.
   */
  scrollToVerdictSignal?: number;
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

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollTopSignal !== undefined) {
      scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [scrollTopSignal]);

  // Verdict envolto num div com ref para podermos rolar a seção para dentro
  // da vista quando o run abre o painel. Não dá pra por o ref direto no
  // `Accordion.Item` (componente de função sem `forwardRef`); o wrapper preserva
  // o `last:border-b-0` (o Verdict continua sendo o último filho do wrapper).
  const verdictRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollToVerdictSignal !== undefined) {
      verdictRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [scrollToVerdictSignal]);

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
        ref={scrollRef}
        className="no-scrollbar h-full overflow-auto"
        style={{ width: PANEL_WIDTH }}
      >
        <Accordion.Root
          value={value}
          onValueChange={handleValueChange}
          className="flex flex-col"
        >
          <Accordion.Item value="node" disabled={locked}>
            <Accordion.Header>
              <Accordion.Trigger>
                <NodeAccordionLabel />
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Panel>
              <NodeAttrsFormConnected />
            </Accordion.Panel>
          </Accordion.Item>
          <Accordion.Item value="challenge" disabled={locked}>
            <Accordion.Header>
              <Accordion.Trigger>Challenge</Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Panel>
              <FlowParamsFormConnected />
            </Accordion.Panel>
          </Accordion.Item>
          {/* Verdict NÃO recebe `disabled`: no run ele é a seção ativa e deve
              parecer normal/aberta. Fechar é impedido pela shell ignorar
              `onValueChange` enquanto `locked` (valor controlado). */}
          <div ref={verdictRef}>
            <Accordion.Item value="verdict">
              <Accordion.Header>
                <Accordion.Trigger>Verdict</Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Panel>
                <FlowVerdictConnected />
              </Accordion.Panel>
            </Accordion.Item>
          </div>
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
  disabled = false,
}: Readonly<{ open: boolean; onToggle: () => void; disabled?: boolean }>) {
  const label = open ? "Close panel" : "Open panel";
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            disabled={disabled}
            aria-label={label}
            aria-pressed={open}
          >
            <PanelRightIcon />
          </Button>
        }
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
