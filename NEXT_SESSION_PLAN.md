# Next Session Plan

## Active Slice

- id: `TRK-044`
- title: `Release Manifest Switch`

## Goal

Switch Track's public package exports and CLI bin from source-level TypeScript entrypoints to compiled release artifacts under `dist`.

## First Steps

1. point package exports at `dist/**/*.js` with matching declaration targets
2. point `bin.track` at `dist/cli.js`
3. update package dry-run checks to validate release targets exist

## Constraints

- keep local `.track` files as the source of truth
- keep source boundary checks intact for future package extraction
- keep local development scripts using `src/cli.ts`
- keep root package `private: true`; do not publish in this slice
- include VS Code extension build output in release-manifest verification

## Verification

```bash
npm test
npm run typecheck
npm run check:harness
npm run build
npm run vscode:build
npm run package:dry-run
npm run package:build-check
npm pack --dry-run --json
```

## Exit Condition

- package subpath imports resolve through compiled `dist` artifacts
- `bin.track` targets `dist/cli.js`
- package dry-run validates export/bin target existence
- npm pack dry-run includes release artifacts without exposing source-level public entrypoints
