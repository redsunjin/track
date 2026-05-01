# Next Session Plan

## Active Slice

- id: `TRK-062`
- title: `Pre-Publish User Acceptance`

## Goal

Prove Track can be installed and used from a clean project before public npm publish is resumed.

## First Steps

1. review `docs/pre-publish-user-acceptance-report.md`
2. rerun `npm run uat:clean-project` if release-owner wants fresh evidence
3. decide go/no-go for public npm publish
4. keep public npm publish parked unless release-owner explicitly approves execution

## Current Result

- `track init` now has a simple MVP with safe no-overwrite behavior
- `track bootstrap --dry-run` now drafts from README, package metadata, git context, and plan files
- Track Builder guidance now appears when no roadmap, TODO, spec, or harness evidence exists
- `track bootstrap --from harness` reads `.agent/track-bootstrap.json` adapter payloads
- `.agent/track-bootstrap.json` projection is now extracted into `trackOrchestrationContractToIntermediateSchema`
- `examples/track-bootstrap.example.json` is the checked project-harness-runner payload fixture
- root and runtime package exports expose the orchestration contract adapter
- `docs/workflow-framework-collaboration.md` documents the Track/framework ownership boundary
- `docs/multi-agent-handoff-patterns.md` documents the handoff packet, owner transitions, and parallel work rules
- `npm run uat:clean-project` now packs Track, installs it into a clean temporary consumer, and verifies installed CLI `init/status/map/bootstrap`
- `docs/pre-publish-user-acceptance-report.md` records the clean-project UAT pass
- `track bootstrap --from agent` detects `AGENTS.md` and `.agent` workflow files as operating evidence
- `track bootstrap --write` now writes roadmap/state files through no-overwrite safety checks
- `track bootstrap --write --force` is required to replace existing Track files
- active work moved from `task-102` to `task-103`
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

- clean-project UAT script exists
- tarball install into a fresh repo passes
- `track init`, `track status`, `track map`, and bootstrap draft usage are proven outside this repo
- public npm publish remains parked until release-owner approval
