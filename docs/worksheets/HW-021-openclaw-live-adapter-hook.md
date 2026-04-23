# Harness Worksheet

## 1. Work Identity

- slice_id: `TRK-047`
- title: `OpenClaw Live Adapter Hook`
- branch_scope: current repo mainline slice
- official_active_loop: yes
- user_visible_change: Track can capture raw OpenClaw session/process telemetry into the default Pitwall monitor file

## 2. Scope

- in:
  - OpenClaw capture runtime helper
  - `track openclaw capture` CLI command
  - combined `--source` input
  - split `--sessions` and `--processes` inputs
  - dry-run, JSON, and watch-friendly output
  - package export and install-smoke coverage
- out:
  - direct OpenClaw API integration
  - bot push delivery
  - browser dashboard
  - storing full transcripts

## 3. Record System

- source_of_truth_docs:
  - [TODO.md](../../TODO.md)
  - [NEXT_SESSION_PLAN.md](../../NEXT_SESSION_PLAN.md)
  - [README.md](../../README.md)
  - [docs/openclaw-worker-monitor.md](../openclaw-worker-monitor.md)
  - [docs/package-layout.md](../package-layout.md)
- execution_doc:
  - this worksheet
- state_files_touched:
  - `.track/state.yaml`
  - `.track/roadmap.yaml`

## 4. Outcome

Track should have a local handoff hook between OpenClaw telemetry producers and the existing Pitwall OpenClaw worker board.

## 5. Checkpoints

1. add capture runtime helper
2. wire OpenClaw capture CLI and package export
3. verify capture docs, tests, and package smoke coverage

## 6. Verification

```bash
npm test
npm run typecheck
npm run check:harness
npm run package:dry-run
npm run package:install-smoke
npm pack --dry-run --json
```

## 7. Exit Condition

- `track openclaw capture --source <file>` writes `.track/openclaw-monitor.json`
- split session/process inputs normalize into one monitor snapshot
- dry-run JSON output works for automation
- installed package consumers can import `track/openclaw-live`

## 8. Control Surface Checks

- `TODO.md`, `NEXT_SESSION_PLAN.md`, and this worksheet point at `TRK-047`
- `.track/roadmap.yaml` and `.track/state.yaml` include matching capture checkpoints
- the CLI remains compatible with `track pitwall --openclaw`

## 9. Risks

- normalizing stale or partial OpenClaw telemetry into misleading status
- mixing combined source and split source modes
- exposing raw worker content instead of status-level signals

## 10. Mitigations

- preserve source timestamps in the normalized snapshot
- reject mixed source modes
- keep the capture helper focused on supplied session/process status fields
