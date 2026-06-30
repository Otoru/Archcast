import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  hasSeenOnboarding,
  markOnboardingSeen,
} from "@/components/flow/onboarding-persistence";

describe("onboarding-persistence", () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
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

  it("hasSeen retorna false em SSR (sem window)", () => {
    vi.stubGlobal("window", undefined);
    expect(hasSeenOnboarding()).toBe(false);
  });

  it("markOnboardingSeen é no-op em SSR (sem window)", () => {
    vi.stubGlobal("window", undefined);
    expect(() => markOnboardingSeen()).not.toThrow();
  });

  it("hasSeen retorna false quando o storage lança (modo privado/cota)", () => {
    vi.spyOn(globalThis.localStorage, "getItem").mockImplementation(() => {
      throw new Error("quota");
    });
    expect(hasSeenOnboarding()).toBe(false);
  });

  it("markOnboardingSeen engole erro de escrita (cota cheia)", () => {
    vi.spyOn(globalThis.localStorage, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    expect(() => markOnboardingSeen()).not.toThrow();
  });
});
