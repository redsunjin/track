# Next Session Plan

## Active Slice

- id: `TRK-056`
- title: `Release Notes Draft Generator`

## Goal

Generate a pasteable public-release note from the current package state without manually reconstructing install commands, CLI usage, verification output, or recent release slices.

## First Steps

1. add a release notes draft builder from readiness, publish guard, and RC tag dry-run state
2. wire `track package release-notes` and `track package notes-draft`
3. add `npm run package:release-notes`
4. document the command and add regression coverage

## Constraints

- do not publish to npm
- do not create or push git tags
- keep the output as a draft, not a release execution command
- keep blocked readiness visible in the rendered draft

## Verification

```bash
npm test
npm run typecheck
npm run check:harness
npm run package:readiness
npm run package:publish-guard
npm run package:rc-tag
npm run package:release-notes
node --import tsx ./src/cli.ts package notes-draft --json
git diff --check
```

## Exit Condition

- release notes draft includes package name, version, install command, CLI usage, and verification summary
- RC tag dry-run status is included without creating a tag
- blocked draft behavior is covered by tests
- docs and harness state point at `TRK-056`
