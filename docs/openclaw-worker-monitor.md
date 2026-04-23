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

- adapter hook that pulls from the real OpenClaw tool/session source
- `track pitwall --openclaw` style surface or sibling command
- filtered views for `running`, `blocked`, and `error`

Status: the normalization adapter now exists in `src/openclaw-adapter.ts` and can combine supplied OpenClaw session-list plus process-list data into one monitor snapshot.

### Phase 3

- bot push hooks for completion, blocked, approval-needed, and failure
- optional transcript-tail references when policy allows
- optional MCP read tools for worker overview

## CLI direction

Recommended direction, not implemented in this slice yet:

- `track pitwall --openclaw`
- `track pitwall --openclaw --errors`
- `track pitwall --openclaw --blocked`
- `track pitwall --openclaw --json`

The key rule is to preserve `Track`'s existing terminal-first control-room language rather than inventing a separate monitoring product shell.
