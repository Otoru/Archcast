import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { BlockNode as BlockNodeType } from "@/components/flow/block-node";
import { FlowEditorProvider } from "@/components/flow/flow-editor-state";
import { FlowInspector } from "@/components/flow/flow-inspector";
import type { Verdict } from "@/engine";

function rfNode(id: string, kind: string): BlockNodeType {
  return {
    id,
    type: "block",
    position: { x: 0, y: 0 },
    data: { kind, attrs: {} },
  };
}

const NODES = [rfNode("app", "app-server"), rfNode("db", "sql-db")];

const passedVerdict: Verdict = {
  passed: true,
  endToEndLatency: 120,
  systemAvailability: 0.9995,
  nodes: {
    app: {
      rho: 0.6,
      latency: 20,
      saturated: false,
      provisioned: 2,
      dropped: 0,
    },
    db: { rho: 0.8, latency: 5, saturated: false, provisioned: 1, dropped: 0 },
  },
  edgeFlows: {},
  violations: [],
};

function Harness({
  selectedNodeId,
  verdict,
}: Readonly<{
  selectedNodeId: string | null;
  verdict: Verdict | null;
}>) {
  return (
    <FlowEditorProvider
      initialNodes={NODES}
      initialSelectedNodeId={selectedNodeId}
      initialVerdict={verdict}
    >
      <div className="flex h-dvh w-full">
        <main className="flex-1 bg-wf-bg" />
        <FlowInspector open />
      </div>
    </FlowEditorProvider>
  );
}

const meta = {
  tags: ["ai-generated"],
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <Harness selectedNodeId="app" verdict={passedVerdict} />,
};

export const EmptySelection: Story = {
  render: () => <Harness selectedNodeId={null} verdict={null} />,
};

export const NoVerdict: Story = {
  render: () => <Harness selectedNodeId="db" verdict={null} />,
};
