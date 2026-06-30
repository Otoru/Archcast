import { describe, expect, it } from "vitest";
import { deserializeGraph } from "@/components/flow/graph-serialization";
import { PRESET_GRAPHS } from "@/components/flow/preset-graphs";
import { buildGraph } from "@/components/flow/validate-graph";
import { runSimulation } from "@/engine";
import { createDefaultRegistry } from "@/engine/registry";

/**
 * Regression guard: each "Presets" menu entry is a healthy production topology
 * that PASSES the default challenge (1000 rps / 200ms p99 SLO / 99.9%
 * availability). Loads via the real path (`deserializeGraph` → `buildGraph`)
 * and runs the engine — catches breakages when the model changes (e.g. the
 * `instances` gating by dispatcher, which broke Queue+Workers before
 * `message-queue` was marked as a dispatcher).
 */
describe("preset graphs", () => {
  const registry = createDefaultRegistry();

  for (const preset of PRESET_GRAPHS) {
    it(`${preset.title} passes the default challenge`, () => {
      const loaded = deserializeGraph(preset.doc);
      const graph = buildGraph(loaded.nodes, loaded.edges);
      const verdict = runSimulation(graph, preset.doc.params, registry);

      const failing = verdict.violations.filter((v) => v.severity !== "warn");
      expect(
        verdict.passed,
        `${preset.title} should pass; violations: ${failing
          .map((v) => `${v.type}@${v.nodeId ?? ""}:${v.detail}`)
          .join(", ")}`,
      ).toBe(true);
      expect(verdict.endToEndLatency).toBeLessThanOrEqual(
        preset.doc.params.latencySlo,
      );
      expect(verdict.systemAvailability).toBeGreaterThanOrEqual(
        preset.doc.params.availabilitySlo,
      );
    });
  }
});
