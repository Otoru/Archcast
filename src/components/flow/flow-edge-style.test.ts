import { describe, expect, it } from "vitest";
import { strokeByMagnitude } from "@/components/flow/flow-edge-style";

describe("strokeByMagnitude", () => {
  it("usa a cor mais suave para magnitude baixa (< 0.33)", () => {
    expect(strokeByMagnitude(0)).toBe("var(--color-wf-border-soft)");
    expect(strokeByMagnitude(0.32)).toBe("var(--color-wf-border-soft)");
  });

  it("usa a cor intermediária para magnitude média (0.33–0.66)", () => {
    expect(strokeByMagnitude(0.33)).toBe("var(--color-wf-border)");
    expect(strokeByMagnitude(0.65)).toBe("var(--color-wf-border)");
  });

  it("usa a cor de foco para magnitude alta (≥ 0.66)", () => {
    expect(strokeByMagnitude(0.66)).toBe("var(--color-wf-focus)");
    expect(strokeByMagnitude(1)).toBe("var(--color-wf-focus)");
  });
});
