import { describe, expect, it } from "vitest";

import { runSimulation } from "@/engine";
import {
  defaultParams,
  makeGraph,
  presetNode,
  serverNode,
  sourceNode,
} from "@/engine/test-helpers";

describe("absorber-forwarding", () => {
  it("cdn forwards 0.15R on read output and computes rho on full R", () => {
    const graph = makeGraph(
      [
        sourceNode("src"),
        presetNode("cdn", "cdn", {
          hitRatio: 0.85,
          capacity: 2e5,
          latBase: 15,
        }),
        serverNode("origin", { capacity: 5000, latBase: 10 }),
      ],
      [
        { id: "e1", from: "src", to: "cdn", kind: "read" },
        { id: "e2", from: "cdn", to: "origin", kind: "read" },
      ],
    );

    const verdict = runSimulation(
      graph,
      defaultParams({ rps: 1000, readWriteRatio: 1 }),
    );

    expect(verdict.edgeFlows.e2?.read).toBeCloseTo(150);
    expect(verdict.nodes.cdn?.rho).toBeCloseTo(1000 / 2e5);
  });
});
