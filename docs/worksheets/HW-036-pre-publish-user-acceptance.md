# Harness Worksheet

## 1. Work Identity

- slice_id: `TRK-062`
- title: `Pre-Publish User Acceptance`
- branch_scope: current repo mainline slice
- official_active_loop: yes
- user_visible_change: Track can be tested from a clean project before public npm publish.

## 2. Scope

- in:
  - clean-project UAT script
  - tarball install into a temporary consumer repo
  - `track init`, `track status`, `track map`, and bootstrap draft checks from outside this repo
  - user-facing evidence for release-owner go/no-go
- out:
  - actual `npm publish`
  - release tag creation
  - changing the package public name
  - broad UI or dashboard work
- assumptions:
  - public npm publish remains parked
  - tarball install is enough for pre-publish dogfooding
  - UAT should run without relying on this repo's `.track/*` files

## 3. Record System

- source_of_truth_docs:
  - [TODO.md](../../TODO.md)
  - [NEXT_SESSION_PLAN.md](../../NEXT_SESSION_PLAN.md)
  - [docs/track-init-bootstrap-roadmap.md](../track-init-bootstrap-roadmap.md)
  - [docs/public-npm-release-roadmap.md](../public-npm-release-roadmap.md)
  - [docs/pre-publish-user-acceptance-report.md](../pre-publish-user-acceptance-report.md)
- execution_doc:
  - this worksheet
- state_files_touched:
  - `.track/state.yaml`

## 4. Evaluators

- static_checks:
  - `npm run check:harness`
  - `npm run typecheck`
  - `git diff --check`
- runtime_checks:
  - `npm test`
  - `npm run package:dry-run`
  - clean-project UAT script
  - `node --import tsx ./src/cli.ts status --no-color`
  - `node --import tsx ./src/cli.ts map --no-color`
- control_surface_checks:
  - active slice points at `TRK-062`
  - worksheet official loop is `yes`
  - public release execution remains parked
- regression_gate:
  - UAT uses a throwaway repo, not the Track repo itself
  - UAT proves installed CLI behavior, not only source-tree behavior
  - no npm publish command is run

## 5. Guardrails

- do_not_expand_into:
  - actual npm publish
  - release tagging
  - changing package ownership or package name
  - bypassing tarball install with source-tree-only tests
- escalation_conditions:
  - npm registry write is requested
  - UAT needs external network access beyond local package install
  - release owner asks to resume public publish
- rollback_or_recovery_path:
  - keep TRK-061 framework integration changes intact
  - keep public publish parked if UAT fails
  - preserve generated UAT evidence as local artifacts only unless intentionally committed

## 6. Drift / Hygiene

- likely_drift_points:
  - TODO/NEXT state pointing at a release slice while UAT is still active
  - package dry-run passing but clean-project installed CLI failing
  - UAT accidentally depending on repo-local files
- required_doc_updates:
  - README
  - docs/public-npm-release-roadmap.md
  - docs/track-init-bootstrap-roadmap.md
- candidate_future_automation:
  - add UAT to package readiness gates after it is stable
  - capture release-owner go/no-go evidence in a generated report

## 7. Implementation Notes

- `scripts/clean-project-uat.mjs` packs Track, installs the tarball into a throwaway consumer, and runs the installed CLI through init/status/map/bootstrap checks.
- `npm run uat:clean-project` is the repeatable UAT entry point.
- `docs/pre-publish-user-acceptance-report.md` records the clean-project pass without committing local temporary paths.
