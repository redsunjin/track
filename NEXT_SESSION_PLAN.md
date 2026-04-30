# Next Session Plan

## Active Slice

- id: `TRK-060`
- title: `Bootstrap Source Adapters`

## Goal

Implement `track bootstrap` as a draft-first path that can inspect a local repo and propose `.track/roadmap.yaml` plus `.track/state.yaml` without treating git history as the source of truth.

## First Steps

1. define the bootstrap evidence model for README, package metadata, git context, and harness files
2. add source readers that produce explicit evidence and warnings
3. project the evidence into the existing intermediate roadmap schema
4. render a reviewable `track bootstrap --dry-run` draft
5. keep write behavior blocked behind explicit `--write` and no-overwrite defaults

## Current Result

- `track init` now has a simple MVP with safe no-overwrite behavior
- CLI sound cues are available only when explicitly enabled
- public markdown no longer exposes local workspace paths
- Team Race Mode is documented as a future roadmap concept, not a runtime feature
- public npm publish remains parked until clean-project UAT

## Constraints

- do not publish to npm during this slice
- do not make git history the source of truth for future plans
- keep `.track/roadmap.yaml` and `.track/state.yaml` as the canonical runtime files
- bootstrap should show evidence, confidence, and warnings before writing
- skill and harness integrations should provide explicit adapter input, not competing state files

## Verification

```bash
npm test
npm run typecheck
npm run check:harness
npm run package:dry-run
node --import tsx ./src/cli.ts status --no-color
node --import tsx ./src/cli.ts map --no-color
git diff --check
```

## Exit Condition

- `track bootstrap --dry-run` can produce a reviewable draft from README/package/git evidence
- bootstrap output clearly separates evidence from inferred roadmap/state
- no `.track/*` files are overwritten without explicit write and force controls
- next slice can add harness/skill bridge inputs
