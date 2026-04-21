# Track Companion for VS Code

This folder contains the VS Code companion scaffold for `Track`.

Current scope:

- command registration
- status bar indicator
- compact corner telemetry tooltip
- `Track Course` Explorer tree view
- companion webview panel
- file-watch refresh for local `.track/state.yaml`
- shared runtime data through `track control --json`

## Commands

- `Track: Open Companion`
- `Track: Refresh Companion`

## Views

- `Track Course`
  - appears in Explorer
  - shows signal, next actions, task board, and recent events from the local Track control snapshot

## Development

From the repo root:

```bash
npm run vscode:build
npm run vscode:check
```

To launch the extension host in VS Code:

1. open this repository in VS Code
2. run `Track Companion Extension Host` from Run and Debug
3. open a workspace that contains `.track/state.yaml`
4. run `Track: Open Companion`

The extension intentionally shells out to the local Track CLI so the IDE panel reads the same summary model as the terminal surfaces.
