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

- `@redsunjin/track/core`
- `@redsunjin/track/runtime`
- `@redsunjin/track/mcp`
- `@redsunjin/track/cli`
- `@redsunjin/track/agents`
- `@redsunjin/track/vscode`
- `@redsunjin/track/package-layout`

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

The root package is now scoped for public npm as `@redsunjin/track` with `private: false` and `publishConfig.access: public`.
The CLI bin intentionally remains `track`.
The unscoped `track` package name is already unavailable on npm, so public release work must move through the scoped package path documented in [public-npm-release-roadmap.md](./public-npm-release-roadmap.md).

## Extension subpaths

The repo may also expose experimental extension subpaths when a new operator surface is being incubated inside the monorepo before its long-term package boundary is settled.

Current extension-oriented subpaths:

- `@redsunjin/track/openclaw-adapter`
- `@redsunjin/track/openclaw-live`
- `@redsunjin/track/openclaw-monitor`
- `@redsunjin/track/pitwall-monitor`
- `@redsunjin/track/bot-bridge`

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
npm run package:release-notes
npm pack --dry-run --json
```

This verifies that every declared boundary has an entrypoint and that the owned source paths still exist.
The dry-run check also verifies that `package.json.files` covers `dist`, boundary entrypoints, exported subpaths, CLI bin target, and package layout docs before any physical npm packing step.
Export and bin targets must exist, so run the build scripts before invoking `node dist/cli.js package dry-run` directly.
The install smoke creates a temporary tarball and consumer project, installs Track from that tarball, imports public subpaths, and runs the installed `track` bin.

Track's root package is now scoped and publishable in the manifest.
`package dry-run` is still only a distribution-readiness check; it does not publish, tag, or authenticate with npm.

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

Current release mode is `publishable`.
That means the manifest is shaped for public npm, but actual publish execution still requires release-owner npm authentication and an explicit publish command.

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

When the package is `publishable`, the note reports `ready-publishable` and lists the verification commands and public package subpaths for release handoff.

## Publish Mode Guard

Use the publish mode guard before publish dry-runs or release handoff:

```bash
track package publish-guard
track package mode-guard
track package publish-guard --target publishable
npm run package:publish-guard
```

The default guard describes the current mode.
In the current repo state it should report `publishable-ready`, meaning the scoped package manifest is public-ready and release readiness gates are green.

`--target publishable` evaluates the public package state explicitly.
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
track package rc-tag --allow-private-root
npm run package:rc-tag
```

The default candidate is derived from `package.json.version`.
For `0.1.0`, the default tag is `v0.1.0-rc.0`.

The dry-run checks:

- package readiness is green
- publish mode guard reports `publishable-ready`
- the candidate tag matches `v<major>.<minor>.<patch>-rc.<n>`
- the candidate tag does not already exist in local git tags

Private-root artifact RC tags are blocked by default even when private artifact readiness is green.
Use `--allow-private-root` only when intentionally preparing a non-publishable artifact tag.

The command prints the exact `git tag -a ...` and `git push origin ...` commands to run manually.
It does not create a tag, push a tag, mutate `package.json`, or publish to npm.

## Release Notes Draft

Use the release notes draft when the package state is ready and the release owner needs a pasteable public-release note:

```bash
track package release-notes
track package notes-draft
track package release-notes --rc 1
npm run package:release-notes
```

The draft includes:

- package name and version
- install and `npx` commands
- CLI quick-start commands
- public import subpaths
- recent release slices from the release roadmap work
- verification command summary
- RC tag dry-run status and tag commands

The command does not publish to npm, create a git tag, or push a tag.
If readiness, publish guard, or RC tag dry-run is blocked, the draft renders `release-notes-blocked`.

## npm Publish Dry Run

Use the registry publish dry-run only after the package readiness, publish guard, RC tag dry-run, and release notes draft are green:

```bash
npm whoami
npm pack --dry-run --json
npm publish --dry-run --access public
npm run package:install-smoke
```

The publish dry-run does not publish the package, but real publish execution still requires npm authentication.
The final publish command remains:

```bash
npm publish --access public
```

Keep `bin.track` as `dist/cli.js`.
Using `./dist/cli.js` works locally, but npm normalizes it during publish dry-run and reports an auto-correction warning.

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
