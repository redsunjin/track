# Next Session Plan

## Active Slice

- id: `TRK-041`
- title: `Package Artifact Dry Run`

## Goal

Add a deterministic package artifact dry-run so Track can verify exports, bin targets, docs, and package allowlist coverage before any physical npm publish or workspace split.

## First Steps

1. add a `package.json.files` allowlist for the current source-level distribution boundary
2. expose `track package dry-run` and `npm run package:dry-run`
3. document the dry-run contract and keep the root package private

## Constraints

- keep local `.track` files as the source of truth
- do not publish npm packages in this slice
- keep this as a dry-run/readiness check, not a physical workspace split
- do not move runtime files
- package docs must clearly state that the root package remains private

## Verification

```bash
npm test
npm run typecheck
npm run check:harness
npm run status -- --no-color
npm run package:check
npm run package:dry-run
node --import tsx ./src/cli.ts package dry-run --json
npm pack --dry-run --json
```

## Exit Condition

- `package.json.files` covers source package boundaries, docs, VS Code extension sources, and agent packs
- `track package dry-run` reports export/bin/allowlist coverage
- dry-run checks pass with normal test and harness checks
