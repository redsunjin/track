# Next Session Plan

## Active Slice

- id: `TRK-040`
- title: `Package Split / Publishable Layout`

## Goal

Add explicit source-level package boundaries and package-layout checks so Track can move toward publishable package extraction without destabilizing the current runtime.

## First Steps

1. add package boundary entrypoints for core/runtime/mcp/cli/agents
2. expose `track package list` and `track package check`
3. document the package layout and verify the boundary map

## Constraints

- keep local `.track` files as the source of truth
- keep this as a source-level baseline, not a physical workspace split
- do not publish npm packages in this slice
- do not move runtime files unless required for boundary entrypoints
- package docs must not overclaim independent package publishing

## Verification

```bash
npm test
npm run check:harness
npm run status -- --no-color
npm run package:check
node --import tsx ./src/cli.ts package list
```

## Exit Condition

- package boundaries exist for `track-core`, `track-runtime`, `track-mcp`, `track-cli`, `track-agents`, and `track-vscode`
- root package exports mirror the boundary map
- package layout checks pass with the normal harness
