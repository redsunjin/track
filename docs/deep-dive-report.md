# Track Deep Dive Report

Panel: single-agent synthesis informed by local repo survey on 2026-04-05

## Clarify

### One-line definition

`Track` is a plugin-first progress system for AI coding tools that turns roadmap execution into a live track map with checkpoints, laps, blockers, and pit stops.

### Target users

- solo builders using Claude Code, Codex, Gemini CLI, or similar harnesses
- operator-style builders who need a visible "what now" progress surface during execution
- small teams coordinating multiple agents and human approvals through coding tools
- optional leads who want read-only monitoring later

### Real problem

Current coding-agent workflows scatter intent and execution across markdown plans, CLI output, issue trackers, and chat.
The missing piece is a portable plugin layer that can follow the work inside Claude Code, Codex, Gemini CLI, and companion IDE surfaces.

## Design

### Product shape

`Track` should be a shared plugin runtime plus tool-specific adapters, not a monolithic app.

Recommended package split:

- `track-core`
  - canonical schema for roadmap, track topology, laps, checkpoints, blockers, owners, timing, and events
- `track-runtime`
  - file-backed loader, projector, watcher, and event append helpers
- `track-mcp`
  - tools for `get_track_status`, `advance_checkpoint`, `mark_blocked`, `list_next_actions`, `render_control_snapshot`
- `track-cli`
  - terminal progress view and quick commands
- `track-agents`
  - command and prompt adapters for Claude Code, Codex, and Gemini CLI
- `track-vscode`
  - optional tree view, webview, compact corner widget

### Racing metaphor mapped to operations

- `track` = roadmap topology
- `lap` = one phase or one major delivery cycle
- `checkpoint` = milestone or gate
- `pit stop` = review, replan, approval, or recovery point
- `split time` = expected versus actual timing
- `yellow flag` = caution, degraded, dependency risk
- `red flag` = blocked, failed, approval missing
- `safety car` = broad slowdown caused by upstream instability
- `driver` = active owner or agent
- `garage` = backlog or parked work
- `control room` = multi-project monitoring surface

### Visual concept

Main idea:

- every project gets a course map generated from its roadmap topology
- roadmap edits can change the course shape
- laps and checkpoints show percent progress in a way that remains legible at a glance

Personal surface:

- a compact corner widget sits in the bottom-right area of the editor
- this widget behaves like a buddy, but is still operational
- it can show mood or posture through shape, color, and animation without becoming a toy
- its design language should borrow from early 8-bit F1 telemetry rather than generic mascot UI

Suggested avatar states:

- calm idle when no task is active
- leaning forward when a checkpoint is close
- flashing yellow when risk rises
- pulsing red when blocked
- pit-stop wrench form during review or approval wait
- finish-flag burst when a lap closes

Important rule:

the avatar is only a compressed indicator of real state.
All fun elements must map to observable execution signals.

### Track topology modes

Different project styles should create different course shapes:

- `circuit`: steady product delivery
- `sprint`: short loop for fast feature work
- `rally`: branching path with optional detours and risk checkpoints
- `endurance`: long-running platform or infra work
- `elimination`: validation-heavy startup experiments where checkpoints can kill the path

This lets roadmap structure affect the visualization naturally.

### State model

Canonical entities:

- project
- track
- lap
- checkpoint
- task
- blocker
- event
- actor
- branch
- artifact
- timer

Required live fields:

- current lap
- current checkpoint
- overall percent
- next action
- current owner
- blocked reason
- health level
- expected completion or target time
- pace versus baseline

### Surface model

Agent tools:

- Claude Code:
  - slash command or local command wrapper for `/track`, `/track-next`, `/track-blocked`
- Codex:
  - MCP-backed tools plus skill-style operating prompts
- Gemini CLI:
  - custom commands, MCP integration, and optional extension packaging

CLI:

- left: track map and lap status
- right: current checkpoint, next actions, blocker stack, recent events
- footer: commands and health summary

VS Code:

- activity bar icon
- tree view for laps and checkpoints
- webview for rich track map
- corner widget for always-on awareness
- this is a companion, not the primary product

MCP:

- shared read/write tool surface for agent clients
- gives Claude, Codex, Gemini CLI the same project state

## Attack

### Main risks

1. The racing metaphor can become cute but not useful.
2. Auto-generated percent can lie if not tied to explicit checkpoints and task states.
3. Per-tool adapters can drift if each keeps its own state.
4. Teams may overfit visuals and ignore hard operational data.
5. Freeform roadmap editing can break topology if the schema is too loose.
6. Calling it a dashboard product may dilute the plugin objective.

### Countermeasures

1. Treat the course map as a projection of canonical state, never as the source of truth.
2. Derive progress from checkpoint completion, weighted tasks, and gates.
3. Keep one file-backed event/state model for every client.
4. Always show blockers, next actions, owner, and health before visual flair.
5. Use topology templates with constrained branching rules.
6. Treat VS Code and wallboard as companion surfaces after the agent-tool integration works.

### Product cautions

- avoid generic kanban language as the primary metaphor
- avoid turning every task into a lap; laps should stay phase-sized
- avoid decorative avatars that do not encode state
- avoid full PM suite ambitions in V1

## Validate

### Why this concept is strong

- it is differentiated from generic task boards
- it is centered on real coding-agent workflows
- it can be shared across Claude Code, Codex, Gemini CLI, and optional IDE companions
- the local repo survey already proves the needed pieces exist separately

### MVP validation plan

1. Define a single YAML state file and event log format.
2. Hand-author one example roadmap and ensure it renders consistently in:
   - MCP tool call output
   - Claude/Codex/Gemini command output
   - CLI view
3. Validate three project topologies:
   - simple circuit
   - branching rally
   - endurance infra roadmap
4. Confirm that a blocked checkpoint is visible within five seconds in every client.
5. Dogfood on one live repo through at least two agent clients.

### Success metrics

- users can identify current checkpoint and next action in under ten seconds
- blocked state is more noticeable than completion percent
- roadmap changes propagate to all surfaces without manual syncing
- the same project state survives tool switching between agent clients

## Decide

### Recommended V1

Build `Track` first as a shared local-first plugin stack with:

- canonical YAML and event log
- MCP server
- Claude/Codex/Gemini command adapters
- CLI progress view
- optional VS Code companion panel plus corner widget

Leave team wallboards for later unless monitoring becomes an immediate requirement.

### Fun elements worth keeping

- dynamic track shapes by roadmap type
- lap and split-time framing
- avatar posture tied to operational state
- finish sequence for completed laps
- pit-stop mode for review and approval

### Fun elements to defer

- heavy 3D animation
- collectible avatars or cosmetic systems
- competitive leaderboards
- voice or mascot systems

### Next actions

1. lock the state schema
2. define the MCP tool contract
3. define Claude/Codex/Gemini command adapters
4. build a minimal text-mode renderer
5. add the VS Code companion panel only after the plugin loop works
