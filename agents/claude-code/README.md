# Claude Code Operating Pack

This pack is the Claude Code-specific entrypoint for `Track`.
It stays thin on purpose: Claude reads the shared Track state, uses the shared mutation helpers, and does not redefine task or checkpoint semantics.

## What this pack is for

- reading the current Track context before work starts
- selecting the next slice from the shared `Track` contract
- updating task state through the shared mutation path only
- keeping Claude aligned with the same `.track` state used by the CLI, MCP, and other packs

## Shared helpers

Use the shared scripts under [`../shared/bin`](../shared/bin).

- [`track-context.sh`](../shared/bin/track-context.sh)
  - prints the current `status` and `next` view
- [`track-update.sh`](../shared/bin/track-update.sh)
  - wraps the shared mutation commands: `start`, `done`, `block`, `unblock`, `checkpoint-advance`

## Pack contents

- [`CLAUDE_PROMPT.md`](./CLAUDE_PROMPT.md)
  - short operating prompt for Claude Code sessions
- [`COMMAND_PATTERNS.md`](./COMMAND_PATTERNS.md)
  - command and workflow reference for the shared Track contract

## Operating rule

Claude Code should always:

1. read context first
2. use the shared helper scripts for mutations
3. keep `.track` as the source of truth
4. avoid client-specific task semantics

If a workflow needs richer automation later, it should extend the shared Track contract, not fork it here.
