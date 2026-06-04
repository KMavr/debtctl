---
name: Bug report
about: debtctl detects the wrong thing, misses an override/patch, or errors
title: ''
labels: bug
assignees: ''
---

## What happened

<!-- What did debtctl do, and what did you expect instead? -->

## Which command

- [ ] `debtctl init`
- [ ] `debtctl check`
- [ ] other / not sure

## Reproduction

**Package manager:** <!-- npm / pnpm / yarn-classic / yarn-berry, and whether a packageManager field is set -->

**Override / patch declaration** (the relevant part of `package.json`, `pnpm-workspace.yaml`, or your patch setup):

```json
// e.g. the "overrides" / "pnpm.overrides" / "resolutions" / "patchedDependencies" block
```

**`.debtctl.json`** (the entry being misreported, if relevant):

```json
// the matching overrides/patches entry, including its revisitWhen trigger
```

**Command run:**

```sh
# e.g. npx debtctl check --strict
```

## Expected vs. actual

- **Expected:** <!-- e.g. "no report" / "should flag as dueForReview" / "should detect pnpm" -->
- **Actual:** <!-- the output you got (paste it), or the absence of one -->

## Environment

- debtctl version:
- Package manager + version:
- Node version:
- OS:
