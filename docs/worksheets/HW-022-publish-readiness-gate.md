# Harness Worksheet

## 1. Work Identity

- slice_id: `TRK-048`
- title: `Publish Readiness Gate`
- branch_scope: current repo mainline slice
- official_active_loop: yes
- user_visible_change: Track has one executable release-readiness gate before pack or publish handoff

## 2. Scope

- in:
  - package readiness checker
  - `track package readiness`
  - `track package gate`
  - `npm run package:readiness`
  - required release-script checks
  - private-root mode reporting
  - release docs and regression coverage
- out:
  - publishing to npm
  - changing package visibility
  - executing the full test suite from inside the readiness checker
  - replacing physical `npm pack --dry-run --json`

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

Release handoff should have a single command that reports whether package manifest, scripts, exports, bin, docs, and private-root mode are ready.

## 5. Checkpoints

1. add readiness checker and renderer
2. wire package readiness CLI and npm script
3. update release docs and harness state

## 6. Verification

```bash
npm test
npm run typecheck
npm run check:harness
npm run package:check
npm run package:dry-run
npm run package:readiness
npm run package:install-smoke
npm pack --dry-run --json
```

## 7. Exit Condition

- `track package readiness` reports `PACKAGE READINESS GATE OK`
- `track package gate` is an alias
- JSON output works for automation
- the gate reports `private-root` mode without treating it as an error

## 8. Control Surface Checks

- `TODO.md`, `NEXT_SESSION_PLAN.md`, and this worksheet point at `TRK-048`
- `.track/roadmap.yaml` and `.track/state.yaml` include matching readiness checkpoints
- docs distinguish release readiness from npm publishing

## 9. Risks

- treating a private root package as publishable by accident
- duplicating package dry-run rules and allowing drift
- making the readiness command too slow for local iteration

## 10. Mitigations

- report `private-root` explicitly
- reuse `checkTrackPackageDryRun`
- check command availability rather than executing the full suite inside the gate
