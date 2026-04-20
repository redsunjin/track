# Harness Worksheet

## 1. Work Identity

- slice_id: `TRK-037`
- title: `MCP Control Snapshot Expansion`
- branch_scope: current repo mainline slice
- official_active_loop: yes
- user_visible_change: Track MCP gains structured task-list, next-action, and control-snapshot read tools for agent clients

## 2. Scope

- in:
  - `list_track_tasks`
  - `get_track_next_actions`
  - `get_track_control_snapshot`
  - shared runtime helper for MCP control snapshots
  - MCP contract and regression updates
- out:
  - new write-side MCP mutations
  - tool-global install hooks for exported packs
  - VS Code widget or tree-view work
- assumptions:
  - the shared `.track` runtime remains the source of truth
  - new MCP read tools should layer on top of existing summary logic instead of replacing it

## 3. Record System

- source_of_truth_docs:
  - [TODO.md](../../TODO.md)
  - [NEXT_SESSION_PLAN.md](../../NEXT_SESSION_PLAN.md)
  - [README.md](../../README.md)
  - [MCP_CONTRACT.md](../MCP_CONTRACT.md)
  - [plugin-architecture.md](../plugin-architecture.md)
- execution_doc:
  - this worksheet
- state_files_touched:
  - `.track/state.yaml`
  - `.track/roadmap.yaml`

## 4. Outcome

Agent clients should be able to ask Track for one structured control payload instead of stitching together multiple terminal-style reads.

## 5. Checkpoints

1. add runtime helpers for task-list and next-action projection
2. expose the new control tools through MCP
3. update MCP docs and verify structured payloads end-to-end

## 6. Verification

```bash
npm test
npm run check:harness
npm run status -- --no-color
node --import tsx ./src/cli.ts mcp-smoke-test
```

## 7. Exit Condition

- MCP exposes structured task-list, next-action, and control-snapshot tools
- new read tools reuse the same local Track summary/runtime logic
- docs and runtime stay aligned while `TRK-037` is active

## 8. Control Surface Checks

- `tools/list` includes the new read tools in default read-only mode
- control snapshot stays coherent with `track status`
- agent-pack docs can point at the expanded MCP surface without redefining runtime semantics

## 9. Risks

- MCP control tools drifting away from terminal summary vocabulary
- multiple helper paths reimplementing current-checkpoint logic
- docs forgetting to record the new read tools after code lands

## 10. Mitigations

- build one shared control-snapshot helper and reuse it
- keep `get_track_status` unchanged while adding richer tools alongside it
- update `MCP_CONTRACT.md`, `TODO.md`, `NEXT_SESSION_PLAN.md`, and `.track` state together
