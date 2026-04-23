# Harness Worksheet

## 1. Work Identity

- slice_id: `TRK-046`
- title: `Publish/Install Smoke`
- branch_scope: current repo mainline slice
- official_active_loop: yes
- user_visible_change: Track can be packed and installed into a separate consumer project without publishing

## 2. Scope

- in:
  - package install smoke script
  - temporary tarball creation outside the repo
  - temporary consumer project installation
  - public package import smoke
  - installed `track` CLI smoke
  - docs and regression coverage for the smoke command
- out:
  - publishing to npm
  - changing package visibility
  - persistent generated tarballs
  - global npm installation

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

Track should prove that the release manifest works from an installed package, not only from the source repository.

## 5. Checkpoints

1. add temporary package install smoke
2. verify installed imports and CLI bin
3. document and wire the package smoke command

## 6. Verification

```bash
npm test
npm run typecheck
npm run check:harness
npm run package:dry-run
npm run package:build-check
npm run package:install-smoke
npm pack --dry-run --json
```

## 7. Exit Condition

- the smoke script creates a tarball in a temporary directory
- a clean temporary consumer installs that tarball
- public subpath imports work from the consumer
- the installed `track` bin executes successfully

## 8. Control Surface Checks

- `TODO.md`, `NEXT_SESSION_PLAN.md`, and this worksheet point at `TRK-046`
- `.track/roadmap.yaml` and `.track/state.yaml` include matching install-smoke checkpoints
- no tarball is left in the repository root

## 9. Risks

- accidentally relying on repo-local `dist`
- leaving generated package files in the working tree
- using a smoke path that hides dependency installation failures

## 10. Mitigations

- install from a packed tarball into a separate temp consumer
- use `npm pack --pack-destination` outside the repo
- run the installed package's bin from `node_modules/.bin`
