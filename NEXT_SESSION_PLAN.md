# Next Session Plan

## Active Slice

- id: `none`
- title: `Select next roadmap slice`

## Goal

Close out the completed VS Code companion milestone and choose the next roadmap version:

- keep the completed Track MVP milestone at 100%
- decide what the next roadmap version should contain
- avoid reopening finished work unless a regression appears

## First Steps

1. review the current roadmap and decide whether the next slice is adapters, packaging, or release polish
2. add a new roadmap version before starting fresh task work
3. promote exactly one new slice into `TODO.md`
4. update `.track/state.yaml` and `.track/roadmap.yaml` together

## Constraints

- keep local `.track` files as the source of truth
- do not add browser-first work
- do not fork state logic away from the shared runtime

## Verification

```bash
npm test
npm run vscode:build
npm run vscode:check
```

Manual checks after implementation:

```bash
npm run status -- --no-color
npm run lab -- --no-color
npm run pitwall -- --root /Users/Agent/ps-workspace --owners --no-color
```

## Exit Condition

- one new active slice is selected
- roadmap and state both reflect that next slice
- completed TRK-031 stays closed unless a regression is found
