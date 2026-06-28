import { describe, expect, it } from "vitest";

import {
  BLOCK_CATALOG,
  getPreset,
  isOrigin,
  isStructural,
  resolveNode,
} from "@/engine/catalog";

describe("catalog", () => {
  it("has unique presets with valid primitives", () => {
    const kinds = BLOCK_CATALOG.map((p) => p.kind);
    expect(new Set(kinds).size).toBe(kinds.length);
    for (const preset of BLOCK_CATALOG) {
      expect([
        "origin",
        "server",
        "absorber-aside",
        "absorber-forwarding",
        "async-buffer",
        "broadcaster",
        "structural",
      ]).toContain(preset.primitive);
    }
  });

  it("resolveNode merges defaults with node attrs", () => {
    const resolved = resolveNode({
      id: "db",
      kind: "app-server",
      attrs: { capacity: 5000 },
    });
    expect(resolved.attrs.capacity).toBe(5000);
    expect(resolved.attrs.latBase).toBe(20);
    expect(resolved.attrs.instances).toBe(1);
    expect(resolved.attrs.availability).toBe(0.99);
    expect(resolved.primitive).toBe("server");
  });

  it("resolveNode applies fallback availability and instances", () => {
    const resolved = resolveNode({
      id: "x",
      kind: "kv-store",
      attrs: {},
    });
    expect(resolved.attrs.availability).toBe(0.999);
    expect(resolved.attrs.instances).toBe(1);
  });

  it("isOrigin and isStructural identify primitives", () => {
    expect(isOrigin({ id: "c", kind: "web-client", attrs: {} })).toBe(true);
    expect(isOrigin({ id: "s", kind: "app-server", attrs: {} })).toBe(false);
    expect(isStructural({ id: "d", kind: "feature-flags", attrs: {} })).toBe(
      true,
    );
    expect(isStructural({ id: "s", kind: "app-server", attrs: {} })).toBe(
      false,
    );
  });

  it("getPreset returns undefined for unknown kind", () => {
    expect(getPreset("unknown")).toBeUndefined();
  });
});
