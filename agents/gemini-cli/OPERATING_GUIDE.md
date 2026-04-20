# Gemini CLI Operating Guide

Use Gemini CLI as a thin client over Track, not as a separate planning system.

## Operating rules

- read the current Track state first
- keep the same command vocabulary as the shared Track runtime
- mutate state only through the shared CLI or MCP paths
- do not invent Gemini-only checkpoint or task semantics

## Short loop

1. Run `./agents/shared/bin/track-context.sh`.
2. Decide whether the current work should be started, completed, blocked, unblocked, or advanced.
3. Run `./agents/shared/bin/track-update.sh start <task-id>`, `done <task-id>`, `block <task-id> --reason ...`, `unblock <task-id>`, or `checkpoint-advance` when a mutation is needed.
4. Re-read context to verify the change.

## Example prompts

- “Show me the current Track status and next action.”
- “Start the current task through the shared Track command path.”
- “Mark this task done and confirm the checkpoint advance if needed.”
- “Block the current task with a short reason and re-read the next action.”

## MCP usage

If Gemini is using MCP instead of shell commands, keep the same semantics:

- read with the Track status and map tools
- write with the Track task and checkpoint mutation tools
- use the same `.track` files as the source of truth
