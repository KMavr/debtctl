# debtctl

[![CI](https://github.com/KMavr/debtctl/actions/workflows/ci.yml/badge.svg)](https://github.com/KMavr/debtctl/actions/workflows/ci.yml)

> Govern `npm` `overrides`, `pnpm.overrides`, and `yarn` `resolutions` as documented technical debt — with a `check` command that fails CI when overrides go stale.

`debtctl` is a small CLI that treats your `npm` `overrides`, `pnpm.overrides`, and `yarn` `resolutions` as what they actually are: technical debt. It maintains a sidecar file (`.debtctl.json`) that records _why_ each override exists, _who_ owns it, and _when_ it should be revisited — then surfaces stale overrides in CI before they rot for another two years.

## Philosophy

Overrides are routinely added to patch a CVE, force peer compatibility, or pin a transitive dependency. They're almost always meant to be temporary. They are almost never reviewed again.

`debtctl` does one job: it enforces three pieces of metadata next to every override, and fails CI when an override has drifted past its expected lifetime. No metadata, no merge. No revisit trigger, no merge. Reviewer changed the override's range and forgot to update the rationale? CI catches it.

The tool has four runtime dependencies (`commander`, `chalk`, `semver`, `yaml`) and is deliberately small. It does not patch your `package.json`, run installs, or talk to a registry — it only reads, classifies, and reports.

## Install

```bash
npm install -g debtctl
```

Requires Node.js ≥ 20.

## Quickstart

```bash
cd your-project
debtctl init        # scaffolds .debtctl.json with TODO stubs for current overrides
$EDITOR .debtctl.json
debtctl check       # fails if anything is undocumented or due for review
```

Commit `.debtctl.json` to your repo. Run `debtctl check --strict` in CI.

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

| Manager        | Lockfile            | Override location |
| -------------- | ------------------- | ----------------- |
| `npm`          | `package-lock.json` | `overrides`       |
| `pnpm`         | `pnpm-lock.yaml`    | `pnpm.overrides`  |
| `yarn-classic` | `yarn.lock` (v1)    | `resolutions`     |
| `yarn-berry`   | `yarn.lock` (v6+)   | `resolutions`     |

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

`.debtctl.json` is a versioned JSON file with one entry per override. Two trigger types are supported:

```json
{
  "version": 1,
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
  }
}
```

### `version-anchor` (recommended)

Fires when the declared range for the named package in `package.json` no longer matches `declaredRange`. This is usually what you want: if upstream releases a fix and someone bumps the dependency, you'll be prompted to revisit the override automatically — no human-set deadline required.

Ranges are compared semantically via `semver.subset`, so `^1.0.0` and `^1.0.0` match, but `^1.0.0` and `^2.0.0` don't. Non-semver ranges like `latest` or `workspace:*` fall back to string equality.

### `date`

Fires when today is on or after `expires`. Use this only when there's no natural dependency to anchor against (e.g., you're waiting on an external schedule).

## CI usage

Add a step to your workflow that runs `check --strict`. Example for GitHub Actions:

```yaml
- name: Verify dependency overrides
  run: npx debtctl check --strict
```

Exit codes are designed for CI:

| Code | Meaning                                                                                    |
| ---- | ------------------------------------------------------------------------------------------ |
| `0`  | Clean, or only warnings present without `--strict`.                                        |
| `1`  | Errors found: missing or incomplete metadata, or (with `--strict`) due-for-review entries. |
| `2`  | Misuse: invalid `--only` value, or `check` run before `init`.                              |

Orphans never cause a non-zero exit; they're informational.

## Status

`debtctl` is at `0.1.0`. The metadata schema is versioned (`"version": 1`); future schema changes will bump it explicitly. Bug reports and PRs welcome.

## License

MIT
