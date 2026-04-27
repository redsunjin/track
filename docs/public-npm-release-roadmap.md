# Public npm Release Roadmap

## Decision

Track's release target is now public npm distribution.

The unscoped `track` package name is already taken on npm, so the public package target is:

- package name: `@redsunjin/track`
- CLI bin: `track`
- release access: public scoped package

The current repo state is now a scoped publishable manifest baseline:

- `package.json.name`: `@redsunjin/track`
- `package.json.private`: `false`
- `package.json.publishConfig.access`: `public`

The package has not been published from this repo in this slice.

## Release Definition Of Done

Public release is not complete until all of these are true:

- package name is switched to `@redsunjin/track`
- `package.json.private` is `false`
- `publishConfig.access` is `public`
- package imports and install smoke use `@redsunjin/track` subpaths
- `track` bin still works after tarball install
- `track package publish-guard --target publishable` passes
- `track package rc-tag` only reports ready for publishable release state
- npm authentication is available on the release machine
- `npm publish --dry-run --access public` passes
- the release owner explicitly runs the final publish command

## Locked Sequence

### TRK-053 Public NPM Release Roadmap Lock

Lock the public release target, package name, release criteria, and remaining slices.

Exit condition:

- this document exists
- TODO, session plan, roadmap, state, and worksheet all point at the public npm target
- package remained private and unpublished during the roadmap-lock slice

### TRK-054 Scoped Package Manifest Switch

Switch package identity from `track` to `@redsunjin/track`.

Completed changes:

- update `package.json.name`
- set `private: false`
- add `publishConfig.access: public`
- update install smoke imports to `@redsunjin/track`
- keep CLI bin name as `track`
- update docs and package tests

Exit condition:

- package dry-run and install smoke pass with scoped imports
- publish guard target `publishable` passes locally

### TRK-055 Publishable RC Gate Tightening

Make RC tag readiness mean publishable readiness, not private artifact readiness.

Completed changes:

- `track package rc-tag` requires publishable guard success by default
- private artifact RC behavior is explicit through `--allow-private-root`
- docs explain the distinction

Exit condition:

- `track package rc-tag` cannot report ready while publishable mode is blocked

### TRK-056 Release Notes Draft Generator

Generate a release note draft from the locked package state and recent release slices.

Completed changes:

- add `track package release-notes` and `npm run package:release-notes`
- include package name, version, install command, CLI usage, and verification summary

Exit condition:

- release notes are generated without manual archaeology

### TRK-057 npm Publish Dry Run

Run the full public npm publish dry-run path.

Expected checks:

- `track package publish-dry-run`
- `npm run package:publish-dry-run`
- `npm whoami`
- `npm pack --dry-run --json`
- `npm publish --dry-run --access public`
- package install smoke

Current result:

- `npm pack --dry-run --json`: passed
- `npm publish --dry-run --access public`: passed as a dry-run
- `npm run package:install-smoke`: passed
- `npm whoami`: passed as `redsunjin`
- `bin.track`: normalized to `dist/cli.js` so npm does not auto-correct the manifest during publish dry-run
- `track package publish-dry-run`: passed with `publish-dry-run-ready`

Exit condition:

- release owner can see the exact final publish command and all dry-runs are green
- npm authentication passed before moving to `TRK-058`

### TRK-058 Public Release Execution

Execute the release only after owner confirmation.

Expected steps:

- create the RC or release tag
- push the tag
- publish `@redsunjin/track`
- verify npm registry metadata
- verify clean consumer install

Current gate:

- `TRK-058` is active
- final publish command is `npm publish --access public`
- actual tag creation and npm publish still require explicit release-owner approval

Exit condition:

- `npm install @redsunjin/track` works in a clean consumer
- `npx @redsunjin/track` or installed `track` bin path works as documented

## Non-Goals

- do not publish under unscoped `track`
- do not publish from an unauthenticated machine
- do not create tags as part of dry-run commands
- do not change the CLI bin name away from `track`
