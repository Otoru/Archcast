import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { EmptyCanvasHint } from "@/components/flow/empty-canvas-hint";

describe("EmptyCanvasHint", () => {
  it("renders nothing when not visible", () => {
    const { container } = render(
      <EmptyCanvasHint
        visible={false}
        onLoadExample={() => {}}
        onTakeTour={() => {}}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders the hint and shortcuts when visible", () => {
    render(
      <EmptyCanvasHint
        visible={true}
        onLoadExample={() => {}}
        onTakeTour={() => {}}
      />,
    );
    expect(
      screen.getByText("Drag a block from the left palette to start"),
    ).toBeInTheDocument();
    // The overlay is marked aria-hidden, so the buttons are excluded from the
    // default accessibility tree — opt into hidden nodes to reach them.
    expect(
      screen.getByRole("button", { name: /load example/i, hidden: true }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /take the tour/i, hidden: true }),
    ).toBeInTheDocument();
  });

  it("calls onLoadExample when the example button is clicked", async () => {
    const user = userEvent.setup();
    const onLoadExample = vi.fn();
    render(
      <EmptyCanvasHint
        visible={true}
        onLoadExample={onLoadExample}
        onTakeTour={() => {}}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: /load example/i, hidden: true }),
    );
    expect(onLoadExample).toHaveBeenCalledOnce();
  });

  it("calls onTakeTour when the tour button is clicked", async () => {
    const user = userEvent.setup();
    const onTakeTour = vi.fn();
    render(
      <EmptyCanvasHint
        visible={true}
        onLoadExample={() => {}}
        onTakeTour={onTakeTour}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: /take the tour/i, hidden: true }),
    );
    expect(onTakeTour).toHaveBeenCalledOnce();
  });
});
