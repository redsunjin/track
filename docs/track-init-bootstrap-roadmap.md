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
