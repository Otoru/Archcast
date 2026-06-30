import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TOUR_STEPS, useTour } from "@/components/flow/tour";

describe("useTour", () => {
  it("começa inativo (step === null)", () => {
    const { result } = renderHook(() => useTour());
    expect(result.current.step).toBeNull();
    expect(result.current.isActive).toBe(false);
  });

  it("start ativa no passo 0", () => {
    const { result } = renderHook(() => useTour());
    act(() => result.current.start());
    expect(result.current.step).toBe(0);
    expect(result.current.isActive).toBe(true);
  });

  it("next avança e trava no último passo", () => {
    const { result } = renderHook(() => useTour());
    const last = TOUR_STEPS.length - 1;
    act(() => result.current.start());
    // Advance past the end to ensure the clamp on the last step.
    for (let i = 0; i < TOUR_STEPS.length + 1; i++) {
      act(() => result.current.next());
    }
    expect(result.current.step).toBe(last);
  });

  it("prev recua e trava em 0", () => {
    const { result } = renderHook(() => useTour());
    act(() => result.current.start());
    act(() => result.current.next());
    act(() => result.current.next());
    act(() => result.current.prev());
    expect(result.current.step).toBe(1);
    act(() => result.current.prev());
    act(() => result.current.prev());
    expect(result.current.step).toBe(0);
  });

  it("end volta para null", () => {
    const { result } = renderHook(() => useTour());
    act(() => result.current.start());
    act(() => result.current.end());
    expect(result.current.step).toBeNull();
    expect(result.current.isActive).toBe(false);
  });

  it("next/prev são no-op quando inativo", () => {
    const { result } = renderHook(() => useTour());
    act(() => result.current.next());
    expect(result.current.step).toBeNull();
    act(() => result.current.prev());
    expect(result.current.step).toBeNull();
  });
});
