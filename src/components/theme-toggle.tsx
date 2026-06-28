"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Gate em `mounted` para que servidor e primeira renderização do cliente
  // produzam o mesmo className (evita hydration mismatch do next-themes).
  const isDark = mounted && resolvedTheme === "dark";

  return (
    <Button
      variant="outline"
      size="icon"
      className="rounded-full bg-background shadow-md"
      aria-label="Alternar tema"
      disabled={!mounted}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      <span aria-hidden="true" className="relative block size-3.5">
        <Sun
          className={cn(
            "absolute inset-0 size-3.5 transition-all duration-300 ease-in-out",
            isDark
              ? "rotate-0 scale-100 opacity-100"
              : "rotate-90 scale-0 opacity-0",
          )}
        />
        <Moon
          className={cn(
            "absolute inset-0 size-3.5 transition-all duration-300 ease-in-out",
            isDark
              ? "-rotate-90 scale-0 opacity-0"
              : "rotate-0 scale-100 opacity-100",
          )}
        />
      </span>
    </Button>
  );
}
