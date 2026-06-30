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
  /** Accumulated volume at the node (GB), worst-case. */
  usedGB: number;
  /** Node capacity (GB) = `maxStorage` (without `× instances`). */
  capGB: number;
}

export interface StorageCheckResult {
  violations: Violation[];
  usage: Record<string, StorageUsage>;
}

const BYTES_PER_GB = 1024 ** 3;
const SECONDS_PER_DAY = 86_400;

/**
 * Formats a volume in GB to the closest readable unit (GB/TB/PB), with at most
 * one decimal place. E.g. `393854424.5` → `"375.6 PB"`, `8.2` → `"8.2 GB"`,
 * `500` → `"500 GB"`. Used in the storage violation `detail` and in the node
 * panel (verdict table).
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
 * Checks for data loss: for each node with `maxStorage`, estimates the volume
 * accumulated over the retention window (`stored = writeFlow × bytesPerWrite ×
 * retention`) and compares it against the cap (`maxStorage`). Overflow → hard
 * `storage` violation (brings down `passed`).
 *
 * Equilibrium model, no tick-state: assumes the write rate received by the
 * node is sustained over the whole retention (conservative upper bound).
 * `writeFlow` already reflects `readWriteRatio` — `propagate` does the split
 * at the origin and propagates it through the `write` channel, so the ratio
 * is already included for free (do not re-apply it here).
 *
 * `instances` does NOT scale the cap: db replicas exist to reduce load and
 * remove SPOFs (already modeled in `distributedCapacity`/
 * `effectiveAvailability`), not to provide space — the entire dataset must
 * fit in a single instance.
 *
 * Disabled when `bytesPerWrite` is missing/0 (challenge with no volume
 * concern). `usage` is populated for every node with `maxStorage > 0` (even
 * the OK ones) so the panel can show how much is being used.
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
 * Stamps `storageUsed`/`storageCap` onto `NodeResult`s from the check `usage`.
 * Shallow: creates a per-node copy only when there is usage to record (so it
 * does not mutate the engine result map nor allocate unnecessarily).
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
