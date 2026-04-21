# Harness Worksheet

## 1. Work Identity

- slice_id: `TRK-039`
- title: `Agent Pack Install Hooks`
- branch_scope: current repo mainline slice
- official_active_loop: yes
- user_visible_change: Track can install exported Claude Code, Codex, and Gemini CLI operating packs into an explicit local target with dry-run preview

## 2. Scope

- in:
  - `track pack install`
  - explicit `--out` target support
  - safe repo-local default install target
  - `--dry-run` install planning
  - install manifest
  - regression coverage for dry-run and real install paths
- out:
  - writing directly into global Claude/Codex/Gemini configuration directories
  - remote auth or marketplace publishing
  - per-client state models
  - VS Code companion changes
- assumptions:
  - the first install hook should be safe and explicit
  - global tool-specific install paths can be added later after stronger environment detection

## 3. Record System

- source_of_truth_docs:
  - [TODO.md](../../TODO.md)
  - [NEXT_SESSION_PLAN.md](../../NEXT_SESSION_PLAN.md)
  - [README.md](../../README.md)
  - [agent-operating-packs.md](../agent-operating-packs.md)
- execution_doc:
  - this worksheet
- state_files_touched:
  - `.track/state.yaml`
  - `.track/roadmap.yaml`

## 4. Outcome

Move agent packs from export-only bundles to installable local bundles while preserving the shared Track runtime contract.

## 5. Checkpoints

1. add install planning and manifest support
2. expose `track pack install` through the CLI
3. verify dry-run and real install flows and update docs

## 6. Verification

```bash
npm test
npm run check:harness
npm run status -- --no-color
node --import tsx ./src/cli.ts pack install --tool codex --out /tmp/track-codex-install --dry-run --json
node --import tsx ./src/cli.ts pack install --tool codex --out /tmp/track-codex-install
```

## 7. Exit Condition

- `track pack install` works for supported tool kinds
- `--dry-run` reports the install plan without writing files
- real install writes shared files, tool-specific files, export manifest, and install manifest
- docs explain the safe default and explicit target behavior

## 8. Control Surface Checks

- install hooks reuse the same pack registry as export
- install output does not create a second source of truth
- harness state, docs, and runtime remain aligned while `TRK-039` is active

## 9. Risks

- install command accidentally writing into global tool config directories
- install output drifting from export output
- dry-run behavior becoming misleading

## 10. Mitigations

- require explicit `--out` for non-default installs
- default to repo-local `.track/agent-installs/<tool>`
- implement install by reusing the export path
- test dry-run and real install side by side
