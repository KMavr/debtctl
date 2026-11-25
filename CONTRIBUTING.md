# Contributing

Thanks for your interest in improving `debtctl`. Issues and PRs are welcome.

## Getting started

```sh
npm install
npm run build      # compile TypeScript to dist/
npm run dev        # run the CLI from source via tsx
npm test           # vitest (watch); use `npm test -- --run` for a single pass
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
```

Requires **Node 22+**.

## Project layout

- `src/commands/` — the `init` and `check` commands.
- `src/detect/` — package manager detection (`packageManager` field, lockfiles).
- `src/parsers/` — per-manager readers for overrides, resolutions, and patches.
- `src/sidecar/` — reading, migrating, and writing `.debtctl.json`.
- `src/triggers/` — `version-anchor`, `date`, and `patch-hash` evaluation.
- `src/cli/`, `src/index.ts` — the commander wiring and entry point.
- `tests/` — mirrors `src/`.

## Tests

- Written with Vitest.
- Test descriptions start with **"should"** (e.g. `it('should flag a missing owner', …)`).
- Use generic placeholder package names (`foo`, `bar`, `baz`) in fixtures.
- If detection, a parser, or a trigger changes, cover every affected package manager.
- Run `npm test -- --run` before pushing.

## Commits & releases

This repo uses **Conventional Commits** and [release-please](https://github.com/googleapis/release-please)
for automated releases. Your commit type drives the version bump:

- `feat:` → minor release
- `fix:` → patch release
- `docs:` / `chore:` / `test:` / `ci:` / `refactor:` → no release

Releases are published from CI with npm provenance — no manual `npm publish`.

## Pull requests

1. Branch off `main`.
2. Make your change with tests. Update the README if a command, flag, exit code, or the
   `.debtctl.json` schema changed.
3. Ensure the full gate is green locally:
   `npm run lint && npm run typecheck && npm run format:check && npm test -- --run`.
4. Push and open a PR against `main`. CI runs the suite across Node 22/24/26; `ci-success` is the required check.

### Maintainer note: branch protection

Require only the `ci-success` status check on `main` (**Settings → Branches**). It aggregates the
whole Node matrix, so changing the matrix in `.github/workflows/ci.yml` never orphans a required check.
