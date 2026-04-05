# Next Session Plan

## Active Slice

- id: `TRK-031`
- title: `VS Code Companion`

## Goal

Establish the first IDE-side Track companion:

- surface the same Track summary inside VS Code
- preserve the existing local `.track` state model
- avoid inventing a separate IDE-only status source

## First Steps

1. define the signal palette and no-color fallback rule
2. scaffold the extension manifest and command set
3. render a minimal companion summary panel
4. wire the panel to local `.track/state.yaml`

## Constraints

- keep local `.track` files as the source of truth
- do not add browser-first work
- do not fork state logic away from the shared runtime

## Verification

```bash
npm test
```

Manual checks after implementation:

```bash
npm run status -- --no-color
npm run lab -- --no-color
npm run pitwall -- --root /Users/Agent/ps-workspace --owners --no-color
```

## Exit Condition

- a minimal VS Code companion exists and reflects current Track summary
- tests still pass
- docs stay aligned with the active loop
