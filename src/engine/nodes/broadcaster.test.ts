import { describe, expect, it } from "vitest";

import { apportionChannel } from "@/engine/apportion";
import { createDefaultRegistry } from "@/engine/registry";
import type { Graph } from "@/engine/types";

const registry = createDefaultRegistry();

describe("broadcaster", () => {
  it("duplicates full flow to each async output", () => {
    const graph: Graph = {
      nodes: [
        {
          id: "pubsub",
          kind: "pubsub-topic",
          attrs: { capacity: 1e5, latBase: 5 },
        },
        {
          id: "w1",
          kind: "worker",
          attrs: { capacity: 1000, latBase: 100 },
        },
        {
          id: "w2",
          kind: "worker",
          attrs: { capacity: 1000, latBase: 100 },
        },
        {
          id: "w3",
          kind: "worker",
          attrs: { capacity: 1000, latBase: 100 },
        },
      ],
      edges: [
        { id: "e1", from: "pubsub", to: "w1", kind: "async" },
        { id: "e2", from: "pubsub", to: "w2", kind: "async" },
        { id: "e3", from: "pubsub", to: "w3", kind: "async" },
      ],
    };

    const result = apportionChannel("pubsub", "async", 300, graph, registry);

    expect(result.deliveries.get("e1")).toBeCloseTo(300);
    expect(result.deliveries.get("e2")).toBeCloseTo(300);
    expect(result.deliveries.get("e3")).toBeCloseTo(300);
  });

  it("contrasts with server split: 3 servers get R/3 each", () => {
    const graph: Graph = {
      nodes: [
        {
          id: "app",
          kind: "app-server",
          attrs: { capacity: 1000, latBase: 1 },
        },
        {
          id: "db1",
          kind: "app-server",
          attrs: { capacity: 100, latBase: 2 },
        },
        {
          id: "db2",
          kind: "app-server",
          attrs: { capacity: 100, latBase: 2 },
        },
        {
          id: "db3",
          kind: "app-server",
          attrs: { capacity: 100, latBase: 2 },
        },
      ],
      edges: [
        { id: "e1", from: "app", to: "db1", kind: "read" },
        { id: "e2", from: "app", to: "db2", kind: "read" },
        { id: "e3", from: "app", to: "db3", kind: "read" },
      ],
    };

    const result = apportionChannel("app", "read", 300, graph, registry);

    expect(result.deliveries.get("e1")).toBeCloseTo(100);
    expect(result.deliveries.get("e2")).toBeCloseTo(100);
    expect(result.deliveries.get("e3")).toBeCloseTo(100);
  });
});
