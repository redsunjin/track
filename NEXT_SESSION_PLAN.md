# Next Session Plan

## Active Slice

- id: `TRK-043`
- title: `Build Artifact Baseline`

## Goal

Add a deterministic compiled `dist` baseline so Track can verify package artifacts through the built CLI before switching release exports.

## First Steps

1. add a root TypeScript build config that emits runtime files into `dist`
2. add package scripts and allowlist coverage for build artifacts
3. verify the built CLI can run package dry-run checks

## Constraints

- keep local `.track` files as the source of truth
- keep source-level exports in place for this slice
- do not switch `bin.track` to `dist` until built CLI checks are stable
- preserve the OpenClaw worker monitor extension subpaths already present in the worktree

## Verification

```bash
npm test
npm run typecheck
npm run check:harness
npm run build
npm run package:dry-run
npm run package:build-check
npm pack --dry-run --json
```

## Exit Condition

- `dist` is generated from `src/**/*.ts`
- declarations are emitted with the runtime JavaScript
- `package.json.files` includes `dist`
- `node dist/cli.js package dry-run` passes after build
