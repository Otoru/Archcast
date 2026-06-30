"use client";

import {
  Database,
  type LucideIcon,
  MessageSquare,
  Network,
  Search,
  Server,
  Smartphone,
  Wrench,
} from "lucide-react";
import { useState } from "react";
import {
  clearBlockDragImage,
  setBlockDragImage,
} from "@/components/flow/block-drag-image";
import { BLOCK_DND_MIME } from "@/components/flow/dnd";
import { Input } from "@/components/ui/input";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
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
 * Workflow block palette: lists the `BLOCK_CATALOG` presets grouped by layer,
 * with a fixed search header that filters blocks by label. Each item is
 * draggable onto the canvas, which creates a node of that kind at the drop
 * position.
 */
export function AppSidebar() {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  return (
    <Sidebar
      collapsible="offcanvas"
      className="!border-r-2 !border-wf-border"
      data-tour="palette"
    >
      <SidebarHeader>
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-wf-ink-soft"
            aria-hidden="true"
          />
          <Input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search blocks..."
            aria-label="Search blocks"
            className="pl-9"
          />
        </div>
      </SidebarHeader>
      <SidebarContent>
        {LAYER_META.map(({ layer, label, icon: Icon }) => {
          const blocks = BLOCK_CATALOG.filter(
            (block) =>
              block.layer === layer &&
              (q === "" || block.label.toLowerCase().includes(q)),
          );
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
                        className="cursor-grab active:cursor-grabbing"
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
