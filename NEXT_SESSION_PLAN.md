# Next Session Plan

## Active Slice

- id: `TRK-050`
- title: `Release Handoff Notes`

## Goal

Generate one executable release handoff note that summarizes current package status, verification commands, public subpaths, boundaries, and reference docs for a human handoff.

## First Steps

1. add a package handoff note builder on top of the readiness gate
2. wire `track package handoff` and `track package notes`
3. document the handoff flow and update release verification tests

## Constraints

- keep the handoff note deterministic and terminal-friendly
- reuse readiness and dry-run results instead of re-implementing checks
- keep `private-root` explicit in the handoff output
- do not publish or tag a release
- keep JSON output available for automation

## Verification

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

## Exit Condition

- `track package handoff` prints a usable release handoff block
- `track package notes` is an alias
- the output includes commands, subpaths, boundaries, and docs
- JSON output is available for structured handoff tooling
