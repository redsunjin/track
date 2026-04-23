# Next Session Plan

## Active Slice

- id: `TRK-047`
- title: `OpenClaw Live Adapter Hook`

## Goal

Let Track capture raw OpenClaw session/process telemetry into the default Pitwall monitor file so another session can produce telemetry while `track pitwall --openclaw` consumes it.

## First Steps

1. add an OpenClaw capture runtime helper
2. wire `track openclaw capture` with source, split-file, dry-run, JSON, and watch modes
3. expose the helper through package exports and install smoke checks

## Constraints

- keep the manager surface read-oriented and terminal-first
- do not require a browser dashboard
- keep `.track/openclaw-monitor.json` as the local handoff file
- preserve `track pitwall --openclaw` as the operator display
- avoid storing raw transcript content beyond supplied status fields

## Verification

```bash
npm test
npm run typecheck
npm run check:harness
npm run package:dry-run
npm run package:install-smoke
npm pack --dry-run --json
```

## Exit Condition

- `track openclaw capture --source <file>` writes `.track/openclaw-monitor.json`
- split `--sessions` and `--processes` inputs normalize into one monitor snapshot
- `--dry-run --json` can be used by scripts without writing
- package consumers can import `track/openclaw-live`
