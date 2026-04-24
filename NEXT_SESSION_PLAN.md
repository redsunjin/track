# Next Session Plan

## Active Slice

- id: `TRK-051`
- title: `Publish Mode Switch Guard`

## Goal

Add a deterministic guard that keeps the current private package state explicit and blocks an accidental publishable-mode switch until the manifest and package readiness signals are safe.

## First Steps

1. add a publish mode guard on top of package readiness and dry-run state
2. wire `track package publish-guard`, `track package mode-guard`, and `npm run package:publish-guard`
3. document private-root and publishable target behavior with regression coverage

## Constraints

- do not change `package.json.private`
- do not publish, tag, or push release artifacts
- keep the default command safe for the current `private-root` state
- require an explicit `--target publishable` check before evaluating a publish switch
- keep JSON output available for automation

## Verification

```bash
npm test
npm run typecheck
npm run check:harness
npm run package:check
npm run package:dry-run
npm run package:handoff
npm run package:readiness
npm run package:publish-guard
node --import tsx ./src/cli.ts package publish-guard --target publishable --json
npm run package:install-smoke
npm pack --dry-run --json
```

## Exit Condition

- default guard reports the current `private-held` state
- publishable target evaluation blocks when explicit publish configuration is missing
- package readiness and dry-run results are reused rather than duplicated
- docs explain that the guard does not publish or mutate the manifest
