# TODO

## Active

- `TRK-060` Bootstrap Source Adapters

Current TRK-060 result: README/package/git/plan bootstrap draft is implemented, and plan-file detection plus Track Builder missing-plan guidance is in progress.
Next TRK-060 focus: harness/skill adapter payload bridge and explicit review/write flow.

## Queued

- `TRK-061 Workflow Framework Integration`
- `TRK-062 Pre-Publish User Acceptance`

## Parked

- `TRK-058 Public Release Execution` - parked until Track is dogfooded from a clean project and release owner approves actual npm publish

## Done

### TRK-059 Track Init / Bootstrap Roadmap

- completed:
  - `track init` and `track bootstrap` product direction documented
  - subagent split and implementation strategy recorded
  - `project-harness-runner` role boundary documented
  - CLI sound MVP implemented with opt-in retro cues
  - `track init` core and CLI MVP implemented
  - public markdown local-path exposure cleaned up
  - Team Race Mode captured as roadmap-only design
  - public npm publish remains parked until clean-project UAT

### TRK-057 npm Publish Dry Run

- completed:
  - `npm whoami` passes as `redsunjin`
  - `npm run package:publish-dry-run` reports `publish-dry-run-ready`
  - `npm pack --dry-run --json` passes
  - `npm publish --dry-run --access public` passes without publishing
  - `npm run package:install-smoke` passes
  - final publish command is visible as `npm publish --access public`
  - no package was published during the dry-run slice

### TRK-056 Release Notes Draft Generator

- completed:
  - `track package release-notes`
  - `track package notes-draft` alias
  - `npm run package:release-notes`
  - Markdown draft with package name, version, install command, and `npx` command
  - CLI quick-start, public imports, recent release slices, and verification summary
  - RC tag dry-run status included without creating a tag
  - blocked draft output when release readiness or RC tag readiness is blocked

### TRK-055 Publishable RC Gate Tightening

- completed:
  - `track package rc-tag` now requires `publishable-ready` by default
  - private-root artifact RC tags are blocked by default
  - explicit `--allow-private-root` override added for artifact-only RC tags
  - RC tag dry-run output explains the publish guard expectation
  - regression coverage added for default block and explicit artifact override

### TRK-054 Scoped Package Manifest Switch

- completed:
  - package name switched to `@redsunjin/track`
  - `private` set to `false`
  - `publishConfig.access` set to `public`
  - install smoke imports switched to `@redsunjin/track` subpaths
  - public package import tests switched to scoped imports
  - publish guard target `publishable` passes for the scoped manifest
  - CLI bin remains `track`

### TRK-053 Public NPM Release Roadmap Lock

- completed:
  - public package target set to `@redsunjin/track`
  - unscoped `track` package name treated as unavailable
  - public release definition of done documented
  - TRK-054 through TRK-058 release sequence locked
  - private-root state preserved until manifest switch
  - final npm publish kept behind release-owner confirmation

### TRK-052 Release Candidate Tag Dry Run

- completed:
  - `track package rc-tag`
  - `track package tag-dry-run` alias
  - `npm run package:rc-tag`
  - default `v<version>-rc.0` tag candidate derivation
  - `--rc` and `--tag` candidate controls
  - readiness, publish guard, tag format, and local tag conflict checks
  - dry-run git tag and push command output without creating a tag
  - JSON output and regression coverage

### TRK-051 Publish Mode Switch Guard

- completed:
  - `track package publish-guard`
  - `track package mode-guard` alias
  - `npm run package:publish-guard`
  - current `private-root` status guard
  - `--target publishable` switch evaluation
  - manifest `private`, `publishConfig`, exports/files/bin readiness checks
  - JSON output and regression coverage

### TRK-050 Release Handoff Notes

- completed:
  - `track package handoff`
  - `track package notes` alias
  - `npm run package:handoff`
  - release status summary derived from package readiness
  - public subpath and boundary handoff listing
  - reference docs and verification command handoff block

### TRK-049 OpenClaw Bot Push Hooks

- completed:
  - bot push event payload builder
  - failed, blocked, approval-needed, and completed event kinds
  - previous/current snapshot dedupe behavior
  - `track openclaw push`
  - `--previous`, `--include-completed`, `--json`, and `--watch`
  - package export and install-smoke coverage

### TRK-048 Publish Readiness Gate

- completed:
  - `track package readiness`
  - `track package gate` alias
  - `npm run package:readiness`
  - required release-script gate checks
  - npm pack dry-run readiness signal
  - private-root release mode reporting

### TRK-047 OpenClaw Live Adapter Hook

- completed:
  - `track openclaw capture`
  - combined `--source` capture
  - split `--sessions` and `--processes` capture
  - `--dry-run`, `--json`, and watch-friendly summary output
  - `track/openclaw-live` package export and install-smoke coverage

### TRK-046 Publish/Install Smoke

- completed:
  - temporary package install smoke
  - tarball install into a clean consumer project
  - public subpath import smoke
  - installed `track` bin smoke
  - package install-smoke docs and verification

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
