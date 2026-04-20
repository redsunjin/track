# External Adapters

`Track` now routes external roadmap import through an adapter-backed normalization layer.

The operating rule stays the same:

- external tools may author plans
- `Track` projects those plans into local `.track` files
- local `.track` state remains the runtime source of truth

## Current baseline

CLI surface:

```bash
npm run import -- --source examples/external-plan.example.yaml --dry-run --json
npm run import -- --adapter notion --source examples/notion-roadmap.example.json --dry-run --json
npm run import -- --adapter github --source examples/github-roadmap.example.json --dry-run --json
npm run import -- --adapter jira --source examples/jira-roadmap.example.json --dry-run --json
npm run import -- --adapter linear --source examples/linear-roadmap.example.json --dry-run --json
npm run import -- --source plan.yaml
```

Current implementation path:

1. `track import` resolves the source file
2. `createRoadmapAdapter()` selects the adapter kind
3. the selected adapter loads the source payload
4. the adapter normalizes the input into `IntermediateRoadmapSchema`
5. `intermediateToExternalPlan()` bridges that schema into the existing external-plan projection
6. Track projects the result into `.track/roadmap.yaml` and `.track/state.yaml`

Default adapter:

- `file`

First provider-specific entry point:

- `notion`
  - fixture-backed import path for Notion-style page/property exports

Additional registry-backed fixture hooks:

- `github`
- `jira`
- `linear`

That keeps the CLI stable while moving future provider logic behind a shared adapter contract.

## Shared adapter contract

Core pieces:

- `src/adapters/base.ts`
  - defines the `RoadmapAdapter` contract
- `src/adapter-schema.ts`
  - defines `IntermediateRoadmapSchema`
- `src/adapters/bridge.ts`
  - converts the intermediate schema into the existing `ExternalPlanFile`
- `src/adapters/file-adapter.ts`
  - provides the file-backed baseline adapter
- `src/adapters/notion-adapter.ts`
  - maps Notion-style page/property fixtures into the shared schema
- `src/adapters/github-adapter.ts`
  - maps GitHub-style milestone and issue fixtures into the shared schema
- `src/adapters/jira-adapter.ts`
  - maps Jira-style epic and issue fixtures into the shared schema
- `src/adapters/linear-adapter.ts`
  - maps Linear-style cycle and issue fixtures into the shared schema
- `src/adapters/registry.ts`
  - resolves adapter kinds and source paths for `track import`

The current file baseline accepts two input shapes:

- the legacy generic external-plan shape
- the direct intermediate roadmap schema

That means future adapters can either:

- map their source into `IntermediateRoadmapSchema` directly
- or emit the legacy external-plan shape while migrating toward the shared schema

## Supported file shapes

### 1. Generic external-plan shape

Top-level fields:

- `version`
- `project`
- `plan`
- optional `tasks`
- optional `source`

Minimal example:

```yaml
version: 1
project:
  id: track
  name: Track
  mode: sprint
plan:
  id: track-v2
  title: Track plugin v2
  topology: sprint
  phases:
    - id: phase-5
      title: External adapter core
      checkpoints:
        - id: cp-7
          title: Generic plan import adapter
tasks:
  - id: task-007
    title: Build generic plan import adapter
    checkpoint_id: cp-7
    owner: codex
    status: doing
```

Reference:

- [external-plan.example.yaml](../examples/external-plan.example.yaml)

### 2. Intermediate roadmap schema

Top-level fields:

- `version`
- `project`
- `phases`
- optional `tasks`
- optional `metadata`

Minimal example:

```yaml
version: 1
project:
  id: adapter-demo
  name: Adapter Demo
  mode: sprint
phases:
  - id: phase-1
    title: Source contract
    checkpoints:
      - id: cp-1
        title: Normalize source payload
tasks:
  - id: task-1
    title: Map provider records into checkpoints
    phase_id: phase-1
    checkpoint_id: cp-1
metadata:
  kind: fixture
  name: adapter-demo
  plan_id: adapter-demo-plan
  plan_title: Adapter Demo Plan
  topology: sprint
```

### 3. Notion adapter fixture shape

The first provider-specific entry point uses `--adapter notion` and a Notion-style fixture document.

Minimal example:

```json
{
  "version": 1,
  "project": {
    "id": "track",
    "name": "Track",
    "mode": "sprint"
  },
  "database": {
    "id": "db-track-roadmap",
    "title": "Track Roadmap"
  },
  "plan": {
    "id": "track-v2",
    "title": "Track plugin v2",
    "topology": "sprint"
  },
  "pages": [
    {
      "id": "page-phase-8",
      "type": "phase",
      "properties": {
        "Phase ID": "phase-8",
        "Title": "External roadmap adapters"
      }
    },
    {
      "id": "page-cp-14",
      "type": "checkpoint",
      "properties": {
        "Phase ID": "phase-8",
        "Checkpoint ID": "cp-14",
        "Title": "Intermediate adapter schema",
        "Status": "done"
      }
    },
    {
      "id": "page-task-16",
      "type": "task",
      "properties": {
        "Task ID": "task-016",
        "Title": "Define intermediate roadmap adapter schema",
        "Phase ID": "phase-8",
        "Checkpoint ID": "cp-14",
        "Owner": "codex",
        "Status": "done"
      }
    }
  ]
}
```

Reference:

- [notion-roadmap.example.json](../examples/notion-roadmap.example.json)

### 4. Registry-backed provider fixtures

The current registry-backed provider hooks are fixture-first, not live API integrations.

Reference fixtures:

- [github-roadmap.example.json](../examples/github-roadmap.example.json)
- [jira-roadmap.example.json](../examples/jira-roadmap.example.json)
- [linear-roadmap.example.json](../examples/linear-roadmap.example.json)

## Why the adapter layer exists

Vendor integrations should stay thin.

That means:

- Notion should normalize into the shared intermediate schema
- Jira should do the same
- GitHub or Linear should follow the same contract

If the adapter boundary is stable first, Track avoids turning every integration into a bespoke state model.

## Verification

Current regression coverage:

- `tests/external-plan.test.ts`
- `tests/adapter-base.test.ts`
- `tests/file-roadmap-adapter.test.ts`
- `tests/notion-roadmap-adapter.test.ts`
- `tests/provider-roadmap-adapters.test.ts`

Recommended checks:

```bash
npm test
npm run import -- --source examples/external-plan.example.yaml --dry-run --json
npm run import -- --adapter notion --source examples/notion-roadmap.example.json --dry-run --json
npm run import -- --adapter github --source examples/github-roadmap.example.json --dry-run --json
npm run import -- --adapter jira --source examples/jira-roadmap.example.json --dry-run --json
npm run import -- --adapter linear --source examples/linear-roadmap.example.json --dry-run --json
npm run check:harness
```
