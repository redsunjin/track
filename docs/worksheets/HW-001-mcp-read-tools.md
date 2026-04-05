# Harness Worksheet

## 1. Work Identity

- slice_id: `TRK-017`
- title: `MCP Read Surface`
- branch_scope: current repo mainline slice
- official_active_loop: yes
- user_visible_change: external agent clients can read Track and Pitwall state through MCP

## 2. Scope

- in:
  - MCP server entrypoint
  - `get_track_status`
  - `get_track_map`
  - `get_pitwall_overview`
  - tests for repo-local and workspace-level reads
- out:
  - write-side MCP tools
  - external roadmap adapters
  - VS Code-specific integrations
- assumptions:
  - local `.track` files remain the source of truth
  - current runtime functions are stable enough to wrap

## 3. Record System

- source_of_truth_docs:
  - [TODO.md](../../TODO.md)
  - [NEXT_SESSION_PLAN.md](../../NEXT_SESSION_PLAN.md)
  - [plugin-architecture.md](../plugin-architecture.md)
  - [runtime-feature-matrix.md](../runtime-feature-matrix.md)
- execution_doc:
  - this worksheet
- state_files_touched:
  - `.track/state.yaml` only for runtime verification if needed

## 4. Evaluators

- static_checks:
  - `npm test`
- runtime_checks:
  - `npm run status`
  - `npm run map`
  - `npm run pitwall -- --root /Users/Agent/ps-workspace`
- control_surface_checks:
  - MCP read tools return structured output matching current CLI state
- regression_gate:
  - existing CLI flows remain intact

## 5. Guardrails

- do_not_expand_into:
  - write mutations over MCP
  - Notion or external sync
  - browser dashboard work
- escalation_conditions:
  - MCP transport choice forces schema changes
  - current Track runtime cannot be wrapped without duplicating logic
- rollback_or_recovery_path:
  - keep MCP as a thin adapter over current runtime functions

## 6. Drift / Hygiene

- likely_drift_points:
  - MCP output diverges from CLI summary
  - workspace root handling differs between CLI and MCP
  - roadmap/state loading logic gets duplicated
- required_doc_updates:
  - update `TODO.md` and `NEXT_SESSION_PLAN.md` if the active slice changes
  - update `plugin-architecture.md` once the MCP contract is fixed
- candidate_future_automation:
  - harness check that active worksheet exists for the active TODO slice
