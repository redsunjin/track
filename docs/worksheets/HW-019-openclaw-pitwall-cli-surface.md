# Harness Worksheet

## 1. Work Identity

- slice_id: `TRK-045`
- title: `OpenClaw Pitwall CLI Surface`
- branch_scope: current repo mainline slice
- official_active_loop: yes
- user_visible_change: `track pitwall --openclaw` renders OpenClaw worker status in the terminal control-room surface

## 2. Scope

- in:
  - OpenClaw monitor source loader
  - terminal Pitwall worker board renderer
  - `track pitwall --openclaw`
  - `--blocked`, `--errors`, and `--running` filters
  - `--json` output for bot/script consumers
  - docs and regression coverage
- out:
  - real-time OpenClaw API polling
  - bot push notifications
  - transcript-tail display
  - separate browser dashboard

## 3. Record System

- source_of_truth_docs:
  - [TODO.md](../../TODO.md)
  - [NEXT_SESSION_PLAN.md](../../NEXT_SESSION_PLAN.md)
  - [README.md](../../README.md)
  - [docs/openclaw-worker-monitor.md](../openclaw-worker-monitor.md)
- execution_doc:
  - this worksheet
- state_files_touched:
  - `.track/state.yaml`
  - `.track/roadmap.yaml`

## 4. Outcome

Track should be able to monitor worker telemetry written by another session through the same Pitwall language used for multi-project control.

## 5. Checkpoints

1. add OpenClaw Pitwall loader and renderer
2. wire CLI flags and filtered views
3. verify tests, docs, and built CLI output

## 6. Verification

```bash
npm test
npm run typecheck
npm run check:harness
npm run build
npm run package:dry-run
npm run package:build-check
node dist/cli.js pitwall --openclaw --no-color
node dist/cli.js pitwall --openclaw --blocked --no-color
```

## 7. Exit Condition

- `track pitwall --openclaw` renders an OpenClaw worker board
- missing `.track/openclaw-monitor.json` is handled without crashing
- filtered views show only matching workers
- docs describe expected source data and CLI usage

## 8. Control Surface Checks

- `TODO.md`, `NEXT_SESSION_PLAN.md`, and this worksheet point at `TRK-045`
- `.track/roadmap.yaml` and `.track/state.yaml` include matching OpenClaw Pitwall checkpoints
- package layout still covers the new CLI module

## 9. Risks

- overfitting to one OpenClaw payload shape
- leaking raw local worker transcript content into remote-friendly summaries
- confusing the project Pitwall board with the worker Pitwall board

## 10. Mitigations

- accept both adapter input and prebuilt monitor snapshots
- render concise status fields only
- require `--openclaw` for the worker board path
