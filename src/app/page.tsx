import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-24 text-center">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <h1 className="text-4xl font-semibold tracking-tight">Wireframe</h1>
      <p className="max-w-md text-lg text-muted-foreground">
        Next.js + Tailwind + TypeScript + Vitest + Base UI + Storybook.
      </p>
      <Button>Começar</Button>
    </main>
  );
}
