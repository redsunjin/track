# Harness Worksheet

## 1. Work Identity

- slice_id: `TRK-060`
- title: `Bootstrap Source Adapters`
- branch_scope: current repo mainline slice
- official_active_loop: yes
- user_visible_change: Track can begin drafting roadmap/state from local project evidence instead of requiring hand-authored `.track/` files

## 2. Scope

- in:
  - README evidence reader
  - package metadata reader
  - git context reader
  - plan-file evidence reader
  - Track Builder missing-plan guidance
  - harness and agent workflow evidence reader
  - `.agent/track-bootstrap.json` adapter payload reader
  - `track bootstrap --dry-run` draft renderer
  - `track bootstrap --write` no-overwrite flow
  - bootstrap evidence and warning model
  - no-overwrite write policy design
- out:
  - npm public publish
  - Team Race Mode runtime implementation
  - replacing `track init`
  - treating git history as authoritative roadmap state
- assumptions:
  - bootstrap should propose, not silently decide
  - a weak signal should become a warning rather than a fake plan
  - no planning signal should produce method guidance, not roadmap confidence
  - `.agent/track-bootstrap.json` is explicit adapter data
  - markdown under `.agent/` is evidence only unless a structured payload exists
  - write behavior must stay explicit and no-overwrite by default

## 3. Record System

- source_of_truth_docs:
  - [TODO.md](../../TODO.md)
  - [NEXT_SESSION_PLAN.md](../../NEXT_SESSION_PLAN.md)
  - [docs/track-init-bootstrap-roadmap.md](../track-init-bootstrap-roadmap.md)
  - [docs/cli-sound-design.md](../cli-sound-design.md)
  - [docs/team-race-mode.md](../team-race-mode.md)
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
  - `node --import tsx ./src/cli.ts status --no-color`
  - `node --import tsx ./src/cli.ts map --no-color`
- control_surface_checks:
  - active slice points at `TRK-060`
  - roadmap/state phase and checkpoint counts remain aligned
  - public release execution remains parked
- regression_gate:
  - bootstrap does not overwrite `.track/*` by default
  - bootstrap separates evidence from inferred roadmap/state
  - bootstrap guides GSD/SDD/TDD/harness choices when planning evidence is missing
  - harness payload projection does not parse prose as source of truth
  - `track bootstrap --write` refuses existing `.track/*` files without `--force`
  - local absolute paths stay out of public markdown

## 5. Guardrails

- do_not_expand_into:
  - actual npm publish
  - race-mode implementation
  - broad project analysis that invents future commitments
  - parsing prose as the source of truth when explicit adapter data exists
- escalation_conditions:
  - bootstrap needs to read outside the current repo
  - implementation needs to write outside `.track/`
  - release owner asks to resume public publish
- rollback_or_recovery_path:
  - keep `track init` MVP intact
  - revert bootstrap source readers independently if inference quality is poor

## 6. Drift / Hygiene

- likely_drift_points:
  - TODO/NEXT pointing at TRK-060 while state remains on TRK-059
  - bootstrap docs promising write behavior before no-overwrite tests exist
  - adapter evidence schema diverging from external-plan import schema
  - Track Builder guidance becoming a second state model instead of a planning UX
  - harness file detection accidentally becoming an implicit roadmap generator
  - `--write` accidentally replacing existing state without explicit `--force`
- required_doc_updates:
  - README
  - docs/track-init-bootstrap-roadmap.md
  - docs/runtime-feature-matrix.md
- candidate_future_automation:
  - `track bootstrap --dry-run`
  - clean-repo bootstrap fixture
  - harness bridge fixture
  - Track Builder method template fixture
