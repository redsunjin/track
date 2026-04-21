# Harness Worksheet

## 1. Work Identity

- slice_id: `TRK-040`
- title: `Package Split / Publishable Layout`
- branch_scope: current repo mainline slice
- official_active_loop: yes
- user_visible_change: Track gains explicit package boundaries and package-layout checks for future publishable extraction

## 2. Scope

- in:
  - source-level package boundary map
  - package entrypoints for core/runtime/mcp/cli/agents
  - root package subpath exports
  - `track package list`
  - `track package check`
  - package layout docs and tests
- out:
  - physically moving source files into separate workspaces
  - publishing npm packages
  - changing runtime import paths across the whole codebase
  - package manager migration
- assumptions:
  - this slice should make extraction mechanical without destabilizing current source layout
  - package boundaries should be executable checks, not just prose

## 3. Record System

- source_of_truth_docs:
  - [TODO.md](../../TODO.md)
  - [NEXT_SESSION_PLAN.md](../../NEXT_SESSION_PLAN.md)
  - [README.md](../../README.md)
  - [package-layout.md](../package-layout.md)
  - [deep-dive-report.md](../deep-dive-report.md)
- execution_doc:
  - this worksheet
- state_files_touched:
  - `.track/state.yaml`
  - `.track/roadmap.yaml`

## 4. Outcome

Track should have a clear, testable package split baseline before any physical package extraction or publishing work starts.

## 5. Checkpoints

1. add package boundary entrypoints and subpath exports
2. add package layout checks through the CLI
3. document the package layout and update control-plane state

## 6. Verification

```bash
npm test
npm run check:harness
npm run status -- --no-color
npm run package:check
node --import tsx ./src/cli.ts package list
```

## 7. Exit Condition

- package boundaries exist for `track-core`, `track-runtime`, `track-mcp`, `track-cli`, `track-agents`, and `track-vscode`
- root package exports mirror the boundary map
- `npm run package:check` catches missing boundary entrypoints or owned paths
- docs explain that this is a source-level baseline, not an npm publish

## 8. Control Surface Checks

- package checks stay green with normal test and harness checks
- source-level exports do not run the CLI entrypoint as a side effect
- package docs do not overclaim independent npm packages

## 9. Risks

- creating a fake split that looks publishable but cannot be built independently
- package docs drifting from actual entrypoints
- broad source moves causing unnecessary churn

## 10. Mitigations

- keep the slice source-level and explicit
- add a package check command backed by a shared boundary manifest
- avoid moving runtime files until extraction becomes a separate slice
