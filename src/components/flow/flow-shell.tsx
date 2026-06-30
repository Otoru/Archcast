"use client";

import dynamic from "next/dynamic";
import {
  type DragEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { AppSidebar } from "@/components/flow/app-sidebar";
import { BLOCK_DND_MIME } from "@/components/flow/dnd";
import { EmptyCanvasHint } from "@/components/flow/empty-canvas-hint";
import {
  FlowEditorProvider,
  useFlowEditor,
} from "@/components/flow/flow-editor-state";
import { FlowInspector } from "@/components/flow/flow-inspector";
import { handleShortcutKey } from "@/components/flow/flow-shortcuts";
import { FlowToolbar } from "@/components/flow/flow-toolbar";
import {
  readStoredGraph,
  writeStoredGraph,
} from "@/components/flow/graph-persistence";
import { deserializeGraph } from "@/components/flow/graph-serialization";
import {
  hasSeenOnboarding,
  markOnboardingSeen,
} from "@/components/flow/onboarding-persistence";
import { PRESET_GRAPHS } from "@/components/flow/preset-graphs";
import { TOUR_STEPS, TourOverlay, useTour } from "@/components/flow/tour";
import { WelcomeDialog } from "@/components/flow/welcome-dialog";
import { SidebarProvider } from "@/components/ui/sidebar";

// The canvas measures the viewport; load it client-side only (Next 16 requires
// ssr:false inside a Client Component — this shell is a client component).
const FlowCanvas = dynamic(
  () => import("@/components/flow/flow-canvas").then((m) => m.FlowCanvas),
  { ssr: false },
);

const AUTOSAVE_DEBOUNCE_MS = 400;
const EXAMPLE_PRESET_ID = "ecommerce";

/**
 * Internal layout (inside `FlowEditorProvider`): header with toolbar + canvas
 * (the left palette sidebar + right inspector panel are siblings of `<main>`
 * inside the `SidebarProvider`). Consumes `useFlowEditor` to trigger the
 * simulation (Run/Stop), orchestrate the inspector and persist the graph.
 */
function ShellLayout() {
  const {
    running,
    startRun,
    stopRun,
    selectedNodeId,
    nodeClickNonce,
    history,
    applyGraph,
    requestFitView,
    nodes,
    edges,
    params,
    setNodes,
    setEdges,
  } = useFlowEditor();

  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [inspectorValue, setInspectorValue] = useState<string[]>(["node"]);
  const [helpOpen, setHelpOpen] = useState(false);
  // Sidebar controlled so the tour/overlay can open the palette at the right step.
  const [sidebarOpen, setSidebarOpen] = useState(true);
  // First-visit onboarding: the welcome is shown once (localStorage flag).
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  // Gate so the empty overlay doesn't flash before the localStorage restore.
  const [hydrated, setHydrated] = useState(false);
  const {
    step: tourStep,
    isActive: tourActive,
    start: startTourStep,
    end: endTour,
    next: tourNext,
    prev: tourPrev,
  } = useTour();
  // Counter incremented on every Run: feeds the inspector's
  // `scrollToVerdictSignal`, which scrolls the Verdict section into view on run.
  const [runStartNonce, setRunStartNonce] = useState(0);
  // `running` and `selectedNodeId` read via ref inside the node-click effect:
  // during a run the inspector is locked on the Verdict, so clicking a node
  // (which still selects it on the canvas) does NOT reopen the Node section.
  // Refs instead of deps so the effect only runs on click (nonce), not when
  // `running`/`selectedNodeId` change.
  const runningRef = useRef(running);
  runningRef.current = running;
  const selectedNodeIdRef = useRef(selectedNodeId);
  selectedNodeIdRef.current = selectedNodeId;

  // Run starts run mode (lock + edge effect + live recompute) AND opens the
  // inspector already on the Verdict section — the toolbar lives in the header
  // (outside the panel), so we pull the panel open to show the result without
  // the user having to open/scroll manually. `runStartNonce` triggers the
  // scroll to the Verdict (in case the panel was scrolled all the way down).
  const handleRun = useCallback(() => {
    setInspectorOpen(true);
    setInspectorValue(["verdict"]);
    setRunStartNonce((n) => n + 1);
    startRun();
  }, [startRun]);

  // During a run the accordion is locked on the Verdict: the shell ignores any
  // section change coming from `onValueChange` (the controlled value doesn't
  // change). In idle it forwards normally.
  const handleInspectorValueChange = useCallback(
    (next: string[]) => {
      if (running) return;
      setInspectorValue(next);
    },
    [running],
  );

  // Clicking a node on the canvas opens the inspector already on the attributes
  // (Node) section. It watches `nodeClickNonce` (not just `selectedNodeId`) to
  // react to EVERY click — re-clicking the already-selected node doesn't change
  // the id, but should still reopen the Node section (e.g. after a Run switched
  // to the Verdict). During a run the effect is a no-op (we stay locked on the
  // Verdict). `nodeClickNonce === 0` is the mount (no click) — we open nothing.
  useEffect(() => {
    if (nodeClickNonce === 0) return;
    if (runningRef.current) return;
    if (selectedNodeIdRef.current) {
      setInspectorOpen(true);
      setInspectorValue(["node"]);
    }
  }, [nodeClickNonce]);

  // Onboarding: handlers shared by the welcome, the empty-canvas overlay and
  // the tour. `loadExample` reuses the pattern from the toolbar's `handlePreset`
  // (applyGraph + deserializeGraph + requestFitView) and marks the seen flag.
  const loadExample = useCallback(() => {
    const preset = PRESET_GRAPHS.find((p) => p.id === EXAMPLE_PRESET_ID);
    if (preset) {
      applyGraph(deserializeGraph(preset.doc));
      requestFitView();
      toast.success(`Loaded preset: ${preset.title}`);
    }
    markOnboardingSeen();
    setWelcomeOpen(false);
    endTour();
  }, [applyGraph, requestFitView, endTour]);

  const startTour = useCallback(() => {
    markOnboardingSeen();
    setWelcomeOpen(false);
    startTourStep();
  }, [startTourStep]);

  const dismissWelcome = useCallback(() => {
    markOnboardingSeen();
    setWelcomeOpen(false);
  }, []);

  // First visit: if the onboarding flag isn't set, opens the welcome once on
  // mount.
  useEffect(() => {
    if (!hasSeenOnboarding()) {
      setWelcomeOpen(true);
    }
  }, []);

  // Tour: prepares the target before measuring — opens the palette on the
  // "palette" step, the inspector on the "inspector"/"challenge" steps, and
  // expands the accordion's Challenge section on the "challenge" step so it's
  // visible under the spotlight.
  useEffect(() => {
    if (tourStep === null) return;
    const step = TOUR_STEPS[tourStep];
    if (step?.id === "palette") setSidebarOpen(true);
    if (step?.id === "inspector") setInspectorOpen(true);
    if (step?.id === "challenge") {
      setInspectorOpen(true);
      setInspectorValue(["challenge"]);
    }
  }, [tourStep]);

  // Mount restore — recovers the last saved graph from localStorage (auto-save)
  // and makes it the history **baseline** (`replaceCurrent`), so undo doesn't
  // revert to an empty canvas. `applyGraph` fires the history observer effect,
  // but the echo commit is discarded (snapshot == present after replaceCurrent).
  // All deps are stable callbacks (useCallback), so the effect only runs on
  // mount. `setHydrated(true)` releases the empty-canvas overlay (avoids a flash
  // before we know whether there's a saved graph).
  const { replaceCurrent } = history;
  useEffect(() => {
    const doc = readStoredGraph();
    if (doc) {
      applyGraph(doc);
      replaceCurrent({
        nodes: doc.nodes,
        edges: doc.edges,
        params: doc.params,
      });
      requestFitView();
    }
    setHydrated(true);
  }, [applyGraph, replaceCurrent, requestFitView]);

  // Debounced auto-save: 400ms after any change (node/edge/param/position),
  // writes to localStorage. Doesn't save during a run (avoids recompute churn).
  useEffect(() => {
    if (running) return;
    const timer = setTimeout(() => {
      writeStoredGraph(nodes, edges, params);
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [nodes, edges, params, running]);

  // Keyboard shortcuts (undo/redo/copy/paste/duplicate/run-toggle/help). Read
  // via ref so the listener is registered once and always sees fresh state.
  // Ctrl+A and Delete remain in `FlowCanvas` (different keys, no conflict).
  const shortcutsRef = useRef({
    running,
    nodes,
    edges,
    history,
    setNodes,
    setEdges,
    handleRun,
    stopRun,
    setHelpOpen,
  });
  shortcutsRef.current = {
    running,
    nodes,
    edges,
    history,
    setNodes,
    setEdges,
    handleRun,
    stopRun,
    setHelpOpen,
  };
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) {
        return;
      }
      const consumed = handleShortcutKey(
        {
          key: event.key,
          mod: event.ctrlKey || event.metaKey,
          shift: event.shiftKey,
        },
        shortcutsRef.current,
      );
      if (consumed) {
        event.preventDefault();
      }
    };
    globalThis.addEventListener("keydown", onKeyDown);
    return () => globalThis.removeEventListener("keydown", onKeyDown);
  }, []);

  // Accepts the "move" drop-effect across the whole shell while dragging a
  // block — without this, the cursor turns into 🚫 (no-drop) when crossing the
  // sidebar/header, since only the canvas calls `preventDefault` on `dragover`.
  // Node creation still happens only on the canvas `onDrop`; here we just keep
  // the "move" cursor consistent.
  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (event.dataTransfer.types.includes(BLOCK_DND_MIME)) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    }
  }, []);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: drag-and-drop cursor (not a keyboard widget)
    <div className="h-dvh w-full overflow-hidden" onDragOver={onDragOver}>
      <SidebarProvider
        className="h-full w-full"
        style={{ minHeight: 0 }}
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
      >
        <AppSidebar />
        <main className="flex h-full flex-1 flex-col overflow-hidden">
          <FlowToolbar
            inspectorOpen={inspectorOpen}
            onToggleInspector={() => setInspectorOpen((v) => !v)}
            onRun={handleRun}
            helpOpen={helpOpen}
            onHelpChange={setHelpOpen}
            onStartTour={startTour}
          />
          <div className="relative flex-1 overflow-hidden" data-tour="canvas">
            <FlowCanvas />
            <EmptyCanvasHint
              visible={
                hydrated &&
                nodes.length === 0 &&
                !running &&
                !tourActive &&
                !welcomeOpen
              }
              onLoadExample={loadExample}
              onTakeTour={startTour}
            />
          </div>
        </main>
        <FlowInspector
          open={inspectorOpen}
          value={inspectorValue}
          onValueChange={handleInspectorValueChange}
          scrollTopSignal={nodeClickNonce}
          locked={running}
          scrollToVerdictSignal={runStartNonce}
        />
      </SidebarProvider>
      <WelcomeDialog
        open={welcomeOpen}
        onTakeTour={startTour}
        onLoadExample={loadExample}
        onDismiss={dismissWelcome}
      />
      <TourOverlay
        step={tourStep}
        onNext={tourNext}
        onPrev={tourPrev}
        onEnd={endTour}
        onLoadExample={loadExample}
      />
    </div>
  );
}

/**
 * Home layout shell: header with toolbar (File/Presets/Edit/Help + Run/Stop +
 * toggles) + full-screen React Flow canvas + left shadcn sidebar (palette,
 * collapsible offcanvas) + right panel (attrs/params/verdict inspector). The
 * `FlowEditorProvider` wraps everything so the palette, canvas, inspector and
 * toolbar share the same state. The graph auto-persists to localStorage on
 * refresh; JSON export/import swaps graphs between sessions.
 */
export function FlowShell() {
  return (
    <FlowEditorProvider>
      <ShellLayout />
    </FlowEditorProvider>
  );
}
