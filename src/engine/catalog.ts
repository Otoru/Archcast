import type { BlockPreset, NodeInstance, ResolvedNode } from "@/engine/types";
import { DEFAULT_AVAILABILITY, DEFAULT_INSTANCES } from "@/engine/types";

export const BLOCK_CATALOG: BlockPreset[] = [
  {
    kind: "web-client",
    label: "Web Client",
    primitive: "origin",
    layer: "client",
    defaults: {},
    edges: { in: [], out: ["read", "write"] },
  },
  {
    kind: "mobile-client",
    label: "Mobile Client",
    primitive: "origin",
    layer: "client",
    defaults: {},
    edges: { in: [], out: ["read", "write"] },
  },
  {
    kind: "iot-fleet",
    label: "IoT Fleet",
    primitive: "origin",
    layer: "client",
    defaults: {},
    edges: { in: [], out: ["read", "write"] },
  },
  {
    kind: "cron",
    label: "Cron",
    primitive: "origin",
    layer: "client",
    defaults: {},
    edges: { in: [], out: ["read", "write"] },
  },
  {
    kind: "cdn",
    label: "CDN",
    primitive: "absorber-forwarding",
    layer: "edge",
    defaults: {
      hitRatio: 0.85,
      capacity: 2e5,
      latBase: 15,
      availability: 0.9999,
    },
    edges: { in: ["read"], out: ["read"] },
  },
  {
    kind: "waf",
    label: "WAF",
    primitive: "absorber-forwarding",
    layer: "edge",
    defaults: {
      hitRatio: 0.02,
      capacity: 5e4,
      latBase: 5,
    },
    flags: { drop: true },
    edges: { in: ["read", "write"], out: ["read", "write"] },
  },
  {
    kind: "api-gateway",
    label: "API Gateway",
    primitive: "server",
    layer: "edge",
    defaults: {
      capacity: 2e4,
      latBase: 5,
      rateCap: 2e4,
    },
    edges: { in: ["read", "write"], out: ["read", "write"] },
  },
  {
    kind: "load-balancer",
    label: "Load Balancer",
    primitive: "server",
    layer: "edge",
    defaults: {
      capacity: 1e5,
      latBase: 1,
      availability: 0.9999,
    },
    edges: { in: ["read", "write"], out: ["read", "write"] },
  },
  {
    kind: "app-server",
    label: "App Server",
    primitive: "server",
    layer: "compute",
    defaults: {
      capacity: 2000,
      latBase: 20,
      instances: 1,
      availability: 0.99,
    },
    edges: { in: ["read", "write", "async"], out: ["read", "write", "async"] },
  },
  {
    kind: "microservice",
    label: "Microservice",
    primitive: "server",
    layer: "compute",
    defaults: {
      capacity: 3000,
      latBase: 15,
      availability: 0.99,
    },
    edges: { in: ["read", "write", "async"], out: ["read", "write", "async"] },
  },
  {
    kind: "serverless",
    label: "Serverless",
    primitive: "server",
    layer: "compute",
    defaults: {
      capacity: 1000,
      latBase: 50,
      availability: 0.9999,
    },
    flags: { elastic: true },
    edges: { in: ["read", "write"], out: ["read", "write", "async"] },
  },
  {
    kind: "worker",
    label: "Worker",
    primitive: "server",
    layer: "compute",
    defaults: {
      capacity: 1000,
      latBase: 100,
      instances: 1,
    },
    edges: { in: ["async"], out: ["read", "write"] },
  },
  {
    kind: "batch-processor",
    label: "Batch Processor",
    primitive: "server",
    layer: "compute",
    defaults: {
      capacity: 500,
      latBase: 500,
    },
    edges: { in: ["async"], out: ["read", "write"] },
  },
  {
    kind: "auth-service",
    label: "Auth Service",
    primitive: "server",
    layer: "compute",
    defaults: {
      capacity: 5000,
      latBase: 30,
    },
    edges: { in: ["read", "write"], out: ["read", "write"] },
  },
  {
    kind: "sql-db",
    label: "SQL Database",
    primitive: "server",
    layer: "data",
    defaults: {
      capacity: 5000,
      latBase: 5,
      instances: 1,
      availability: 0.999,
    },
    edges: { in: ["read", "write"], out: [] },
  },
  {
    kind: "document-database",
    label: "Document Database",
    primitive: "server",
    layer: "data",
    defaults: {
      capacity: 2e4,
      latBase: 3,
      availability: 0.999,
    },
    edges: { in: ["read", "write"], out: [] },
  },
  {
    kind: "kv-store",
    label: "Key-Value Store",
    primitive: "server",
    layer: "data",
    defaults: {
      capacity: 5e4,
      latBase: 2,
    },
    edges: { in: ["read", "write"], out: [] },
  },
  {
    kind: "wide-column",
    label: "Columnar Database",
    primitive: "server",
    layer: "data",
    defaults: {
      capacity: 3e4,
      latBase: 4,
    },
    edges: { in: ["read", "write"], out: [] },
  },
  {
    kind: "timeseries-db",
    label: "Timeseries Database",
    primitive: "server",
    layer: "data",
    defaults: {
      capacity: 1.5e4,
      latBase: 4,
    },
    edges: { in: ["read", "write"], out: [] },
  },
  {
    kind: "graph-db",
    label: "Graph Database",
    primitive: "server",
    layer: "data",
    defaults: {
      capacity: 3000,
      latBase: 8,
    },
    edges: { in: ["read", "write"], out: [] },
  },
  {
    kind: "object-storage",
    label: "Object Storage",
    primitive: "server",
    layer: "data",
    defaults: {
      capacity: 5e4,
      latBase: 30,
      availability: 0.99999,
    },
    edges: { in: ["read", "write"], out: [] },
  },
  {
    kind: "data-warehouse",
    label: "Data Warehouse",
    primitive: "server",
    layer: "data",
    defaults: {
      capacity: 200,
      latBase: 2000,
    },
    edges: { in: ["read", "write"], out: [] },
  },
  {
    kind: "message-queue",
    label: "Message Queue",
    primitive: "async-buffer",
    layer: "messaging",
    defaults: {
      drainRate: 5000,
      maxDepth: 1e6,
      latBase: 5,
    },
    edges: { in: ["async"], out: ["async"] },
  },
  {
    kind: "event-stream",
    label: "Event Stream",
    primitive: "async-buffer",
    layer: "messaging",
    defaults: {
      drainRate: 5e4,
      maxDepth: 1e7,
      latBase: 5,
      instances: 1,
    },
    edges: { in: ["async"], out: ["async"] },
  },
  {
    kind: "pubsub-topic",
    label: "Pub/Sub Topic",
    primitive: "broadcaster",
    layer: "messaging",
    defaults: {
      capacity: 1e5,
      latBase: 5,
    },
    edges: { in: ["async"], out: ["async"] },
  },
  {
    kind: "event-bus",
    label: "Event Bus",
    primitive: "broadcaster",
    layer: "messaging",
    defaults: {
      capacity: 1e5,
      latBase: 5,
    },
    edges: { in: ["async"], out: ["async", "read"] },
  },
  {
    kind: "feature-flags",
    label: "Feature Flags",
    primitive: "structural",
    layer: "platform",
    defaults: {
      availability: 0.999,
    },
    edges: { in: ["read"], out: [] },
  },
];

