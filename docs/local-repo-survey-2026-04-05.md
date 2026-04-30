# Track Local Repo Survey

Date: 2026-04-05
Purpose: identify reusable patterns from local workspace repos for the new `track` shared library.

## Summary

The strongest local precedent is not one repo, but a combination:

- a local control-surface prototype provides the real-time status model
- a local room/task prototype provides the room, task, and timeline operating model
- a local agent control-plane prototype provides append-only event and state-transition discipline
- a local roadmap dashboard prototype provides durable roadmap and dashboard document patterns
- a local operator-console prototype provides the docked panel and approval-console mindset
- a local MCP/skill boundary prototype provides the clearest MCP vs skill vs harness boundary

`Track` should reuse those patterns rather than invent a new planning system from scratch.

## Repo findings

### Local control-surface prototype

Relevant files:

- product specification
- web dashboard plan

Reusable ideas:

- core engine broadcasts canonical payloads while clients only render
- progress, status, target area, and operational state are separated cleanly
- multiple clients can subscribe without coupling UI to event generation
- VS Code extension support was already considered as a non-core client

Carry into `Track`:

- keep the event model UI-agnostic
- let CLI, VS Code, and wallboard all consume the same state contract
- include operational health alongside progress

### Local room/task prototype

Relevant files:

- project README

Reusable ideas:

- work is centered on rooms, participants, tasks, blockers, artifacts, and messages
- task status and orchestration state live together
- the console is for operating work, not just listing tickets

Carry into `Track`:

- a roadmap lane should always expose current owner, blockers, latest signal, and next action
- the track metaphor should not hide the underlying task room and timeline

### Local agent control-plane prototype

Relevant files:

- event schema documentation

Reusable ideas:

- append-only events make every transition reconstructable
- approval, execution, failure, and handoff should be explicit states
- shared event fields allow replay, audit, and correlation

Carry into `Track`:

- `Track` should store state as projections over events, not only editable documents
- pit-stop, blocked, approval-needed, and handoff states should be first-class

### Local roadmap dashboard prototype

Relevant files:

- project dashboard documentation

Reusable ideas:

- durable dashboard docs are valuable when they encode current phase, risks, quality gates, and next actions
- roadmap and dashboard language can stay lightweight but still operational

Carry into `Track`:

- support both live dashboards and durable markdown snapshots
- keep risk and next-action sections mandatory

### Local operator-console prototype

Relevant files:

- work console product plan
- work console UI plan

Reusable ideas:

- the operator panel should be dockable and contextual
- event streams should mix free text with structured cards
- chat should never replace state transitions or approvals

Carry into `Track`:

- the VS Code panel can feel like a work console, not a kanban clone
- the buddy/avatar should expose state, not become decorative noise

### Local MCP/skill boundary prototype

Relevant files:

- MCP vs skill boundary review
- local dashboard documentation
- project README

Reusable ideas:

- capability surface, skill, and harness are different layers
- a local read-only dashboard can stay simple if the contract is stable
- health semantics should be canonical across CLI, API, dashboard, and harness

Carry into `Track`:

- `Track` should define:
  - core state contract
  - MCP capability surface
  - skill or command patterns
  - harness integration points
- the same readiness model should appear in every client

## Recommended synthesis for `Track`

`Track` should combine:

1. control-surface event and display model
2. room and task semantics
3. agent control-plane transition discipline
4. roadmap dashboard reporting discipline
5. docked operator console UX
6. layer boundaries between MCP, skill, and harness

## Immediate build recommendation

Build order:

1. canonical state and event schema
2. file-backed local runtime
3. CLI dashboard
4. MCP server
5. VS Code panel with corner widget
6. team control-room wallboard

This keeps `Track` useful before any IDE-specific work lands.
