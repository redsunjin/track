# Next Session Plan

## Active Slice

- id: `TRK-030`
- title: `External Roadmap Adapters`

## Goal

Turn the existing generic import path into an adapter-backed external roadmap baseline that can support future provider-specific sources without changing Track's local runtime model.

## First Steps

1. land the intermediate roadmap schema and file adapter baseline as the official `track import` path
2. keep `notion` as the first fixture-backed provider entry point on top of that shared contract
3. expand from registry-backed provider hooks instead of jumping straight into network-bound integrations

## Constraints

- keep local `.track` files as the source of truth
- keep vendor-specific adapters thin and normalize them into one shared intermediate schema
- do not add remote auth or write-back flows before the adapter contract is stable
- keep the existing `track import` CLI shape stable while the implementation moves under adapters
- treat fixture-backed provider adapters as the proving ground before any live API integration
- do not reopen the completed retro telemetry slice unless a regression appears

## Verification

```bash
npm test
npm run check:harness
npm run import -- --source examples/external-plan.example.yaml --dry-run --json
npm run status -- --no-color
npm run pitwall -- --root /Users/Agent/ps-workspace --owners --no-color
```

## Exit Condition

- the file-backed adapter path is the documented baseline for `track import`
- Track has one shared intermediate roadmap schema for future adapters
- at least one provider-specific adapter entry point works without changing local runtime ownership
