# Harness Worksheet

## 1. Work Identity

- slice_id: `TRK-052`
- title: `Release Candidate Tag Dry Run`
- branch_scope: current repo mainline slice
- official_active_loop: yes
- user_visible_change: Track can prepare release-candidate tag commands without creating a tag

## 2. Scope

- in:
  - RC tag dry-run result model
  - default `v<version>-rc.0` candidate derivation
  - `--rc` and `--tag` candidate controls
  - local git tag conflict checks
  - `track package rc-tag`
  - `track package tag-dry-run`
  - `npm run package:rc-tag`
  - docs and regression coverage
- out:
  - creating git tags
  - pushing git tags
  - npm publishing
  - mutating `package.json`

## 3. Record System

- source_of_truth_docs:
  - [TODO.md](../../TODO.md)
  - [NEXT_SESSION_PLAN.md](../../NEXT_SESSION_PLAN.md)
  - [README.md](../../README.md)
  - [docs/package-layout.md](../package-layout.md)
- execution_doc:
  - this worksheet
- state_files_touched:
  - `.track/state.yaml`
  - `.track/roadmap.yaml`

## 4. Outcome

Release-candidate tagging should be explicit and reviewable: Track derives the tag, verifies readiness and publish-mode safety, checks local tag conflicts, and prints commands without executing them.

## 5. Checkpoints

1. add RC tag dry-run builder
2. wire RC tag CLI and npm script
3. update docs, harness state, and regression coverage

## 6. Verification

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

## 7. Exit Condition

- default candidate is `v0.1.0-rc.0`
- dry-run output includes manual tag and push commands
- existing local tag conflicts block the dry-run
- no tag is created or pushed by Track

## 8. Control Surface Checks

- `TODO.md`, `NEXT_SESSION_PLAN.md`, and this worksheet point at `TRK-052`
- `.track/roadmap.yaml` and `.track/state.yaml` include matching RC tag dry-run checkpoints
- docs state that the command is non-mutating

## 9. Risks

- accidentally creating or pushing a tag
- preparing an RC tag while package readiness is blocked
- ignoring an existing local tag

## 10. Mitigations

- render commands only
- derive status from package readiness and publish guard
- scan local git tags before reporting ready
