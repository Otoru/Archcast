import { aggregateIncomingFlow } from "@/engine/propagate";
import type { NodeTypeRegistry } from "@/engine/registry";
import type {
  ChallengeParams,
  Flow,
  Graph,
  NodeResult,
  Violation,
} from "@/engine/types";

export interface StorageUsage {
  /** Volume acumulado no nó (GB), worst-case. */
  usedGB: number;
  /** Capacidade do nó (GB) = `maxStorage` (sem `× instances`). */
  capGB: number;
}

export interface StorageCheckResult {
  violations: Violation[];
  usage: Record<string, StorageUsage>;
}

const BYTES_PER_GB = 1024 ** 3;
const SECONDS_PER_DAY = 86_400;

/**
 * Formata um volume em GB pra a unidade legível mais próxima (GB/TB/PB), com no
 * máximo uma casa decimal. Ex.: `393854424.5` → `"375.6 PB"`, `8.2` → `"8.2 GB"`,
 * `500` → `"500 GB"`. Usado no `detail` da violação de storage e no painel de
 * nós (tabela de veredito).
 */
export function formatStorage(gb: number): string {
  const units = ["GB", "TB", "PB"];
  let value = gb;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const rounded = Number.isInteger(value) ? value : Number(value.toFixed(1));
  return `${rounded} ${units[unit]}`;
}

/**
 * Checa perda de dados: para cada nó com `maxStorage`, estima o volume
 * acumulado na janela de retenção (`stored = writeFlow × bytesPerWrite ×
 * retention`) e compara com o cap (`maxStorage`). Overflow → violação dura
 * de `storage` (derruba o `passed`).
 *
 * Modelo de equilíbrio, sem tick-state: assume a taxa de escrita recebida pelo
 * nó sustentada por toda a retenção (upper bound conservador). `writeFlow` já
 * reflete o `readWriteRatio` — o `propagate` faz o split na origem e propaga
 * pelo canal `write`, então o ratio entra de graça (não re-aplicar aqui).
 *
 * `instances` NÃO escala o cap: réplicas do banco servem pra diminuir load e
 * tirar SPOF (já modelado em `distributedCapacity`/`effectiveAvailability`), não
 * pra dar espaço — o dataset inteiro tem que caber numa instância.
 *
 * Desligada se `bytesPerWrite` está ausente/0 (challenge sem preocupação de
 * volume). `usage` é populado para todos os nós com `maxStorage > 0` (mesmo os
 * OK) pra o painel mostrar o quanto está sendo usado.
 */
export function checkStorage(
  graph: Graph,
  params: ChallengeParams,
  registry: NodeTypeRegistry,
  edgeFlows: Record<string, Flow>,
): StorageCheckResult {
  const bytesPerWrite = params.bytesPerWrite ?? 0;
  const violations: Violation[] = [];
  const usage: Record<string, StorageUsage> = {};

  if (bytesPerWrite <= 0) {
    return { violations, usage };
  }

  for (const node of graph.nodes) {
    const resolved = registry.resolve(node);
    const maxStorage = resolved.attrs.maxStorage ?? 0;
    if (maxStorage <= 0) {
      continue;
    }
    const retentionDays = resolved.attrs.retention ?? 0;

    const writeFlow = aggregateIncomingFlow(node.id, graph, edgeFlows).write;
    const retentionS = retentionDays * SECONDS_PER_DAY;
    const storedB = writeFlow * bytesPerWrite * retentionS;
    const capB = maxStorage * BYTES_PER_GB;

    const usedGB = storedB / BYTES_PER_GB;
    usage[node.id] = { usedGB, capGB: maxStorage };

    if (storedB > capB) {
      violations.push({
        type: "storage",
        nodeId: node.id,
        detail: `${formatStorage(usedGB)} of data exceeds ${formatStorage(maxStorage)} capacity`,
      });
    }
  }

  return { violations, usage };
}

/**
 * Carimba `storageUsed`/`storageCap` nos `NodeResult`s a partir do `usage` da
 * checagem. Shallow: cria uma cópia por nó só quando há uso a registrar (pra
 * não mutar o mapa de resultados do engine nem alocar sem necessidade).
 */
export function stampStorageUsage(
  nodeResults: Record<string, NodeResult>,
  usage: Record<string, StorageUsage>,
): Record<string, NodeResult> {
  const stamped: Record<string, NodeResult> = {};
  for (const [id, result] of Object.entries(nodeResults)) {
    const u = usage[id];
    if (u) {
      stamped[id] = {
        ...result,
        storageUsed: u.usedGB,
        storageCap: u.capGB,
      };
    } else {
      stamped[id] = result;
    }
  }
  return stamped;
}
