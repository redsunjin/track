# TODO

## Active

- `TRK-030` External Roadmap Adapters

## Queued

## Parked

## Done

### TRK-034 Retro Telemetry Dashboard Pass

- completed:
  - durable retro telemetry dashboard plan
  - VS Code companion telemetry shell
  - pitwall race-board hierarchy
  - terminal telemetry vocabulary alignment

### TRK-033 Harness Guardrails

- completed:
  - `npm run check:harness`
  - active-loop parity across `TODO.md`, `NEXT_SESSION_PLAN.md`, and the official worksheet
  - semantic parity checks between `.track/roadmap.yaml` and `.track/state.yaml`
  - harness regression coverage for control-plane and runtime drift

### TRK-032 Generic Plan Import Adapter

- completed:
  - generic external plan schema
  - projection into `.track/roadmap.yaml`
  - projection into `.track/state.yaml`
  - `track import --source <file>`
  - example plan and regression coverage
  - generic adapter contract docs

### TRK-031 VS Code Companion

- completed:
  - VS Code extension scaffold
  - `Track: Open Companion`
  - `Track: Refresh Companion`
  - status bar indicator
  - companion webview panel driven by `track status --json`
  - mocked extension-host smoke coverage
  - `npm run vscode:build`
  - `npm run vscode:check`

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
