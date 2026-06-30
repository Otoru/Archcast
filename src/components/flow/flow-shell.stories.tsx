import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { within } from "storybook/test";

import { FlowShell } from "@/components/flow/flow-shell";

const meta = {
  component: FlowShell,
  parameters: { layout: "fullscreen" },
  tags: ["ai-generated"],
} satisfies Meta<typeof FlowShell>;

export default meta;
type Story = StoryObj<typeof meta>;

// Each interactive story clears the onboarding flag before mount so the welcome
// dialog auto-opens (otherwise a previous story's click would persist the flag
// in the shared iframe localStorage and the welcome wouldn't reappear).
const clearOnboarding = () => {
  window.localStorage.clear();
};

export const Default: Story = {};

export const TakeTour: Story = {
  loaders: [clearOnboarding],
  play: async ({ canvasElement, userEvent }) => {
    // base-ui Dialog portals to document.body, so scope queries there.
    const body = within(canvasElement.ownerDocument.body);
    const button = await body.findByRole("button", { name: /take the tour/i });
    await userEvent.click(button);
    // The tour starts (step 0). Press Escape to exercise useTour's Esc handler
    // (which cancels the tour) before the dialog's own close takes over.
    await userEvent.keyboard("{Escape}");
  },
};

export const LoadExample: Story = {
  loaders: [clearOnboarding],
  play: async ({ canvasElement, userEvent }) => {
    const body = within(canvasElement.ownerDocument.body);
    const button = await body.findByRole("button", {
      name: /load an example/i,
    });
    await userEvent.click(button);
  },
};

export const StartFromScratch: Story = {
  loaders: [clearOnboarding],
  play: async ({ canvasElement, userEvent }) => {
    const body = within(canvasElement.ownerDocument.body);
    const button = await body.findByRole("button", {
      name: /start from scratch/i,
    });
    await userEvent.click(button);
  },
};
