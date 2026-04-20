# Claude Code Command Patterns

These patterns keep Claude Code thin over the shared Track contract.
All commands are meant to be run from the repo root.

## Read context

```bash
bash agents/shared/bin/track-context.sh
```

Use this first. It shows the current `status` and `next` view.

## Start work

```bash
bash agents/shared/bin/track-update.sh start <task-id>
```

Use when you begin a slice and want Track state to reflect active work.

## Finish work

```bash
bash agents/shared/bin/track-update.sh done <task-id>
```

Use when the slice is complete and validated.

## Block work

```bash
bash agents/shared/bin/track-update.sh block <task-id> --reason "short reason"
```

Use when work cannot move forward without an external dependency or a missing decision.

## Unblock work

```bash
bash agents/shared/bin/track-update.sh unblock <task-id>
```

Use after the blocking condition is resolved.

## Advance checkpoint

```bash
bash agents/shared/bin/track-update.sh checkpoint-advance <checkpoint-id>
```

Use when the current checkpoint is complete and the shared runtime should move on.

## Minimal Claude loop

```bash
bash agents/shared/bin/track-context.sh
bash agents/shared/bin/track-update.sh start <task-id>
# make the change
bash agents/shared/bin/track-update.sh done <task-id>
```

## Contract reminders

- `.track` is the source of truth.
- Shared helpers are the preferred mutation path.
- This pack does not redefine Track task or checkpoint behavior.
