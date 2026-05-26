# Changelog

All notable changes to this project are documented here. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- `npm run build` now cleans `dist/` before compiling, and the publish pipeline runs as `prepack` instead of `prepublishOnly` so `npm pack` also produces a fresh build. Prevents stale or removed source files from leaking into published tarballs.

### Fixed

- `debtctl --version` now reports the version declared in `package.json`. Previously the CLI hardcoded `0.1.0` and continued to report it after the 0.2.0 release.
- Malformed `package.json` or `.debtctl.json` now fails with a descriptive `Failed to parse <path>: <reason>` error instead of a raw `SyntaxError` stack trace.

## [0.2.0] — 2026-05-26

### Added

- pnpm parser now reads overrides from `pnpm-workspace.yaml` in addition to `pnpm.overrides` in `package.json`. When the same key appears in both, the workspace YAML value wins (matches pnpm's own precedence).
- `yaml` runtime dependency for parsing `pnpm-workspace.yaml`.
- Dependabot configuration for automated `npm` and GitHub Actions dependency updates.

### Changed

- Parser dispatcher (`parseOverrides`) is now async and accepts `cwd` as a third argument. The pnpm parser signature is `(packageJson, cwd) => Promise<Override[]>`; other parsers retain their synchronous in-memory signatures.
- README install instructions now recommend the per-project (dev dependency) flow, with global install documented as an alternative for ad-hoc use.

## [0.1.0] — 2026-05-26

Initial release.

### Added

- `debtctl init` — scans `package.json` for dependency overrides and scaffolds `.debtctl.json` with stub metadata (`reason`, `owner`, `revisitWhen`).
- `debtctl check` — reports overrides that are missing metadata, incomplete (still contain `TODO` fields), or due for review (their trigger has fired).
- `--strict` flag escalates `dueForReview` from a warning to a failure.
- `--json` flag emits machine-readable output for CI consumers.
- `--only <bucket>` flag filters output to a single category (`missing`, `incomplete`, `dueForReview`, or `orphans`).
- Package-manager detection via `packageManager` field with lockfile fallback. Supports `npm`, `pnpm`, `yarn-classic`, and `yarn-berry`.
- Trigger types: `version-anchor` (fires when a package's declared range drifts) and `date` (fires when today ≥ `expires`).
- Range comparison is semver-aware via `semver.subset`, with string-equality fallback for non-semver ranges like `latest` and `workspace:*`.
- Warning when multiple lockfiles are present, with the matched set surfaced in JSON output.

[Unreleased]: https://github.com/KMavr/debtctl/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/KMavr/debtctl/releases/tag/v0.2.0
[0.1.0]: https://github.com/KMavr/debtctl/releases/tag/v0.1.0
