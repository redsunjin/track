# OpenClaw Worker Monitor

## Purpose

This slice extends `Track` with an OpenClaw-aware monitoring layer.
It is not a separate browser dashboard product.
It is a terminal-first operator surface that helps monitor ACP workers, background exec runs, and their bot-visible status.

The main fit inside `Track` is:

- `Track` keeps canonical progress and operator vocabulary
- `Pitwall` remains the multi-project control-room surface
- the OpenClaw worker monitor adapts session/process telemetry into that same control-room model

## Security boundary

For security-sensitive or local-only work, the monitoring layer must preserve a strict split:

- local workers perform the sensitive generation, editing, and file writing
- the manager/orchestrator only watches status, requests handoffs, and relays sanitized results
- bot-facing summaries should prefer status, health, ownership, and blocking reason over raw content

This is important for local Claude or Ollama-backed workflows where the point is to keep the substantive work local.

## Option A package layout

Initial source layout:

- `src/packages/openclaw-adapter.ts`
- `src/packages/openclaw-monitor.ts`
- `src/packages/pitwall-monitor.ts`
- `src/packages/bot-bridge.ts`

Backed by implementation modules:

- `src/openclaw-adapter.ts`
- `src/openclaw-live.ts`
- `src/openclaw-monitor.ts`
- `src/pitwall-monitor.ts`
- `src/bot-bridge.ts`

This keeps the work inside the `track` repo while making future extraction possible if the OpenClaw-specific surface grows too specialized.

## Responsibility split

### `openclaw-monitor`

Normalizes raw OpenClaw session/process facts into a stable worker snapshot:

- runtime kind (`acp`, `exec`, `main`, `other`)
- worker status (`running`, `done`, `blocked`, `error`, `waiting`)
- lane, model, timestamps, and last visible status signal

### `openclaw-adapter`

Bridges real OpenClaw tool payloads into that snapshot model:

- session-list entries from `sessions_list`
- process-list style entries from `process`
- worker filtering so the main chat does not pollute worker dashboards
- heuristics for blocked, error, done, and running states

### `pitwall-monitor`

Projects that worker snapshot into operator views:

- active workers
- blocked workers
- failed workers
- alert list for yellow/red conditions

### `openclaw-pitwall`

Loads OpenClaw monitor source data and renders the terminal Pitwall worker board:

- default source: `.track/openclaw-monitor.json`
- explicit source: `--source <file>`
- filters: `--blocked`, `--errors`, `--running`
- machine output: `--json`

### `openclaw-live`

Captures raw OpenClaw session/process telemetry into the default Pitwall input file:

- default output: `.track/openclaw-monitor.json`
- combined source: `--source <file>`
- split sources: `--sessions <file>` and/or `--processes <file>`
- dry run and machine output: `--dry-run`, `--json`

### `bot-bridge`

Maps monitor state into lightweight remote interaction patterns:

- concise bot summaries
- alert push text
- small command vocabulary for status queries

## MVP target

### Phase 1, now

- define source files and package boundaries
- define a normalized worker snapshot model
- define a pitwall-style grouped view
- define bot summary renderers
- normalize provided OpenClaw session-list and process-list data into one snapshot

### Phase 2

- terminal OpenClaw Pitwall surface
- filtered views for `running`, `blocked`, and `error`
- JSON output for bot or script consumers

Status: `track pitwall --openclaw` now renders supplied OpenClaw monitor data through the Pitwall control-room surface.
The default file is `.track/openclaw-monitor.json`; pass `--source <file>` when another session writes worker telemetry elsewhere.

Status: the normalization adapter now exists in `src/openclaw-adapter.ts` and can combine supplied OpenClaw session-list plus process-list data into one monitor snapshot.

### Phase 3

- live adapter hook that writes `.track/openclaw-monitor.json` from raw OpenClaw source files
- bot push hooks for completion, blocked, approval-needed, and failure
- optional transcript-tail references when policy allows
- optional MCP read tools for worker overview

## CLI usage

OpenClaw source data should be JSON with `sessions` and/or `processes` arrays matching the adapter input shape, or a prebuilt monitor snapshot.

```bash
track openclaw capture --source /path/to/raw-openclaw.json
track openclaw capture --sessions /path/to/sessions.json --processes /path/to/processes.json
track openclaw capture --source /path/to/raw-openclaw.json --dry-run --json
track openclaw capture --source /path/to/raw-openclaw.json --watch --interval 1000
track pitwall --openclaw
track pitwall --openclaw --source /path/to/openclaw-monitor.json
track pitwall --openclaw --blocked
track pitwall --openclaw --errors
track pitwall --openclaw --running
track pitwall --openclaw --json
```

`track openclaw capture` writes `.track/openclaw-monitor.json` by default.
After capture, `track pitwall --openclaw` reads that file without extra flags.

The key rule is to preserve `Track`'s existing terminal-first control-room language rather than inventing a separate monitoring product shell.
