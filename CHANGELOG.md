# Changelog

All notable changes to this project are documented here. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0](https://github.com/KMavr/debtctl/compare/debtctl-v0.2.1...debtctl-v0.3.0) (2026-05-27)


### Features

* add patch file content hashing helper ([cf02728](https://github.com/KMavr/debtctl/commit/cf02728ce46888dd0a6ba9b7aab6c0804f6a8a7e))
* add patch-hash trigger type ([1f99246](https://github.com/KMavr/debtctl/commit/1f99246d0fe77dd5ea8eedba69f78499e373e81b))
* add patch-hash trigger type ([2d046e1](https://github.com/KMavr/debtctl/commit/2d046e17cb6e63fbac26b4f49b112a390b3d86e8))
* include patches in init and check commands ([f956127](https://github.com/KMavr/debtctl/commit/f9561271e344a53cbdae0bea6fd68e639b80f090))
* include patches in init and check commands ([9257d3c](https://github.com/KMavr/debtctl/commit/9257d3cf166585952dee73618d6ce0d71fbc526a))
* parse patch-package patches ([ed35c84](https://github.com/KMavr/debtctl/commit/ed35c844568602c80250093176c73478b074d865))
* parse pnpm patchedDependencies ([1136ebf](https://github.com/KMavr/debtctl/commit/1136ebfe5b69483923e4e8a5b780c8ee3c61bf32))
* parse yarn berry patch protocol resolutions ([844aa0e](https://github.com/KMavr/debtctl/commit/844aa0ea5ac3b1218ead0374d1c3c20293fd87c5))
* support --only overrides:bucket and --only patches:bucket scoping ([e9e0514](https://github.com/KMavr/debtctl/commit/e9e0514a796b0fcab334030a186c34d7618d4014))
* support --only overrides:bucket and --only patches:bucket scoping ([6725dea](https://github.com/KMavr/debtctl/commit/6725deaf10efd8b59bd53f2934dd1360721b4b57))
* update sidecar schema to v2 with auto-migration ([e6456a2](https://github.com/KMavr/debtctl/commit/e6456a2fb941c0de0e4f8043dc3dd002529a92a1))
* update sidecar schema to v2 with auto-migration ([7a7bdae](https://github.com/KMavr/debtctl/commit/7a7bdae4db02049c0023645884313ede89b775a9))


### Bug Fixes

* exclude patch protocol values from yarn overrides parsers ([98c38ff](https://github.com/KMavr/debtctl/commit/98c38ffbd65c7abce31f0c923fd92919bd031b5a))

## [0.2.1] — 2026-05-26

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

[Unreleased]: https://github.com/KMavr/debtctl/compare/v0.2.1...HEAD
[0.2.1]: https://github.com/KMavr/debtctl/releases/tag/v0.2.1
[0.2.0]: https://github.com/KMavr/debtctl/releases/tag/v0.2.0
[0.1.0]: https://github.com/KMavr/debtctl/releases/tag/v0.1.0
