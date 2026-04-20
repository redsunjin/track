# Codex Operating Guide

Use this guide when you are actively driving a Track slice inside Codex.

## Loop

1. Read the current Track context.
2. Identify the active checkpoint and the next action.
3. Make one bounded change set.
4. Update state only through the shared Track command or MCP path.
5. Re-read context before starting the next slice.

## Default Behavior

- Treat `status` as the source of the current run state.
- Treat `next` as the immediate next move.
- Stop when the current slice reaches its exit condition.
- Do not invent new task or checkpoint semantics.

## Mutation Rule

Prefer the shared helper wrapper when shelling out locally:

```bash
../shared/bin/track-context.sh
../shared/bin/track-update.sh start <task-id>
../shared/bin/track-update.sh done <task-id>
../shared/bin/track-update.sh block <task-id> --reason "..."
../shared/bin/track-update.sh unblock <task-id>
../shared/bin/track-update.sh checkpoint-advance
```

If the client is using MCP, use the same vocabulary and the same state transitions.

## Exit Rule

When a slice is complete:

- confirm the state update landed
- re-read `status` and `next`
- decide the next slice from the shared roadmap, not from client-local memory
