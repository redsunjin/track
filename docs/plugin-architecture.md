# Track Plugin Architecture

## Product definition

`Track` is a plugin for AI coding workflows.

Primary scope:

- Claude Code
- Codex
- Gemini CLI

Secondary scope:

- VS Code companion view

`Track` is not primarily a standalone dashboard app.

## Layer model

### 1. Canonical state

Repo-local files:

- `.track/roadmap.yaml`
- `.track/state.yaml`
- `.track/events.ndjson`

This is the single source of truth.

### 2. Plugin runtime

Shared library responsibilities:

- load and validate state
- append events
- compute progress
- resolve current checkpoint
- compute flags and next actions

### 3. Agent integration layer

Per-tool adapters should stay thin.

Claude Code:

- slash-command style wrappers
- MCP tool usage
- project-local command helpers

Codex:

- MCP tool usage
- reusable skill or prompt package

Gemini CLI:

- custom commands
- MCP integration
- optional extension packaging

### 4. Companion surfaces

Optional surfaces after core plugin works:

- CLI progress panel
- VS Code tree view and webview
- corner widget

## Command model

Recommended common commands:

- `track status`
- `track next`
- `track start <task-id>`
- `track done <task-id>`
- `track block <task-id>`
- `track unblock <task-id>`
- `track checkpoint advance`

Tool-specific wrappers can map to these commands.

## MCP model

Recommended core tools:

- `get_track_status`
- `list_track_tasks`
- `get_track_next_actions`
- `get_track_control_snapshot`
- `start_track_task`
- `complete_track_task`
- `block_track_task`
- `advance_track_checkpoint`

## UI rule

The race-track metaphor is allowed only when it improves situational awareness.

Always visible first:

- current checkpoint
- next action
- owner
- blocked state
- health level
- percent complete

Only after that:

- track shape
- lap animation
- buddy/avatar posture

## Team mode

If team monitoring is added later, it should read the same `.track/` state.

That keeps solo and team usage compatible instead of creating a second system.
