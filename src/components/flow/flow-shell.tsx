"use client";

import { PlayIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { type DragEvent, useCallback, useEffect, useState } from "react";
import { AppSidebar } from "@/components/flow/app-sidebar";
import { BLOCK_DND_MIME } from "@/components/flow/dnd";
import {
  FlowEditorProvider,
  useFlowEditor,
} from "@/components/flow/flow-editor-state";
import {
  FlowInspector,
  FlowInspectorToggle,
} from "@/components/flow/flow-inspector";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

// Canvas mede o viewport; carrega só no cliente (Next 16 exige ssr:false
// dentro de um Client Component — esta shell é client).
const FlowCanvas = dynamic(
  () => import("@/components/flow/flow-canvas").then((m) => m.FlowCanvas),
  { ssr: false },
);

/**
 * Layout interno (dentro do `FlowEditorProvider`): canvas + sidebar esquerda
 * (paleta) + painel direito (inspector) + botão Run no canto superior direito.
 * Consome `useFlowEditor` para disparar a simulação.
 */
function ShellLayout() {
  const { run, isRunning, selectedNodeId } = useFlowEditor();
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [inspectorValue, setInspectorValue] = useState<string[]>(["node"]);

  // Run dispara a simulação E abre o inspector já na seção Verdict — o botão
  // Run mora na top-bar (fora do painel), então puxamos o painel pra mostrar o
  // resultado sem o usuário precisar abrir/rolar manualmente.
  const handleRun = useCallback(() => {
    setInspectorOpen(true);
    setInspectorValue(["verdict"]);
    run();
  }, [run]);

  // Selecionar um nó no canvas abre o inspector já na seção de atributos
  // (Node), para o usuário editar o bloco sem precisar abrir/rolar o painel.
  // Desselecionar (null) não mexe no painel — deixa o usuário onde está.
  useEffect(() => {
    if (selectedNodeId) {
      setInspectorOpen(true);
      setInspectorValue(["node"]);
    }
  }, [selectedNodeId]);

  // Aceita o drop-effect "move" em toda a shell durante o arraste de um bloco
  // — sem isso, o cursor vira 🚫 (no-drop) ao cruzar a sidebar/header, já que
  // só o canvas dá `preventDefault` no `dragover`. A criação do nó continua só
  // no `onDrop` do canvas; aqui só mantemos o cursor de "mover" consistente.
  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (event.dataTransfer.types.includes(BLOCK_DND_MIME)) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    }
  }, []);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: cursor do drag-and-drop (não é widget de teclado)
    <div className="h-dvh w-full overflow-hidden" onDragOver={onDragOver}>
      <SidebarProvider className="h-full w-full" style={{ minHeight: 0 }}>
        <AppSidebar />
        <main className="relative h-full flex-1 overflow-hidden">
          <SidebarTrigger
            variant="outline"
            size="icon"
            className="absolute left-4 top-4 z-20 rounded-full bg-background shadow-md"
          />
          <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={handleRun}
              loading={isRunning}
            >
              <PlayIcon />
              Run
            </Button>
            <ThemeToggle />
            <FlowInspectorToggle
              open={inspectorOpen}
              onToggle={() => setInspectorOpen((v) => !v)}
            />
          </div>
          <FlowCanvas />
        </main>
        <FlowInspector
          open={inspectorOpen}
          value={inspectorValue}
          onValueChange={setInspectorValue}
        />
      </SidebarProvider>
    </div>
  );
}

/**
 * Shell de layout da home: canvas React Flow em tela cheia + sidebar shadcn
 * esquerda (paleta, colapsável offcanvas) + painel direito (inspector de
 * attrs/params/veredito). O `FlowEditorProvider` envolve tudo para que
 * paleta, canvas, inspector e botão Run compartilhem o mesmo estado.
 */
export function FlowShell() {
  return (
    <FlowEditorProvider>
      <ShellLayout />
    </FlowEditorProvider>
  );
}
