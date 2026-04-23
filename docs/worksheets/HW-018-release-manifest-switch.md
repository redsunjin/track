# Harness Worksheet

## 1. Work Identity

- slice_id: `TRK-044`
- title: `Release Manifest Switch`
- branch_scope: current repo mainline slice
- official_active_loop: yes
- user_visible_change: Track's public package exports and CLI bin resolve to compiled release artifacts

## 2. Scope

- in:
  - package exports for root and subpaths pointing at `dist`
  - declaration targets for exported runtime subpaths
  - `bin.track` pointing at `dist/cli.js`
  - package dry-run validation for export and bin target existence
  - tests that import package subpaths through release exports
  - docs and harness state for the manifest switch
- out:
  - publishing to npm
  - removing `src` from `package.json.files`
  - changing local development scripts away from `src/cli.ts`
  - adding the OpenClaw Pitwall CLI command

## 3. Record System

- source_of_truth_docs:
  - [TODO.md](../../TODO.md)
  - [NEXT_SESSION_PLAN.md](../../NEXT_SESSION_PLAN.md)
  - [README.md](../../README.md)
  - [docs/package-layout.md](../package-layout.md)
- execution_doc:
  - this worksheet
- state_files_touched:
  - `.track/state.yaml`
  - `.track/roadmap.yaml`

## 4. Outcome

Track should behave like a release-ready package manifest while still remaining private and local-first.

## 5. Checkpoints

1. switch public exports and CLI bin to release artifacts
2. tighten package dry-run target validation
3. verify tests, build, package dry-run, and npm pack output

## 6. Verification

```bash
npm test
npm run typecheck
npm run check:harness
npm run build
npm run vscode:build
npm run package:dry-run
npm run package:build-check
npm pack --dry-run --json
node dist/cli.js status --no-color
```

## 7. Exit Condition

- `track/core` and sibling package imports resolve through `dist`
- `bin.track` points at `dist/cli.js`
- package dry-run reports covered and existing export/bin targets
- the root package remains `private: true`

## 8. Control Surface Checks

- `TODO.md`, `NEXT_SESSION_PLAN.md`, and this worksheet point at `TRK-044`
- `.track/roadmap.yaml` and `.track/state.yaml` include matching release-manifest checkpoints
- `npm run check:harness` passes after the control-plane update

## 9. Risks

- making tests depend on stale `dist` output
- breaking local source-first development scripts
- treating a private package readiness check as a real publish

## 10. Mitigations

- run `npm run build` before tests
- leave local CLI scripts on `src/cli.ts`
- keep `private: true` and validate with dry-runs only
