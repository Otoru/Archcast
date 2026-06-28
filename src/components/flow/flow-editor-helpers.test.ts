import { describe, expect, it } from "vitest";

import type { BlockNode as BlockNodeType } from "@/components/flow/block-node";
import {
  applyAttrChange,
  attrsFormSpec,
  defaultChallengeParams,
  formatPercent,
  nodeRows,
  summarizeVerdict,
  violationBadgeVariant,
} from "@/components/flow/flow-editor-helpers";
import { getPreset, type Verdict, type Violation } from "@/engine";

function rfNode(id: string, kind: string): BlockNodeType {
  return { id, type: "block", position: { x: 0, y: 0 }, data: { kind } };
}

describe("defaultChallengeParams", () => {
  it("devolve valores-padrão sensatos", () => {
    expect(defaultChallengeParams()).toEqual({
      rps: 1000,
      trafficPattern: "steady",
      readWriteRatio: 0.7,
      latencySlo: 200,
      availabilitySlo: 0.999,
    });
  });
});

describe("attrsFormSpec", () => {
  it("lista as chaves do preset na ordem declarada", () => {
    const preset = getPreset("app-server");
    if (!preset) throw new Error("preset app-server ausente");
    const spec = attrsFormSpec(preset);
    expect(spec.map((f) => f.key)).toEqual(Object.keys(preset.defaults));
  });

  it("expõe só as chaves do preset, nunca todas de BlockDefaults", () => {
    const preset = getPreset("cdn");
    if (!preset) throw new Error("preset cdn ausente");
    const keys = attrsFormSpec(preset).map((f) => f.key);
    // cdn não tem instances nem rateCap nem drainRate nem maxDepth
    expect(keys).not.toContain("instances");
    expect(keys).not.toContain("rateCap");
    expect(keys).toContain("hitRatio");
    expect(keys).toContain("capacity");
  });

  it("cada campo tem um rótulo humano", () => {
    const preset = getPreset("sql-db");
    if (!preset) throw new Error("preset sql-db ausente");
    for (const field of attrsFormSpec(preset)) {
      expect(field.label).not.toBe(field.key);
    }
  });
});

describe("applyAttrChange", () => {
  it("adiciona um override de attr imutavelmente", () => {
    const node = rfNode("n1", "app-server");
    const next = applyAttrChange(node, "capacity", 5000);
    expect(next.data.attrs).toEqual({ capacity: 5000 });
    expect(node.data.attrs).toBeUndefined(); // original intocado
  });

  it("mescla sobre attrs existentes sem perder outras chaves", () => {
    const node: BlockNodeType = {
      ...rfNode("n1", "app-server"),
      data: { kind: "app-server", attrs: { capacity: 1000, instances: 3 } },
    };
    const next = applyAttrChange(node, "instances", 5);
    expect(next.data.attrs).toEqual({ capacity: 1000, instances: 5 });
  });

  it("remove a chave (reverte ao default) quando value é undefined", () => {
    const node: BlockNodeType = {
      ...rfNode("n1", "app-server"),
      data: { kind: "app-server", attrs: { capacity: 1000, instances: 3 } },
    };
    const next = applyAttrChange(node, "instances", undefined);
    expect(next.data.attrs).toEqual({ capacity: 1000 });
  });

  it("remove a chave quando value não é finito", () => {
    const node: BlockNodeType = {
      ...rfNode("n1", "app-server"),
      data: { kind: "app-server", attrs: { capacity: 1000 } },
    };
    expect(applyAttrChange(node, "capacity", Number.NaN).data.attrs).toEqual(
      {},
    );
  });
});

describe("violationBadgeVariant", () => {
  function violation(
    type: Violation["type"],
    severity?: Violation["severity"],
  ): Violation {
    return { type, detail: "x", ...(severity ? { severity } : {}) };
  }

  it("marca structure/spof/presence como destructive", () => {
    expect(violationBadgeVariant(violation("structure"))).toBe("destructive");
    expect(violationBadgeVariant(violation("spof"))).toBe("destructive");
    expect(violationBadgeVariant(violation("presence"))).toBe("destructive");
  });

  it("marca as demais como warning", () => {
    expect(violationBadgeVariant(violation("saturation"))).toBe("warning");
    expect(violationBadgeVariant(violation("latency"))).toBe("warning");
    expect(violationBadgeVariant(violation("availability"))).toBe("warning");
    expect(violationBadgeVariant(violation("ratelimit"))).toBe("warning");
  });

  it("severity warn vira warning mesmo para structure", () => {
    expect(violationBadgeVariant(violation("structure", "warn"))).toBe(
      "warning",
    );
  });
});

function makeVerdict(over: Partial<Verdict> = {}): Verdict {
  return {
    passed: true,
    endToEndLatency: 150,
    systemAvailability: 0.9995,
    nodes: {
      app: {
        rho: 0.8,
        latency: 20,
        saturated: false,
        provisioned: 2,
        dropped: 0,
      },
      db: {
        rho: 0.95,
        latency: 5,
        saturated: true,
        provisioned: 1,
        dropped: 12,
      },
    },
    edgeFlows: {},
    violations: [],
    ...over,
  };
}

describe("nodeRows", () => {
  it("junta verdict.nodes com o rótulo do preset e ordena por rho desc", () => {
    const nodes = [rfNode("app", "app-server"), rfNode("db", "sql-db")];
    const rows = nodeRows(makeVerdict(), nodes);
    expect(rows.map((r) => r.id)).toEqual(["db", "app"]); // 0.95 > 0.8
    expect(rows[0]?.label).toBe("SQL Database");
    expect(rows[0]?.saturated).toBe(true);
    expect(rows[0]?.dropped).toBe(12);
  });

  it("usa o id como rótulo quando o nó não está no canvas", () => {
    const rows = nodeRows(makeVerdict(), []);
    expect(rows.map((r) => r.label)).toEqual(["db", "app"]);
  });
});

describe("summarizeVerdict", () => {
  const params = defaultChallengeParams();
  const nodes = [rfNode("app", "app-server"), rfNode("db", "sql-db")];

  it("marca latência/availability como ok quando dentro dos SLOs", () => {
    const summary = summarizeVerdict(makeVerdict(), params, nodes);
    expect(summary.passed).toBe(true);
    expect(summary.latency.status).toBe("ok"); // 150 <= 200
    expect(summary.availability.status).toBe("ok"); // 0.9995 >= 0.999
  });

  it("marca latência como danger ao estourar o SLO", () => {
    const summary = summarizeVerdict(
      makeVerdict({ endToEndLatency: 350 }),
      params,
      nodes,
    );
    expect(summary.latency.status).toBe("danger");
  });

  it("marca availability como danger abaixo do SLO", () => {
    const summary = summarizeVerdict(
      makeVerdict({ systemAvailability: 0.99 }),
      params,
      nodes,
    );
    expect(summary.availability.status).toBe("danger");
  });

  it("repassa as violations e linhas de nós", () => {
    const summary = summarizeVerdict(
      makeVerdict({
        passed: false,
        violations: [{ type: "saturation", nodeId: "db", detail: "rho > 1" }],
      }),
      params,
      nodes,
    );
    expect(summary.passed).toBe(false);
    expect(summary.violations).toHaveLength(1);
    expect(summary.nodeRows).toHaveLength(2);
  });
});

describe("formatadores", () => {
  it("formatPercent", () => {
    expect(formatPercent(0.9995)).toBe("99.950%");
    expect(formatPercent(0.5, 1)).toBe("50.0%");
  });
});
