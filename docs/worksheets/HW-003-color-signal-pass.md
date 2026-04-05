# Harness Worksheet

## 1. Work Identity

- slice_id: `TRK-018`
- title: `Color and Signal Pass`
- branch_scope: current repo mainline slice
- official_active_loop: no
- user_visible_change: terminal Track surfaces gain a clearer race-signal hierarchy without becoming unreadable in plain text

## 2. Scope

- in:
  - ANSI color helpers
  - `status` signal treatment
  - `companion` signal treatment
  - `map` signal treatment
  - `pitwall` signal treatment
  - no-color fallback
- out:
  - browser work
  - external adapters
  - VS Code integration
- assumptions:
  - current text layout is stable enough to style instead of redesigning
  - color must reinforce, not replace, textual flags

## 3. Record System

- source_of_truth_docs:
  - [TODO.md](/Users/Agent/ps-workspace/track/TODO.md)
  - [NEXT_SESSION_PLAN.md](/Users/Agent/ps-workspace/track/NEXT_SESSION_PLAN.md)
  - [visual-direction.md](/Users/Agent/ps-workspace/track/docs/visual-direction.md)
- execution_doc:
  - this worksheet
- state_files_touched:
  - none required unless sample output states change

## 4. Evaluators

- static_checks:
  - `npm test`
- runtime_checks:
  - `npm run status`
  - `npm run companion`
  - `npm run map`
  - `npm run pitwall -- --root /Users/Agent/ps-workspace`
- control_surface_checks:
  - red, yellow, and active states remain obvious at a glance
  - plain-text output is still readable when ANSI is stripped
- regression_gate:
  - layout width and spacing do not collapse under color formatting

## 5. Guardrails

- do_not_expand_into:
  - browser work
  - VS Code work
  - transport-layer changes
- escalation_conditions:
  - color needs structural layout changes to work
  - ANSI output breaks watch-mode readability
- rollback_or_recovery_path:
  - keep color wrappers thin and easy to disable

## 6. Drift / Hygiene

- likely_drift_points:
  - color styling leaks into JSON or watch flows
  - active vs blocked semantics become color-only
  - companion and pitwall palettes diverge
- required_doc_updates:
  - move `TRK-018` from active when finished
- candidate_future_automation:
  - snapshot test coverage for ANSI and no-color variants
