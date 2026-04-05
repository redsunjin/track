# MCP Contract

## Purpose

This document defines the current MCP surface for `Track`.

Current runtime entrypoints:

- `npm run mcp:smoke -- --root /Users/Agent/ps-workspace`
- `track mcp`

## Transport

- stdio
- line-delimited JSON-RPC

Supported protocol methods:

- `initialize`
- `notifications/initialized`
- `tools/list`
- `tools/call`
- `ping`

## Server identity

- name: `track-mcp`
- version: `0.1.0`
- protocolVersion: `2024-11-05`

## Current read tools

### `get_track_status`

- current repo Track summary

### `get_track_map`

- roadmap-derived track segments

### `get_pitwall_overview`

- workspace-wide Track summaries

### `get_pitwall_detail`

- focused project detail inside Pitwall

### `get_pitwall_owner_load`

- grouped owner and agent load across the workspace

## Current write tools

### `start_track_task`

- marks one task as `doing`
- persists `.track/state.yaml`
- appends an event to `.track/events.ndjson`

### `complete_track_task`

- marks one task as `done`
- persists `.track/state.yaml`
- appends an event to `.track/events.ndjson`

### `block_track_task`

- marks one task as `blocked`
- records the supplied reason
- appends an event to `.track/events.ndjson`

### `unblock_track_task`

- clears the blocked state for one task
- removes the auto-block flag for that task
- appends an event to `.track/events.ndjson`

### `advance_track_checkpoint`

- advances the active or selected checkpoint
- marks unfinished tasks under that checkpoint as `done`
- appends an event to `.track/events.ndjson`

## Output shape

Every `tools/call` response includes:

- `content[0].text`
- `structuredContent`
- `isError`

`structuredContent` is the canonical machine-readable payload.

## Current guardrails

- read and write tools reuse the shared Track mutation path
- local `.track` files remain the source of truth
- MCP wrappers reuse runtime logic instead of copying it
