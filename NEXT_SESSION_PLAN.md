# Next Session Plan

## Active Slice

- id: `TRK-055`
- title: `Publishable RC Gate Tightening`

## Goal

Make `track package rc-tag` mean public-release readiness, not just private artifact readiness.

## First Steps

1. require `publishable-ready` publish guard status for the default RC tag dry-run
2. block private-root artifact RC tags unless explicitly requested
3. add a clear `--allow-private-root` escape hatch for artifact-only RC tags
4. cover both paths with regression tests and docs

## Constraints

- do not publish to npm
- do not create or push git tags
- keep default RC behavior aligned to public npm release readiness
- keep private-root artifact behavior explicit and visibly non-publishable

## Verification

```bash
npm test
npm run typecheck
npm run check:harness
npm run package:readiness
npm run package:publish-guard
npm run package:rc-tag
node --import tsx ./src/cli.ts package rc-tag --allow-private-root
git diff --check
```

## Exit Condition

- default RC tag dry-run requires `publishable-ready`
- private-root fixture is blocked by default
- explicit private-root artifact override is tested
- docs and harness state point at `TRK-055`
