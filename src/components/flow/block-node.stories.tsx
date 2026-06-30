import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import "@xyflow/react/dist/style.css";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";

import {
  BlockNode,
  type BlockNode as BlockNodeType,
  InvalidNodesContext,
} from "@/components/flow/block-node";
import { BLOCK_CATALOG } from "@/engine";

const nodeTypes = { block: BlockNode };

const KIND_OPTIONS = BLOCK_CATALOG.map((block) => block.kind);
const KIND_LABELS = Object.fromEntries(
  BLOCK_CATALOG.map((block) => [block.kind, block.label]),
);

function blockNode(kind: string, x: number, y: number): BlockNodeType {
  return { id: kind, type: "block", position: { x, y }, data: { kind } };
}

const meta: Meta<{ kind: string }> = {
  title: "Flow/BlockNode",
  argTypes: {
    kind: {
      control: { type: "select" },
      options: KIND_OPTIONS,
      labels: KIND_LABELS,
    },
  },
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div style={{ height: "100dvh", width: "100%" }}>
        <ReactFlowProvider>
          <Story />
        </ReactFlowProvider>
      </div>
    ),
  ],
} satisfies Meta<{ kind: string }>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Isolated node — use the "kind" control in the args panel to switch the
 * block and view any of the 28 catalog variations.
 */
export const Single: Story = {
  args: { kind: "app-server" },
  render: (args) => (
    <ReactFlow
      nodes={[blockNode(args.kind, 0, 0)]}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.4 }}
      proOptions={{ hideAttribution: true }}
      colorMode="light"
    >
      <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
      <Controls />
      <MiniMap pannable zoomable />
    </ReactFlow>
  ),
};

const GRID_COLS = 6;
const CELL_W = 240;
const CELL_H = 140;
const allNodes: BlockNodeType[] = BLOCK_CATALOG.map((block, index) =>
  blockNode(
    block.kind,
    (index % GRID_COLS) * CELL_W,
    Math.floor(index / GRID_COLS) * CELL_H,
  ),
);

/**
 * Grid with all catalog blocks side by side — every port configuration
 * (read/write/async, asymmetric, etc.) visible at once.
 */
export const All: Story = {
  render: () => (
    <ReactFlow
      nodes={allNodes}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.1 }}
      proOptions={{ hideAttribution: true }}
      colorMode="light"
    >
      <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
      <Controls />
      <MiniMap pannable zoomable />
    </ReactFlow>
  ),
};

/**
 * Two nodes in a cycle (A→B and B→A, compatible channels) — both light up
 * the `--wf-destructive` border via `InvalidNodesContext`, just like the real
 * canvas when live validation detects the cycle.
 */
export const Invalid: Story = {
  render: () => (
    <InvalidNodesContext.Provider value={new Set(["a", "b"])}>
      <ReactFlow
        nodes={[
          { ...blockNode("app-server", 0, 0), id: "a" },
          { ...blockNode("app-server", 320, 0), id: "b" },
        ]}
        edges={[
          {
            id: "e1",
            source: "a",
            target: "b",
            sourceHandle: "out-read",
            targetHandle: "in-read",
          },
          {
            id: "e2",
            source: "b",
            target: "a",
            sourceHandle: "out-read",
            targetHandle: "in-read",
          },
        ]}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.4 }}
        proOptions={{ hideAttribution: true }}
        colorMode="light"
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        <Controls />
        <MiniMap pannable zoomable />
      </ReactFlow>
    </InvalidNodesContext.Provider>
  ),
};
