# Agent Operating Packs

`Track` uses one shared runtime and one shared command/MCP vocabulary.
Claude Code, Codex, and Gemini CLI should consume that shared contract through thin operating packs, not through client-specific forks.

## Shared Contract

Common command loop:

- `track status`
- `track next`
- `track start <task-id>`
- `track done <task-id>`
- `track block <task-id> --reason ...`
- `track unblock <task-id>`
- `track checkpoint advance`

Common MCP tools:

- `get_track_status`
- `get_track_map`
- `get_pitwall_overview`
- `get_pitwall_detail`
- `get_pitwall_owner_load`
- `start_track_task`
- `complete_track_task`
- `block_track_task`
- `unblock_track_task`
- `advance_track_checkpoint`

Operating rule:

- read the current Track context first
- mutate state only through the shared CLI or MCP paths
- write back to the same local `.track` files

## Shared Helpers

Shared helper scripts live under [agents/shared/bin](../agents/shared/bin).

- `track-context.sh`
  - prints `status` and `next`
- `track-update.sh`
  - wraps the common mutation commands

These are the stable baseline for every client pack.

## Export Path

`Track` can export one reusable pack bundle at a time:

- `track pack list`
- `track pack export --tool claude-code --out ./tmp/track-claude-pack`
- `track pack export --tool codex --out ./tmp/track-codex-pack`
- `track pack export --tool gemini-cli --out ./tmp/track-gemini-pack`

Each export includes:

- `shared/`
- one tool-specific pack directory
- `manifest.json`
- a top-level export `README.md`

## Client Packs

- [Claude Code](../agents/claude-code/README.md)
- [Codex](../agents/codex/README.md)
- [Gemini CLI](../agents/gemini-cli/README.md)

Each pack should provide:

- one short operating guide
- one client-facing prompt or command pattern
- a minimal workflow that reads and updates the same Track state

## Guardrails

- no client pack should redefine Track task or checkpoint semantics
- no client pack should bypass the shared mutation path
- no client pack should introduce a second source of truth
