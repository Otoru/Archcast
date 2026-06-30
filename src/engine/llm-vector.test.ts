import { describe, expect, it } from "vitest";

import { getPreset, runSimulation } from "@/engine";
import {
  defaultParams,
  makeGraph,
  presetNode,
  sourceNode,
} from "@/engine/test-helpers";

describe("llm-inference + vector-db blocks", () => {
  it("catalog presets are wired with the server primitive", () => {
    const llm = getPreset("llm-inference");
    expect(llm).toBeDefined();
    expect(llm?.primitive).toBe("server");
    expect(llm?.layer).toBe("compute");
    expect(llm?.defaults.rateCap).toBe(200);
    expect(llm?.edges).toEqual({
      in: ["read", "write", "async"],
      out: ["read", "write", "async"],
    });

    const vdb = getPreset("vector-db");
    expect(vdb).toBeDefined();
    expect(vdb?.primitive).toBe("server");
    expect(vdb?.layer).toBe("data");
    expect(vdb?.edges).toEqual({ in: ["read", "write"], out: [] });
  });

  it("source→llm→vector-db runs without throwing and stays unsaturated at light load", () => {
    const graph = makeGraph(
      [
        sourceNode("src"),
        presetNode("llm", "llm-inference", {
          capacity: 50,
          latBase: 600,
          instances: 2,
        }),
        presetNode("vdb", "vector-db", {
          capacity: 1e4,
          latBase: 30,
          instances: 2,
        }),
      ],
      [
        { id: "e1", from: "src", to: "llm", kind: "read" },
        { id: "e2", from: "llm", to: "vdb", kind: "read" },
      ],
    );

    const verdict = runSimulation(
      graph,
      defaultParams({ rps: 20, readWriteRatio: 1, latencySlo: 5000 }),
    );

    // The LLM dominates latency (latBase 600 → p99 in the seconds range), but
    // the AI SLO accommodates it. capacity 50 vs 20 rps → rho 0.4, no
    // saturation.
    expect(verdict.nodes.llm?.saturated).toBe(false);
    expect(verdict.nodes.vdb?.saturated).toBe(false);
    expect(verdict.passed).toBe(true);
  });
});
