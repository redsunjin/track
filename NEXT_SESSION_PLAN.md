# Next Session Plan

## Active Slice

- id: `TRK-059`
- title: `Track Init / Bootstrap Roadmap`

## Goal

Turn Track from a tool that only works in already-prepared repos into a project-progress framework that can initialize `.track/roadmap.yaml` and `.track/state.yaml`, then cooperate with skill, harness, SDD, TDD, and multi-agent workflows.

## First Steps

1. lock the `track init` command contract and template outputs
2. document how `track bootstrap` drafts roadmap/state from git, README, package metadata, and harness files
3. define the integration boundary with `/Users/Agent/ps-workspace/skills/project-harness-runner`
4. add roadmap phases for init, bootstrap, workflow integration, and pre-publish UAT
5. keep public npm publish parked until clean-project UAT passes

## Current Result

- public npm publish is ready but intentionally parked
- `TRK-059` through `TRK-062` now define the product direction before publish
- `track init` is the next required capability
- Track should act as the canonical roadmap/state layer, not replace git or method-specific harnesses

## Constraints

- do not publish to npm during this slice
- do not make git history the source of truth for future plans
- keep `.track/roadmap.yaml` and `.track/state.yaml` as the canonical runtime files
- skill and harness integrations should generate or update Track inputs, not create competing state models

## Verification

```bash
npm test
npm run typecheck
npm run check:harness
node --import tsx ./src/cli.ts status --no-color
node --import tsx ./src/cli.ts map --no-color
git diff --check
```

## Exit Condition

- docs define `track init`, `track bootstrap`, and framework cooperation
- `.track/roadmap.yaml` and `.track/state.yaml` include the new post-release-readiness phases
- public npm publish remains parked until UAT
- next implementation slice can start building `track init`