const presetByKind = new Map<string, BlockPreset>();

function rebuildPresetIndex(): void {
  presetByKind.clear();
  for (const preset of BLOCK_CATALOG) {
    presetByKind.set(preset.kind, preset);
  }
}

rebuildPresetIndex();

export function getPreset(kind: string): BlockPreset | undefined {
  return presetByKind.get(kind);
}

/** For tests: register a preset at runtime without new primitive code. */
export function registerPreset(preset: BlockPreset): void {
  BLOCK_CATALOG.push(preset);
  presetByKind.set(preset.kind, preset);
}

export function resolveNode(node: NodeInstance): ResolvedNode {
  const preset = getPreset(node.kind);
  if (!preset) {
    throw new Error(`Unknown block kind: ${node.kind}`);
  }

  const attrs: Record<string, number> = {
    ...preset.defaults,
    ...node.attrs,
  };

  attrs.availability ??= DEFAULT_AVAILABILITY;
  attrs.instances ??= DEFAULT_INSTANCES;

  return {
    id: node.id,
    kind: node.kind,
    preset,
    primitive: preset.primitive,
    attrs,
    flags: preset.flags ?? {},
  };
}

export function isOrigin(node: NodeInstance): boolean {
  const preset = getPreset(node.kind);
  return preset?.primitive === "origin";
}

export function isStructural(node: NodeInstance): boolean {
  const preset = getPreset(node.kind);
  return preset?.primitive === "structural";
}
