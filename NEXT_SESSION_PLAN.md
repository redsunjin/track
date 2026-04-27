# Next Session Plan

## Active Slice

- id: `TRK-054`
- title: `Scoped Package Manifest Switch`

## Goal

Switch Track from the unavailable unscoped `track` package identity to the public scoped package `@redsunjin/track` while keeping the installed CLI command as `track`.

## First Steps

1. update `package.json` and `package-lock.json` to `@redsunjin/track`
2. set `private: false` and `publishConfig.access: public`
3. switch package import tests and install smoke to `@redsunjin/track` subpaths
4. verify publishable manifest guard output

## Constraints

- do not publish to npm
- do not create or push git tags
- keep CLI bin name as `track`
- keep actual release execution behind release-owner confirmation

## Verification

```bash
npm test
npm run typecheck
npm run check:harness
npm run package:check
npm run package:dry-run
npm run package:readiness
npm run package:publish-guard
node --import tsx ./src/cli.ts package publish-guard --target publishable
npm run package:rc-tag
npm run package:install-smoke
npm pack --dry-run --json
```

## Exit Condition

- scoped public manifest is in place
- install smoke uses `@redsunjin/track` imports
- publish guard reports the package as publishable-ready
- package dry-run, readiness, RC tag dry-run, install smoke, and npm pack dry-run are green
