# Next Session Plan

## Active Slice

- id: `TRK-037`
- title: `MCP Control Snapshot Expansion`

## Goal

Expand the Track MCP read surface with structured task-list, next-action, and control-snapshot tools so agent clients can read one richer control model directly.

## First Steps

1. define one shared control-snapshot helper over the existing Track state model
2. expose task-list, next-action, and control-snapshot tools through MCP
3. verify the richer MCP payloads stay aligned with the terminal summary vocabulary

## Constraints

- keep local `.track` files as the source of truth
- keep MCP reads thin and avoid reimplementing state semantics per tool
- do not add new MCP write mutations in this slice
- keep CLI and MCP semantics aligned across all surfaces
- do not reopen completed adapter, telemetry, or pack-export slices unless a regression appears

## Verification

```bash
npm test
npm run check:harness
npm run status -- --no-color
node --import tsx ./src/cli.ts mcp-smoke-test
```

## Exit Condition

- MCP exposes structured task-list, next-action, and control-snapshot tools
- richer MCP reads still point at the same shared local `.track` runtime
- agent clients can read one control payload without scraping terminal text
