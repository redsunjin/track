# Harness Worksheet

## 1. Work Identity

- slice_id: `TRK-032`
- title: `Generic Plan Import Adapter`
- branch_scope: current repo mainline slice
- official_active_loop: yes
- user_visible_change: Track can ingest a generic external plan file and project it into local `.track` runtime files

## 2. Scope

- in:
  - external plan schema
  - projection into Track roadmap/state
  - CLI import surface
  - example plan and persistence coverage
- out:
  - live Notion auth
  - Jira/GitHub/Linear adapters
  - background sync and webhooks
- assumptions:
  - the local `.track` runtime stays canonical even when external plans are imported
  - vendor-specific adapters should sit on top of a generic projection core

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
  - `node --import tsx ./src/cli.ts import --source examples/external-plan.example.yaml --dry-run --json`
  - `npm run status -- --no-color`
  - `npm run pitwall -- --root /path/to/workspace --owners --no-color`
- control_surface_checks:
  - imported state produces the same summary vocabulary as native Track state
- regression_gate:
  - existing CLI, MCP, and VS Code companion tests still pass

## 5. Guardrails

- do_not_expand_into:
  - vendor-specific auth flows inside the core projection layer
  - replacing `.track` as the source of truth
  - hidden background sync behavior
- escalation_conditions:
  - a vendor adapter requires network credentials or webhook handling
  - projection rules start mutating runtime history unexpectedly
- rollback_or_recovery_path:
  - keep import as an explicit CLI action and preserve dry-run mode

## 6. Drift / Hygiene

- likely_drift_points:
  - imported plan schemas drifting from Track roadmap/state shape
  - tests relying on repo-local state instead of adapter fixtures
  - docs overclaiming vendor integrations before they exist
- required_doc_updates:
  - move `TRK-032` out of active when finished
- candidate_future_automation:
  - fixture-based contract tests for vendor adapters on top of the generic import core
