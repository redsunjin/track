# Harness Worksheet

## 1. Work Identity

- slice_id: `TRK-043`
- title: `Build Artifact Baseline`
- branch_scope: current repo mainline slice
- official_active_loop: yes
- user_visible_change: Track can build compiled `dist` artifacts and verify package readiness through the built CLI

## 2. Scope

- in:
  - root TypeScript build config for `src/**/*.ts`
  - compiled JavaScript, source maps, declarations, and declaration maps under `dist`
  - `npm run build`
  - `npm run package:build-check`
  - package dry-run validation that `dist` is in the files allowlist
  - docs and regression coverage for build artifact readiness
- out:
  - switching package exports to `dist`
  - switching `bin.track` to `dist/cli.js`
  - publishing to npm
  - bundling the VS Code extension into the root build

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

Track should have a reproducible compiled artifact path before the release manifest is switched from source-level entries to built files.

## 5. Checkpoints

1. add TypeScript build config for runtime source
2. add package scripts and manifest allowlist coverage
3. verify built CLI dry-run and npm pack output

## 6. Verification

```bash
npm test
npm run typecheck
npm run check:harness
npm run build
npm run package:dry-run
npm run package:build-check
npm pack --dry-run --json
```

## 7. Exit Condition

- `npm run build` emits `dist`
- `node dist/cli.js package dry-run` passes through `npm run package:build-check`
- package dry-run rejects manifests that omit build readiness basics
- docs explain that exports/bin remain source-level until the next release-manifest slice

## 8. Control Surface Checks

- `TODO.md`, `NEXT_SESSION_PLAN.md`, and this worksheet point at `TRK-043`
- `.track/roadmap.yaml` and `.track/state.yaml` include matching build artifact checkpoints
- OpenClaw monitor extension subpaths remain package-covered while build output is introduced

## 9. Risks

- switching exports too early and breaking source-level tests
- building VS Code extension files through the root runtime compiler by accident
- treating `dist` existence as publish readiness before the manifest switch is done

## 10. Mitigations

- keep exports/bin on source entries in this slice
- exclude `vscode-extension` from the root build config
- make the built CLI check explicit without publishing
