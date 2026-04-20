# Track

Track is a progress-management plugin layer for AI coding workflows.

Its primary job is to help Claude Code, Codex, Gemini CLI, and similar coding agents manage roadmap progress while work is actively happening.

The race-track metaphor is the UI language, not the product boundary.

## Why it matters

During AI-assisted development, plans, TODOs, logs, and milestone notes usually drift apart.
The plugin should keep one live view of:

- what is currently being built
- how far the run has progressed
- what checkpoint comes next
- what is blocked
- which agent or human owns the current move

`Track` exists to make that visible inside coding tools first.

## Core problem

Claude Code, Codex, and Gemini CLI can execute work, but they do not natively provide a shared, portable progress model for roadmap execution across tools.

## V1 direction

V1 is a plugin-first architecture:

- file-backed state and event log
- read/write MCP surface for agent clients
- Claude/Codex/Gemini command patterns
- CLI progress view with ANSI signal mode and `--no-color` fallback
- generic external plan import path
- `lab` shorthand that maps to Track and Pitwall terminal surfaces
- minimal VS Code companion scaffold plus room for a later compact corner widget

## Security defaults

Track now ships with conservative defaults intended for open-source and local-agent use:

- explicit `state` and `roadmap` file paths must stay inside repo-local `.track/`
- MCP starts in read-only mode by default
- MCP writes require `--allow-write` or `TRACK_MCP_WRITE=1`
- state writes use a simple lock file plus atomic rename
- terminal surfaces sanitize ANSI escapes and control characters
- live `.track/events.ndjson` is treated as runtime data and should stay out of Git

## VS Code companion

The repo now includes a minimal VS Code extension scaffold under [vscode-extension](vscode-extension/README.md).

Current behavior:

- adds `Track: Open Companion`
- shows a status bar indicator
- opens a webview panel with the same summary vocabulary as `track status`
- refreshes when local `.track/state.yaml` changes

Verification:

- `npm run vscode:build`
- `npm run vscode:check`

## External plan import

Track now includes a vendor-neutral import core for external planning documents.
The current baseline runs through an adapter-backed normalization layer, so future provider-specific sources can plug in without changing Track's local runtime schema.

Current usage:

- `npm run import -- --source examples/external-plan.example.yaml --dry-run --json`
- `npm run import -- --adapter notion --source examples/notion-roadmap.example.json --dry-run --json`
- `npm run import -- --source plan.yaml`

Reference:

- [docs/external-adapters.md](docs/external-adapters.md)
- [examples/external-plan.example.yaml](examples/external-plan.example.yaml)

## Non-goals for V1

- generic project management replacement
- standalone enterprise dashboard product
- broad collaboration suite before agent-tool integration works
- decorative visuals without operational meaning

## Concept links

- Local repo survey: [docs/local-repo-survey-2026-04-05.md](docs/local-repo-survey-2026-04-05.md)
- Deep dive: [docs/deep-dive-report.md](docs/deep-dive-report.md)
- Harness guide: [docs/HARNESS_MASTER_GUIDE.md](docs/HARNESS_MASTER_GUIDE.md)
- MCP contract: [docs/MCP_CONTRACT.md](docs/MCP_CONTRACT.md)
- Security operations guide: [docs/SECURITY_OPERATIONS_GUIDE.md](docs/SECURITY_OPERATIONS_GUIDE.md)
- External adapters: [docs/external-adapters.md](docs/external-adapters.md)
- VS Code companion scaffold: [vscode-extension/README.md](vscode-extension/README.md)
- Pitwall concept: [docs/pitwall-concept.md](docs/pitwall-concept.md)
- Retro telemetry dashboard plan: [docs/retro-telemetry-dashboard-plan.md](docs/retro-telemetry-dashboard-plan.md)
- Track generator: [docs/track-generator-method.md](docs/track-generator-method.md)
- Runtime requirements: [docs/runtime-feature-matrix.md](docs/runtime-feature-matrix.md)
- Visual direction: [docs/visual-direction.md](docs/visual-direction.md)
- State example: [examples/track-state.example.yaml](examples/track-state.example.yaml)
