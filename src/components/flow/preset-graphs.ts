import { defaultChallengeParams } from "@/components/flow/flow-editor-helpers";
import {
  GRAPH_DOC_VERSION,
  type GraphDocument,
} from "@/components/flow/graph-serialization";
import type { ChallengeParams } from "@/engine";

export type PresetGraph = {
  id: string;
  title: string;
  doc: GraphDocument;
};

type PresetNode = {
  id: string;
  kind: string;
  attrs: Record<string, number>;
  position: { x: number; y: number };
};

type PresetEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle: string;
  targetHandle: string;
};

/** Monta um nó de preset: attrs mesclados vazios por padrão (defaults do preset valem). */
function n(
  id: string,
  kind: string,
  x: number,
  y: number,
  attrs: Record<string, number> = {},
): PresetNode {
  return { id, kind, attrs, position: { x, y } };
}

/** Aresta de preset entre portas de um mesmo canal: `out-${channel}` → `in-${channel}`. */
function e(
  id: string,
  source: string,
  target: string,
  channel: "read" | "write" | "async",
): PresetEdge {
  return {
    id,
    source,
    target,
    sourceHandle: `out-${channel}`,
    targetHandle: `in-${channel}`,
  };
}

function doc(
  nodes: PresetNode[],
  edges: PresetEdge[],
  params: ChallengeParams = defaultChallengeParams(),
): GraphDocument {
  return { version: GRAPH_DOC_VERSION, nodes, edges, params };
}

const ECOMMERCE = doc(
  [
    n("wc", "web-client", 0, 200),
    n("cdn", "cdn", 220, 200),
    n("storage", "object-storage", 440, 80),
    n("gw", "api-gateway", 440, 320),
    n("app", "app-server", 660, 200),
    n("cache", "cache", 880, 80),
    n("db", "sql-db", 880, 320),
  ],
  [
    e("e1", "wc", "cdn", "read"),
    e("e2", "cdn", "storage", "read"),
    e("e3", "gw", "app", "read"),
    e("e4", "app", "cache", "read"),
    e("e5", "app", "db", "read"),
    e("e6", "wc", "gw", "read"),
    e("e7", "wc", "gw", "write"),
    e("e8", "gw", "app", "write"),
    e("e9", "app", "db", "write"),
  ],
);

const QUEUE_WORKERS = doc(
  [
    n("wc", "web-client", 0, 200),
    n("app", "app-server", 220, 200),
    n("q", "message-queue", 440, 200),
    n("worker", "worker", 660, 200),
    n("db", "sql-db", 880, 200),
  ],
  [
    e("e1", "wc", "app", "write"),
    e("e2", "app", "q", "async"),
    e("e3", "q", "worker", "async"),
    e("e4", "worker", "db", "write"),
  ],
);

const CACHE_ASIDE = doc(
  [
    n("wc", "web-client", 0, 200),
    n("app", "app-server", 240, 200),
    n("cache", "cache", 480, 80, { hitRatio: 0.85 }),
    n("db", "sql-db", 480, 320),
  ],
  [
    e("e1", "wc", "app", "read"),
    e("e2", "app", "cache", "read"),
    e("e3", "app", "db", "read"),
  ],
);

/**
 * Grafos iniciais prontos pra carregar (menu Presets). Cada um exercita um
 * padrão: E-commerce (CDN com origin em object storage, API gateway+cache+DB),
 * Queue+Workers (fila assíncrona drenando pra workers), Cache-aside (mostra o
 * bloco Cache com `absorber-aside`, hitRatio 0.85 — a maior parte da leitura
 * é absorvida pelo cache e só o misses chegam ao DB).
 */
export const PRESET_GRAPHS: PresetGraph[] = [
  { id: "ecommerce", title: "E-commerce", doc: ECOMMERCE },
  { id: "queue-workers", title: "Queue + Workers", doc: QUEUE_WORKERS },
  { id: "cache-aside", title: "Cache-aside", doc: CACHE_ASIDE },
];
