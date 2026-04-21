# Harness Worksheet

## 1. Work Identity

- slice_id: `TRK-041`
- title: `Package Artifact Dry Run`
- branch_scope: current repo mainline slice
- official_active_loop: yes
- user_visible_change: Track can inspect package artifact readiness without publishing

## 2. Scope

- in:
  - `package.json.files` allowlist for the current source-level package surface
  - `track package dry-run`
  - `npm run package:dry-run`
  - export, bin, docs, and boundary allowlist coverage checks
  - package dry-run docs and regression coverage
- out:
  - npm publish
  - physical workspace split
  - package manager migration
  - moving runtime source files
- assumptions:
  - the root package remains `private: true`
  - this dry-run should catch missing packaging coverage before an actual pack/publish workflow exists

## 3. Record System

- source_of_truth_docs:
  - [TODO.md](../../TODO.md)
  - [NEXT_SESSION_PLAN.md](../../NEXT_SESSION_PLAN.md)
  - [README.md](../../README.md)
  - [package-layout.md](../package-layout.md)
- execution_doc:
  - this worksheet
- state_files_touched:
  - `.track/state.yaml`
  - `.track/roadmap.yaml`

## 4. Outcome

Track should have a deterministic packaging dry-run that reports whether the current package manifest covers the source-level package boundaries, exported subpaths, CLI bin target, and required docs.

## 5. Checkpoints

1. add package artifact allowlist and dry-run manifest checks
2. expose package dry-run through CLI and npm script
3. update docs, tests, and control-plane state

## 6. Verification

```bash
npm test
npm run typecheck
npm run check:harness
npm run status -- --no-color
npm run package:check
npm run package:dry-run
node --import tsx ./src/cli.ts package dry-run --json
npm pack --dry-run --json
```

## 7. Exit Condition

- `package.json.files` covers declared package boundaries
- `track package dry-run` reports exports, bin, layout, and allowlist coverage
- dry-run output states that the root package is private, not published
- tests and harness checks pass

## 8. Control Surface Checks

- `track package check` and `track package dry-run` stay separate
- dry-run checks are deterministic and do not write pack artifacts
- docs avoid claiming that Track is already published as independent npm packages

## 9. Risks

- confusing distribution readiness with actual publishing
- allowlist drift silently dropping a required source boundary
- dry-run output becoming too noisy for normal CLI use

## 10. Mitigations

- keep `private: true` and render `private-root`
- verify all boundary-owned paths against `package.json.files`
- keep JSON output for detailed automation and terse text output for humans
