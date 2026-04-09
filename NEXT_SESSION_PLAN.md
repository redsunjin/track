# Next Session Plan

## Active Slice

- id: `none`
- title: `Select next roadmap slice`

## Goal

Select the next Track roadmap slice after `TRK-032` completion.

## First Steps

1. review queued and parked backlog items
2. choose the next active slice and worksheet
3. update `TODO.md`, `.track/state.yaml`, and this plan together

## Constraints

- keep local `.track` files as the source of truth
- do not reopen completed slices without a specific regression or new scope
- keep terminal and MCP surfaces green while selecting the next step

## Verification

```bash
npm test
npm run status -- --no-color
npm run lab -- --no-color
npm run pitwall -- --root /Users/Agent/ps-workspace --owners --no-color
```

## Exit Condition

- one new active slice is selected
- control-plane docs and self-track state match that selection
