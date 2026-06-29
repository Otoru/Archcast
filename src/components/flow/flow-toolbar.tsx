"use client";

import { CircleHelpIcon, PlayIcon, SquareIcon } from "lucide-react";
import { useCallback } from "react";
import { toast } from "sonner";
import {
  applyClipboardEntry,
  type ClipboardEntry,
  copySelection,
  duplicateSelection,
  pasteSelection,
} from "@/components/flow/clipboard";
import { defaultChallengeParams } from "@/components/flow/flow-editor-helpers";
import {
  type FlowEditorState,
  useFlowEditor,
} from "@/components/flow/flow-editor-state";
import { FlowInspectorToggle } from "@/components/flow/flow-inspector";
import { clearStoredGraph } from "@/components/flow/graph-persistence";
import {
  deserializeGraph,
  type LoadedGraph,
  serializeGraph,
} from "@/components/flow/graph-serialization";
import { HelpDialog } from "@/components/flow/help-dialog";
import {
  PRESET_GRAPHS,
  type PresetGraph,
} from "@/components/flow/preset-graphs";
import { useGraphIO } from "@/components/flow/use-graph-io";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Menubar } from "@/components/ui/menubar";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const MOD =
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad|iPod/.test(navigator.platform)
    ? "⌘"
    : "Ctrl";

type FlowToolbarProps = {
  inspectorOpen: boolean;
  onToggleInspector: () => void;
  /** Run: abre o inspector na seção Verdict + startRun (a shell orquestra os dois). */
  onRun: () => void;
  helpOpen: boolean;
  onHelpChange: (open: boolean) => void;
};

/** Botão de ícone com tooltip — envolve o Button base-ui via `render` no trigger. */
function ToolbarButton({
  label,
  disabled,
  onClick,
  icon,
}: Readonly<{
  label: string;
  disabled?: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}>) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            disabled={disabled}
            onClick={onClick}
          >
            {icon}
          </Button>
        }
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function applyEntry(
  entry: ClipboardEntry,
  setNodes: FlowEditorState["setNodes"],
  setEdges: FlowEditorState["setEdges"],
): void {
  applyClipboardEntry(entry, setNodes, setEdges);
}

/**
 * Barra superior do playground: sidebar toggle, Run/Stop, dropdowns
 * File/Presets/Edit, Share, Help — e à direita Theme + Inspector toggle. Consome
 * `useFlowEditor` (estado + histórico + applyGraph + requestFitView) e
 * `useGraphIO` (export/import/share). Não chama `useReactFlow` (está fora do
 * ReactFlowProvider) — `fitView` é sinalizado via contexto.
 */
