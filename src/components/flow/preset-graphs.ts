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
    n("wc", "web-client", 0, 240),
    n("cdn", "cdn", 360, 120),
    n("storage", "object-storage", 720, 120),
    n("gw", "api-gateway", 360, 360),
    n("app", "app-server", 720, 360, { instances: 3, latBase: 10 }),
    n("cache", "cache", 1080, 240, { instances: 2 }),
    n("db", "sql-db", 1080, 480, { instances: 2 }),
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
    n("wc", "web-client", 0, 240),
    n("app", "app-server", 360, 240, { instances: 3, latBase: 10 }),
    n("q", "message-queue", 720, 240, { instances: 3 }),
    n("worker", "worker", 1080, 240, { instances: 3 }),
    n("db", "sql-db", 720, 460, { instances: 2 }),
  ],
  [
    e("e1", "wc", "app", "write"),
    e("e2", "app", "q", "async"),
    e("e3", "q", "worker", "async"),
    e("e4", "worker", "db", "write"),
    e("e5", "wc", "app", "read"),
    e("e6", "app", "db", "read"),
  ],
);

const CACHE_ASIDE = doc(
  [
    n("wc", "web-client", 0, 240),
    n("app", "app-server", 360, 240, { instances: 3, latBase: 10 }),
    n("cache", "cache", 720, 100, { hitRatio: 0.85, instances: 2 }),
    n("db", "sql-db", 720, 380, { instances: 2 }),
  ],
  [
    e("e1", "wc", "app", "read"),
    e("e2", "app", "cache", "read"),
    e("e3", "app", "db", "read"),
    e("e4", "wc", "app", "write"),
    e("e5", "app", "db", "write"),
  ],
);

/**
 * RAG / AI assistant: leitura segue `web-client → api-gateway → app-server →
 * LLM → vector-db` (o LLM recupera contexto do banco vetorial antes de
 * responder); a escrita faz a ingestão de embeddings direto `app-server →
 * vector-db`. Workload de IA é baixo volume + latência alta, então o desafio
 * declara SLO próprio (20 rps / p99 5s) — não o padrão de 1000 rps/200ms. O
 * LLM é uma frota de inferência auto-hospedada (não-elástica): capacity baixo
 * satura rápido, e como o upstream imediato é o `app-server` (não um
 * distribuidor), `instances` só levanta disponibilidade — a capacidade fica no
 * limite de uma instância, exercitando o gargalo de inferência. Tiers
 * replicados (instances≥2) eliminam SPOFs no path único.
 */
const RAG = doc(
  [
    n("wc", "web-client", 0, 240),
    n("gw", "api-gateway", 360, 360, { instances: 2 }),
    n("app", "app-server", 720, 360, { instances: 3, latBase: 10 }),
    n("llm", "llm-inference", 1080, 240, { instances: 2 }),
    n("vdb", "vector-db", 1080, 480, { instances: 2 }),
  ],
  [
    e("e1", "wc", "gw", "read"),
    e("e2", "gw", "app", "read"),
    e("e3", "app", "llm", "read"),
    e("e4", "llm", "vdb", "read"),
    e("e5", "wc", "gw", "write"),
    e("e6", "gw", "app", "write"),
    e("e7", "app", "vdb", "write"),
  ],
  {
    rps: 20,
    trafficPattern: "steady",
    readWriteRatio: 0.9,
    latencySlo: 5000,
    availabilitySlo: 0.999,
  },
);

/**
 * Grafos iniciais prontos pra carregar (menu Presets). Cada um exercita um
 * padrão e representa uma topologia de produção sadia que PASSA o desafio do
 * próprio `doc.params` (por padrão 1000 rps / SLO 200ms p99 / 99,9%
 * disponibilidade; o RAG usa SLO de IA): tiers stateless replicados
 * (instances≥2) eliminam SPOFs e sustentam a disponibilidade em série.
 * E-commerce (CDN com origin em object storage, API gateway+cache+DB),
 * Queue+Workers (escrita assíncrona via fila drenando pra workers + leitura
 * síncrona direta), Cache-aside (Cache `absorber-aside` com hitRatio 0.85 — a
 * maior parte da leitura é absorvida pelo cache e só os misses chegam ao DB —
 * mais caminho de escrita direto), RAG (LLM + vector-db com SLO de IA).
 */
export const PRESET_GRAPHS: PresetGraph[] = [
  { id: "ecommerce", title: "E-commerce", doc: ECOMMERCE },
  { id: "queue-workers", title: "Queue + Workers", doc: QUEUE_WORKERS },
  { id: "cache-aside", title: "Cache-aside", doc: CACHE_ASIDE },
  { id: "rag", title: "RAG / AI Assistant", doc: RAG },
];
