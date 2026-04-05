# Harness Worksheet

## 1. Work Identity

- slice_id: `TRK-020`
- title: `MCP Write Surface`
- branch_scope: current repo mainline slice
- official_active_loop: no
- user_visible_change: external agent clients can mutate Track state through MCP instead of shelling out to CLI commands

## 2. Scope

- in:
  - MCP write tool contract
  - handlers that reuse `mutation.ts`
  - event append preservation
  - tests for task and checkpoint mutations through MCP
- out:
  - external roadmap adapters
  - VS Code integration
  - browser work
- assumptions:
  - existing CLI mutation logic is stable enough to wrap
  - read-only MCP surface remains unchanged

## 3. Record System

- source_of_truth_docs:
  - [TODO.md](../../TODO.md)
  - [NEXT_SESSION_PLAN.md](../../NEXT_SESSION_PLAN.md)
  - [MCP_CONTRACT.md](../MCP_CONTRACT.md)
- execution_doc:
  - this worksheet
- state_files_touched:
  - `.track/state.yaml`
  - `.track/events.ndjson`

## 4. Evaluators

- static_checks:
  - `npm test`
- runtime_checks:
  - `npm run mcp:smoke -- --root /Users/Agent/ps-workspace`
  - `npm run status`
  - `npm run pitwall -- --root /Users/Agent/ps-workspace`
- control_surface_checks:
  - MCP write tools produce the same state transitions as CLI mutations
- regression_gate:
  - read-side MCP tools still work

## 5. Guardrails

- do_not_expand_into:
  - external planning adapters
  - VS Code-specific work
  - browser surfaces
- escalation_conditions:
  - MCP write contract forces state-schema changes
  - event log append logic diverges between CLI and MCP
- rollback_or_recovery_path:
  - keep transport thin and reuse mutation core

## 6. Drift / Hygiene

- likely_drift_points:
  - CLI and MCP mutation semantics diverge
  - event log append path is skipped in one code path
  - docs overclaim write support before tests prove it
- required_doc_updates:
  - update `MCP_CONTRACT.md` once write tools land
  - move `TRK-020` from active when finished
- candidate_future_automation:
  - harness check ensuring the active worksheet matches the active TODO slice
