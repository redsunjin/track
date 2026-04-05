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
- `lab` shorthand that maps to Track and Pitwall terminal surfaces
- optional VS Code companion panel and compact corner widget

## Non-goals for V1

- generic project management replacement
- standalone enterprise dashboard product
- broad collaboration suite before agent-tool integration works
- decorative visuals without operational meaning

## Concept links

- Local repo survey: [docs/local-repo-survey-2026-04-05.md](/Users/Agent/ps-workspace/track/docs/local-repo-survey-2026-04-05.md)
- Deep dive: [docs/deep-dive-report.md](/Users/Agent/ps-workspace/track/docs/deep-dive-report.md)
- Harness guide: [docs/HARNESS_MASTER_GUIDE.md](/Users/Agent/ps-workspace/track/docs/HARNESS_MASTER_GUIDE.md)
- MCP contract: [docs/MCP_CONTRACT.md](/Users/Agent/ps-workspace/track/docs/MCP_CONTRACT.md)
- Pitwall concept: [docs/pitwall-concept.md](/Users/Agent/ps-workspace/track/docs/pitwall-concept.md)
- Track generator: [docs/track-generator-method.md](/Users/Agent/ps-workspace/track/docs/track-generator-method.md)
- Runtime requirements: [docs/runtime-feature-matrix.md](/Users/Agent/ps-workspace/track/docs/runtime-feature-matrix.md)
- Visual direction: [docs/visual-direction.md](/Users/Agent/ps-workspace/track/docs/visual-direction.md)
- State example: [examples/track-state.example.yaml](/Users/Agent/ps-workspace/track/examples/track-state.example.yaml)
