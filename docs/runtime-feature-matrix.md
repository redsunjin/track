# Track Runtime Feature Matrix

## Purpose

This document defines what `Track` and `Pitwall` need in order to be usable in a real development environment, not just as a concept demo.

It answers two questions:

1. what functions are required
2. what should be visible on screen

## Product split

- `Track`
  - per-repo developer progress plugin
  - used while building inside Claude Code, Codex, Gemini CLI, or local terminal workflow
- `Pitwall`
  - workspace-level monitoring surface
  - used by operators, leads, or the same developer when scanning several active repos

## Real-environment requirements

### 0. Project initialization and bootstrap

Must have:

- `track init`
- safe `.track/roadmap.yaml` template creation
- safe `.track/state.yaml` template creation
- no overwrite by default
- dry-run preview of generated files
- `track bootstrap` draft mode from README, package metadata, git branch, plan files, and existing harness files
- Track Builder guidance when no roadmap, TODO, spec, or harness evidence exists

Why:

- a project without `.track/` files cannot use Track meaningfully
- git history can suggest context, but it cannot be the source of truth for future work
- the first user experience should not require hand-authoring YAML
- missing-plan projects need a guided planning method instead of fake roadmap confidence

### 1. Canonical state and durability

Must have:

- `.track/roadmap.yaml`
- `.track/state.yaml`
- `.track/events.ndjson`
- schema validation on read
- append-only event writes
- deterministic progress recomputation from files

Why:

- every surface must agree on the same progress state
- restarts must not lose status

### 2. Status mutation commands

Must have:

- `track status`
- `track next`
- `track map`
- `track pitwall`
- `track companion`
- `track start <task-id>`
- `track done <task-id>`
- `track block <task-id> --reason ...`
- `track unblock <task-id>`
- `track checkpoint advance`

Why:

- read-only dashboards are not enough
- developers need a fast way to keep state aligned with actual work

### 3. File watching and refresh

Must have:

- `--watch` mode for `status`, `map`, `companion`, and `pitwall`
- `--color` and `--no-color` control for terminal signal rendering
- optional `--sound` cues for human-facing terminal status changes
- change detection on `.track/state.yaml` and `.track/events.ndjson`
- minimal redraw logic for terminal mode

Why:

- the system needs to feel live during work, not batch-only

### 4. Agent integration

Must have:

- MCP tools for Track state reads
- MCP tools for controlled state updates
- thin command adapters for Claude Code, Codex, Gemini CLI

Recommended first MCP tools:

- `get_track_status`
- `get_track_map`
- `get_pitwall_owner_load`
- `start_track_task`
- `complete_track_task`
- `block_track_task`
- `get_pitwall_overview`

Why:

- Track must survive tool switching
- agent clients should not scrape terminal text when structured state exists

### 5. Workspace aggregation

Must have:

- workspace scan for `.track/state.yaml`
- per-repo summary generation
- blocked/stale/high-risk ranking
- owner load summary

Why:

- without this, `Pitwall` is only a skin on one repo

### 6. Error and drift handling

Must have:

- invalid schema warnings
- missing roadmap warnings
- state/roadmap mismatch warnings
- stale update detection
- event append failure handling

Why:

- progress tools fail quietly unless drift is made visible

## Screen and view inventory

These are terminal views, not web pages.

## Track views

### 1. `track status`

Role:

- driver HUD for the current repo

Must show:

- project name
- track title
- strong flag color or plain-text fallback
- current lap
- current checkpoint
- progress bar and percent
- owner
- next action
- flag state
- active blockers
- recent events

Good additions:

- pace delta
- last update age
- branch name

### 2. `track companion`

Role:

- compact right-bottom style companion block

Must show:

- mood or posture based on health
- active signal coloring without breaking the box layout
- current checkpoint
- mini track strip
- next action
- current flag

Good additions:

- blinking caution/red state
- tiny lap counter
- shortened owner label
- IDE companion panel sharing the same summary vocabulary
- VS Code tree view sharing the same control snapshot

### 3. `track map`

Role:

- roadmap-to-track visualization

Must show:

- generated course strip
- segment-state signal coloring
- segment list
- segment type
- difficulty score
- slope score
- pace score
- active segment
- notes explaining why a segment became climb, fork, pit, or hairpin

Good additions:

- detail mode with ASCII map
- per-phase grouping
- alternate generation strategies

### 4. `track next`

Role:

- minimal "what do I do now" output

Must show:

- next action
- current checkpoint
- owner
- blocker if present

## Pitwall views

### 1. `track pitwall`

Role:

- workspace race-control overview

Must show:

- workspace root
- total active projects
- race-signal color hierarchy for red/yellow/green
- red/yellow/green counts
- blocked count
- project roster
- owner
- active checkpoint
- next action
- compact progress bar

Good additions:

- last update age
- stale marker
- sort by severity, owner, or pace drift

### 2. `track pitwall --detail <repo>`

Role:

- focused project inspection from the control room

Must show:

- current course map
- lap and checkpoint breakdown
- blockers
- recent events
- owner and task breakdown
- artifacts or linked outputs

### 3. `track pitwall --queue`

Role:

- operations queue

Must show:

- blocked tracks
- approval-needed tracks
- stale tracks
- failed or degraded tracks
- tracks waiting for handoff

Sort order:

- severity first
- age second

### 4. `track pitwall --owners`

Role:

- load and coordination view

Must show:

- owner or agent id
- active checkpoints
- blocked load
- number of repos owned
- caution count

## Priority matrix

### Must ship for first real use

- canonical files
- `status`
- `next`
- `map`
- `pitwall`
- `companion`
- task state mutation commands
- event append and replay
- MCP read tools

### Should ship soon after

- `--watch`
- colorized flags
- `pitwall --detail`
- `pitwall --queue`
- MCP write tools
- stale detection

### Can wait

- VS Code marketplace packaging
- richer ASCII track art
- multi-user approval flows
- persistent SQLite aggregation for Pitwall

## Data fields that must be visible somewhere

These do not all need to appear in every view, but they must exist in the system.

- project id
- project name
- branch
- topology
- lap
- checkpoint
- task id
- owner
- status
- next action
- blocked reason
- health
- percent complete
- difficulty
- pace delta
- last updated timestamp
- recent event summaries

## Anti-requirements

Do not optimize early for:

- generic PM features
- decorative avatars with no state value
- browser-first dashboard work
- chat history as the primary state model
- arbitrary manual percentage editing without checkpoint logic

## Recommended next implementation order

1. add state mutation commands
2. add `--watch` refresh
3. add MCP read tools
4. add `pitwall --detail` and queue modes
5. add MCP write tools
6. add optional companion integrations for specific agent environments
