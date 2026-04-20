# Harness Worksheet

- slice_id: `TRK-036`
- title: `Installable Agent Packs`
- branch_scope: current repo mainline slice
- official_active_loop: yes
- user_visible_change: Track can export reusable Claude Code, Codex, and Gemini CLI operating-pack bundles through one shared CLI path

## Outcome

Add a first executable export path for the agent operating packs so the shared contract can leave the repo as a reusable bundle rather than staying as documentation only.

## In Scope

- pack registry and export helpers
- `track pack list`
- `track pack export --tool <kind> --out <dir>`
- export manifest and bundle layout
- regression coverage for exported shared and tool-specific files
- control-plane updates for the new slice

## Out of Scope

- writing directly into Claude/Codex/Gemini global config directories
- live remote auth or vendor APIs
- client-specific runtime forks
- IDE widget or tree-view work

## Constraints

- local `.track` files stay the source of truth
- exported packs must stay thin wrappers over the shared CLI/MCP contract
- export output should copy the existing repo pack assets rather than inventing new semantics
- do not reopen completed telemetry or adapter slices unless a regression appears

## References

- [README.md](../../README.md)
- [plugin-architecture.md](../plugin-architecture.md)
- [deep-dive-report.md](../deep-dive-report.md)
- [agent-operating-packs.md](../agent-operating-packs.md)
- [MCP_CONTRACT.md](../MCP_CONTRACT.md)

## Checkpoints

1. add a registry-backed export contract for supported agent packs
2. wire the export path into the CLI
3. verify exported bundles and update the control-plane docs

## Verification

```bash
npm test
npm run check:harness
npm run status -- --no-color
node --import tsx ./src/cli.ts pack list
node --import tsx ./src/cli.ts pack export --tool codex --out /tmp/track-codex-pack
```

## Exit Condition

- `track pack list` enumerates the supported client packs
- `track pack export` writes a reusable bundle for Claude Code, Codex, and Gemini CLI
- exported bundles include shared helper scripts and one tool-specific pack
- docs and control-plane state point at the new slice consistently

## Control Surface Checks

- export output stays aligned with the same shared Track command and MCP vocabulary
- pack exports do not fork or rename Track task/checkpoint semantics
- harness state, docs, and runtime remain aligned while `TRK-036` is active

## Risks

- export docs drifting away from the source pack files
- writing bundles that break relative links between shared and tool-specific assets
- control-plane docs showing the old slice after the export path lands

## Mitigations

- copy existing `agents/shared` and tool-specific pack files directly
- keep one manifest format and test every supported tool kind
- update `TODO.md`, `NEXT_SESSION_PLAN.md`, and `.track` state together
