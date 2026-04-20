# Gemini CLI Operating Pack

This pack is a thin Gemini CLI wrapper over the shared Track contract.
It does not redefine Track state, checkpoint, or mutation semantics.

## What it uses

- the shared Track CLI commands
- the shared MCP read/write contract
- the helper scripts in `agents/shared/bin/`

## What it should do

- read Track context before acting
- prefer `track status` and `track next` for orientation
- use the shared mutation path for `start`, `done`, `block`, `unblock`, and `checkpoint advance`
- keep all state in the repo-local `.track` files

## Shared helpers

- `agents/shared/bin/track-context.sh`
  - prints the current `status` and `next` view
- `agents/shared/bin/track-update.sh`
  - wraps the shared mutation commands

## Suggested Gemini workflow

1. Read context with `./agents/shared/bin/track-context.sh`.
2. Inspect the current slice and decide whether the next action is start, finish, unblock, or checkpoint advance.
3. Use `./agents/shared/bin/track-update.sh start <task-id>`, `done <task-id>`, `block <task-id> --reason ...`, `unblock <task-id>`, or `checkpoint-advance` for mutations.
4. Re-run `./agents/shared/bin/track-context.sh` after a change to confirm the new state.

## Files in this pack

- [OPERATING_GUIDE.md](OPERATING_GUIDE.md)
- [COMMANDS_AND_MCP.md](COMMANDS_AND_MCP.md)
