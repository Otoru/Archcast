"use client";

import dynamic from "next/dynamic";
import { AppSidebar } from "@/components/flow/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

// Canvas mede o viewport; carrega só no cliente (Next 16 exige ssr:false
// dentro de um Client Component — esta shell é client).
const FlowCanvas = dynamic(
  () => import("@/components/flow/flow-canvas").then((m) => m.FlowCanvas),
  { ssr: false },
);

/**
 * Shell de layout da home: canvas React Flow em tela cheia + sidebar shadcn
 * colapsável (offcanvas = some completamente) acionada por um FAB flutuante
 * sobre o canto do canvas.
 */
export function FlowShell() {
  return (
    <div className="h-dvh w-full overflow-hidden">
      <SidebarProvider className="h-full w-full" style={{ minHeight: 0 }}>
        <AppSidebar />
        <main className="relative h-full flex-1 overflow-hidden">
          <SidebarTrigger className="absolute left-4 top-4 z-20 rounded-full border bg-background shadow-md" />
          <div className="absolute right-4 top-4 z-20">
            <ThemeToggle />
          </div>
          <FlowCanvas />
        </main>
      </SidebarProvider>
    </div>
  );
}
