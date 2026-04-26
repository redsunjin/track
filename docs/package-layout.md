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

These package exports now resolve to compiled release artifacts under `dist/`.
They are not yet independent npm packages.

## Build Artifacts

`npm run build` compiles `src/**/*.ts` into `dist/` using [tsconfig.build.json](../tsconfig.build.json).
The build emits JavaScript, source maps, declarations, and declaration maps.

This is the current release baseline:

- `src/` remains the local development and source-boundary surface
- `dist/` is generated and included in `package.json.files`
- `package.json.exports` points public subpaths at `dist/**/*.js` with matching declaration targets
- `bin.track` points at `dist/cli.js`
- `npm run package:build-check` builds root runtime artifacts, builds the VS Code extension, and then runs the package dry-run through `node dist/cli.js`

The root package still remains `private: true`, so this is a release-manifest readiness baseline rather than an npm publishing step.

The public npm package target is now `@redsunjin/track`.
The unscoped `track` package name is already unavailable on npm, so public release work must move through the scoped package path documented in [public-npm-release-roadmap.md](./public-npm-release-roadmap.md).

## Extension subpaths

The repo may also expose experimental extension subpaths when a new operator surface is being incubated inside the monorepo before its long-term package boundary is settled.

Current extension-oriented subpaths:

- `track/openclaw-adapter`
- `track/openclaw-live`
- `track/openclaw-monitor`
- `track/pitwall-monitor`
- `track/bot-bridge`

These are intentionally treated as extension surfaces, not yet part of the formal publishable package split above.

## Guardrail

Run:

```bash
npm run build
npm run vscode:build
npm run package:check
npm run package:dry-run
npm run package:build-check
npm run package:install-smoke
npm run package:handoff
npm run package:readiness
npm run package:publish-guard
npm run package:rc-tag
npm pack --dry-run --json
```

This verifies that every declared boundary has an entrypoint and that the owned source paths still exist.
The dry-run check also verifies that `package.json.files` covers `dist`, boundary entrypoints, exported subpaths, CLI bin target, and package layout docs before any physical npm packing step.
Export and bin targets must exist, so run the build scripts before invoking `node dist/cli.js package dry-run` directly.
The install smoke creates a temporary tarball and consumer project, installs Track from that tarball, imports public subpaths, and runs the installed `track` bin.

Track's root package remains `private: true`.
`package dry-run` is therefore a distribution-readiness check, not a publishing command.

The next public-release manifest step is the scoped package switch:

- `package.json.name` -> `@redsunjin/track`
- `private` -> `false`
- `publishConfig.access` -> `public`
- package import smokes -> `@redsunjin/track` subpaths
- CLI bin remains `track`

## Readiness Gate

Use the release gate before treating the package as ready for a handoff:

```bash
track package readiness
track package gate
npm run package:readiness
```

The gate verifies:

- required verification scripts exist: build, typecheck, test, harness, package dry-run, and install smoke
- package dry-run is clean
- `npm pack --dry-run --json` has the manifest coverage it needs
- release mode is explicit

Current release mode is `private-root`.
That means distribution artifacts can be checked and handed off, but npm publish is intentionally blocked until `private` is changed deliberately.

## Handoff Notes

Use the handoff command when someone needs the current release picture in one pasteable block:

```bash
track package handoff
track package notes
npm run package:handoff
```

The handoff note includes:

- release status summary derived from the readiness gate
- recommended verification commands
- public package subpaths
- package boundary release entrypoints
- reference docs for the handoff receiver

When the package is still `private-root`, the note explicitly says it is ready for artifact handoff but not for npm publish.

## Publish Mode Guard

Use the publish mode guard before changing `package.json.private`:

```bash
track package publish-guard
track package mode-guard
track package publish-guard --target publishable
npm run package:publish-guard
```

The default guard describes the current mode.
In the current repo state it should report `private-held`, meaning `private: true` is still blocking `npm publish`.

`--target publishable` evaluates a deliberate switch before the manifest is edited.
That path checks:

- package readiness is green
- exports, files, docs, and bin targets are covered by the dry-run
- `private` is explicit
- publishable mode has explicit `publishConfig`

If any of those checks fail, the guard reports `switch-blocked`.
The guard does not publish, tag, or modify `package.json`.

## Release Candidate Tag Dry Run

Use the RC tag dry-run when the package state is ready and the next step is a human-reviewed git tag:

```bash
track package rc-tag
track package tag-dry-run
track package rc-tag --rc 1
track package rc-tag --tag v0.1.0-rc.1
npm run package:rc-tag
```

The default candidate is derived from `package.json.version`.
For `0.1.0`, the default tag is `v0.1.0-rc.0`.

The dry-run checks:

- package readiness is green
- publish mode guard is green
- the candidate tag matches `v<major>.<minor>.<patch>-rc.<n>`
- the candidate tag does not already exist in local git tags

The command prints the exact `git tag -a ...` and `git push origin ...` commands to run manually.
It does not create a tag, push a tag, mutate `package.json`, or publish to npm.

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
