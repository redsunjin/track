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

## Build Artifacts

`npm run build` compiles `src/**/*.ts` into `dist/` using [tsconfig.build.json](../tsconfig.build.json).
The build emits JavaScript, source maps, declarations, and declaration maps.

This is the current release baseline:

- `src/` remains the local development and test entrypoint surface
- `dist/` is generated and included in `package.json.files`
- `npm run package:build-check` builds `dist/` and then runs the package dry-run through `node dist/cli.js`

The package exports and CLI bin still point at source-level entrypoints in this slice.
Switching exports/bin to compiled `dist` targets should happen as a separate release-manifest slice after the built CLI path is stable.

## Extension subpaths

The repo may also expose experimental extension subpaths when a new operator surface is being incubated inside the monorepo before its long-term package boundary is settled.

Current extension-oriented subpaths:

- `track/openclaw-adapter`
- `track/openclaw-monitor`
- `track/pitwall-monitor`
- `track/bot-bridge`

These are intentionally treated as extension surfaces, not yet part of the formal publishable package split above.

## Guardrail

Run:

```bash
npm run build
npm run package:check
npm run package:dry-run
npm run package:build-check
npm pack --dry-run --json
```

This verifies that every declared boundary has an entrypoint and that the owned source paths still exist.
The dry-run check also verifies that `package.json.files` covers `dist`, boundary entrypoints, exported subpaths, CLI bin target, and package layout docs before any physical npm packing step.

Track's root package remains `private: true`.
`package dry-run` is therefore a distribution-readiness check, not a publishing command.

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
