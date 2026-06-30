import { beforeEach, describe, expect, it } from "vitest";
import {
  hasSeenOnboarding,
  markOnboardingSeen,
} from "@/components/flow/onboarding-persistence";

describe("onboarding-persistence", () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
  });

  it("hasSeen devolve false quando nada salvo", () => {
    expect(hasSeenOnboarding()).toBe(false);
  });

  it("markOnboardingSeen faz hasSeen virar true", () => {
    markOnboardingSeen();
    expect(hasSeenOnboarding()).toBe(true);
  });

  it("é idempotente", () => {
    markOnboardingSeen();
    markOnboardingSeen();
    expect(hasSeenOnboarding()).toBe(true);
  });

  it("escreve o marcador esperado no localStorage", () => {
    markOnboardingSeen();
    expect(globalThis.localStorage.getItem("wireframe:onboarded")).toBe("1");
  });
});
