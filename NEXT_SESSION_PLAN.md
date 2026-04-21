# Next Session Plan

## Active Slice

- id: `TRK-038`
- title: `VS Code Companion Expansion`

## Goal

Expand the VS Code companion beyond a webview-only surface by adding a compact course tree and strengthening the always-visible corner telemetry signal.

## First Steps

1. add a `Track Course` tree view contribution and provider
2. wire the tree and status bar to the shared Track control snapshot
3. verify the extension host smoke path, docs, and runtime state stay aligned

## Constraints

- keep local `.track` files as the source of truth
- keep VS Code as a companion surface, not the source of truth
- do not introduce a separate VS Code state model
- keep terminal and MCP surfaces unchanged unless a regression appears
- do not add publishing or marketplace work in this slice

## Verification

```bash
npm test
npm run check:harness
npm run status -- --no-color
npm run vscode:build
npm run vscode:check
```

## Exit Condition

- VS Code contributes a `Track Course` tree view
- the status bar reads as a compact corner telemetry widget
- tree, webview, and status bar all read from the same local Track runtime
