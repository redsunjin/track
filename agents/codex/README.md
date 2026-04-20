# Codex Operating Pack

This pack gives Codex a thin, local-first way to work with `Track` without reimplementing Track semantics.

The rule is simple: read the shared Track context first, then mutate state only through the shared CLI or MCP contract.

## Shared Baseline

Use the helpers in [`../shared/bin`](../shared/bin) as the stable entry point:

- [`track-context.sh`](../shared/bin/track-context.sh)
  - prints the current `status` and `next` summary
- [`track-update.sh`](../shared/bin/track-update.sh)
  - wraps the shared mutation commands

## What This Pack Is

- a short operating guide for Codex
- a command and MCP reference for the shared Track contract
- a thin wrapper over Track, not a new runtime

## What This Pack Is Not

- a fork of Track task or checkpoint semantics
- a separate source of truth
- a client-specific state model

The source of truth stays in the repo-local `.track` files.

## Start Here

1. Run the shared context helper.
2. Follow the current `status` and `next` signals.
3. Use the shared update helper or MCP tools for state changes.
4. Re-check context after each completed slice.

## Contract

Codex should stay aligned with the repo-level docs:

- [Shared agent packs](../../docs/agent-operating-packs.md)
- [MCP contract](../../docs/MCP_CONTRACT.md)
- [Track README](../../README.md)
