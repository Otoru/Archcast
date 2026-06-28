"use client";

import {
  Database,
  type LucideIcon,
  MessageSquare,
  Network,
  Server,
  Smartphone,
  Wrench,
} from "lucide-react";
import {
  clearBlockDragImage,
  setBlockDragImage,
} from "@/components/flow/block-drag-image";
import { BLOCK_DND_MIME } from "@/components/flow/dnd";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { BLOCK_CATALOG, type Layer } from "@/engine";

const LAYER_META: { layer: Layer; label: string; icon: LucideIcon }[] = [
  { layer: "client", label: "Clients", icon: Smartphone },
  { layer: "edge", label: "Edge", icon: Network },
  { layer: "compute", label: "Compute", icon: Server },
  { layer: "data", label: "Data", icon: Database },
  { layer: "messaging", label: "Messaging", icon: MessageSquare },
  { layer: "platform", label: "Platform", icon: Wrench },
];

/**
 * Paleta de blocos do workflow: lista os presets do `BLOCK_CATALOG`
 * agrupados por camada. Cada item é arrastável para o canvas, que cria um
 * nó daquele kind na posição do drop.
 */
export function AppSidebar() {
  return (
    <Sidebar collapsible="offcanvas">
      <SidebarContent>
        {LAYER_META.map(({ layer, label, icon: Icon }) => {
          const blocks = BLOCK_CATALOG.filter((block) => block.layer === layer);
          if (blocks.length === 0) {
            return null;
          }
          return (
            <SidebarGroup key={layer}>
              <SidebarGroupLabel className="gap-2">
                <Icon />
                <span>{label}</span>
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {blocks.map((block) => (
                    <SidebarMenuItem key={block.kind}>
                      <SidebarMenuButton
                        draggable
                        onDragStart={(event) => {
                          event.dataTransfer.setData(
                            BLOCK_DND_MIME,
                            block.kind,
                          );
                          event.dataTransfer.setData("text/plain", block.kind);
                          event.dataTransfer.effectAllowed = "move";
                          setBlockDragImage(event.dataTransfer, block.kind);
                        }}
                        onDragEnd={clearBlockDragImage}
                      >
                        <span>{block.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>
    </Sidebar>
  );
}
