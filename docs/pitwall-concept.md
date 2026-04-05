# Pitwall Concept

## Definition

`Pitwall` is the operator and admin dashboard for `Track`.

- `Track` = per-repo progress plugin used inside Claude Code, Codex, Gemini CLI, and companion views
- `Pitwall` = multi-project monitoring and intervention surface for leads, operators, or team admins

This separation is useful because the coding tool needs a compact execution view, while the admin surface needs a wide control-room view.

## Core role

`Pitwall` should answer:

- which projects are active right now
- which tracks are blocked or at risk
- who owns each current checkpoint
- which repos are stale
- where approvals, reviews, or handoffs are piling up
- which runs are ahead or behind expected pace

## Architectural rule

`Pitwall` must not invent its own state model.

It should read the same canonical `Track` state:

- `.track/roadmap.yaml`
- `.track/state.yaml`
- `.track/events.ndjson`

That keeps solo usage and team monitoring aligned.

## Conceptual implementation

### 1. Source layer

Each repo exposes Track state locally.

Examples:

- `/Users/Agent/ps-workspace/track/.track/state.yaml`
- `/Users/Agent/ps-workspace/FirstStep/.track/state.yaml`
- `/Users/Agent/ps-workspace/asset-growth/.track/state.yaml`

### 2. Aggregation layer

A `pitwall-indexer` process watches one workspace root and builds read models.

Responsibilities:

- scan repos for `.track/state.yaml`
- load and validate Track state
- tail `.track/events.ndjson`
- compute derived fields:
  - stale duration
  - ETA drift
  - blocked duration
  - owner load
  - checkpoint congestion

Recommended storage:

- MVP: in-memory cache plus file watching
- next: SQLite for replay and history queries

### 3. Terminal surface

`Pitwall` should be terminal-first.

Primary shape:

- one CLI command scans the workspace
- a terminal view summarizes projects, flags, checkpoints, and owners
- historical data is built from Track events, not from a web frontend

Suggested commands:

- `track pitwall --root /Users/Agent/ps-workspace`
- `track pitwall --root /Users/Agent/ps-workspace --json`

The JSON path exists so MCP or agents can consume the same aggregated snapshot.

### 4. MCP bridge

If agents need workspace-wide monitoring, `Pitwall` should expose the same terminal data through MCP tools.

Suggested tools:

- `get_pitwall_overview`
- `list_blocked_tracks`
- `list_stale_tracks`
- `list_owner_load`

### 5. Presentation model

`Pitwall` is a terminal control room, not a browser dashboard.

Art direction:

- early 8-bit F1 telemetry mood
- compact race HUD hierarchy
- hard flag-state transitions
- crisp terminal grid instead of soft cards

Recommended layout:

- summary strip:
  - workspace health
  - active projects
  - blocked projects
  - reviews waiting
  - average pace drift
- main roster:
  - project list
  - filters for health, owner, topology, stale
  - compact per-project race strip
- detail pane:
  - alerts
  - pit-stop queue
  - recent major events
- optional tail mode:
  - event timeline or operator log

## Screen model

### 1. Race Board

This is the default overview.

Each project card shows:

- project name
- current lap
- current checkpoint
- percent complete
- health flag
- owner
- blocked reason
- updated age

### 2. Pit Queue

This is the operations queue.

Used for:

- blocked work
- approval waiting
- handoff required
- test failures
- stale repos

This should be sorted by severity first, not by percent complete.

### 3. Project Detail

Opening a project shows:

- course map
- checkpoint list
- task ownership
- recent events
- artifact links
- expected versus actual pace

### 4. Load View

For team management.

Shows:

- owner or agent
- assigned active checkpoints
- blocked load
- review load
- stale work

## Pitwall-specific concepts

Useful derived concepts:

- `yellow flag`: caution, degradation, dependency warning
- `red flag`: blocked, failed, missing approval
- `pit stop`: review, QA, approval, or replan stop
- `safety car`: shared incident slowing multiple projects
- `blue flag`: one project is waiting on another faster-moving dependency
- `retire`: paused or abandoned track

These should be computed from Track state and events, not manually decorated.

## Operator actions

`Pitwall` should stay mostly read-first.

Allowed early actions:

- acknowledge alert
- open project detail
- open repo
- open latest artifact
- request handoff
- mark pit stop needed

Deferred actions:

- direct task editing
- arbitrary state mutation
- bypassing per-repo Track controls

## MVP recommendation

Build `Pitwall` after Track MCP is working.

Recommended MVP:

1. workspace scanner
2. aggregated read model
3. terminal renderer
4. optional MCP bridge

That is enough to validate the concept before adding richer admin actions.

## Why the name works

`Pitwall` fits because it is not the car and not the track.
It is the control position that watches the race, spots risk, and decides when intervention is needed.
