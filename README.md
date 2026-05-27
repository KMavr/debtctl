# debtctl

[![CI](https://github.com/KMavr/debtctl/actions/workflows/ci.yml/badge.svg)](https://github.com/KMavr/debtctl/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/debtctl.svg)](https://www.npmjs.com/package/debtctl)

> Govern `npm` `overrides`, `pnpm.overrides`, and `yarn` `resolutions` as documented technical debt — with a `check` command that fails CI when overrides go stale.

`debtctl` is a small CLI that treats your `npm` `overrides`, `pnpm.overrides`, and `yarn` `resolutions` as what they actually are: technical debt. It maintains a sidecar file (`.debtctl.json`) that records _why_ each override exists, _who_ owns it, and _when_ it should be revisited — then surfaces stale overrides in CI before they rot for another two years.

## Philosophy

Overrides are routinely added to patch a CVE, force peer compatibility, or pin a transitive dependency. They're almost always meant to be temporary. They are almost never reviewed again.

`debtctl` does one job: it enforces three pieces of metadata next to every override, and fails CI when an override has drifted past its expected lifetime. No metadata, no merge. No revisit trigger, no merge. Reviewer changed the override's range and forgot to update the rationale? CI catches it.

The tool has four runtime dependencies (`commander`, `chalk`, `semver`, `yaml`) and is deliberately small. It does not patch your `package.json`, run installs, or talk to a registry — it only reads, classifies, and reports.

## How this compares to Renovate / Dependabot

Renovate and Dependabot **bump** dependencies. They open PRs when a new version is available, including for overridden packages. They don't enforce _why_ an override exists, _who_ owns it, or _when_ it should be revisited.

`debtctl` is the layer next to them, not a replacement:

- **Renovate / Dependabot** open the PR that bumps the underlying package.
- **`debtctl`** fails CI when the override pinning it has no rationale, no owner, or has drifted past its revisit trigger.

It does not call a registry, run installs, or open PRs — it reads `package.json`, reads `.debtctl.json`, and reports. Best suited for teams with a backlog of undocumented overrides who want a CI gate to stop the bleeding.

## Install

Install as a dev dependency so the version is pinned in your project and CI runs match local:

```bash
npm install --save-dev debtctl
# or
pnpm add -D debtctl
# or
yarn add --dev debtctl
```

Then invoke via your package manager's runner:

```bash
npx debtctl init           # npm
pnpm debtctl init          # pnpm (shortcut for `pnpm exec debtctl`)
yarn debtctl init          # yarn
```

Or add a `package.json` script and call it via the manager:

```json
{
  "scripts": {
    "debt:check": "debtctl check --strict"
  }
}
```

```bash
npm run debt:check
```

### Alternatives

- **Global install** — `npm install -g debtctl`. Convenient for ad-hoc use across many projects; not recommended for CI, since the version drifts independently from your repo.
- **No install** — `npx debtctl@0.2.1 check`. Pinned to a version, fetched on demand. Fine for one-off exploration; slower on every CI run than installing.

Requires Node.js ≥ 20.

## Quickstart

```bash
cd your-project
npm install --save-dev debtctl
npx debtctl init        # scaffolds .debtctl.json with TODO stubs for current overrides
$EDITOR .debtctl.json
npx debtctl check       # fails if anything is undocumented or due for review
```

Commit `.debtctl.json` to your repo. Run `npx debtctl check --strict` in CI.

> The command examples below show the bare `debtctl` invocation. Prefix with `npx`, `pnpm`, or `yarn` per your package manager.

## Commands

### `debtctl init`

Scans your package manifest for overrides, then creates or updates `.debtctl.json` with stub metadata for each. Existing documented entries are preserved. Orphaned entries (sidecar entries with no matching override) are kept but counted in the summary.

```
$ debtctl init
Detected: npm
Found 3 overrides. 1 documented, 2 need metadata.
```

### `debtctl check`

Reports overrides that are missing metadata, incomplete (still contain `TODO` fields), or due for review (their trigger has fired). Read-only — never modifies your sidecar.

```
$ debtctl check
Missing metadata (1):
  - some-package

Incomplete (1):
  - other-package: TODO fields present

Due for review (1):
  - third-package: Expired on 2025-09-01

✖ 3 problems: 1 missing, 1 incomplete, 1 due for review
```

**Options:**

| Flag              | Effect                                                               |
| ----------------- | -------------------------------------------------------------------- |
| `--strict`        | Escalate `dueForReview` from a warning to a failure.                 |
| `--json`          | Emit machine-readable JSON; suppress human output.                   |
| `--only <bucket>` | Filter to one of `missing`, `incomplete`, `dueForReview`, `orphans`. |

## Detection precedence

`debtctl` picks the package manager in this order:

1. The `packageManager` field in `package.json` (e.g. `"pnpm@9.1.0"`).
2. The lockfile present in the working directory.
3. If multiple lockfiles are present, `debtctl` reports the ambiguity and falls back to a fixed priority order: `npm` → `pnpm` → `yarn-classic` → `yarn-berry`.

| Manager        | Lockfile            | Override location                             |
| -------------- | ------------------- | --------------------------------------------- |
| `npm`          | `package-lock.json` | `overrides` (in `package.json`)               |
| `pnpm`         | `pnpm-lock.yaml`    | `pnpm.overrides` and/or `pnpm-workspace.yaml` |
| `yarn-classic` | `yarn.lock` (v1)    | `resolutions` (in `package.json`)             |
| `yarn-berry`   | `yarn.lock` (v6+)   | `resolutions` (in `package.json`)             |

For pnpm projects, `debtctl` reads overrides from both `pnpm.overrides` in `package.json` and the `overrides:` block of `pnpm-workspace.yaml` (the recommended location since pnpm 9). When the same key appears in both, the workspace YAML value wins — matching pnpm's own precedence.

### Ambiguous lockfiles

When `debtctl` finds more than one lockfile and no `packageManager` field disambiguates, it prints a warning to stderr and proceeds with the highest-priority match:

```
Warning: multiple lockfiles found (package-lock.json, yarn.lock). Using npm. Consider removing the unused lockfile.
```

In `--json` mode the warning is suppressed and the matched lockfiles are surfaced on the result instead:

```json
{
  "manager": "npm",
  "ambiguous": ["package-lock.json", "yarn.lock"],
  "entries": [...],
  "orphans": [...]
}
```

Ambiguity never affects the exit code — it's repo hygiene, not override debt.

## Metadata model

`.debtctl.json` is a versioned JSON file with one entry per override. Three trigger types are supported (`version-anchor`, `date`, `patch-hash`):

```json
{
  "version": 2,
  "overrides": {
    "some-package": {
      "reason": "Patches CVE-2024-XXXX until upstream v3 ships",
      "owner": "team-security",
      "revisitWhen": {
        "type": "version-anchor",
        "package": "some-package",
        "declaredRange": "^2.4.0"
      }
    },
    "other-package": {
      "reason": "Force peer compatibility with legacy-ui",
      "owner": "alice",
      "revisitWhen": {
        "type": "date",
        "expires": "2026-09-01"
      }
    }
  },
  "patches": {}
}
```

Sidecar files written by older versions of `debtctl` (`"version": 1`) are auto-migrated to v2 on first read. Your existing file on disk is left untouched until you re-run `debtctl init`.

### `version-anchor` (recommended for overrides)

Fires when the declared range for the named package in `package.json` no longer matches `declaredRange`. This is usually what you want for overrides: if upstream releases a fix and someone bumps the dependency, you'll be prompted to revisit the override automatically — no human-set deadline required.

Ranges are compared semantically via `semver.subset`, so `^1.0.0` and `^1.0.0` match, but `^1.0.0` and `^2.0.0` don't. Non-semver ranges like `latest` or `workspace:*` fall back to string equality.

### `date`

Fires when today is on or after `expires`. Use this only when there's no natural dependency or patch file to anchor against (e.g., you're waiting on an external schedule).

### `patch-hash` (recommended for patches)

Fires when the patch file's content hash differs from the recorded hash. See [Patches](#patches) for the full story.

## Patches

`debtctl` also governs code patches managed by `patch-package`, pnpm's `patchedDependencies`, and yarn berry's `patch:` protocol. Patches are arguably worse than overrides for rot: they include explicit code diffs that can fail to apply silently when upstream shifts, or apply _wrongly_ and quietly diverge from the patch's original intent.

Patches share the same metadata shape as overrides (`reason`, `owner`, `revisitWhen`) and live under the `patches` key of `.debtctl.json`. `debtctl init` detects patches in your project, computes a SHA-256 hash of each patch file, and scaffolds an entry with a `patch-hash` trigger pre-armed at the current content.

| Manager        | Where patches are declared                   | Where patch files live                         |
| -------------- | -------------------------------------------- | ---------------------------------------------- |
| `npm`          | `package.json` `scripts.postinstall`         | `patches/*.patch`                              |
| `yarn-classic` | `package.json` `scripts.postinstall`         | `patches/*.patch`                              |
| `pnpm`         | `pnpm.patchedDependencies` in `package.json` | path declared per entry (typically `patches/`) |
| `yarn-berry`   | `resolutions` field with `patch:` protocol   | `.yarn/patches/*.patch`                        |

Example sidecar with both an override and two patches:

```json
{
  "version": 2,
  "overrides": {
    "some-package": {
      "reason": "Patches CVE-2024-XXXX until upstream v3 ships",
      "owner": "team-security",
      "revisitWhen": {
        "type": "version-anchor",
        "package": "some-package",
        "declaredRange": "^2.4.0"
      }
    }
  },
  "patches": {
    "react-router": {
      "reason": "Backport upstream PR #1234 until v6.20 ships",
      "owner": "team-frontend",
      "revisitWhen": {
        "type": "patch-hash",
        "hash": "sha256:abc123def456..."
      }
    },
    "legacy-thing": {
      "reason": "Block calls to deprecated endpoint until migration completes",
      "owner": "alice",
      "revisitWhen": {
        "type": "date",
        "expires": "2026-12-01"
      }
    }
  }
}
```

### The `patch-hash` trigger

`debtctl init` records the SHA-256 hash of each patch file at the moment it's detected. `debtctl check` recomputes the hash on every run and fires the trigger if it has drifted. This is the killer feature: if a developer edits a patch file without also updating the metadata, CI catches it.

`debtctl` does **not** automatically update the stored hash on subsequent `init` runs. The hash is your snapshot — when the trigger fires, you should review what changed in the patch, update the `reason` if needed, and then update the `hash` to the new value to "acknowledge" the change.

**Line endings:** patch contents are normalized to LF (`\n`) before hashing. This means a patch file checked out on Windows (CRLF) and macOS/Linux (LF) produces the same hash. Without this, every Windows contributor would see all patch triggers fire on every install.

### Out of scope (for now)

- Workspace-sourced yarn berry patches (`patch:.../workspace#...`) — only npm-sourced patches stored in `.yarn/patches/` are detected.
- Inline `.pnp.cjs` diffs.
- Auto-applying or auto-fixing patches — `debtctl` is strictly read-only.

## CI usage

With `debtctl` installed as a dev dependency, run `check --strict` after `npm ci` (or the equivalent for your manager). Example for GitHub Actions:

```yaml
- uses: actions/checkout@v4
- uses: actions/setup-node@v4
  with:
    node-version: 20
- run: npm ci
- name: Verify dependency overrides
  run: npx debtctl check --strict
```

Pinning `debtctl` in `devDependencies` keeps the version stable across CI runs and matches whatever you use locally.

Exit codes are designed for CI:

| Code | Meaning                                                                                    |
| ---- | ------------------------------------------------------------------------------------------ |
| `0`  | Clean, or only warnings present without `--strict`.                                        |
| `1`  | Errors found: missing or incomplete metadata, or (with `--strict`) due-for-review entries. |
| `2`  | Misuse: invalid `--only` value, or `check` run before `init`.                              |

Orphans never cause a non-zero exit; they're informational.

## Status

`debtctl` is at `0.2.1`. The metadata schema is at version 2; v1 sidecars are auto-migrated on read. Future schema changes will bump it explicitly. Bug reports and PRs welcome.

## License

MIT
