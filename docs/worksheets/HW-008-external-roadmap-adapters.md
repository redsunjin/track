# Harness Worksheet

## 1. Work Identity

- slice_id: `TRK-030`
- title: `External Roadmap Adapters`
- branch_scope: current repo mainline slice
- official_active_loop: yes
- user_visible_change: Track imports external plans through an adapter-backed normalization layer that can grow into source-specific providers without changing the local `.track` runtime model

## 2. Scope

- in:
  - reusable intermediate roadmap schema for external sources
  - adapter-backed file baseline for `track import`
  - contract docs and fixture-backed tests for the adapter bridge
- out:
  - live vendor auth flows
  - remote write-back into Notion, GitHub, Jira, or Linear
  - replacing repo-local `.track` files as the source of truth
- assumptions:
  - provider-specific adapters should normalize into one shared intermediate schema before Track projection
  - the existing generic external-plan import surface should remain stable while the adapter layer grows underneath it

## 3. Record System

- source_of_truth_docs:
  - [TODO.md](../../TODO.md)
  - [NEXT_SESSION_PLAN.md](../../NEXT_SESSION_PLAN.md)
  - [HARNESS_MASTER_GUIDE.md](../HARNESS_MASTER_GUIDE.md)
  - [external-adapters.md](../external-adapters.md)
  - [README.md](../../README.md)
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
  - `npm run import -- --source examples/external-plan.example.yaml --dry-run --json`
  - `npm run status -- --no-color`
- control_surface_checks:
  - `track import` keeps the same CLI shape while using the adapter-backed file baseline internally
  - adapter docs clearly describe the shared intermediate schema and current file-backed baseline
- regression_gate:
  - existing status, pitwall, and companion surfaces keep reading the same local `.track` model after import changes

## 5. Guardrails

- do_not_expand_into:
  - direct vendor-specific state models inside core Track runtime files
  - network-dependent adapters without a stable local contract first
  - browser-first adapter management UI
- escalation_conditions:
  - source-specific adapters require secrets, auth, or remote API calls
  - the intermediate schema cannot preserve current external-plan semantics without breaking imports
- rollback_or_recovery_path:
  - keep the file-backed adapter baseline working as the fallback path for `track import`

## 6. Drift / Hygiene

- likely_drift_points:
  - docs still describing generic import without the new adapter bridge
  - control-plane files still pointing at the completed retro telemetry slice
  - provider-specific adapter ideas expanding before the baseline contract is stable
- required_doc_updates:
  - keep this worksheet, `TODO.md`, `NEXT_SESSION_PLAN.md`, and `.track` state aligned while `TRK-030` is active
- candidate_future_automation:
  - fixture-driven adapter contract tests for each provider-specific source
