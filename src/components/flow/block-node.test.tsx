import "@xyflow/react/dist/style.css";

import { render, screen } from "@testing-library/react";
import { ReactFlow } from "@xyflow/react";
import { describe, expect, it } from "vitest";

import {
  BlockNode,
  type BlockNode as BlockNodeType,
  InvalidNodesContext,
} from "@/components/flow/block-node";

const nodeTypes = { block: BlockNode };

/** Renders a single BlockNode in a minimal ReactFlow (polyfilled jsdom). */
function renderNode(kind: string, invalidIds?: Set<string>): HTMLElement {
  const node: BlockNodeType = {
    id: "n1",
    type: "block",
    position: { x: 0, y: 0 },
    data: { kind },
  };
  const flow = (
    <ReactFlow
      nodes={[node]}
      nodeTypes={nodeTypes}
      proOptions={{ hideAttribution: true }}
    />
  );
  const { container } = render(
    <div style={{ height: 600, width: 800 }}>
      {invalidIds ? (
        <InvalidNodesContext.Provider value={invalidIds}>
          {flow}
        </InvalidNodesContext.Provider>
      ) : (
        flow
      )}
    </div>,
  );
  return container;
}

describe("BlockNode", () => {
  it("renderiza rótulo do bloco e caption da camada", () => {
    renderNode("app-server");
    expect(screen.getByText("App Server")).toBeInTheDocument();
    expect(screen.getByText("Compute")).toBeInTheDocument();
  });

  it("app-server gera 3 handles target e 3 source (read/write/async)", () => {
    const container = renderNode("app-server");
    const targets = container.querySelectorAll('[data-handleid^="in-"]');
    const sources = container.querySelectorAll('[data-handleid^="out-"]');
    expect(targets).toHaveLength(3);
    expect(sources).toHaveLength(3);
    expect(container.querySelector('[data-handleid="in-read"]')).not.toBeNull();
    expect(
      container.querySelector('[data-handleid="out-async"]'),
    ).not.toBeNull();
  });

  it("feature-flags gera 1 target e 0 source (read)", () => {
    const container = renderNode("feature-flags");
    expect(container.querySelectorAll('[data-handleid^="in-"]')).toHaveLength(
      1,
    );
    expect(container.querySelectorAll('[data-handleid^="out-"]')).toHaveLength(
      0,
    );
    expect(container.querySelector('[data-handleid="in-read"]')).not.toBeNull();
  });

  it("web-client (origem) gera 0 target e 2 source", () => {
    const container = renderNode("web-client");
    expect(container.querySelectorAll('[data-handleid^="in-"]')).toHaveLength(
      0,
    );
    expect(container.querySelectorAll('[data-handleid^="out-"]')).toHaveLength(
      2,
    );
  });

  it("kind desconhecido renderiza fallback sem handles", () => {
    const container = renderNode("does-not-exist");
    expect(screen.getByText(/unknown: does-not-exist/)).toBeInTheDocument();
    expect(container.querySelectorAll("[data-handleid]")).toHaveLength(0);
  });

  it("nó no InvalidNodesContext ganha borda wf-destructive", () => {
    const container = renderNode("app-server", new Set(["n1"]));
    expect(container.querySelector(".border-wf-destructive")).not.toBeNull();
  });

  it("nó válido não tem borda wf-destructive", () => {
    const container = renderNode("app-server");
    expect(container.querySelector(".border-wf-destructive")).toBeNull();
  });
});
