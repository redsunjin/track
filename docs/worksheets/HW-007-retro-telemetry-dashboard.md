# Harness Worksheet

## 1. Work Identity

- slice_id: `TRK-034`
- title: `Retro Telemetry Dashboard Pass`
- branch_scope: current repo mainline slice
- official_active_loop: yes
- user_visible_change: Track gets a durable retro telemetry dashboard plan and an explicit next checkpoint for companion-first UI refinement

## 2. Scope

- in:
  - current UI document inventory and gap analysis
  - retro telemetry dashboard plan
  - companion-first implementation target for the next visual checkpoint
  - alignment of `TODO.md`, `NEXT_SESSION_PLAN.md`, and `.track` state with the new active UI slice
- out:
  - browser-first dashboard work
  - replacing repo-local `.track` state as the source of truth
  - mascot-heavy decorative companion experiments
- assumptions:
  - the current race-telemetry language is the base, not something to discard
  - the VS Code companion is the highest-leverage place to evolve the visual system first

## 3. Record System

- source_of_truth_docs:
  - [TODO.md](../../TODO.md)
  - [NEXT_SESSION_PLAN.md](../../NEXT_SESSION_PLAN.md)
  - [visual-direction.md](../visual-direction.md)
  - [runtime-feature-matrix.md](../runtime-feature-matrix.md)
  - [pitwall-concept.md](../pitwall-concept.md)
  - [retro-telemetry-dashboard-plan.md](../retro-telemetry-dashboard-plan.md)
- execution_doc:
  - this worksheet
- state_files_touched:
  - `.track/state.yaml`
  - `.track/roadmap.yaml`

## 4. Evaluators

- static_checks:
  - `npm test`
  - `npm run vscode:build`
  - `npm run vscode:check`
- runtime_checks:
  - `npm run check:harness`
  - `npm run status -- --no-color`
  - `npm run companion -- --no-color`
  - `npm run pitwall -- --root /path/to/workspace --no-color`
- control_surface_checks:
  - flag, checkpoint, owner, and next action stay the dominant signals
  - retro dashboard cues do not weaken plain-text readability or shared vocabulary
- regression_gate:
  - terminal and companion surfaces continue to read the same summary model

## 5. Guardrails

- do_not_expand_into:
  - browser-first admin products
  - alternate state models for the companion shell
  - visual flair that hides operational meaning
- escalation_conditions:
  - companion redesign requires shared summary schema changes
  - pitwall hierarchy work forces a deeper renderer split than expected
- rollback_or_recovery_path:
  - keep the retro dashboard plan durable even if the first implementation checkpoint slips

## 6. Drift / Hygiene

- likely_drift_points:
  - retro styling diverges from the existing race telemetry vocabulary
  - companion and pitwall evolve into different visual languages
  - design docs overpromise a browser dashboard direction
- required_doc_updates:
  - keep this worksheet, `TODO.md`, `NEXT_SESSION_PLAN.md`, and `.track` state aligned while `TRK-034` is active
- candidate_future_automation:
  - snapshot coverage for the companion webview once the telemetry shell changes land
