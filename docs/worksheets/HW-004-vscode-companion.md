# Harness Worksheet

## 1. Work Identity

- slice_id: `TRK-031`
- title: `VS Code Companion`
- branch_scope: current repo mainline slice
- official_active_loop: yes
- user_visible_change: Track gains the first IDE-side companion surface rather than staying terminal-only

## 2. Scope

- in:
  - VS Code extension scaffold
  - command registration
  - minimal companion panel shell
  - read path from local `.track/state.yaml`
- out:
  - browser work
  - external roadmap adapters
  - full panel polish
- assumptions:
  - the shared summary/runtime layer is stable enough to reuse in an IDE shell
  - terminal mode remains the primary fallback

## 3. Record System

- source_of_truth_docs:
  - [TODO.md](../../TODO.md)
  - [NEXT_SESSION_PLAN.md](../../NEXT_SESSION_PLAN.md)
  - [plugin-architecture.md](../plugin-architecture.md)
- execution_doc:
  - this worksheet
- state_files_touched:
  - `.track/state.yaml`
  - `.track/roadmap.yaml`

## 4. Evaluators

- static_checks:
  - `npm test`
- runtime_checks:
  - `npm run status -- --no-color`
  - `npm run lab -- --no-color`
  - `npm run pitwall -- --root /Users/Agent/ps-workspace --owners --no-color`
- control_surface_checks:
  - the IDE companion renders the same current checkpoint, percent, owner, and next action as terminal Track
- regression_gate:
  - terminal Track and Pitwall surfaces still behave unchanged

## 5. Guardrails

- do_not_expand_into:
  - browser-first dashboards
  - external planning adapters
  - custom state models for the IDE surface
- escalation_conditions:
  - extension scaffold requires a new package layout
  - IDE-side rendering forces shared runtime refactors
- rollback_or_recovery_path:
  - keep the IDE shell thin and reuse summary logic

## 6. Drift / Hygiene

- likely_drift_points:
  - VS Code panel copies logic instead of consuming shared summary data
  - companion naming diverges from terminal `Track`
  - docs overclaim real IDE integration before the scaffold exists
- required_doc_updates:
  - move `TRK-031` out of active when finished
- candidate_future_automation:
  - smoke check for extension scaffold files
