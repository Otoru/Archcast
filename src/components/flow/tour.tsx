"use client";

import { XIcon } from "lucide-react";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { H4, Muted } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

type Placement = "bottom" | "top" | "right" | "left";

export interface TourStep {
  id: string;
  title: string;
  body: ReactNode;
  /** `[data-tour="..."]` selector of the target. No `target` = centered modal step. */
  target?: string;
  placement?: Placement;
}

/**
 * Guided tour steps. Pure data — the shell takes care of "preparing" the
 * target (opening the sidebar/inspector) in an effect that watches the step
 * index, so the steps don't reference shell state.
 */
export const TOUR_STEPS: TourStep[] = [
  {
    id: "intro",
    title: "Welcome to Archcast",
    body: (
      <Muted>
        We&apos;ll build and simulate a system-design graph in a few quick
        steps.
      </Muted>
    ),
  },
  {
    id: "palette",
    title: "Block palette",
    target: '[data-tour="palette"]',
    placement: "right",
    body: (
      <Muted>
        Blocks live here, grouped by layer. Drag one onto the canvas to add a
        node.
      </Muted>
    ),
  },
  {
    id: "canvas",
    title: "Canvas",
    target: '[data-tour="canvas"]',
    placement: "bottom",
    body: (
      <Muted>
        Drop blocks here. Drag from a block&apos;s output port to another
        block&apos;s input port to connect them.
      </Muted>
    ),
  },
  {
    id: "inspector",
    title: "Inspector",
    target: '[data-tour="inspector"]',
    placement: "left",
    body: (
      <Muted>
        Select a node to set its attributes here — capacity, instances, and
        more.
      </Muted>
    ),
  },
  {
    id: "challenge",
    title: "Challenge & SLOs",
    target: '[data-tour="challenge"]',
    placement: "left",
    body: (
      <Muted>
        The <strong className="font-semibold text-wf-ink">Challenge</strong>{" "}
        section sets the global workload: traffic (RPS &amp; pattern),
        read/write mix, and the latency &amp; availability SLOs your design must
        meet to <strong className="font-semibold text-wf-ink">pass</strong>.
      </Muted>
    ),
  },
  {
    id: "run",
    title: "Run the simulation",
    target: '[data-tour="run"]',
    placement: "bottom",
    body: (
      <Muted>
        Press <strong className="font-semibold text-wf-ink">Run</strong> (or{" "}
        <strong className="font-semibold text-wf-ink">⌘/Ctrl+Enter</strong>).
        The Verdict panel shows latency, saturation, availability and SPOFs.
      </Muted>
    ),
  },
  {
    id: "end",
    title: "You're set",
    body: (
      <Muted>
        Load a <strong className="font-semibold text-wf-ink">Preset</strong>{" "}
        from the toolbar for a working example, or build your own.
      </Muted>
    ),
  },
];

/** Tour state machine. `step === null` = inactive. */
export function useTour() {
  const [step, setStep] = useState<number | null>(null);

  const start = useCallback(() => setStep(0), []);
  const end = useCallback(() => setStep(null), []);
  const next = useCallback(
    () =>
      setStep((s) => (s === null ? s : Math.min(s + 1, TOUR_STEPS.length - 1))),
    [],
  );
  const prev = useCallback(
    () => setStep((s) => (s === null ? s : Math.max(s - 1, 0))),
    [],
  );

  // Esc cancels the tour (modal steps: the Dialog also closes → onEnd).
  useEffect(() => {
    if (step === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setStep(null);
    };
    globalThis.addEventListener("keydown", onKey);
    return () => globalThis.removeEventListener("keydown", onKey);
  }, [step]);

  return { step, start, end, next, prev, isActive: step !== null };
}

type TourOverlayProps = Readonly<{
  step: number | null;
  onNext: () => void;
  onPrev: () => void;
  onEnd: () => void;
  onLoadExample: () => void;
}>;

/**
 * Renders the current tour step: a centered modal (Dialog) for steps without a
 * `target`, or a spotlight + popover for steps with a target. Portaled to
 * `body` to escape the shell's `overflow-hidden` containers.
 */
