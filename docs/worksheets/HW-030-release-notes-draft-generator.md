# Harness Worksheet

## 1. Work Identity

- slice_id: `TRK-056`
- title: `Release Notes Draft Generator`
- branch_scope: current repo mainline slice
- official_active_loop: yes
- user_visible_change: Track can generate a public npm release-notes draft from current package readiness state

## 2. Scope

- in:
  - release notes draft builder
  - `track package release-notes`
  - `track package notes-draft` alias
  - `npm run package:release-notes`
  - Markdown output with install, CLI, import, verification, and RC tag sections
  - blocked draft behavior when RC tag readiness is blocked
- out:
  - npm publishing
  - npm publish dry-run against the registry
  - git tag creation or push
  - editing a hosted GitHub release
- assumptions:
  - release owner will review and edit the draft before publishing
  - the draft should make blocked readiness visible instead of hiding it

## 3. Record System

- source_of_truth_docs:
  - [TODO.md](../../TODO.md)
  - [NEXT_SESSION_PLAN.md](../../NEXT_SESSION_PLAN.md)
  - [docs/package-layout.md](../package-layout.md)
  - [docs/public-npm-release-roadmap.md](../public-npm-release-roadmap.md)
- execution_doc:
  - this worksheet
- state_files_touched:
  - `.track/state.yaml`
  - `src/package-layout.ts`
  - `src/cli.ts`
  - `package.json`

## 4. Evaluators

- static_checks:
  - `npm test`
  - `npm run typecheck`
  - `npm run check:harness`
- runtime_checks:
  - `npm run package:readiness`
  - `npm run package:publish-guard`
  - `npm run package:rc-tag`
  - `npm run package:release-notes`
  - `node --import tsx ./src/cli.ts package notes-draft --json`
  - `git diff --check`
- control_surface_checks:
  - active slice points at `TRK-056`
  - next queued implementation slice is `TRK-057`
- regression_gate:
  - draft includes install command, CLI usage, verification summary, and recent release slices
  - blocked RC readiness produces `release-notes-blocked`

## 5. Guardrails

- do_not_expand_into:
  - actual npm publish
  - registry publish dry-run
  - git tag creation
  - GitHub release creation
- escalation_conditions:
  - release owner asks to run npm auth or publish dry-run
  - release owner asks to create or push an RC tag
- rollback_or_recovery_path:
  - keep the draft command read-only and remove only the npm script if release flow changes

## 6. Drift / Hygiene

- likely_drift_points:
  - draft content drifting from package readiness output
  - docs listing release commands but not the draft path
  - TODO active slice not matching the worksheet
- required_doc_updates:
  - TODO
  - NEXT_SESSION_PLAN
  - package layout docs
  - public npm release roadmap
- candidate_future_automation:
  - npm authentication preflight
  - publish dry-run summary capture for the release owner
