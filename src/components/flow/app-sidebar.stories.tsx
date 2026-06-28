import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AppSidebar } from "@/components/flow/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

const meta = {
  component: AppSidebar,
  parameters: { layout: "fullscreen" },
  tags: ["ai-generated"],
} satisfies Meta<typeof AppSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <SidebarProvider style={{ minHeight: 0 }} className="flex h-dvh w-full">
      <AppSidebar />
    </SidebarProvider>
  ),
};
