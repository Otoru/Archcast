# Archcast

**A visual simulator for distributed-system architecture. Draw the graph, run the challenge, read the verdict.**

🔗 **[Try it live → otoru.github.io/Archcast](https://otoru.github.io/Archcast)**

<p>
  <a href="https://github.com/Otoru/Archcast/actions/workflows/ci.yml"><img src="https://github.com/Otoru/Archcast/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://sonarcloud.io/summary/new_code?id=archcast"><img src="https://sonarcloud.io/api/project_badges/measure?project=archcast&metric=alert_status" alt="Quality Gate" /></a>
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License: MIT" />
  <a href="https://github.com/Otoru/Archcast/issues"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs welcome" /></a>
</p>

## What is Archcast?

Assemble a system as a graph of blocks — CDN, API gateway, app server, SQL DB, message queue, cache — and run a deterministic simulation against a traffic challenge. You get back a **Verdict**: p99 latency, availability, saturation, rate-limiting, single points of failure, storage loss, and rule violations. A fast way to reason about an architecture's resilience *before* you build it.

## Features

- Drag-and-drop architecture canvas with **live validation**.
- **27+ blocks** across 6 layers (client, edge, compute, data, messaging, platform).
- **Deterministic tick-by-tick simulation**, run off the main thread.
- A **Verdict**: p99 latency, availability, saturation, rate-limiting, SPOF, storage loss, rule violations.
- Traffic profiles: steady, spiky, diurnal.
- Starter graphs: e-commerce, queue + workers, cache-aside.

## Run locally

```bash
pnpm install
pnpm dev   # http://localhost:3000
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full dev setup, architecture, and how to add a block.

## Contributing

Contributions are welcome. Read the [Contributing guide](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md) to get started.

## Contributors ✨

<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->
[![All Contributors](https://img.shields.io/badge/all_contributors-1-orange.svg?style=flat-square)](#contributors-)
<!-- ALL-CONTRIBUTORS-BADGE:END -->

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://vitoru.dev"><img src="https://avatars.githubusercontent.com/u/26543872?v=4?s=100" width="100px;" alt="Vitor Hugo"/><br /><sub><b>Vitor Hugo</b></sub></a><br /><a href="https://github.com/Otoru/Archcast/commits?author=Otoru" title="Code">💻</a> <a href="https://github.com/Otoru/Archcast/commits?author=Otoru" title="Documentation">📖</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

Maintained by the [all-contributors](https://allcontributors.org) bot — comment `@all-contributors please add @user for code,docs` on any issue or PR to add someone.

## License

[MIT](LICENSE) © Vitor Hugo de Oliveira Vargas
