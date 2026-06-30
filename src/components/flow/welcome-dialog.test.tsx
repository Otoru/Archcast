import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { WelcomeDialog } from "@/components/flow/welcome-dialog";

describe("WelcomeDialog", () => {
  it("renders the welcome copy and three paths when open", () => {
    render(
      <WelcomeDialog
        open={true}
        onTakeTour={() => {}}
        onLoadExample={() => {}}
        onDismiss={() => {}}
      />,
    );
    expect(screen.getByText("Welcome to Archcast")).toBeInTheDocument();
    // The Lead is split across JSX (inline `Run`), so match a substring.
    expect(
      screen.getByText(/Drag blocks onto the canvas, wire them up/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /take the tour/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /load an example/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /start from scratch/i }),
    ).toBeInTheDocument();
  });

  it("calls onTakeTour when the tour button is clicked", async () => {
    const user = userEvent.setup();
    const onTakeTour = vi.fn();
    render(
      <WelcomeDialog
        open={true}
        onTakeTour={onTakeTour}
        onLoadExample={() => {}}
        onDismiss={() => {}}
      />,
    );
    await user.click(screen.getByRole("button", { name: /take the tour/i }));
    expect(onTakeTour).toHaveBeenCalledOnce();
  });

  it("calls onLoadExample when the example button is clicked", async () => {
    const user = userEvent.setup();
    const onLoadExample = vi.fn();
    render(
      <WelcomeDialog
        open={true}
        onTakeTour={() => {}}
        onLoadExample={onLoadExample}
        onDismiss={() => {}}
      />,
    );
    await user.click(screen.getByRole("button", { name: /load an example/i }));
    expect(onLoadExample).toHaveBeenCalledOnce();
  });

  it("calls onDismiss when the scratch button is clicked", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(
      <WelcomeDialog
        open={true}
        onTakeTour={() => {}}
        onLoadExample={() => {}}
        onDismiss={onDismiss}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: /start from scratch/i }),
    );
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("calls onDismiss when the dialog is dismissed via its close button", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(
      <WelcomeDialog
        open={true}
        onTakeTour={() => {}}
        onLoadExample={() => {}}
        onDismiss={onDismiss}
      />,
    );
    // base-ui DialogContent renders a close (X) control labelled "Close".
    await user.click(screen.getByRole("button", { name: /close/i }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
