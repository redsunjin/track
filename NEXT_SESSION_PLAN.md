# Next Session Plan

## Active Slice

- id: `TRK-046`
- title: `Publish/Install Smoke`

## Goal

Verify Track can be packed, installed into a separate consumer project, imported through public subpaths, and run through the installed CLI without publishing.

## First Steps

1. add a package install smoke script
2. pack Track into a temporary tarball and install it in a throwaway consumer
3. verify public imports and installed CLI execution

## Constraints

- keep local `.track` files as the source of truth
- do not publish to npm
- keep root package `private: true`
- keep the consumer project temporary
- verify installed package behavior, not just repo-local `dist`

## Verification

```bash
npm test
npm run typecheck
npm run check:harness
npm run package:dry-run
npm run package:build-check
npm run package:install-smoke
npm pack --dry-run --json
```

## Exit Condition

- a temporary tarball installs into a clean consumer project
- `import("track")`, `track/core`, `track/cli`, and OpenClaw adapter imports work from the consumer
- installed `track` bin runs `pitwall --openclaw --no-color`
- smoke command leaves no repo-local tarball behind
