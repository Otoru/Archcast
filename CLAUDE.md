# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

> The line above imports `AGENTS.md`: this Next.js (16.2.9) has breaking changes vs. training data — consult `node_modules/next/dist/docs/` before writing framework code.

## Commands

```bash
pnpm dev              # dev server (Turbopack)
pnpm build            # production build
pnpm lint:fix         # biome check --write (lint + format, the one to run)
pnpm test:run         # vitest run (CI) — runs both jsdom + storybook projects
pnpm test             # vitest watch
pnpm storybook        # storybook dev on :6006
```

Run a single test file: `pnpm test:run src/engine/propagate.test.ts`
Filter by name: `pnpm test:run -t "broadcaster duplicates"`

`pnpm test:run` executes two Vitest projects (see `vitest.config.ts`): the default **jsdom** project (unit/component tests, setup in `src/test/setup.ts`) and a **storybook** project that runs every `*.stories.tsx` in a headless Playwright Chromium browser. A green local run requires Playwright's chromium installed.

## Conventions

- **Imports:** always use the `@/` alias (→ `src/`). Biome errors on relative `./`/`../` imports (`biome.json` `noRestrictedImports`). TS strict.
- **Lint/format:** Biome 2 only (no ESLint/Prettier). 2-space indent, double quotes. `pnpm lint:fix` before considering work done.
- **UI primitives:** shadcn **base-ui variant** — components in `src/components/ui/` are built on `@base-ui/react/*` (not Radix). Styling via Tailwind v4 (CSS-first, no `tailwind.config`; theme tokens live in `src/app/globals.css`).
- **Design tokens:** the wireframe identity uses `--wf-*` tokens (e.g. `wf-surface`, `wf-border`, `wf-ink`, `wf-focus`, `wf-destructive`) and utilities `font-wf-heading`, `wf-text-caption`, `rounded-wf`, all defined in `globals.css`. Prefer these over ad-hoc colors. `--wf-destructive` is theme-invariant.

## Architecture

Two largely independent layers: a **pure simulation engine** (`src/engine/`) and a **React Flow visual editor** (`src/components/flow/`). The app shell (`src/app/page.tsx` → `FlowShell`) currently mounts only the editor; the engine's validation helpers are wired into the canvas, but full `runSimulation` is not yet surfaced in the UI.

### Engine (`src/engine/`) — framework-agnostic, no React

Models a system-design graph and computes a `Verdict` (latency, saturation, availability, SPOF, rule violations). All types in `types.ts`; the public surface is re-exported from `index.ts`.

- **`Graph = { nodes: NodeInstance[], edges: Edge[] }`**. `NodeInstance = { id, kind, attrs }`; `Edge = { id, from, to, kind }` where `kind: EdgeChannel = "read" | "write" | "async"`.
- **Catalog (`catalog.ts`):** `BLOCK_CATALOG` is the list of `BlockPreset`s — each maps a `kind` (e.g. `"app-server"`) to a `primitive`, a `layer` (client/edge/compute/data/messaging/platform), default `attrs`, and `edges: { in: EdgeChannel[]; out: EdgeChannel[] }` (which channels the block accepts/emits). `getPreset(kind)` returns `undefined` for unknown kinds (callers handle gracefully). `registerPreset` adds presets at runtime. **To add a block, add a `BlockPreset` — no code change needed** (acceptance test D10 enforces this).
- **Primitives (`nodes/` + `registry.ts`):** behavior is keyed by `primitive`, not `kind`. Each `PrimitiveHandler` (origin, server, absorber-aside, absorber-forwarding, async-buffer, broadcaster, structural) defines how a node consumes a channel and transforms flow. `createDefaultRegistry()` wires them; `resolveNode` merges preset defaults with instance attrs. Many `kind`s share one primitive.
- **Pipeline (`index.ts` `runSimulation`):** `validateDag` (throws `CycleError`) → `validateEdges` → then either single-pass `propagate` (steady traffic) or multi-tick `simulate` (spiky/diurnal, see `profile.ts`) → `computeEndToEndLatency`, `computeSystemAvailability`, `checkPresence`, `detectSpof` → `buildVerdict`. `propagate.ts` apportions flow per channel through the topologically-sorted graph; `apportion.ts` splits load across parallel edges.
- **Validation is layered:** `validateEdges` (channel compatibility), `validateDag`/`topologicalSort` (cycle detection — `CycleError` carries no path), and per-concern checks (`presence`, `spof`, `verdict` saturation/latency). `Violation` carries `{ type, nodeId?, detail, severity? }` — no `edgeId`; the offending edge is identified by `nodeId` (= `edge.from`) plus the `detail` string. `severity: "warn"` marks non-fatal warnings (e.g. a channel with flow but no valid destination) that don't flip `passed`; omitted/`"error"` are hard failures.

