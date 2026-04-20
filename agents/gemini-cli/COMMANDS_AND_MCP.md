# Gemini CLI Commands and MCP Reference

This file is the minimal command-pattern reference for the Gemini CLI pack.
It stays thin over the shared Track contract.

## Command patterns

- `./agents/shared/bin/track-context.sh`
  - read-only context snapshot
- `./agents/shared/bin/track-update.sh start <task-id>`
  - mark the current task active
- `./agents/shared/bin/track-update.sh done <task-id>`
  - complete the current task
- `./agents/shared/bin/track-update.sh block <task-id> --reason "..."`
  - block the current task with a reason
- `./agents/shared/bin/track-update.sh unblock <task-id>`
  - clear a block
- `./agents/shared/bin/track-update.sh checkpoint-advance`
  - move to the next checkpoint when the current one is complete

## MCP reference

Gemini CLI should use the same state semantics whether it reaches Track through the CLI or through MCP.

Read tools:

- `get_track_status`
- `get_track_map`
- `get_pitwall_overview`
- `get_pitwall_detail`
- `get_pitwall_owner_load`

Write tools:

- `start_track_task`
- `complete_track_task`
- `block_track_task`
- `unblock_track_task`
- `advance_track_checkpoint`

## Contract reminders

- the repo-local `.track` files are the source of truth
- write paths must stay aligned with the shared Track runtime
- Gemini-specific commands should be wrappers, not a forked model
