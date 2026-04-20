# Next Session Plan

## Active Slice

- id: `TRK-036`
- title: `Installable Agent Packs`

## Goal

Turn the repo-local Claude Code, Codex, and Gemini CLI operating packs into exportable bundles that can be reused outside the repo without forking Track runtime behavior.

## First Steps

1. define one export contract for the supported agent pack kinds
2. add `track pack list` and `track pack export`
3. verify the exported bundles keep the shared helper and local `.track` contract intact

## Constraints

- keep local `.track` files as the source of truth
- keep exported packs thin and avoid per-client runtime forks
- do not write directly into tool-global config directories in this slice
- keep CLI and MCP semantics aligned across all packs
- do not reopen completed adapter, telemetry, or operating-pack slices unless a regression appears

## Verification

```bash
npm test
npm run check:harness
npm run status -- --no-color
node --import tsx ./src/cli.ts pack list
node --import tsx ./src/cli.ts pack export --tool codex --out /tmp/track-codex-pack
```

## Exit Condition

- `track pack list` enumerates the supported client packs
- `track pack export` writes reusable Claude Code, Codex, and Gemini CLI bundles
- every exported bundle still points at the same shared command and MCP contract
