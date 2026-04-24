# Harness Worksheet

## 1. Work Identity

- slice_id: `TRK-051`
- title: `Publish Mode Switch Guard`
- branch_scope: current repo mainline slice
- official_active_loop: yes
- user_visible_change: Track can explain and block unsafe package publish mode switches

## 2. Scope

- in:
  - publish mode guard result model
  - `track package publish-guard`
  - `track package mode-guard`
  - `npm run package:publish-guard`
  - `--target publishable` switch evaluation
  - private field, publishConfig, dry-run, and readiness checks
  - docs and regression coverage
- out:
  - changing `package.json.private`
  - npm publishing
  - git tagging
  - remote registry checks

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

Publish mode should have a clear guardrail: staying private is explicit, switching to publishable is evaluated before editing the manifest, and unsafe switch conditions are blocked with actionable output.

## 5. Checkpoints

1. add publish mode guard checker
2. wire guard CLI and npm script
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
node --import tsx ./src/cli.ts package publish-guard --target publishable --json
npm run package:install-smoke
npm pack --dry-run --json
```

## 7. Exit Condition

- default guard reports `private-held`
- publishable target evaluation reports `switch-blocked` while `publishConfig` is missing
- JSON output works for automation
- the guard does not publish, tag, or mutate `package.json`

## 8. Control Surface Checks

- `TODO.md`, `NEXT_SESSION_PLAN.md`, and this worksheet point at `TRK-051`
- `.track/roadmap.yaml` and `.track/state.yaml` include matching publish guard checkpoints
- docs explain current-mode and publishable-target behavior

## 9. Risks

- making publishable mode look active while `private: true` remains in place
- duplicating readiness logic and letting the guard drift
- blocking the current private state even though it is intentionally safe

## 10. Mitigations

- derive package shape and readiness from existing package checks
- keep default guard status as `private-held`
- require explicit `--target publishable` for switch evaluation
