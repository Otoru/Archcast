import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TourOverlay } from "@/components/flow/tour";

function renderOverlay(
  step: number | null,
  handlers: Record<string, () => void> = {},
) {
  const onNext = vi.fn();
  const onPrev = vi.fn();
  const onEnd = vi.fn();
  const onLoadExample = vi.fn();
  const result = render(
    <TourOverlay
      step={step}
      onNext={onNext}
      onPrev={onPrev}
      onEnd={onEnd}
      onLoadExample={onLoadExample}
    />,
  );
  return { ...result, onNext, onPrev, onEnd, onLoadExample, ...handlers };
}

describe("TourOverlay", () => {
  it("renders nothing when the tour is inactive", () => {
    const { container } = renderOverlay(null);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing for an out-of-range step index", () => {
    const { container } = renderOverlay(999);
    expect(container.firstChild).toBeNull();
  });

  it("renders the intro modal step with navigation", () => {
    renderOverlay(0);
    expect(screen.getByText("Welcome to Archcast")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument();
    // Back is disabled on the first step.
    expect(screen.getByRole("button", { name: /back/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /skip/i })).toBeInTheDocument();
  });

  it("advances via Next and cancels via Skip on the intro step", async () => {
    const user = userEvent.setup();
    const r = renderOverlay(0);
    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(r.onNext).toHaveBeenCalledOnce();
    await user.click(screen.getByRole("button", { name: /skip/i }));
    expect(r.onEnd).toHaveBeenCalledOnce();
  });

  it("renders the end step with Done and Load example actions", () => {
    renderOverlay(6);
    expect(screen.getByText("You're set")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /done/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /load example/i }),
    ).toBeInTheDocument();
  });

  it("calls onEnd when Done is clicked", async () => {
    const user = userEvent.setup();
    const r = renderOverlay(6);
    await user.click(screen.getByRole("button", { name: /done/i }));
    expect(r.onEnd).toHaveBeenCalledOnce();
    expect(r.onLoadExample).not.toHaveBeenCalled();
  });

  it("loads an example and ends the tour when Load example is clicked", async () => {
    const user = userEvent.setup();
    const r = renderOverlay(6);
    await user.click(screen.getByRole("button", { name: /load example/i }));
    expect(r.onLoadExample).toHaveBeenCalledOnce();
    expect(r.onEnd).toHaveBeenCalledOnce();
  });
});