export function FlowToolbar({
  inspectorOpen,
  onToggleInspector,
  onRun,
  helpOpen,
  onHelpChange,
}: Readonly<FlowToolbarProps>) {
  const {
    nodes,
    edges,
    params,
    setNodes,
    setEdges,
    history,
    applyGraph,
    requestFitView,
    running,
    computing,
    stopRun,
  } = useFlowEditor();

  const getSnapshot = useCallback(
    () => serializeGraph(nodes, edges, params),
    [nodes, edges, params],
  );
  const onLoad = useCallback(
    (doc: LoadedGraph) => {
      applyGraph(doc);
      requestFitView();
    },
    [applyGraph, requestFitView],
  );
  const graphIO = useGraphIO(getSnapshot, onLoad);

  const handleCopy = useCallback(() => {
    copySelection(nodes, edges);
  }, [nodes, edges]);

  const handlePaste = useCallback(() => {
    const entry = pasteSelection();
    if (entry) {
      applyEntry(entry, setNodes, setEdges);
    }
  }, [setNodes, setEdges]);

  const handleDuplicate = useCallback(() => {
    const entry = duplicateSelection(nodes, edges);
    if (entry) {
      applyEntry(entry, setNodes, setEdges);
    }
  }, [nodes, edges, setNodes, setEdges]);

  const handleClear = useCallback(() => {
    applyGraph({ nodes: [], edges: [], params: defaultChallengeParams() });
    clearStoredGraph();
    requestFitView();
    toast.success("Canvas cleared");
  }, [applyGraph, requestFitView]);

  const handlePreset = useCallback(
    (preset: PresetGraph) => {
      // Presets guardam o `GraphDocument` (plano, serializável); `deserializeGraph`
      // reconstrói o shape RF (e valida cada kind) antes de aplicar.
      applyGraph(deserializeGraph(preset.doc));
      requestFitView();
      toast.success(`Loaded preset: ${preset.title}`);
    },
    [applyGraph, requestFitView],
  );

  return (
    <TooltipProvider>
      <header className="flex h-12 items-center gap-1 border-b border-wf-border bg-background px-2">
        <Tooltip>
          <TooltipTrigger render={<SidebarTrigger />} />
          <TooltipContent>Toggle block palette</TooltipContent>
        </Tooltip>
        <Separator orientation="vertical" className="mx-1 h-6" />
        {running ? (
          <Button variant="destructive" size="sm" onClick={stopRun}>
            <SquareIcon />
            Stop
          </Button>
        ) : (
          <Button
            variant="default"
            size="sm"
            onClick={onRun}
            loading={computing}
          >
            <PlayIcon />
            Run
          </Button>
        )}
        <Separator orientation="vertical" className="mx-1 h-6" />
        <Menubar className="border-0 bg-transparent p-0">
          <Menubar.Menu>
            <Menubar.Trigger>File</Menubar.Trigger>
            <Menubar.Content>
              <Menubar.Item disabled={running} onClick={graphIO.importGraph}>
                Import…
              </Menubar.Item>
              <Menubar.Item onClick={graphIO.exportGraph}>Export…</Menubar.Item>
              <Menubar.Separator />
              <Menubar.Item disabled={running} onClick={handleClear}>
                Clear canvas
              </Menubar.Item>
            </Menubar.Content>
          </Menubar.Menu>
          <Menubar.Menu>
            <Menubar.Trigger>Presets</Menubar.Trigger>
            <Menubar.Content>
              {PRESET_GRAPHS.map((preset) => (
                <Menubar.Item
                  key={preset.id}
                  disabled={running}
                  onClick={() => handlePreset(preset)}
                >
                  {preset.title}
                </Menubar.Item>
              ))}
            </Menubar.Content>
          </Menubar.Menu>
          <Menubar.Menu>
            <Menubar.Trigger>Edit</Menubar.Trigger>
            <Menubar.Content>
              <Menubar.Item
                disabled={running || !history.canUndo}
                onClick={history.undo}
                shortcut={`${MOD}Z`}
              >
                Undo
              </Menubar.Item>
              <Menubar.Item
                disabled={running || !history.canRedo}
                onClick={history.redo}
                shortcut={`${MOD}Shift+Z`}
              >
                Redo
              </Menubar.Item>
              <Menubar.Separator />
              <Menubar.Item onClick={handleCopy} shortcut={`${MOD}C`}>
                Copy
              </Menubar.Item>
              <Menubar.Item
                disabled={running}
                onClick={handlePaste}
                shortcut={`${MOD}V`}
              >
                Paste
              </Menubar.Item>
              <Menubar.Item
                disabled={running}
                onClick={handleDuplicate}
                shortcut={`${MOD}D`}
              >
                Duplicate
              </Menubar.Item>
            </Menubar.Content>
          </Menubar.Menu>
        </Menubar>
        <div className="flex-1" />
        <ToolbarButton
          label="Help (?)"
          onClick={() => onHelpChange(true)}
          icon={<CircleHelpIcon />}
        />
        <ThemeToggle />
        <FlowInspectorToggle
          open={inspectorOpen}
          onToggle={onToggleInspector}
          disabled={running}
        />
      </header>
      <HelpDialog open={helpOpen} onOpenChange={onHelpChange} />
    </TooltipProvider>
  );
}
