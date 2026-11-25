# Security Policy

## Supported versions

`debtctl` is pre-1.0. Only the latest published release receives security fixes.

## Reporting a vulnerability

Please **do not** open a public issue for security problems.

Report privately through GitHub:
[Report a vulnerability](https://github.com/KMavr/debtctl/security/advisories/new).

Include the affected version, what you did, and what you expected versus what happened. You can
expect an acknowledgement within a few days. Confirmed issues are fixed in a new release and
credited in the advisory unless you prefer otherwise.

## Scope

`debtctl` only reads `package.json`, `pnpm-workspace.yaml`, patch files and `.debtctl.json`, and writes
`.debtctl.json`. It does not run installs, execute project code, or contact a registry. Reports about
path handling, unsafe parsing of those files, or the release pipeline are in scope.

Every release is published from CI with
[npm provenance](https://docs.npmjs.com/generating-provenance-statements) attestations.
