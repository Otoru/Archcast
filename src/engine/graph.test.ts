import { describe, expect, it } from "vitest";
import { topologicalSort, validateDag } from "@/engine/graph";
import type { Graph } from "@/engine/types";

describe("validateDag", () => {
  it("accepts acyclic graph", () => {
    const graph: Graph = {
      nodes: [
        { id: "a", kind: "web-client", attrs: {} },
        {
          id: "b",
          kind: "app-server",
          attrs: { capacity: 100, latBase: 1 },
        },
      ],
      edges: [{ id: "e1", from: "a", to: "b", kind: "read" }],
    };

    expect(() => validateDag(graph)).not.toThrow();
  });

  it("throws descriptive error on cycle", () => {
    const graph: Graph = {
      nodes: [
        {
          id: "a",
          kind: "app-server",
          attrs: { capacity: 100, latBase: 1 },
        },
        {
          id: "b",
          kind: "app-server",
          attrs: { capacity: 100, latBase: 1 },
        },
        {
          id: "c",
          kind: "app-server",
          attrs: { capacity: 100, latBase: 1 },
        },
      ],
      edges: [
        { id: "e1", from: "a", to: "b", kind: "read" },
        { id: "e2", from: "b", to: "c", kind: "read" },
        { id: "e3", from: "c", to: "a", kind: "read" },
      ],
    };

    expect(() => validateDag(graph)).toThrow(/cycle/i);
  });
});

describe("topologicalSort", () => {
  it("orders nodes with sources before dependents", () => {
    const graph: Graph = {
      nodes: [
        {
          id: "app",
          kind: "app-server",
          attrs: { capacity: 100, latBase: 1 },
        },
        {
          id: "db",
          kind: "app-server",
          attrs: { capacity: 100, latBase: 1 },
        },
        { id: "src", kind: "web-client", attrs: {} },
      ],
      edges: [
        { id: "e1", from: "src", to: "app", kind: "read" },
        { id: "e2", from: "app", to: "db", kind: "read" },
      ],
    };

    const order = topologicalSort(graph);
    expect(order.indexOf("src")).toBeLessThan(order.indexOf("app"));
    expect(order.indexOf("app")).toBeLessThan(order.indexOf("db"));
  });
});
