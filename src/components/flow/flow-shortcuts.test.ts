import { beforeEach, describe, expect, it, vi } from "vitest";
import { copySelection, duplicateSelection } from "@/components/flow/clipboard";
import {
  handleShortcutKey,
  type ShortcutHandlers,
} from "@/components/flow/flow-shortcuts";

function makeHandlers(
  overrides: Partial<ShortcutHandlers> = {},
): ShortcutHandlers {
  return {
    running: false,
    nodes: [],
    edges: [],
    history: { canUndo: true, canRedo: true, undo: vi.fn(), redo: vi.fn() },
    setNodes: vi.fn(),
    setEdges: vi.fn(),
    handleRun: vi.fn(),
    stopRun: vi.fn(),
    setHelpOpen: vi.fn(),
    ...overrides,
  } as ShortcutHandlers;
}

describe("handleShortcutKey", () => {
  beforeEach(() => {
    // clear the module-level clipboard between tests
    copySelection([], []);
  });

  it("abre a ajuda com '?' sem modificador", () => {
    const s = makeHandlers();
    expect(handleShortcutKey({ key: "?", mod: false, shift: false }, s)).toBe(
      true,
    );
    expect(s.setHelpOpen).toHaveBeenCalledWith(true);
  });

  it("ignora teclas sem modificador que não sejam '?'", () => {
    const s = makeHandlers();
    expect(handleShortcutKey({ key: "a", mod: false, shift: false }, s)).toBe(
      false,
    );
    expect(s.setHelpOpen).not.toHaveBeenCalled();
  });

  it("Mod+Enter roda quando parado e para quando rodando", () => {
    const stopped = makeHandlers({ running: false });
    handleShortcutKey({ key: "Enter", mod: true, shift: false }, stopped);
    expect(stopped.handleRun).toHaveBeenCalled();

    const running = makeHandlers({ running: true });
    handleShortcutKey({ key: "Enter", mod: true, shift: false }, running);
    expect(running.stopRun).toHaveBeenCalled();
  });

  it("Mod+Z faz undo, Mod+Shift+Z faz redo", () => {
    const s = makeHandlers();
    handleShortcutKey({ key: "z", mod: true, shift: false }, s);
    expect(s.history.undo).toHaveBeenCalled();
    handleShortcutKey({ key: "Z", mod: true, shift: true }, s);
    expect(s.history.redo).toHaveBeenCalled();
  });

  it("Mod+C copia a seleção", () => {
    const s = makeHandlers();
    expect(handleShortcutKey({ key: "c", mod: true, shift: false }, s)).toBe(
      true,
    );
    // copySelection is module-level (no return); we just ensure it was consumed.
  });

  it("Mod+V cola e aplica quando há clipboard e não está rodando", () => {
    // populate the clipboard with a selection
    const node = {
      id: "n1",
      type: "block",
      position: { x: 0, y: 0 },
      data: { kind: "app-server" },
      selected: true,
    };
    // @ts-expect-error: minimal BlockNode shape for the test
    copySelection([node], []);
    const s = makeHandlers();
    expect(handleShortcutKey({ key: "v", mod: true, shift: false }, s)).toBe(
      true,
    );
    expect(s.setNodes).toHaveBeenCalled();
  });

  it("Mod+V é consumido mas não faz nada quando rodando", () => {
    const s = makeHandlers({ running: true });
    expect(handleShortcutKey({ key: "v", mod: true, shift: false }, s)).toBe(
      true,
    );
    expect(s.setNodes).not.toHaveBeenCalled();
  });

  it("Mod+D duplica a seleção quando não está rodando", () => {
    const node = {
      id: "n1",
      type: "block",
      position: { x: 0, y: 0 },
      data: { kind: "app-server" },
      selected: true,
    };
    const s = makeHandlers({
      // @ts-expect-error: minimal BlockNode shape for the test
      nodes: [node],
    });
    const dup = duplicateSelection(s.nodes, s.edges);
    expect(dup).not.toBeNull(); // sanity: there is something to duplicate
    expect(handleShortcutKey({ key: "d", mod: true, shift: false }, s)).toBe(
      true,
    );
    expect(s.setNodes).toHaveBeenCalled();
  });

  it("Mod+D é consumido mas não faz nada quando rodando", () => {
    const s = makeHandlers({ running: true });
    expect(handleShortcutKey({ key: "d", mod: true, shift: false }, s)).toBe(
      true,
    );
    expect(s.setNodes).not.toHaveBeenCalled();
  });

  it("devolve false para tecla com modificador não mapeada", () => {
    const s = makeHandlers();
    expect(handleShortcutKey({ key: "k", mod: true, shift: false }, s)).toBe(
      false,
    );
  });
});
