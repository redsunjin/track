# Next Session Plan

## Active Slice

- id: `TRK-039`
- title: `Agent Pack Install Hooks`

## Goal

Add safe local install hooks for exported Claude Code, Codex, and Gemini CLI operating packs so a bundle can be placed into an explicit target with dry-run preview.

## First Steps

1. add install planning and manifest support to the agent pack runtime
2. expose `track pack install --tool <kind> --out <dir>` through the CLI
3. verify dry-run and real install paths remain aligned with export output

## Constraints

- keep local `.track` files as the source of truth
- keep install hooks safe and explicit
- do not write directly into global Claude/Codex/Gemini config directories in this slice
- do not introduce client-specific state models
- keep export and install bundle layouts aligned

## Verification

```bash
npm test
npm run check:harness
npm run status -- --no-color
node --import tsx ./src/cli.ts pack install --tool codex --out /tmp/track-codex-install --dry-run --json
node --import tsx ./src/cli.ts pack install --tool codex --out /tmp/track-codex-install
```

## Exit Condition

- `track pack install` works for supported tool kinds
- dry-run reports the planned files without writing
- real install writes shared files, tool-specific files, export manifest, and install manifest
