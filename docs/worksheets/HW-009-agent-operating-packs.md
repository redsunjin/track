# Harness Worksheet

## 1. Work Identity

- slice_id: `TRK-035`
- title: `Agent Operating Packs`
- branch_scope: current repo mainline slice
- official_active_loop: yes
- user_visible_change: Track gains usable operating packs for Claude Code, Codex, and Gemini CLI on top of one shared command and MCP contract

## 2. Scope

- in:
  - shared operating contract for agent clients
  - thin operating packs for Claude Code, Codex, and Gemini CLI
  - common helper scripts for context read and state update loops
  - smoke-level verification that each pack points at the same local Track runtime
- out:
  - live remote sync into external planning tools
  - browser-first dashboard work
  - client-specific forks of Track runtime logic
- assumptions:
  - each client pack should stay thin and reuse the same CLI/MCP contract
  - shared state ownership remains repo-local `.track` files

## 3. Record System

- source_of_truth_docs:
  - [TODO.md](../../TODO.md)
  - [NEXT_SESSION_PLAN.md](../../NEXT_SESSION_PLAN.md)
  - [README.md](../../README.md)
  - [plugin-architecture.md](../plugin-architecture.md)
  - [MCP_CONTRACT.md](../MCP_CONTRACT.md)
  - [agent-operating-packs.md](../agent-operating-packs.md)
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
  - `npm run companion -- --no-color`
  - `npm run pitwall -- --root /Users/Agent/ps-workspace --owners --no-color`
- control_surface_checks:
  - Claude Code, Codex, and Gemini CLI packs point at the same shared Track command/MCP vocabulary
  - pack docs stay thin and do not redefine Track runtime semantics
- regression_gate:
  - MCP and CLI outputs still agree after pack docs/helpers are added

## 5. Guardrails

- do_not_expand_into:
  - bespoke per-client state models
  - hard-coded cloud credentials or live API wiring
  - browser-first control panels
- escalation_conditions:
  - one client needs a state mutation path that the shared CLI/MCP contract cannot represent
  - pack docs require core runtime changes that would affect every surface
- rollback_or_recovery_path:
  - keep agent packs as thin wrappers over existing CLI/MCP surfaces and fall back to direct Track commands when needed

## 6. Drift / Hygiene

- likely_drift_points:
  - pack-specific docs drifting away from shared command names
  - client examples using different state mutation semantics
  - control-plane docs forgetting to close completed slices before opening a new one
- required_doc_updates:
  - keep this worksheet, `TODO.md`, `NEXT_SESSION_PLAN.md`, and shared operating-pack docs aligned while `TRK-035` is active
- candidate_future_automation:
  - pack smoke checks that validate example commands against the current CLI/MCP contract
