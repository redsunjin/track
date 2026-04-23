# Next Session Plan

## Active Slice

- id: `TRK-048`
- title: `Publish Readiness Gate`

## Goal

Add a single executable gate that tells whether Track is ready for a release handoff before a physical npm pack or future publish attempt.

## First Steps

1. add a package readiness checker over the existing package dry-run
2. wire `track package readiness` and `track package gate`
3. document the gate and update the release verification path

## Constraints

- do not publish to npm
- keep root package `private: true`
- keep the gate deterministic and fast
- report private-root mode explicitly instead of hiding it
- reuse package dry-run results instead of duplicating manifest checks

## Verification

```bash
npm test
npm run typecheck
npm run check:harness
npm run package:check
npm run package:dry-run
npm run package:readiness
npm run package:install-smoke
npm pack --dry-run --json
```

## Exit Condition

- `track package readiness` reports `PACKAGE READINESS GATE OK`
- the gate lists required verification commands
- the gate reports `private-root` mode
- JSON output is available for automation
