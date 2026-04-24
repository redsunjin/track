# Next Session Plan

## Active Slice

- id: `TRK-052`
- title: `Release Candidate Tag Dry Run`

## Goal

Add a safe release-candidate tag dry-run that derives the next RC tag, checks package readiness and publish guard state, detects local tag conflicts, and prints the exact git commands without creating or pushing a tag.

## First Steps

1. add an RC tag dry-run builder on top of package readiness and publish guard results
2. wire `track package rc-tag`, `track package tag-dry-run`, and `npm run package:rc-tag`
3. document tag derivation, safety behavior, and regression coverage

## Constraints

- do not create a git tag
- do not push a git tag
- do not publish to npm
- do not mutate `package.json`
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
npm run package:rc-tag
node --import tsx ./src/cli.ts package tag-dry-run --rc 1 --json
npm run package:install-smoke
npm pack --dry-run --json
```

## Exit Condition

- default RC tag dry-run reports `v0.1.0-rc.0`
- custom RC candidate controls work through `--rc` and `--tag`
- existing tag conflicts block the dry-run
- rendered output includes only manual git commands and does not execute them
