# TODO

## Active

### TRK-031 VS Code Companion

- goal:
  establish the first real IDE-side companion surface so Track is not limited to terminal-only usage
- in:
  - extension scaffold
  - command registration
  - companion panel shell
  - state read path from local `.track`
- out:
  - external adapters
  - browser work
  - full design polish
- done_when:
  - a VS Code companion surface exists and renders live Track summary data
  - `npm test` passes

## Queued

## Parked

### TRK-030 External Roadmap Adapters

- Notion ingestion
- Jira/GitHub/Linear adapters

## Done

### TRK-019 Pitwall Detail Expansion

- completed:
  - `pitwall --owners`
  - stale age and pace metrics
  - richer queue prioritization
  - `get_pitwall_owner_load`

### TRK-018 Color and Signal Pass

- completed:
  - ANSI signal palette
  - `--color` / `--no-color`
  - colored `status`, `companion`, `map`, `pitwall`
  - plain-text fallback coverage

### TRK-020 MCP Write Surface

- completed:
  - `start_track_task`
  - `complete_track_task`
  - `block_track_task`
  - `unblock_track_task`
  - `advance_track_checkpoint`
  - shared mutation commit path for CLI and MCP
  - write-side persistence and event-log test coverage

### TRK-017 MCP Read Surface

- completed:
  - read-only MCP server
  - `get_track_status`
  - `get_track_map`
  - `get_pitwall_overview`
  - `get_pitwall_detail`
  - smoke path and test coverage