export function TourOverlay({
  step,
  onNext,
  onPrev,
  onEnd,
  onLoadExample,
}: TourOverlayProps) {
  if (step === null) return null;
  const current = TOUR_STEPS[step];
  if (!current) return null;

  const total = TOUR_STEPS.length;
  const isFirst = step === 0;
  const isLast = step === total - 1;

  if (!current.target) {
    return (
      <Dialog open onOpenChange={(open) => !open && onEnd()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{current.title}</DialogTitle>
          </DialogHeader>
          {current.body}
          {current.id === "end" ? (
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={onEnd}>
                Done
              </Button>
              <Button
                variant="default"
                onClick={() => {
                  onLoadExample();
                  onEnd();
                }}
              >
                Load example
              </Button>
            </div>
          ) : (
            <TourNav
              isFirst={isFirst}
              isLast={isLast}
              index={step}
              total={total}
              onNext={onNext}
              onPrev={onPrev}
              onEnd={onEnd}
            />
          )}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Spotlight
      target={current.target}
      placement={current.placement ?? "bottom"}
      title={current.title}
      body={current.body}
      isFirst={isFirst}
      isLast={isLast}
      index={step}
      total={total}
      onNext={onNext}
      onPrev={onPrev}
      onEnd={onEnd}
    />
  );
}

type SpotlightProps = Readonly<{
  target: string;
  placement: Placement;
  title: string;
  body: ReactNode;
  isFirst: boolean;
  isLast: boolean;
  index: number;
  total: number;
  onNext: () => void;
  onPrev: () => void;
  onEnd: () => void;
}>;

function Spotlight({ target, placement, title, body, ...nav }: SpotlightProps) {
  const rect = useTargetRect(target);
  if (typeof document === "undefined") return null;

  // Padding around the target (visual breathing room) + radius matching the
  // `rounded-wf` of the button/panel so the cutout doesn't have square corners.
  const PAD = 6;
  const RADIUS = 10;

  // While the target isn't found (e.g. the sidebar is still opening), show only
  // the dark backdrop to avoid the popover flashing at (0,0).
  return createPortal(
    <div className="fixed inset-0 z-[60]" style={{ pointerEvents: "none" }}>
      {/* Clickable backdrop (closes the tour). The cutout is done by the
          highlight's box-shadow, so this stays transparent. */}
      <button
        type="button"
        aria-label="Skip tour"
        className="fixed inset-0 cursor-default"
        style={{ pointerEvents: "auto", background: "transparent", border: 0 }}
        onClick={nav.onEnd}
      />
      {rect ? (
        <>
          {/* Rounded cutout: the giant box-shadow darkens everything except the
              target's rectangle. `pointer-events: none` lets the click fall
              through to the backdrop behind (closes the tour) or onto the target
              itself. */}
          <div
            aria-hidden="true"
            style={{
              position: "fixed",
              left: `${rect.left - PAD}px`,
              top: `${rect.top - PAD}px`,
              width: `${rect.width + PAD * 2}px`,
              height: `${rect.height + PAD * 2}px`,
              borderRadius: `${RADIUS}px`,
              boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
              pointerEvents: "none",
            }}
          />
          <Popover rect={rect} placement={placement}>
            <H4>{title}</H4>
            {body}
            <TourNav {...nav} />
          </Popover>
        </>
      ) : (
        <div
          aria-hidden="true"
          className="fixed inset-0 bg-black/55"
          style={{ pointerEvents: "none" }}
        />
      )}
    </div>,
    document.body,
  );
}

function Popover({
  rect,
  placement,
  children,
}: Readonly<{
  rect: DOMRect;
  placement: Placement;
  children: ReactNode;
}>) {
  const ref = useRef<HTMLDialogElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Open as a non-modal dialog (no backdrop, no focus trap, no Esc auto-close)
    // so the spotlight backdrop and the tour's own Esc handler stay in control.
    if (!el.open) el.show();
    const pw = el.offsetWidth;
    const ph = el.offsetHeight;
    const vw = globalThis.innerWidth;
    const vh = globalThis.innerHeight;
    const gap = 8;
    let top: number;
    let left: number;
    if (placement === "top") {
      top = rect.top - ph - gap;
      left = rect.left;
    } else if (placement === "right") {
      top = rect.top;
      left = rect.right + gap;
    } else if (placement === "left") {
      top = rect.top;
      left = rect.left - pw - gap;
    } else {
      top = rect.bottom + gap;
      left = rect.left;
    }
    left = Math.max(gap, Math.min(left, vw - pw - gap));
    top = Math.max(gap, Math.min(top, vh - ph - gap));
    setPos({ top, left });
  }, [rect, placement]);

  return (
    <dialog
      ref={ref}
      aria-label="Tour"
      className={cn(
        "fixed z-[61] w-72 rounded-wf border-2 border-wf-border bg-wf-surface p-4 shadow-lg",
        !pos && "opacity-0",
      )}
      style={{
        margin: 0,
        pointerEvents: "auto",
        ...(pos ? { top: pos.top, left: pos.left } : { top: 0, left: 0 }),
      }}
    >
      {children}
    </dialog>
  );
}

function TourNav({
  isFirst,
  isLast,
  index,
  total,
  onNext,
  onPrev,
  onEnd,
}: Readonly<{
  isFirst: boolean;
  isLast: boolean;
  index: number;
  total: number;
  onNext: () => void;
  onPrev: () => void;
  onEnd: () => void;
}>) {
  return (
    <div className="mt-3 flex items-center justify-between gap-2">
      <Button variant="ghost" size="sm" onClick={onEnd}>
        <XIcon />
        Skip
      </Button>
      <div className="flex items-center gap-2">
        <span className="wf-text-caption text-wf-ink-soft">
          {index + 1}/{total}
        </span>
        <Button
          variant="secondary"
          size="sm"
          disabled={isFirst}
          onClick={onPrev}
        >
          Back
        </Button>
        <Button variant="default" size="sm" onClick={onNext} autoFocus>
          {isLast ? "Finish" : "Next"}
        </Button>
      </div>
    </div>
  );
}

/**
 * Measures the target's rect and keeps it updated during transitions (the
 * offcanvas sidebar/inspector animate width/position). Re-measures via rAF for
 * ~400ms after a selector change + on resize + via a ResizeObserver.
 */
function useTargetRect(selector: string): DOMRect | null {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useLayoutEffect(() => {
    let raf = 0;
    let startTs = 0;
    let ro: ResizeObserver | null = null;

    const measure = () => {
      const el = document.querySelector(selector);
      if (!el) {
        setRect(null);
        return;
      }
      const next = el.getBoundingClientRect();
      setRect((prev) => {
        if (
          prev?.x === next.x &&
          prev?.y === next.y &&
          prev?.width === next.width &&
          prev?.height === next.height
        ) {
          return prev;
        }
        return next;
      });
    };

    const loop = (ts: number) => {
      if (startTs === 0) startTs = ts;
      measure();
      if (ts - startTs < 400) {
        raf = requestAnimationFrame(loop);
      }
    };
    raf = requestAnimationFrame(loop);

    globalThis.addEventListener("resize", measure);
    const el = document.querySelector(selector);
    if (el && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(measure);
      ro.observe(el);
    }

    return () => {
      cancelAnimationFrame(raf);
      globalThis.removeEventListener("resize", measure);
      ro?.disconnect();
    };
  }, [selector]);

  return rect;
}
