import { resolveNode } from "@/engine/catalog";
import { absorberAsideHandler } from "@/engine/nodes/absorber-aside";
import { absorberForwardingHandler } from "@/engine/nodes/absorber-forwarding";
import { asyncBufferHandler } from "@/engine/nodes/async-buffer";
import { broadcasterHandler } from "@/engine/nodes/broadcaster";
import { originHandler } from "@/engine/nodes/origin";
import { serverHandler } from "@/engine/nodes/server";
import { structuralHandler } from "@/engine/nodes/structural";
import type {
  NodeInstance,
  PrimitiveHandler,
  PrimitiveKind,
  ResolvedNode,
} from "@/engine/types";

export class NodeTypeRegistry {
  private readonly primitives = new Map<PrimitiveKind, PrimitiveHandler>();

  register(handler: PrimitiveHandler): void {
    this.primitives.set(handler.primitive, handler);
  }

  getPrimitive(kind: PrimitiveKind): PrimitiveHandler {
    const handler = this.primitives.get(kind);
    if (!handler) {
      throw new Error(`Unknown primitive: ${kind}`);
    }
    return handler;
  }

  resolve(node: NodeInstance): ResolvedNode {
    const resolved = resolveNode(node);
    return resolved;
  }

  getHandler(node: NodeInstance): PrimitiveHandler {
    const resolved = this.resolve(node);
    return this.getPrimitive(resolved.primitive);
  }
}

export function createDefaultRegistry(): NodeTypeRegistry {
  const registry = new NodeTypeRegistry();
  registry.register(originHandler);
  registry.register(serverHandler);
  registry.register(absorberAsideHandler);
  registry.register(absorberForwardingHandler);
  registry.register(asyncBufferHandler);
  registry.register(broadcasterHandler);
  registry.register(structuralHandler);
  return registry;
}
