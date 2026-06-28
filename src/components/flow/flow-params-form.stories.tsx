import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { defaultChallengeParams } from "@/components/flow/flow-editor-helpers";
import { FlowParamsForm } from "@/components/flow/flow-params-form";
import type { ChallengeParams } from "@/engine";

function Harness({ initial }: { initial: ChallengeParams }) {
  const [params, setParams] = useState(initial);
  return (
    <div className="w-80 border-2 border-wf-border bg-wf-surface">
      <FlowParamsForm params={params} onChange={setParams} />
    </div>
  );
}

const meta = {
  tags: ["ai-generated"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <Harness initial={defaultChallengeParams()} />,
};

export const Spiky: Story = {
  render: () => (
    <Harness
      initial={{ ...defaultChallengeParams(), trafficPattern: "spiky" }}
    />
  ),
};
