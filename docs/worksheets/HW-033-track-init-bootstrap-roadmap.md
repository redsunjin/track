# Harness Worksheet

## 1. Work Identity

- slice_id: `TRK-059`
- title: `Track Init / Bootstrap Roadmap`
- branch_scope: current repo mainline slice
- official_active_loop: yes
- user_visible_change: Track's roadmap now prioritizes project initialization and workflow-framework cooperation before public npm publish

## 2. Scope

- in:
  - `track init` product contract
  - `track bootstrap` product contract
  - workflow framework integration plan
  - `<skills-workspace>/project-harness-runner` compatibility review
  - roadmap/state extension for TRK-059 through TRK-062
  - public publish parking decision
- out:
  - implementing `track init`
  - implementing `track bootstrap`
  - npm public publish
  - creating a new Codex skill package
- assumptions:
  - npm publish readiness is useful but not sufficient for user adoption
  - Track should be the canonical state layer when cooperating with other harnesses

## 3. Record System

- source_of_truth_docs:
  - [TODO.md](../../TODO.md)
  - [NEXT_SESSION_PLAN.md](../../NEXT_SESSION_PLAN.md)
  - [docs/track-init-bootstrap-roadmap.md](../track-init-bootstrap-roadmap.md)
  - [docs/runtime-feature-matrix.md](../runtime-feature-matrix.md)
  - [docs/public-npm-release-roadmap.md](../public-npm-release-roadmap.md)
- execution_doc:
  - this worksheet
- state_files_touched:
  - `.track/roadmap.yaml`
  - `.track/state.yaml`
  - `.gitignore`

## 4. Evaluators

- static_checks:
  - `npm run check:harness`
  - `npm run typecheck`
  - `git diff --check`
- runtime_checks:
  - `node --import tsx ./src/cli.ts status --no-color`
  - `node --import tsx ./src/cli.ts map --no-color`
- control_surface_checks:
  - active slice points at `TRK-059`
  - public release execution is parked
  - roadmap/state phase and checkpoint counts remain aligned
- regression_gate:
  - Track documents why `track init` is required before public release
  - workflow integration docs keep Track state canonical

## 5. Guardrails

- do_not_expand_into:
  - actual npm publish
  - executable implementation before the product contract is recorded
  - replacing project-harness-runner or method-specific harnesses
  - making git history the source of truth for future roadmap
- escalation_conditions:
  - release owner asks to resume public publish
  - implementation needs to write into a local skills workspace
- rollback_or_recovery_path:
  - keep release readiness artifacts intact
  - revert only the roadmap extension docs/state if the product direction changes

## 6. Drift / Hygiene

- likely_drift_points:
  - release docs saying publish is active while TODO says init is active
  - roadmap/state count drift after adding phases
  - skills integration creating a second state model
- required_doc_updates:
  - TODO
  - NEXT_SESSION_PLAN
  - README
  - runtime feature matrix
  - public npm release roadmap
- candidate_future_automation:
  - `track init --dry-run`
  - `track bootstrap --dry-run`
  - clean-project user acceptance harness
