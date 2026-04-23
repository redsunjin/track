# Harness Worksheet

## 1. Work Identity

- slice_id: `TRK-049`
- title: `OpenClaw Bot Push Hooks`
- branch_scope: current repo mainline slice
- official_active_loop: yes
- user_visible_change: Track can turn OpenClaw worker state transitions into bot-push-ready messages

## 2. Scope

- in:
  - bot push event payload builder
  - failed, blocked, approval-needed, and completed worker event kinds
  - previous/current snapshot dedupe
  - `track openclaw push`
  - `--previous`, `--include-completed`, `--json`, and watch mode
  - docs and package smoke coverage
- out:
  - Telegram/Slack network transport
  - webhook secret handling
  - transcript streaming
  - persistent push delivery queue

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

OpenClaw monitoring should have a transport-neutral push hook so future bot adapters can send only meaningful state changes.

## 5. Checkpoints

1. add bot push event model and rendering
2. wire OpenClaw push CLI
3. document and verify push hooks

## 6. Verification

```bash
npm test
npm run typecheck
npm run check:harness
npm run package:check
npm run package:dry-run
npm run package:readiness
npm run package:install-smoke
npm pack --dry-run --json
```

## 7. Exit Condition

- bot bridge exports push event helpers
- `track openclaw push` emits readable messages
- `--previous` suppresses unchanged alerts
- `--json` exposes payloads for external adapters

## 8. Control Surface Checks

- `TODO.md`, `NEXT_SESSION_PLAN.md`, and this worksheet point at `TRK-049`
- `.track/roadmap.yaml` and `.track/state.yaml` include matching bot-push checkpoints
- docs state that no network transport is included yet

## 9. Risks

- duplicate alert spam
- leaking raw transcript content
- coupling Track to one chat provider too early

## 10. Mitigations

- compare current and previous snapshots
- emit status-level details only
- keep transport integration out of this slice
