# External Adapters

`Track` now has a generic import core for external planning files.

The rule is:

- external tools can author plans
- `Track` projects those plans into local `.track` files
- `.track` remains the runtime source of truth

## Current shape

CLI surface:

```bash
npm run import -- --source examples/external-plan.example.yaml --dry-run --json
npm run import -- --source plan.yaml
```

Default behavior:

- reads an external YAML or JSON plan file
- projects phases into `.track/roadmap.yaml`
- projects tasks and checkpoint state into `.track/state.yaml`
- preserves matching task progress when an existing local state is available

## Generic plan schema

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

Reference file:

- [external-plan.example.yaml](../examples/external-plan.example.yaml)

## Why this exists before Notion/Jira adapters

Vendor integrations should be thin.

That means:

- Notion should map into the generic plan shape
- Jira should map into the generic plan shape
- GitHub or Linear should do the same

If the generic projection is stable first, Track avoids turning every integration into a bespoke state model.
