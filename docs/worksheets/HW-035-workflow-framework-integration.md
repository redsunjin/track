# Harness Worksheet

## 1. Work Identity

- slice_id: `TRK-061`
- title: `Workflow Framework Integration`
- branch_scope: current repo mainline slice
- official_active_loop: yes
- user_visible_change: Track can cooperate with workflow frameworks through explicit adapter payloads while keeping `.track/` as the canonical state.

## 2. Scope

- in:
  - orchestration contract adapter definition
  - project-harness-runner payload boundary
  - SDD/TDD/GSD/harness method cooperation docs
  - multi-agent handoff patterns that feed Track without replacing it
- out:
  - npm public publish
  - broad dashboard work
  - parsing `.agent` markdown prose as authoritative roadmap data
  - allowing external frameworks to write `.track/*` directly
- assumptions:
  - Track remains the single writer for `.track/roadmap.yaml` and `.track/state.yaml`
  - workflow frameworks should emit explicit adapter data
  - markdown and logs are evidence unless converted to structured payloads

## 3. Record System

- source_of_truth_docs:
  - [TODO.md](../../TODO.md)
  - [NEXT_SESSION_PLAN.md](../../NEXT_SESSION_PLAN.md)
  - [docs/track-init-bootstrap-roadmap.md](../track-init-bootstrap-roadmap.md)
  - [docs/workflow-framework-collaboration.md](../workflow-framework-collaboration.md)
  - [docs/multi-agent-handoff-patterns.md](../multi-agent-handoff-patterns.md)
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
  - `node --import tsx --test tests/orchestration-contract.test.ts tests/bootstrap.test.ts`
  - `npm run package:dry-run`
  - `node --import tsx ./src/cli.ts status --no-color`
  - `node --import tsx ./src/cli.ts map --no-color`
- control_surface_checks:
  - active slice points at `TRK-061`
  - worksheet official loop is `yes`
  - public release execution remains parked
- regression_gate:
  - Track remains the only writer of `.track/*`
  - explicit adapter payloads remain separate from fallback evidence
  - integration docs do not imply npm publish is active

## 5. Guardrails

- do_not_expand_into:
  - actual npm publish
  - replacing project-harness-runner
  - treating git history or agent logs as the future roadmap
  - accepting broad workflow sync without tests
- escalation_conditions:
  - integration needs to write outside repo-local files
  - implementation requires changing external skill code
  - release owner asks to resume public publish
- rollback_or_recovery_path:
  - keep TRK-060 bootstrap write flow intact
  - keep `.agent/track-bootstrap.json` as the explicit payload boundary

## 6. Drift / Hygiene

- likely_drift_points:
  - TODO/NEXT state pointing at different active slices
  - docs suggesting project-harness-runner owns Track state
  - payload schema diverging from the intermediate adapter schema
- required_doc_updates:
  - README
  - docs/track-init-bootstrap-roadmap.md
  - docs/runtime-feature-matrix.md
- candidate_future_automation:
  - orchestration contract fixture
  - project-harness-runner payload fixture
  - clean-project UAT with bootstrap write

## 7. Implementation Notes

- `src/orchestration-contract.ts` owns the explicit `.agent/track-bootstrap.json` to intermediate schema adapter.
- `src/bootstrap.ts` treats `.agent/track-bootstrap.json` as structured contract input and keeps `.agent` markdown as fallback evidence only.
- `examples/track-bootstrap.example.json` is the canonical project-harness-runner payload fixture.
- `tests/orchestration-contract.test.ts` covers fixture projection, default plan generation, validation command de-dupe, and invalid root rejection.
- `docs/workflow-framework-collaboration.md` records the ownership boundary for project-harness-runner, SDD, TDD, GSD, harnesses, and skill workspaces.
- `docs/multi-agent-handoff-patterns.md` records the handoff packet, owner transitions, parallel work split, and Pitwall/OpenClaw monitor boundary.
