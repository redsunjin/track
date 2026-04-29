# Track Init / Bootstrap Roadmap

## Decision

Public npm publish is ready, but it is intentionally parked until Track proves it can be used from a clean project.
The next product direction is `track init` and `track bootstrap`.

Track should be a lightweight roadmap/state framework for coding-agent workflows:

- `git` remains the code history layer
- Track owns roadmap, current state, blockers, ownership, and next action
- SDD, TDD, GSD, harnesses, and skills can feed or verify Track state
- no external workflow tool should become a competing state model inside the same repo

## Problem

Track currently works best after `.track/roadmap.yaml` and `.track/state.yaml` already exist.
That is too much setup for a new project.

A new user should be able to run:

```bash
track init
track status
track map
```

and get a usable starting point.

## Command Direction

### `track init`

Creates a minimal `.track/` control plane.

Expected behavior:

- creates `.track/roadmap.yaml`
- creates `.track/state.yaml`
- refuses to overwrite existing files unless an explicit force flag is provided
- supports `--dry-run`
- supports `--name <project-name>`
- supports templates such as `simple`, `sdd`, `tdd`, and `harness`

Initial template should be intentionally small:

- one project
- one active lap
- two or three checkpoints
- one current task
- no fake completion history

### `track bootstrap`

Creates a reviewable draft from local project signals.

Candidate inputs:

- README
- package metadata
- git branch name and current status
- existing `.agent/` orchestration files
- existing harness scripts
- existing plans or TODO files

Important rule:

- git can provide evidence of past work, but it cannot define the future roadmap by itself

Bootstrap should start as draft-first:

```bash
track bootstrap --dry-run
track bootstrap --from readme --dry-run
track bootstrap --from git --dry-run
track bootstrap --write
```

## Relationship With `/Users/Agent/ps-workspace/skills`

The local skills workspace already contains `project-harness-runner`.
That skill generates or updates project harness material for GSD, SDD, TDD, and superpowers-lite workflows.

Good integration shape:

- `project-harness-runner` chooses method and creates workflow/harness files
- Track records canonical roadmap/state and exposes status to humans and agents
- harness scripts verify implementation quality
- Track harness checks verify roadmap/state/control-plane consistency

The skill should not replace Track state.
Track should not replace method-specific harness files.

Recommended collaboration:

```text
project-harness-runner
  -> creates or updates .agent/ and scripts/agent-harness.sh
  -> optionally emits Track bootstrap input

track init/bootstrap
  -> creates .track/roadmap.yaml and .track/state.yaml
  -> tracks current active slice and next action

track status/map/pitwall
  -> gives humans and agents one shared operating view
```

## Framework Boundary

Track should cooperate with workflow systems by using adapters:

- SDD: map specs, acceptance criteria, and milestones into Track phases/checkpoints
- TDD: map failing tests, red/green/refactor state, and test gates into Track checkpoints
- GSD: map immediate goal, next actions, and done criteria into a small Track plan
- project harnesses: map verification commands and orchestration status into Track gates
- multi-agent systems: map worker sessions, blockers, ownership, and handoffs into Pitwall/Track views

The adapter output should be explicit data, not scraped terminal prose.

## TRK-059 Strategy

TRK-059 can use subagents for planning and later implementation, but only if each agent has a non-overlapping write surface.
The main session should keep ownership of product decisions, `.track/*` state transitions, `src/cli.ts` integration, release parking, and final verification.

Recommended split:

- init worker: owns `src/init.ts`, optional `src/init-templates.ts`, and `tests/init.test.ts`
- bootstrap worker: owns `src/bootstrap.ts`, optional `src/bootstrap-sources.ts` or `src/bootstrap/*`, and `tests/bootstrap.test.ts`
- integration-doc worker: owns workflow integration docs and adapter examples only
- QA worker: owns clean-project tarball/UAT scripts and reports only
- main session: owns `src/cli.ts`, public exports, `.track/roadmap.yaml`, `.track/state.yaml`, `TODO.md`, `NEXT_SESSION_PLAN.md`, release decisions, and final merge

Conflict rule:

- only Track CLI/MCP should mutate `.track/*`
- only `project-harness-runner` should mutate `.agent/*`, `AGENTS.md` managed sections, and harness scripts
- shared integration should happen through explicit adapter payloads and tests, not through two tools editing the same state files

## Locked Command Contract

### `track init`

First implementation target:

```bash
track init --dry-run
track init --name "My Project" --template simple
track init --force --name "My Project"
```

Contract:

- creates `.track/roadmap.yaml` and `.track/state.yaml`
- refuses overwrite by default if either file already exists
- supports `--dry-run`, `--force`, `--name <project-name>`, and `--template <simple|sdd|tdd|harness>`
- may support `--state-out` and `--roadmap-out` for consistency with `track import`
- returns JSON as `{ roadmap, state, files, written, skipped, warnings }`
- produces a text summary that points the user to `track status` and `track map`

