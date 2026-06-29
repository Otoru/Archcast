import { describe, expect, it } from "vitest";
import { deserializeGraph } from "@/components/flow/graph-serialization";
import { PRESET_GRAPHS } from "@/components/flow/preset-graphs";
import { buildGraph } from "@/components/flow/validate-graph";
import { runSimulation } from "@/engine";
import { createDefaultRegistry } from "@/engine/registry";

/**
 * Guarda de regressão: cada preset do menu "Presets" é uma topologia de
 * produção sadia que PASSA o desafio padrão (1000 rps / SLO 200ms p99 / 99,9%
 * disponibilidade). Carrega pelo caminho real (`deserializeGraph` →
 * `buildGraph`) e roda o motor — pega quebras quando o modelo muda (ex.: o
 * gating de `instances` por distribuidor, que derrubou Queue+Workers antes de
 * `message-queue` ser marcado como distribuidor).
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
