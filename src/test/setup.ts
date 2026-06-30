import "@testing-library/jest-dom";

// jsdom does not implement ResizeObserver nor return real dimensions from
// getBoundingClientRect. React Flow v12 depends on these to measure the canvas.
// Global polyfills so future flow unit tests can run.
if (typeof globalThis.ResizeObserver === "undefined") {
  class ResizeObserverStub {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  globalThis.ResizeObserver =
    ResizeObserverStub as unknown as typeof ResizeObserver;
}

if (
  typeof HTMLDivElement !== "undefined" &&
  typeof HTMLDivElement.prototype.getBoundingClientRect === "function"
) {
  const original = HTMLDivElement.prototype.getBoundingClientRect;
  HTMLDivElement.prototype.getBoundingClientRect =
    function getBoundingClientRect() {
      const rect = original.call(this);
      if (rect.width === 0 && rect.height === 0) {
        return { ...rect, width: 800, height: 600 } as DOMRect;
      }
      return rect;
    };
}
