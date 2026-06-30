import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type { BlockNode as BlockNodeType } from "@/components/flow/block-node";
import { FlowEditorProvider } from "@/components/flow/flow-editor-state";
import { FlowInspector } from "@/components/flow/flow-inspector";
import { getPreset } from "@/engine";

function rfNode(id: string, kind: string): BlockNodeType {
  return { id, type: "block", position: { x: 0, y: 0 }, data: { kind } };
}

function renderInspector(selectedNodeId: string | null) {
  return render(
    <FlowEditorProvider
      initialNodes={[rfNode("app", "app-server")]}
      initialSelectedNodeId={selectedNodeId}
    >
      <FlowInspector open />
    </FlowEditorProvider>,
  );
}

describe("FlowInspector", () => {
  it("a seção Node traz o rótulo do preset do nó selecionado como título", () => {
    renderInspector("app");
    const preset = getPreset("app-server");
    expect(preset).toBeDefined();
    expect(
      screen.getByRole("button", { name: new RegExp(preset?.label ?? "") }),
    ).toBeInTheDocument();
  });

  it("sem nó selecionado, o título da seção Node cai para 'Node'", () => {
    renderInspector(null);
    expect(screen.getByRole("button", { name: "Node" })).toBeInTheDocument();
  });

  it("abre e fecha a seção Node ao clicar no gatilho", async () => {
    const user = userEvent.setup();
    renderInspector("app");
    const preset = getPreset("app-server");
    const trigger = screen.getByRole("button", {
      name: new RegExp(preset?.label ?? ""),
    });

    // starts open (defaultValue ["node"])
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("só uma seção fica aberta por vez", async () => {
    const user = userEvent.setup();
    renderInspector("app");
    const nodeTrigger = screen.getByRole("button", { name: /App Server/ });
    const challengeTrigger = screen.getByRole("button", { name: "Challenge" });

    expect(nodeTrigger).toHaveAttribute("aria-expanded", "true");
    expect(challengeTrigger).toHaveAttribute("aria-expanded", "false");

    await user.click(challengeTrigger);
    expect(nodeTrigger).toHaveAttribute("aria-expanded", "false");
    expect(challengeTrigger).toHaveAttribute("aria-expanded", "true");
  });
});
