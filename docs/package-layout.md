# Package Layout

Track is still developed in one repository, but the runtime now has explicit publishable package boundaries.
The goal is to make future package extraction mechanical instead of guessing ownership from file names.

## Boundary Map

| Package | Entrypoint | Responsibility |
| --- | --- | --- |
| `track-core` | `src/packages/core.ts` | Canonical types, summaries, control snapshots, and track-map generation. |
| `track-runtime` | `src/packages/runtime.ts` | File-backed state, mutation, import adapters, and Pitwall runtime helpers. |
| `track-mcp` | `src/packages/mcp.ts` | MCP server, tool declarations, stdio transport, and MCP contract docs. |
| `track-cli` | `src/packages/cli.ts` | Terminal command support, renderers, aliases, and watch surfaces. |
| `track-agents` | `src/packages/agents.ts` | Claude Code, Codex, Gemini CLI operating packs plus export/install helpers. |
| `track-vscode` | `vscode-extension/src/extension.ts` | VS Code companion extension, course tree, webview, and status-bar telemetry. |

## Current Package Exports

The root package exposes subpaths that mirror the boundary map:

- `track/core`
- `track/runtime`
- `track/mcp`
- `track/cli`
- `track/agents`
- `track/vscode`
- `track/package-layout`

These are source-level exports for the current local-first runtime.
They are not yet independent npm packages.

## Guardrail

Run:

```bash
npm run package:check
```

This verifies that every declared boundary has an entrypoint and that the owned source paths still exist.

## Extraction Rule

When Track becomes multi-package, extraction should follow this order:

1. `track-core`
2. `track-runtime`
3. `track-mcp`
4. `track-cli`
5. `track-agents`
6. `track-vscode`

`track-core` should stay dependency-light.
Other packages should depend on it rather than duplicating schema, summary, or control-snapshot logic.