MVP scope should implement only the `simple` template first.
The `sdd`, `tdd`, and `harness` templates can be thin variants after the safe write path is proven.

### `track bootstrap`

Bootstrap must be draft-first.
It should not write `.track/*` unless the user explicitly asks for a write path.

Expected usage:

```bash
track bootstrap --dry-run
track bootstrap --from readme --dry-run
track bootstrap --from package,git,harness --dry-run
track bootstrap --write
```

Contract:

- reads local signals as evidence, not as authoritative future plans
- supports `--from <auto|readme|package|git|harness|agent>`
- supports `--dry-run`, `--write`, `--force`, `--name`, `--json`, `--state-out`, and `--roadmap-out`
- shows evidence, confidence, warnings, and projected roadmap/state
- reuses the existing external-plan projection path where possible instead of inventing a second schema

## `project-harness-runner` Role Separation

`project-harness-runner` and Track should cooperate, but they should not become two competing project state systems.

Role boundary:

- `project-harness-runner` owns method selection, GSD/SDD/TDD/superpowers-lite operating material, `.agent/*`, prompt bundles, definition-of-done docs, and validation scripts such as `scripts/agent-harness.sh`
- Track owns `.track/roadmap.yaml`, `.track/state.yaml`, `.track/events.ndjson`, current task state, blockers, owner, next action, Pitwall views, CLI, and MCP state mutation
- harnesses verify implementation quality
- Track verifies roadmap/state/control-plane consistency

Preferred data exchange:

```text
project-harness-runner bootstrap/orchestrate
  -> emits .agent/track-bootstrap.json or stdout adapter JSON

track bootstrap --from harness --dry-run
  -> reads adapter JSON and renders a reviewable Track draft

track bootstrap --from harness --write
  -> writes .track files only through Track's no-overwrite policy

track status/map/pitwall
  -> becomes the shared operating view for humans and agents
```

Initial adapter payload:

```json
{
  "version": 1,
  "source": "project-harness-runner",
  "project": {
    "id": "repo-name",
    "name": "Repo Name",
    "mode": "sprint"
  },
  "method": "gsd|sdd|tdd|superpowers-lite",
  "goal": "MVP complete",
  "validation": {
    "preferred": "scripts/agent-harness.sh",
    "checks": ["npm run check"],
    "smokes": ["npm run smoke"]
  },
  "phases": [
    {
      "id": "harness-execution",
      "title": "Harness execution",
      "checkpoints": [
        { "id": "define-next-slice", "title": "Define next implementation slice" },
        { "id": "implement-slice", "title": "Implement slice" },
        { "id": "validate-harness", "title": "Validate with harness" }
      ]
    }
  ],
  "tasks": [
    {
      "id": "run-agent-harness",
      "title": "Run existing validation harness",
      "checkpoint_id": "validate-harness",
      "owner": "codex",
      "status": "todo"
    }
  ],
  "blockers": [],
  "metadata": {
    "orchestrate_only": true,
    "harness_structure_changed": false
  }
}
```

Track should normalize this payload into the existing intermediate adapter schema, then project it into roadmap/state files.
Markdown files under `.agent/` may be fallback evidence, but they should not be parsed as the source of truth.

## Implementation Sequence

Recommended sequence before public npm publish:

1. TRK-059: lock this strategy, command contract, and role boundary.
2. TRK-060a: implement `track init --dry-run` and `track init --template simple`.
3. TRK-060b: implement `track bootstrap --dry-run` from README, package metadata, git context, and harness evidence.
4. TRK-061: add the `project-harness-runner` adapter contract and optional payload emitter.
5. TRK-062: run clean-project UAT from tarball install before npm publish approval.

## New Roadmap Slices

### TRK-059 Track Init / Bootstrap Roadmap

Define the product contract and implementation plan for `track init`, `track bootstrap`, and framework cooperation.

Exit condition:

- this document exists
- `.track/roadmap.yaml` and `.track/state.yaml` include the new post-release-readiness phases
- public npm publish remains parked until UAT

### TRK-060 Bootstrap Source Adapters

Implement draft generation from local repo sources.

Candidate scope:

- README/package metadata reader
- git context reader
- existing harness and `.agent/` file detector
- draft renderer
- write path with no-overwrite default

### TRK-061 Workflow Framework Integration

Make Track cooperate with `project-harness-runner` and similar tools.

Candidate scope:

- documented adapter contract
- orchestration status import
- prompts or pack guidance for Codex, Claude Code, Gemini CLI
- multi-agent handoff patterns

### TRK-062 Pre-Publish User Acceptance

Prove a clean user can install and use Track before npm publish.

Candidate scope:

- clean project acceptance script
- tarball install into a fresh repo
- `track init`
- `track status`
- `track map`
- simulated agent workflow
- publish go/no-go checklist

## Release Policy

Do not run `npm publish --access public` until:

- `track init` has a usable MVP
- a clean-project tarball install has passed
- `track status` and `track map` are useful without hand-authored internal repo files
- release owner explicitly approves public npm publish
