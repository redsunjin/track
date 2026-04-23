# Harness Worksheet

## 1. Work Identity

- slice_id: `TRK-050`
- title: `Release Handoff Notes`
- branch_scope: current repo mainline slice
- official_active_loop: yes
- user_visible_change: Track can generate a release handoff note for the current package state

## 2. Scope

- in:
  - package handoff note builder
  - `track package handoff`
  - `track package notes`
  - `npm run package:handoff`
  - readiness-derived status summary
  - release commands, subpaths, boundaries, and doc references
  - docs and regression coverage
- out:
  - git tagging
  - npm publishing
  - changelog generation from commit history
  - writing a persistent handoff file by default

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

Release handoff should have one command that explains what is ready, what commands the receiver should run, and which package surfaces are exposed.

## 5. Checkpoints

1. add package handoff note builder
2. wire handoff CLI and npm script
3. update release docs and verification

## 6. Verification

```bash
npm test
npm run typecheck
npm run check:harness
npm run package:check
npm run package:dry-run
npm run package:handoff
npm run package:readiness
npm run package:install-smoke
npm pack --dry-run --json
```

## 7. Exit Condition

- `track package handoff` prints a concise release handoff block
- `track package notes` is an alias
- JSON output works for automation
- the note explicitly distinguishes artifact handoff from npm publish

## 8. Control Surface Checks

- `TODO.md`, `NEXT_SESSION_PLAN.md`, and this worksheet point at `TRK-050`
- `.track/roadmap.yaml` and `.track/state.yaml` include matching handoff checkpoints
- docs mention `private-root` behavior in the handoff path

## 9. Risks

- handoff notes drifting from readiness checks
- presenting `private-root` as publish-ready
- omitting critical docs or commands from the handoff

## 10. Mitigations

- derive the note from `checkTrackPublishReadiness`
- keep `private-root` in the rendered status and summary
- hardcode a short, audited handoff command/doc list
