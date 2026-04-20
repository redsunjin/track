# Harness Worksheet

## 1. Work Identity

- slice_id: `TRK-033`
- title: `Harness Guardrails`
- branch_scope: current repo mainline slice
- official_active_loop: yes
- user_visible_change: Track can self-check harness drift across TODO, next-session planning, worksheets, and local runtime files

## 2. Scope

- in:
  - `check:harness` CLI verification
  - active-slice alignment across `TODO.md` and `NEXT_SESSION_PLAN.md`
  - active worksheet presence and runtime file parity checks
- out:
  - browser-first admin surfaces
  - vendor-specific roadmap sync
  - deep semantic linting for every historical worksheet
- assumptions:
  - the harness should fail fast when the official active loop is unclear
  - repo-local `.track` files remain the canonical runtime state

## 3. Record System

- source_of_truth_docs:
  - [TODO.md](../../TODO.md)
  - [NEXT_SESSION_PLAN.md](../../NEXT_SESSION_PLAN.md)
  - [HARNESS_MASTER_GUIDE.md](../HARNESS_MASTER_GUIDE.md)
- execution_doc:
  - this worksheet
- state_files_touched:
  - `.track/state.yaml`
  - `.track/roadmap.yaml`

## 4. Evaluators

- static_checks:
  - `npm test`
- runtime_checks:
  - `npm run check:harness`
  - `npm run status -- --no-color`
- control_surface_checks:
  - harness verification prints a clear pass/fail summary in terminal form
- regression_gate:
  - existing CLI, MCP, import, and companion flows stay green

## 5. Guardrails

- do_not_expand_into:
  - treating Pitwall as the source of truth
  - mutating `.track` state from the harness checker
  - broad markdown linting unrelated to the active loop
- escalation_conditions:
  - parity checks require schema changes in state or roadmap files
  - harness drift reveals conflicting historical worksheet semantics
- rollback_or_recovery_path:
  - keep the check read-only and limit failures to actionable repo-local mismatches

## 6. Drift / Hygiene

- likely_drift_points:
  - `TODO.md` and `NEXT_SESSION_PLAN.md` naming different active slices
  - active slice selection drifting away from worksheet ownership
  - roadmap/state counts diverging after import or manual edits
- required_doc_updates:
  - keep this worksheet, `TODO.md`, and `NEXT_SESSION_PLAN.md` aligned while `TRK-033` is active
- candidate_future_automation:
  - correlate future harness checks with slice-transition events once event history becomes canonical
