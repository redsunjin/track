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
- read/write MCP surface for agent clients, including structured control snapshots
- Claude/Codex/Gemini command patterns
- CLI progress view with ANSI signal mode and `--no-color` fallback
- generic external plan import path
- `lab` shorthand that maps to Track and Pitwall terminal surfaces
- VS Code companion with webview, course tree, and compact corner telemetry
- exportable Claude/Codex/Gemini operating-pack bundles
- source-level package boundaries for `track-core`, `track-runtime`, `track-mcp`, `track-cli`, `track-agents`, and `track-vscode`
- compiled `dist` package exports and CLI bin for release-manifest readiness checks

## Framework direction

The next product step is to make Track useful in a project that does not already have `.track/` files.
Track should become the canonical roadmap/state layer beside git:

- `git` records code history
- `track` records roadmap, current state, blockers, ownership, and next action
- method-specific tools such as SDD, TDD, GSD, or project harnesses can feed Track, but should not replace Track state

Planned commands:

- `track init` creates `.track/roadmap.yaml` and `.track/state.yaml` from safe templates
- `track bootstrap` drafts roadmap/state from local signals such as README, package metadata, git branch, and existing harness files
- `track import` remains the adapter path for explicit external plans

Reference: [docs/track-init-bootstrap-roadmap.md](docs/track-init-bootstrap-roadmap.md)

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
- contributes a `Track Course` tree view under Explorer
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
- `npm run import -- --adapter github --source examples/github-roadmap.example.json --dry-run --json`
- `npm run import -- --adapter jira --source examples/jira-roadmap.example.json --dry-run --json`
- `npm run import -- --adapter linear --source examples/linear-roadmap.example.json --dry-run --json`
- `npm run import -- --source plan.yaml`

Reference:

- [docs/external-adapters.md](docs/external-adapters.md)
- [examples/external-plan.example.yaml](examples/external-plan.example.yaml)

## Agent pack export and install

Track can export reusable agent-pack bundles for the supported client surfaces.

Current usage:

- `track pack list`
- `track pack export --tool claude-code --out ./tmp/track-claude-pack`
- `track pack export --tool codex --out ./tmp/track-codex-pack`
- `track pack export --tool gemini-cli --out ./tmp/track-gemini-pack`
- `track pack install --tool codex --out ./tmp/track-codex-install --dry-run --json`
- `track pack install --tool codex --out ./tmp/track-codex-install`

## OpenClaw worker monitor adapter

Track now includes an adapter layer that can normalize OpenClaw session-list and process-list data into the worker-monitor snapshot model.

Current building blocks:

- `@redsunjin/track/openclaw-adapter`
- `@redsunjin/track/openclaw-live`
- `@redsunjin/track/openclaw-monitor`
- `@redsunjin/track/pitwall-monitor`
- runtime helpers exposed through `@redsunjin/track/runtime`
- `docs/openclaw-worker-monitor.md`

Current CLI surface:

- `track pitwall --openclaw --source /path/to/openclaw-monitor.json`
- `track pitwall --openclaw --blocked`
- `track pitwall --openclaw --errors`
- `track pitwall --openclaw --json`
- `track openclaw capture --source /path/to/raw-openclaw.json`
- `track openclaw capture --sessions /path/to/sessions.json --processes /path/to/processes.json`
- `track openclaw push --source /path/to/openclaw-monitor.json`
- `track openclaw push --source current.json --previous previous.json --include-completed --json`

This keeps OpenClaw worker monitoring inside the Pitwall control-room language instead of creating a separate dashboard product.

## Package layout

Track now exposes source-level package boundaries and subpath exports for future package extraction.

Current checks:

- `npm run build`
- `npm run package:check`
- `npm run package:dry-run`
- `npm run package:build-check`
- `npm run package:install-smoke`
- `npm run package:handoff`
- `npm run package:readiness`
- `npm run package:publish-guard`
- `npm run package:publish-dry-run`
- `npm run package:rc-tag`
- `npm run package:release-notes`
- `track package list`
- `track package check`
- `track package dry-run`
- `track package handoff`
- `track package readiness`
- `track package publish-guard`
- `track package publish-dry-run`
- `track package rc-tag`
- `track package release-notes`

`package:build-check` runs the compiled CLI from `dist/cli.js` after build.
The public package exports and `bin.track` now point at compiled release artifacts under `dist`.
`package:install-smoke` packs Track into a temporary tarball, installs it into a throwaway consumer project, then verifies package subpath imports and the installed `track` CLI.
`package:handoff` emits a concise release handoff note with status, commands, public subpaths, package boundaries, and reference docs.
`package:readiness` is the release gate: it verifies the required build/test/harness/package scripts exist and that the package dry-run is clean before a physical `npm pack --dry-run --json`.
`package:publish-guard` verifies the current scoped public package manifest and reports `publishable-ready` when the package shape and publish configuration are ready.
`package:publish-dry-run` runs the public npm preflight lane and reports npm auth, pack dry-run, publish dry-run, install smoke, and the final publish command without publishing.
`package:rc-tag` prepares the release-candidate git tag commands as a dry-run only when the publish guard reports `publishable-ready`; it does not create or push a tag.
`package:release-notes` generates a Markdown release-notes draft from package state, install commands, CLI usage, verification commands, and recent release slices.

Public npm release target:

- package: `@redsunjin/track`
- CLI bin: `track`
- manifest: `private: false` with `publishConfig.access: public`
- release roadmap: [docs/public-npm-release-roadmap.md](docs/public-npm-release-roadmap.md)

Reference:

- [docs/package-layout.md](docs/package-layout.md)

## Retro terminal surfaces

The terminal map now renders a wrapped retro course board with sector markers and type-aware ANSI color:

- `npm run map -- --color`
- `npm run map -- --no-color`
- `npm run companion -- --color`
- `npm run pitwall -- --root /path/to/workspace --color`

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
- Package layout: [docs/package-layout.md](docs/package-layout.md)
- Public npm release roadmap: [docs/public-npm-release-roadmap.md](docs/public-npm-release-roadmap.md)
- Track init/bootstrap roadmap: [docs/track-init-bootstrap-roadmap.md](docs/track-init-bootstrap-roadmap.md)
- Security operations guide: [docs/SECURITY_OPERATIONS_GUIDE.md](docs/SECURITY_OPERATIONS_GUIDE.md)
- External adapters: [docs/external-adapters.md](docs/external-adapters.md)
- Agent operating packs: [docs/agent-operating-packs.md](docs/agent-operating-packs.md)
- VS Code companion scaffold: [vscode-extension/README.md](vscode-extension/README.md)
- Pitwall concept: [docs/pitwall-concept.md](docs/pitwall-concept.md)
- OpenClaw worker monitor: [docs/openclaw-worker-monitor.md](docs/openclaw-worker-monitor.md)
- Retro telemetry dashboard plan: [docs/retro-telemetry-dashboard-plan.md](docs/retro-telemetry-dashboard-plan.md)
- Track generator: [docs/track-generator-method.md](docs/track-generator-method.md)
- Runtime requirements: [docs/runtime-feature-matrix.md](docs/runtime-feature-matrix.md)
- Visual direction: [docs/visual-direction.md](docs/visual-direction.md)
- State example: [examples/track-state.example.yaml](examples/track-state.example.yaml)
