# Next Session Plan

## Active Slice

- id: `TRK-053`
- title: `Public NPM Release Roadmap Lock`

## Goal

Lock the public npm release target and remaining release sequence before changing package identity or running publish commands.

## First Steps

1. document the public package target as `@redsunjin/track`
2. define public release completion criteria
3. lock TRK-054 through TRK-058 as the release path

## Constraints

- do not publish to npm
- do not create or push git tags
- do not change `package.json.name` in this slice
- keep the current `private-root` package state intact until the scoped package switch

## Verification

```bash
npm run check:harness
npm run package:readiness
npm run package:publish-guard
npm run package:rc-tag
```

## Exit Condition

- public release target is documented as `@redsunjin/track`
- remaining release sequence is explicit through public release execution
- TODO, roadmap, state, and worksheet all agree on `TRK-053`
- next implementation slice is `TRK-054 Scoped Package Manifest Switch`
