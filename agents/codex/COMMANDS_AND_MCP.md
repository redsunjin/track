# Codex Commands and MCP Reference

This file maps Codex usage to the shared Track contract.

## Shared Command Pattern

Local helper:

```bash
../shared/bin/track-context.sh
```

Mutation helper:

```bash
../shared/bin/track-update.sh start <task-id>
../shared/bin/track-update.sh done <task-id>
../shared/bin/track-update.sh block <task-id> --reason "..."
../shared/bin/track-update.sh unblock <task-id>
../shared/bin/track-update.sh checkpoint-advance
```

Use these helpers instead of duplicating Track runtime logic in Codex-specific scripts.

## Shared MCP Reads

- `get_track_status`
- `get_track_map`
- `list_track_tasks`
- `get_track_next_actions`
- `get_track_control_snapshot`
- `get_pitwall_overview`
- `get_pitwall_detail`
- `get_pitwall_owner_load`

## Shared MCP Writes

- `start_track_task`
- `complete_track_task`
- `block_track_task`
- `unblock_track_task`
- `advance_track_checkpoint`

## Operating Rule

The command and MCP paths should describe the same state.
If they disagree, fix the shared Track state and not the Codex wrapper.

## Minimal Usage

1. Read context.
2. Pick one bounded slice.
3. Mutate through the shared helper or MCP tool.
4. Verify the updated context.
