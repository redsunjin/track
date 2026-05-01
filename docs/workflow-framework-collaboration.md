# Workflow Framework Collaboration

## Purpose

Track is the canonical roadmap and state layer for a repo.
Workflow frameworks can help create plans, run methods, and verify work, but they should not become a second owner of `.track/*`.

Use this rule:

- framework tools produce explicit input or validation evidence
- Track writes `.track/roadmap.yaml`, `.track/state.yaml`, and `.track/events.ndjson`
- humans and agents read `track status`, `track next`, `track map`, and `track pitwall` as the shared operating view

## Ownership Boundary

| Area | Owner | Notes |
| --- | --- | --- |
| `.track/roadmap.yaml` | Track | Canonical roadmap projection |
| `.track/state.yaml` | Track | Current task, blocker, owner, checkpoint, and health state |
| `.track/events.ndjson` | Track | Append-only runtime event log |
| `.agent/track-bootstrap.json` | framework or skill | Explicit adapter input for Track bootstrap |
| `.agent/*` markdown | framework or skill | Evidence and operator context only |
| `scripts/agent-harness.sh` | framework or skill | Validation gate used by Track as evidence |
| `README`, `ROADMAP`, `TODO`, specs | project | Planning evidence, not automatic future truth |
| git history | git | Code history and branch context, not the source of future roadmap state |

No framework should edit `.track/*` directly.
No Track command should rewrite `.agent/*` workflow material.

## Data Exchange

The preferred exchange format is `.agent/track-bootstrap.json`.

Minimal flow:

```bash
track bootstrap --from harness --dry-run
track bootstrap --from harness --write
track status
track map
```

Programmatic flow:

```ts
import { trackOrchestrationContractToIntermediateSchema } from "@redsunjin/track/runtime";

const schema = trackOrchestrationContractToIntermediateSchema(payload, {
  cwd: process.cwd(),
  sourceName: "project-harness-runner",
  sources: ["harness", "agent"],
});
```

Reference payload:

- [examples/track-bootstrap.example.json](../examples/track-bootstrap.example.json)

## Method Mapping

### GSD

GSD should emit:

- a single clear `goal`
- done criteria as checkpoints
- immediate next actions as tasks
- validation commands if they exist

Track should record the selected next action and owner.

### SDD

SDD should emit:

- spec milestones as phases or checkpoints
- acceptance criteria as checkpoint goals
- implementation tasks tied to those checkpoints
- spec/test validation commands

Track should not parse long-form specs as authoritative state unless an adapter converts them into explicit payload data.

### TDD

TDD should emit:

- red, green, and refactor checkpoints
- test commands under `validation.checks`
- smoke or integration commands under `validation.smokes`
- the current failing test or next repair as a task

Track should show whether the active checkpoint is implementation, validation, or release-style work.

### Harness

Harness tools should emit:

- `.agent/track-bootstrap.json`
- `scripts/agent-harness.sh` or equivalent repeatable checks
- definition-of-done documents as evidence

Track should import explicit payloads first and only use files such as `.agent/*.md` as fallback evidence.

### Skill Workspaces

Skills should provide method-specific workflow material.
Track should provide the durable shared control plane.

Good pattern:

```text
skill chooses method and writes .agent/* material
skill optionally writes .agent/track-bootstrap.json
track bootstrap projects the payload into .track/*
track status/map/pitwall become the shared view
```

Bad pattern:

```text
skill edits .track/state.yaml directly
track scrapes .agent markdown as a future roadmap
two tools keep separate current-task state
```

## Safety Rules

- `track bootstrap` is draft-first.
- `track bootstrap --write` is required before `.track/*` files are created.
- existing `.track/*` files are not overwritten unless `--force` is provided.
- external frameworks should pass explicit payloads instead of terminal prose.
- Track should surface missing-plan guidance rather than inventing confident roadmaps.

## Verification

Use these checks after changing collaboration behavior:

```bash
node --import tsx --test tests/orchestration-contract.test.ts tests/bootstrap.test.ts
npm run check:harness
npm run typecheck
```
