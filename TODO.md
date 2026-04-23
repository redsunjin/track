# TODO

## Active

- `TRK-046` Publish/Install Smoke

## Queued

- `TRK-047` OpenClaw Live Adapter Hook
- `TRK-048` Publish Readiness Gate

## Parked

## Done

### TRK-045 OpenClaw Pitwall CLI Surface

- completed:
  - `track pitwall --openclaw`
  - `--source`, `--blocked`, `--errors`, `--running`, and `--json`
  - graceful missing-source board
  - OpenClaw Pitwall loader/renderer tests
  - CLI docs and built-output verification

### TRK-044 Release Manifest Switch

- completed:
  - public package exports switched to `dist`
  - `bin.track` switched to `dist/cli.js`
  - release export/bin target existence checks
  - package dry-run through built CLI
  - npm pack dry-run verification

### TRK-043 Build Artifact Baseline

- completed:
  - root `tsconfig.build.json`
  - `npm run build`
  - `dist` allowlist coverage
  - built CLI package dry-run path
  - build artifact docs and regression coverage

### TRK-042 Retro Track Color Pass

- completed:
  - wrapped retro course board for `track map`
  - sector-numbered progress tokens
  - type-aware ANSI color legend
  - readable `--no-color` fallback
  - map and companion visual verification

### TRK-041 Package Artifact Dry Run

- completed:
  - `package.json.files` artifact allowlist
  - `track package dry-run`
  - `npm run package:dry-run`
  - export/bin/docs/package boundary coverage checks
  - `npm run typecheck`
  - npm pack dry-run verification

### TRK-040 Package Split / Publishable Layout

- completed:
  - source-level package boundary map
  - package entrypoints for core/runtime/mcp/cli/agents
  - root package subpath exports
  - `track package list`
  - `track package check`
  - package layout docs and regression coverage

### TRK-039 Agent Pack Install Hooks

- completed:
  - `track pack install`
  - explicit `--out` target support
  - repo-local default install target
  - dry-run install planning
  - install manifest and regression coverage

### TRK-038 VS Code Companion Expansion

- completed:
  - VS Code `Track Course` tree view
  - compact corner telemetry status-bar treatment
  - control-snapshot-backed extension data loading
  - extension host smoke coverage and docs

### TRK-037 MCP Control Snapshot Expansion

- completed:
  - shared control snapshot helper
  - `list_track_tasks`
  - `get_track_next_actions`
  - `get_track_control_snapshot`
  - MCP contract and smoke coverage updates

### TRK-036 Installable Agent Packs

- completed:
  - pack export registry
  - `track pack list`
  - `track pack export --tool <kind> --out <dir>`
  - reusable pack bundle manifest and smoke coverage

### TRK-035 Agent Operating Packs

- completed:
  - shared Track command and MCP contract baseline
  - Claude Code, Codex, and Gemini CLI pack docs
  - shared helper scripts for context and mutation flows
  - cross-tool pack smoke coverage

### TRK-030 External Roadmap Adapters

- completed:
  - adapter-backed import baseline
  - shared intermediate roadmap schema
  - fixture-backed notion/github/jira/linear adapter entry points
  - provider registry hook coverage

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
