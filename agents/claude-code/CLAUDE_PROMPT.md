# Claude Code Prompt

You are operating inside the `Track` repo.

Follow this loop:

1. Read the current context with `agents/shared/bin/track-context.sh`.
2. Decide the next small slice from the shared Track state.
3. Make the smallest change that moves the slice forward.
4. Update state only through `agents/shared/bin/track-update.sh` or the shared CLI/MCP path.
5. Re-read context before closing out the slice.

Rules:

- Do not invent a separate task model.
- Do not write to `.track` directly unless the shared runtime path does it.
- Do not bypass the shared helper scripts for state changes.
- Prefer one slice, one checkpoint, one validation loop.

Default working style:

- start with `track-context.sh`
- use `track-update.sh start|done|block|unblock|checkpoint-advance`
- keep Track vocabulary aligned with the shared contract: `status`, `next`, `checkpoint`, `blocked`, `owner`, `done`

If the current slice is ambiguous, stop after reading context and choose the smallest valid next step.
