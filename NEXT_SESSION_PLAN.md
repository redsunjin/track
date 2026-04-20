# Next Session Plan

## Active Slice

- id: `TRK-035`
- title: `Agent Operating Packs`

## Goal

Package the shared Track command and MCP contract into usable Claude Code, Codex, and Gemini CLI operating packs without forking core runtime behavior.

## First Steps

1. lock one shared operating contract for command and MCP usage
2. build thin Claude Code, Codex, and Gemini CLI packs on top of that contract
3. verify the three packs still point at the same local `.track` runtime

## Constraints

- keep local `.track` files as the source of truth
- keep client packs thin and avoid per-client runtime forks
- do not add live remote auth or tool-specific state stores
- keep CLI and MCP semantics aligned across all packs
- do not reopen completed adapter or telemetry slices unless a regression appears

## Verification

```bash
npm test
npm run check:harness
npm run status -- --no-color
npm run companion -- --no-color
npm run pitwall -- --root /Users/Agent/ps-workspace --owners --no-color
```

## Exit Condition

- Claude Code, Codex, and Gemini CLI each have a usable operating pack
- every pack points at the same shared command and MCP contract
- Track still reads as one local-first runtime rather than three client-specific systems
