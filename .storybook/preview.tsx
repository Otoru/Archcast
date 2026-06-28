import type { Preview } from "@storybook/nextjs-vite";
import { initialize, mswLoader } from "msw-storybook-addon";
import { ThemeProvider } from "next-themes";

import "@/app/globals.css";
import { wfFontVariables } from "@/lib/fonts";
import { cn } from "@/lib/utils";

import { mswHandlers } from "./msw-handlers";

initialize({ onUnhandledRequest: "bypass" });

const preview: Preview = {
  decorators: [
    (Story) => (
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem={false}
        storageKey="wireframe-storybook-theme"
        disableTransitionOnChange
      >
        <div className={cn(wfFontVariables, "bg-wf-bg p-6 font-wf-body")}>
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
  loaders: [mswLoader],
  parameters: {
    msw: { handlers: mswHandlers },
    backgrounds: {
      default: "wireframe",
      values: [
        { name: "wireframe", value: "#fafafa" },
        { name: "white", value: "#ffffff" },
      ],
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: "todo",
    },
  },
};

export default preview;
