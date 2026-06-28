import "@testing-library/jest-dom";

// jsdom não implementa ResizeObserver nem retorna dimensões reais em
// getBoundingClientRect. React Flow v12 depende disso para medir o canvas.
// Polyfills globais para que testes unitários futuros do fluxo rodem.
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
