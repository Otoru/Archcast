import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { BlockNode as BlockNodeType } from "@/components/flow/block-node";
import { defaultChallengeParams } from "@/components/flow/flow-editor-helpers";
import { FlowVerdict } from "@/components/flow/flow-verdict";
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
const PARAMS = defaultChallengeParams();

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

const failedVerdict: Verdict = {
  passed: false,
  endToEndLatency: 380,
  systemAvailability: 0.998,
  nodes: {
    app: { rho: 1.2, latency: 80, saturated: true, provisioned: 1, dropped: 0 },
    db: {
      rho: 1.05,
      latency: 60,
      saturated: true,
      provisioned: 1,
      dropped: 140,
    },
  },
  edgeFlows: {},
  violations: [
    { type: "latency", detail: "p99 380ms > SLO 200ms" },
    { type: "saturation", nodeId: "app", detail: "rho 1.20 > 1" },
    { type: "saturation", nodeId: "db", detail: "rho 1.05 > 1" },
    { type: "availability", detail: "0.998 < SLO 0.999" },
  ],
};

const meta = {
  tags: ["ai-generated"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  render: () => (
    <div className="w-96 border-2 border-wf-border bg-wf-surface">
      <FlowVerdict
        verdict={null}
        verdictError={null}
        params={PARAMS}
        nodes={NODES}
      />
    </div>
  ),
};

export const Passed: Story = {
  render: () => (
    <div className="w-96 border-2 border-wf-border bg-wf-surface">
      <FlowVerdict
        verdict={passedVerdict}
        verdictError={null}
        params={PARAMS}
        nodes={NODES}
      />
    </div>
  ),
};

export const Failed: Story = {
  render: () => (
    <div className="w-96 border-2 border-wf-border bg-wf-surface">
      <FlowVerdict
        verdict={failedVerdict}
        verdictError={null}
        params={PARAMS}
        nodes={NODES}
      />
    </div>
  ),
};

export const CycleError: Story = {
  render: () => (
    <div className="w-96 border-2 border-wf-border bg-wf-surface">
      <FlowVerdict
        verdict={null}
        verdictError="Graph has a cycle — remove an edge to run the simulation."
        params={PARAMS}
        nodes={NODES}
      />
    </div>
  ),
};
