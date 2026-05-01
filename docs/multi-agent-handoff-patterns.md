# Multi-Agent Handoff Patterns

## Purpose

Track supports multi-agent work by making the current task, owner, blocker, and validation gate visible in one canonical state file.
It does not try to become a chat transcript store or a full orchestration server.

The handoff rule is simple:

- Track records what is active and who owns it
- the agent writes concise handoff evidence in its own workspace or chat surface
- Pitwall/OpenClaw-style monitors show worker status without replacing Track state

## Handoff Packet

Every handoff should include these fields, even if the note is written as Markdown:

| Field | Required | Meaning |
| --- | --- | --- |
| `track_task_id` | yes | Active Track task, for example `task-100` |
| `checkpoint_id` | yes | Roadmap checkpoint the task belongs to |
| `from_owner` | yes | Human or agent handing off |
| `to_owner` | yes | Human or agent expected to continue |
| `status` | yes | `ready`, `blocked`, `needs-review`, or `validation-failed` |
| `summary` | yes | One or two lines describing the current state |
| `changed_paths` | when code changed | Files or directories touched |
| `validation` | yes | Commands run and result |
| `blockers` | if blocked | Concrete unblock condition |
| `next_action` | yes | The next safe action |

Recommended Markdown shape:

```markdown
## Handoff

- track_task_id: task-100
- checkpoint_id: cp-95
- from_owner: codex
- to_owner: claude-code
- status: ready
- summary: Contract docs are in place; continue with implementation fixture review.
- changed_paths: docs/multi-agent-handoff-patterns.md
- validation: npm run check:harness passed
- blockers: none
- next_action: run the focused docs/tests gate, then mark the task done
```

## Ownership Transitions

Use Track mutation commands for canonical ownership and task state.
Use handoff notes for context.

Common transitions:

```bash
track start task-100 --actor codex
track block task-100 --reason "waiting for release owner approval" --actor codex
track unblock task-100 --actor release-owner
track done task-100 --actor codex
```

If ownership changes but the task stays active, the current Track schema should still keep one canonical active task.
The receiving agent should start by reading:

```bash
track status --no-color
track next --no-color
track map --no-color
```

## Agent-Specific Patterns

### Codex

Codex should:

- keep the current Track task aligned with commits
- run validation before handoff
- avoid editing unrelated dirty files
- summarize exact files changed and checks run

Codex should not:

- publish packages unless the release owner explicitly approves
- mutate another framework's `.agent/*` material unless that is the assigned task

### Claude Code

Claude Code should:

- consume Track state through CLI or MCP
- keep task mutations small and explicit
- leave a handoff note when stopping mid-slice

Claude Code should not:

- treat chat history as the source of roadmap truth
- bypass Track commands by hand-editing `.track/state.yaml`

### Gemini CLI

Gemini CLI should:

- use the same Track command vocabulary as other agents
- report validation commands and failing output summaries in handoff notes
- keep generated plans explicit enough to become adapter payloads

Gemini CLI should not:

- create a parallel TODO system that disagrees with Track

### OpenClaw-Style Workers

OpenClaw-style workers should:

- report worker state through normalized monitor snapshots
- use Pitwall for operator status
- keep substantive local work local when privacy or model locality matters

OpenClaw-style workers should not:

- expose raw secrets, prompts, or local-only transcripts in bot-facing summaries
- let monitor snapshots become authoritative Track roadmap state

## Parallel Work Rules

Parallel work is safe when each agent has a non-overlapping write surface.

Good split:

- worker A owns `src/orchestration-contract.ts` and `tests/orchestration-contract.test.ts`
- worker B owns `docs/workflow-framework-collaboration.md`
- worker C owns clean-project UAT scripts

Unsafe split:

- two workers edit `.track/state.yaml`
- two workers edit the same CLI switch block
- one worker changes package exports while another changes package layout checks without coordination

The main session should own:

- `.track/*` state transitions
- final validation
- commit/push integration
- release parking decisions

## Pitwall And Monitor Use

Pitwall is the read model for multiple projects or workers.
It should answer:

- who is blocked
- who is running
- who needs approval
- which Track task is active
- what validation gate is next

OpenClaw worker snapshots can feed Pitwall, but they should not write `.track/roadmap.yaml` or `.track/state.yaml`.

## Completion Gate

A multi-agent handoff is complete only when:

- `track status` points at the expected active task
- the handoff packet names the Track task and checkpoint
- changed paths are listed
- validation commands are listed with pass/fail status
- blockers are explicit or marked `none`
- the next action is concrete

Use this before ending a session:

```bash
npm run check:harness
track status --no-color
git status --short
```
