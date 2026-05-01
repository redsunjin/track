# Pre-Publish User Acceptance Report

## Status

- date: 2026-05-01
- result: pass
- command: `npm run uat:clean-project`
- publish action: none

## What Was Tested

The UAT script performs a clean consumer install from a local tarball:

1. builds Track runtime artifacts
2. builds the VS Code extension artifact required by the package allowlist
3. runs `npm pack` into an OS temporary directory
4. creates a throwaway consumer project
5. installs the generated tarball into that consumer
6. runs the installed `track` bin from `node_modules/.bin`

The installed CLI then verifies:

- `track init --name "Clean UAT Consumer" --template simple`
- `track status --no-color`
- `track map --no-color`
- `track bootstrap --from readme,package --dry-run --no-color`
- `track bootstrap --from harness --dry-run --json`
- repeated `track init` blocks overwrite without `--force`

## Acceptance Result

The expected success line was produced:

```text
CLEAN PROJECT UAT OK
CLI      track init/status/map/bootstrap
GUARD    init overwrite blocked without --force
```

This proves the current package can be packed, installed into a clean project, initialized, rendered, and bootstrap-drafted before npm publish.

## Remaining Gate

Public npm publish is still parked.
The next gate is release-owner go/no-go review, not automatic publish execution.

Required before publish:

- release owner reviews this report
- release owner confirms npm publish should proceed
- tag and npm publish commands are executed explicitly by the release owner