### Visual editor (`src/components/flow/`) — React Flow v12 (`@xyflow/react`)

- **`flow-shell.tsx`** — layout: collapsible `AppSidebar` (block palette) + full-screen canvas. `FlowCanvas` is `dynamic(..., { ssr: false })` (RF measures the viewport). A shell-level `onDragOver` keeps the native drag cursor as "move" across the whole area.
- **`flow-canvas.tsx`** — `FlowInner` holds RF state (`useNodesState`/`useEdgesState`). `onConnect` adds edges; `isValidConnection` rejects bad connections **during the drag** (consults presets). Live validation is derived purely via `useMemo(findInvalidNodeIds(buildGraph(...)))` and published through `InvalidNodesContext` — never mutates node `data` (avoids effect loops). Uses a fixed `defaultViewport` (zoom 1) rather than `fitView`, so dropping the first node doesn't jump the zoom. `nodeOrigin={[0.5,0.5]}` centers nodes on the cursor.
- **`block-node.tsx`** — the single parametrized canvas node: derives label/layer/icon/ports from `data.kind` via `getPreset`. `BlockNodeShell` is the RF-independent visual body (reused by the drag image). Handle ids encode the channel: `in-${channel}` / `out-${channel}` — this is how the engine `EdgeChannel` is recovered from an RF connection. Nodes in `InvalidNodesContext` render a `wf-destructive` border.
- **`validate-graph.ts`** — the bridge between RF and the engine (pure, jsdom-free, fully unit-tested): `channelFromHandle` (parse `out-read`→`read`), `buildGraph` (RF nodes/edges → engine `Graph`), `isConnectionValid` (for `isValidConnection`), `findInvalidNodeIds` (runs `validateEdges` + a local Tarjan SCC for cycles, since `CycleError` gives no node set).
- **`block-drag-image.ts`** — renders `BlockNodeShell` off-screen via `createRoot` + `flushSync` for the native HTML5 drag ghost, scaled to the live canvas zoom (published by `setCanvasZoom` from the canvas). Do **not** use `react-dom/server` here — it triggers Storybook's react-dom shim and breaks tests. `dnd.ts` holds the shared drag MIME type.

**Native drag constraint:** the sidebar→canvas drag uses the HTML5 DnD API (for the zoom-correct ghost). The cursor is browser-controlled via `dropEffect` and limited to `none`/`copy`/`link`/`move` — CSS `cursor` (e.g. `grabbing`) does not apply mid-drag. A true `grabbing` cursor would require migrating to pointer-events dragging.

## Testing notes

- `src/test/setup.ts` polyfills `ResizeObserver` and forces a non-zero `getBoundingClientRect` (800×600) so React Flow v12 renders in jsdom.
- Engine tests are pure and fast; `acceptance.test.ts` (D1–D10) encodes the canonical behavioral contracts — read it to understand expected engine semantics. `test-helpers.ts` provides `makeGraph`/`presetNode`/`sourceNode`/`serverNode`.
- Prefer testing RF logic via the pure `validate-graph.ts` helpers rather than simulating handle drags in jsdom (fragile).
