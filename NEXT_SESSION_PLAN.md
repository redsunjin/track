# Next Session Plan

## Active Slice

- id: `TRK-057`
- title: `npm Publish Dry Run`

## Goal

Complete the public npm dry-run lane without publishing, and make the remaining release-owner blocker explicit.

## First Steps

1. release owner runs `npm login` or `npm adduser` on the release machine
2. verify `npm whoami`
3. rerun `npm publish --dry-run --access public`
4. rerun `npm run package:install-smoke`
5. confirm the final publish command remains `npm publish --access public`

## Current Result

- `npm pack --dry-run --json`: passed
- `npm publish --dry-run --access public`: passed as a dry-run after normalizing `bin.track` to `dist/cli.js`
- `npm run package:install-smoke`: passed
- `npm whoami`: blocked with `ENEEDAUTH`

## Constraints

- do not publish to npm
- do not create or push git tags
- do not proceed to `TRK-058` until npm authentication is available and the release owner confirms final execution
- keep npm auth failures visible instead of treating the dry-run as release-ready

## Verification

```bash
npm test
npm run typecheck
npm run check:harness
npm pack --dry-run --json
npm publish --dry-run --access public
npm run package:install-smoke
npm whoami
git diff --check
```

## Exit Condition

- npm auth preflight passes on the release machine
- public publish dry-run still passes after auth is available
- docs and harness state show whether `TRK-057` is ready or blocked
- final publish command is visible but not executed
