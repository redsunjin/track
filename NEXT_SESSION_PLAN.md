# Next Session Plan

## Active Slice

- id: `TRK-060`
- title: `Bootstrap Source Adapters`

## Goal

Implement `track bootstrap` as a draft-first path that can inspect a local repo and propose `.track/roadmap.yaml` plus `.track/state.yaml` without treating git history as the source of truth.

## First Steps

1. prepare review/write flow behind explicit `--write`
2. keep source readers producing explicit evidence and warnings
3. convert Track Builder guidance into explicit method templates after write safety is proven
4. keep public npm publish parked until clean-project UAT passes

## Current Result

- `track init` now has a simple MVP with safe no-overwrite behavior
- `track bootstrap --dry-run` now drafts from README, package metadata, git context, and plan files
- Track Builder guidance now appears when no roadmap, TODO, spec, or harness evidence exists
- `track bootstrap --from harness` reads `.agent/track-bootstrap.json` adapter payloads
- `track bootstrap --from agent` detects `AGENTS.md` and `.agent` workflow files as operating evidence
- CLI sound cues are available only when explicitly enabled
- public markdown no longer exposes local workspace paths
- Team Race Mode is documented as a future roadmap concept, not a runtime feature
- public npm publish remains parked until clean-project UAT

## Constraints

- do not publish to npm during this slice
- do not make git history the source of truth for future plans
- keep `.track/roadmap.yaml` and `.track/state.yaml` as the canonical runtime files
- bootstrap should show evidence, confidence, and warnings before writing
- missing-plan projects should be guided to GSD, SDD, TDD, or harness planning instead of fake roadmap confidence
- skill and harness integrations should provide explicit adapter input, not competing state files
- `.agent/track-bootstrap.json` is explicit adapter data; markdown under `.agent/` is evidence only

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

- harness and skill evidence can join the existing README/package/git/plan bootstrap draft
- explicit harness adapter payloads can drive the projected roadmap/state draft
- bootstrap output clearly separates evidence from inferred roadmap/state
- Track Builder produces method guidance when no plan evidence is found
- no `.track/*` files are overwritten without explicit write and force controls
- next slice can add `--write` review/no-overwrite behavior
