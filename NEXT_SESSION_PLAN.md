# Next Session Plan

## Active Slice

- id: `TRK-061`
- title: `Workflow Framework Integration`

## Goal

Make Track cooperate with skill, harness, SDD, TDD, and multi-agent workflow systems while keeping Track state canonical.

## First Steps

1. define the orchestration contract adapter shape for `.agent/track-bootstrap.json`
2. document how project-harness-runner should emit explicit Track adapter payloads
3. add fixtures or tests for orchestration status import if the contract changes
4. keep public npm publish parked until clean-project UAT passes

## Current Result

- `track init` now has a simple MVP with safe no-overwrite behavior
- `track bootstrap --dry-run` now drafts from README, package metadata, git context, and plan files
- Track Builder guidance now appears when no roadmap, TODO, spec, or harness evidence exists
- `track bootstrap --from harness` reads `.agent/track-bootstrap.json` adapter payloads
- `track bootstrap --from agent` detects `AGENTS.md` and `.agent` workflow files as operating evidence
- `track bootstrap --write` now writes roadmap/state files through no-overwrite safety checks
- `track bootstrap --write --force` is required to replace existing Track files
- active work moved from TRK-060 to TRK-061
- CLI sound cues are available only when explicitly enabled
- public markdown no longer exposes local workspace paths
- Team Race Mode is documented as a future roadmap concept, not a runtime feature
- public npm publish remains parked until clean-project UAT

## Constraints

- do not publish to npm during this slice
- do not make git history, harness prose, or agent logs the source of truth for future plans
- keep `.track/roadmap.yaml` and `.track/state.yaml` as the canonical runtime files
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

- orchestration adapter contract is documented and testable
- Track remains the only writer of `.track/*`
- project-harness-runner integration has a clear payload boundary
- next slice can move toward clean-project UAT or method templates
