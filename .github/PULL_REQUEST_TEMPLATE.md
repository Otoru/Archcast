## Summary

<!-- What does this change do, and why? -->

## Type

- [ ] Bug fix
- [ ] New feature / block preset
- [ ] Engine behavior change
- [ ] Docs
- [ ] CI / tooling
- [ ] Other

## Checklist

- [ ] `pnpm lint:fix` is green
- [ ] `pnpm test:run` is green (Chromium installed via `pnpm exec playwright install chromium`)
- [ ] `pnpm build` is green
- [ ] Imports use `@/` (no relative `./`/`../`)
- [ ] Engine changes respect the D1–D10 contracts in `src/engine/acceptance.test.ts`
- [ ] UI changes include a screenshot/recording below (if visually relevant)

## Screenshots / recording

<!-- Drag in an image or GIF for any visible change. -->