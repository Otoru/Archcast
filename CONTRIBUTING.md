# Contributing to Archcast

Thanks for your interest in contributing to Archcast! Bug reports, features, docs, and new block presets are all welcome.

By participating in this project you agree to abide by the [Code of Conduct](CODE_OF_CONDUCT.md). Please read it before contributing.

## Dev setup

**Prerequisites**

- Node.js 20+
- [pnpm](https://pnpm.io)
- Playwright's Chromium browser — **required** for `pnpm test:run` (the suite runs Storybook stories in a headless Chromium):

  ```bash
  pnpm exec playwright install chromium
  ```

**Install & run**

```bash
pnpm install
pnpm dev            # editor at http://localhost:3000
pnpm test:run        # test suite (jsdom + Storybook/Chromium)
pnpm storybook       # component explorer at http://localhost:6006
```

## Conventions

These are enforced by the toolchain, not optional:

- **Imports:** always use the `@/` alias (→ `src/`). Biome rejects relative `./` / `../` imports. TypeScript is in strict mode.
- **Lint/format:** Biome 2 only (no ESLint/Prettier). 2-space indent, double quotes. Run `pnpm lint:fix` before opening a PR.
- **UI primitives:** this project uses the shadcn **base-ui variant** — components in `src/components/ui/` are built on `@base-ui/react/*` (not Radix). Prefer existing primitives over new ad-hoc ones.
- **Design tokens:** the visual identity uses `--wf-*` tokens (e.g. `wf-surface`, `wf-border`, `wf-ink`, `wf-destructive`) defined in `src/app/globals.css`, plus utilities like `font-wf-heading`, `wf-text-caption`, `rounded-wf`. Prefer these over ad-hoc colors. Note: the `wf` prefix is an internal design-token convention — it is **not** the product name (the product is Archcast).

## Architecture

Archcast is two largely independent layers:

- **Engine** (`src/engine/`) — a pure, framework-agnostic simulation engine. No React, no DOM. Models a system-design graph and computes a `Verdict` (latency, saturation, availability, SPOF, rule violations). The simulation runs in a **web worker** (`src/workers/simulate.worker.ts`) off the main thread; `buildGraph` runs on the main thread (cheap, used for live validation).
- **Visual editor** (`src/components/flow/`) — a React Flow v12 canvas that lets you assemble a graph and wires the engine's validation/simulation into the UI.

For the deep architectural reference, see the in-repo `CLAUDE.md` and `AGENTS.md`.

## Adding a block

The catalog (`src/engine/catalog.ts`) holds `BlockPreset`s — each maps a `kind` (e.g. `"app-server"`) to a `primitive`, a `layer`, default `attrs`, and the channels it accepts/emits. **To add a block, add a `BlockPreset` — no handler code needed** if its `primitive` already exists. This contract is enforced by acceptance test D10 in `src/engine/acceptance.test.ts`.

Read `src/engine/acceptance.test.ts` (D1–D10) for the canonical behavioral contracts of the engine before touching engine code.

## Testing

- `pnpm test:run` runs two Vitest projects: the default **jsdom** project (unit/component) and a **storybook** project that runs every `*.stories.tsx` in a headless Playwright Chromium. A green run requires Chromium installed.
- Run a single file: `pnpm test:run src/engine/propagate.test.ts`
- Filter by name: `pnpm test:run -t "broadcaster duplicates"`
- Prefer testing React Flow logic via the pure helpers in `src/components/flow/validate-graph.ts` rather than simulating handle drags in jsdom (fragile).

## Commits

This repo uses [Conventional Commits](https://www.conventionalcommits.org/) (e.g. `feat(engine): …`, `fix(flow): …`). Keep the scope aligned with the layer you touched (`engine`, `flow`, `ui`, `docs`, `ci`, …).

## Pull request process

1. Fork the repo and create a branch from `main`.
2. `pnpm lint:fix` — must be green.
3. `pnpm test:run` — must be green (install Chromium first if you haven't).
4. `pnpm build` — must be green.
5. Open a PR against `main` and fill in the [PR template](.github/PULL_REQUEST_TEMPLATE.md). Include screenshots/recordings for any visible change.

CI runs lint, tests (with coverage), build, and a SonarCloud analysis. The SonarCloud **quality gate** is a required check on `main` — a failing gate blocks the merge.

## Adding yourself as a contributor

The contributors table in the [README](README.md) is maintained by the [all-contributors](https://allcontributors.org) bot. To add yourself, comment on any issue or PR:

```
@all-contributors please add @your-username for code,docs
```

The bot opens a PR updating the table. Do **not** edit the table by hand between the `ALL-CONTRIBUTORS-*` markers. See the [emoji key](https://allcontributors.org/docs/en/emoji-key) for contribution types.

## Reporting security issues

Do **not** open a public issue for security problems. See [SECURITY.md](SECURITY.md) for how to report them privately.