# Example

A minimal, runnable project showing `debtctl` governing **npm overrides** through a `.debtctl.json`
sidecar.

[`package.json`](./package.json) declares three overrides; [`.debtctl.json`](./.debtctl.json)
documents two of them. Between them they exercise all three states `debtctl check` reports:

| Override | Sidecar entry                     | State              | Why                                                                       |
| -------- | --------------------------------- | ------------------ | ------------------------------------------------------------------------- |
| `ms`     | `version-anchor` on `ms` `^2.1.3` | **healthy**        | `ms` is still declared as `^2.1.3`, so the anchor holds — nothing to flag |
| `bar`    | `date`, `expires: 2025-01-01`     | **due for review** | the revisit date has passed                                               |
| `baz`    | _(none)_                          | **missing**        | the override exists but has no metadata at all                            |

`ms` is a real dependency pinned by the override, so its `version-anchor` trigger stays quiet until
someone bumps the declared range. `bar` and `baz` are placeholder overrides standing in for the
"documented but stale" and "undocumented" cases.

## Run it

This example consumes the CLI from the parent repo (`"file:.."`), so build it first:

```sh
# from the repo root
npm install
npm run build

# then, in this folder
cd examples
npm install
npm run debt:check   # or: npx debtctl check
```

## Expected output

```
Overrides:
  Missing metadata (1):
    - baz

  Due for review (1):
    - bar: Expired on 2025-01-01

✖ 2 override problems: 1 missing, 1 due for review
```

`debtctl check` exits `1` here: `baz` (missing metadata) is always an error. `bar` (due for review)
is a warning by default and becomes a hard failure under `--strict` — try `npx debtctl check
--strict`. `ms` is well-governed and never appears.

Filter to one bucket with `--only`:

```sh
npx debtctl check --only missing   # just baz
```

To make the report clean, document `baz` and either bump `bar`'s `expires` or remove the override.
See the [root README](../README.md#metadata-model) for the full metadata model, the other trigger
types (`version-anchor`, `date`, `patch-hash`), and patch governance.
