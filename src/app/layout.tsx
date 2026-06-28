import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";

import "@/app/globals.css";
import { rootFontVariables } from "@/lib/fonts";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Wireframe",
  description: "Wireframe — projeto Next.js com Tailwind, Base UI e Storybook",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={cn(rootFontVariables, "h-full antialiased")}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
