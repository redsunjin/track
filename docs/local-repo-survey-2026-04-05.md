# Track Local Repo Survey

Date: 2026-04-05
Purpose: identify reusable patterns in local `ps-workspace` repos for the new `track` shared library.

## Summary

The strongest local precedent is not one repo, but a combination:

- `ctrl_` provides the real-time control surface model
- `FirstStep` provides the room/task/timeline operating model
- `agent-control-plane` provides append-only event and state-transition discipline
- `Vibe_Planner` provides durable roadmap and dashboard document patterns
- `maestro` provides the operator-side docked panel and approval-console mindset
- `asset-growth` provides the clearest MCP vs skill vs harness boundary

`Track` should reuse those patterns rather than invent a new planning system from scratch.

## Repo findings

### `ctrl_`

Relevant files:

- [spec.md](/Users/Agent/ps-workspace/ctrl_/spec.md)
- [web_dashboard_plan.md](/Users/Agent/ps-workspace/ctrl_/web_dashboard_plan.md)

Reusable ideas:

- core engine broadcasts canonical payloads while clients only render
- progress, status, target area, and operational state are separated cleanly
- multiple clients can subscribe without coupling UI to event generation
- VS Code extension support was already considered as a non-core client

Carry into `Track`:

- keep the event model UI-agnostic
- let CLI, VS Code, and wallboard all consume the same state contract
- include operational health alongside progress

### `FirstStep`

Relevant files:

- [README.md](/Users/Agent/ps-workspace/FirstStep/README.md)

Reusable ideas:

- work is centered on rooms, participants, tasks, blockers, artifacts, and messages
- task status and orchestration state live together
- the console is for operating work, not just listing tickets

Carry into `Track`:

- a roadmap lane should always expose current owner, blockers, latest signal, and next action
- the track metaphor should not hide the underlying task room and timeline

### `agent-control-plane`

Relevant files:

- [docs/event-schema.md](/Users/Agent/ps-workspace/agent-control-plane/docs/event-schema.md)

Reusable ideas:

- append-only events make every transition reconstructable
- approval, execution, failure, and handoff should be explicit states
- shared event fields allow replay, audit, and correlation

Carry into `Track`:

- `Track` should store state as projections over events, not only editable documents
- pit-stop, blocked, approval-needed, and handoff states should be first-class

### `Vibe_Planner`

Relevant files:

- [docs/PROJECT_DASHBOARD.md](/Users/Agent/ps-workspace/Vibe_Planner_works/Vibe_Planner/docs/PROJECT_DASHBOARD.md)

Reusable ideas:

- durable dashboard docs are valuable when they encode current phase, risks, quality gates, and next actions
- roadmap and dashboard language can stay lightweight but still operational

Carry into `Track`:

- support both live dashboards and durable markdown snapshots
- keep risk and next-action sections mandatory

### `maestro`

Relevant files:

- [WORK_CONSOLE_PRODUCT_PLAN.md](/Users/Agent/ps-workspace/maestro/docs/version-upgrades/vu-001-openclaw-work-orchestration/WORK_CONSOLE_PRODUCT_PLAN.md)
- [WORK_CONSOLE_UI_PLAN.md](/Users/Agent/ps-workspace/maestro/docs/version-upgrades/vu-001-openclaw-work-orchestration/WORK_CONSOLE_UI_PLAN.md)

Reusable ideas:

- the operator panel should be dockable and contextual
- event streams should mix free text with structured cards
- chat should never replace state transitions or approvals

Carry into `Track`:

- the VS Code panel can feel like a work console, not a kanban clone
- the buddy/avatar should expose state, not become decorative noise

### `asset-growth`

Relevant files:

- [docs/mcp-vs-skill-boundaries-review.md](/Users/Agent/ps-workspace/asset-growth/docs/mcp-vs-skill-boundaries-review.md)
- [docs/local-dashboard.md](/Users/Agent/ps-workspace/asset-growth/docs/local-dashboard.md)
- [README.md](/Users/Agent/ps-workspace/asset-growth/README.md)

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

1. `ctrl_` event and surface model
2. `FirstStep` room and task semantics
3. `agent-control-plane` transition discipline
4. `Vibe_Planner` dashboard reporting discipline
5. `maestro` docked operator console UX
6. `asset-growth` layer boundaries between MCP, skill, and harness

## Immediate build recommendation

Build order:

1. canonical state and event schema
2. file-backed local runtime
3. CLI dashboard
4. MCP server
5. VS Code panel with corner widget
6. team control-room wallboard

This keeps `Track` useful before any IDE-specific work lands.
