# Next Session Plan

## Active Slice

- id: `TRK-045`
- title: `OpenClaw Pitwall CLI Surface`

## Goal

Connect the OpenClaw worker monitor model to the terminal Pitwall surface so another session can write worker telemetry and Track can monitor it.

## First Steps

1. add an OpenClaw Pitwall loader and renderer
2. wire `track pitwall --openclaw` plus filtered views
3. document source file expectations and verify CLI output

## Constraints

- keep local `.track` files as the source of truth
- default to `.track/openclaw-monitor.json` when no source is supplied
- do not invent a separate dashboard product shell
- keep sensitive local worker content summarized, not transcript-heavy
- keep `--json` available for bot/script consumers

## Verification

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

## Exit Condition

- `track pitwall --openclaw` renders a worker control-room board
- `--blocked`, `--errors`, and `--running` filters work
- missing default source is handled gracefully
- JSON output returns the same snapshot/view data
