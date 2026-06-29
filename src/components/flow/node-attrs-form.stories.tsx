import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import type { BlockNode as BlockNodeType } from "@/components/flow/block-node";
import { NodeAttrsForm } from "@/components/flow/node-attrs-form";

function blockNode(id: string, kind: string): BlockNodeType {
  return {
    id,
    type: "block",
    position: { x: 0, y: 0 },
    data: { kind, attrs: {} },
  };
}

function FormHarness({ initial }: { initial: BlockNodeType }) {
  const [node, setNode] = useState(initial);
  return (
    <div className="w-80 border-2 border-wf-border bg-wf-surface">
      <NodeAttrsForm node={node} onChange={setNode} />
    </div>
  );
}

const meta: Meta<{ kind: string }> = {
  title: "Flow/NodeAttrsForm",
  tags: ["ai-generated"],
  argTypes: {
    kind: {
      control: { type: "select" },
      options: ["app-server", "cdn", "message-queue", "sql-db"],
    },
  },
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const AppServer: Story = {
  args: { kind: "app-server" },
  render: (args) => <FormHarness initial={blockNode("n1", args.kind)} />,
};

export const Cdn: Story = {
  render: () => <FormHarness initial={blockNode("n1", "cdn")} />,
};

export const Cache: Story = {
  render: () => <FormHarness initial={blockNode("n1", "cache")} />,
};

export const MessageQueue: Story = {
  render: () => <FormHarness initial={blockNode("n1", "message-queue")} />,
};

export const WithOverride: Story = {
  render: () => (
    <FormHarness
      initial={{
        ...blockNode("n1", "app-server"),
        data: { kind: "app-server", attrs: { capacity: 5000, instances: 3 } },
      }}
    />
  ),
};

export const NoSelection: Story = {
  render: () => (
    <div className="w-80 border-2 border-wf-border bg-wf-surface">
      <NodeAttrsForm node={null} onChange={() => {}} />
    </div>
  ),
};
