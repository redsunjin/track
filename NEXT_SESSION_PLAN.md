# Next Session Plan

## Active Slice

- id: `TRK-049`
- title: `OpenClaw Bot Push Hooks`

## Goal

Turn OpenClaw worker state changes into local bot-push payloads that can be handed to Telegram, Slack, or another remote adapter later without coupling Track to a network transport.

## First Steps

1. add bot push event construction over OpenClaw monitor snapshots
2. wire `track openclaw push` for current and previous snapshot comparison
3. document push usage and update package/install smoke coverage

## Constraints

- do not add a network transport yet
- avoid duplicate alerts when a previous snapshot is supplied
- keep payloads status-focused, not transcript-heavy
- keep `track pitwall --openclaw` as the recommended operator command
- keep completion pushes opt-in with `--include-completed`

## Verification

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

## Exit Condition

- `track openclaw push --source <file>` emits push-ready bot messages
- `--previous` suppresses duplicate unchanged alerts
- `--include-completed` enables completion pushes
- JSON output is available for adapter integration
