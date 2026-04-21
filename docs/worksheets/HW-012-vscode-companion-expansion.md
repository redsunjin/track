# Harness Worksheet

## 1. Work Identity

- slice_id: `TRK-038`
- title: `VS Code Companion Expansion`
- branch_scope: current repo mainline slice
- official_active_loop: yes
- user_visible_change: VS Code companion gains a Track Course tree view and a stronger compact corner telemetry signal

## 2. Scope

- in:
  - VS Code `Track Course` tree view contribution
  - extension host tree data provider
  - compact status-bar corner telemetry treatment
  - control-snapshot-backed companion data loading
  - extension host smoke coverage and docs
- out:
  - publishing the VS Code extension
  - custom activity-bar icon assets
  - browser-first standalone dashboard work
  - tool-global pack install hooks
- assumptions:
  - VS Code remains a companion surface, not the source of truth
  - the extension should shell out to the local Track CLI instead of keeping its own state model

## 3. Record System

- source_of_truth_docs:
  - [TODO.md](../../TODO.md)
  - [NEXT_SESSION_PLAN.md](../../NEXT_SESSION_PLAN.md)
  - [README.md](../../README.md)
  - [plugin-architecture.md](../plugin-architecture.md)
  - [retro-telemetry-dashboard-plan.md](../retro-telemetry-dashboard-plan.md)
- execution_doc:
  - this worksheet
- state_files_touched:
  - `.track/state.yaml`
  - `.track/roadmap.yaml`

## 4. Outcome

Make the VS Code companion useful when the webview is not open by adding a navigable course tree and tightening the always-visible status-bar signal.

## 5. Checkpoints

1. add the VS Code tree view contribution and provider
2. wire the tree and corner signal to the shared Track control snapshot
3. verify extension host, docs, and control-plane alignment

## 6. Verification

```bash
npm test
npm run check:harness
npm run status -- --no-color
npm run vscode:build
npm run vscode:check
```

## 7. Exit Condition

- VS Code contributes a `Track Course` tree view
- the tree shows signal, next actions, task board, and recent events from the same Track state
- the status bar reads as a compact corner telemetry widget
- extension host smoke coverage verifies the new view registration

## 8. Control Surface Checks

- the extension still uses the local Track CLI and `.track` files
- webview, status bar, and tree view share the same summary/control vocabulary
- terminal and MCP behavior remain unchanged

## 9. Risks

- tree view becoming a second dashboard product
- VS Code state drifting from the CLI control snapshot
- status bar copy becoming too noisy for daily use

## 10. Mitigations

- keep the tree compact and operational
- load tree data through `track control --json`
- keep the status-bar text short and move detail into the tooltip
