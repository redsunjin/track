# Next Session Plan

## Active Slice

- id: `TRK-062`
- title: `Pre-Publish User Acceptance`

## Goal

Keep public npm publish parked until the release owner explicitly approves the final go/no-go after clean-project UAT.

## First Steps

1. review `docs/pre-publish-user-acceptance-report.md`
2. confirm whether public npm publish should proceed
3. if approved, resume `TRK-058 Public Release Execution`
4. if not approved, keep testing from tarball or local installs

## Current Result

- `npm run uat:clean-project` packs Track, installs it into a clean temporary consumer, and verifies installed CLI `init/status/map/bootstrap`
- `docs/pre-publish-user-acceptance-report.md` records the clean-project UAT pass
- `TRK-063 CLI Korean Localization MVP` is complete with opt-in `--lang ko` and `TRACK_LANG=ko`
- Korean labels are available for `status`, `next`, `init`, `bootstrap`, and `check:harness`
- JSON output, package gates, and release commands remain stable/English for automation
- public npm publish remains parked until release-owner approval

## Constraints

- do not publish to npm without explicit release-owner approval
- do not create release tags during acceptance review
- keep UAT evidence focused on installed CLI behavior, not only source-tree behavior
- keep Korean support opt-in through `--lang ko` or `TRACK_LANG=ko`

## Verification

```bash
npm test
npm run typecheck
npm run check:harness
npm run package:dry-run
npm run uat:clean-project
node --import tsx ./src/cli.ts status --no-color
node --import tsx ./src/cli.ts status --lang ko --no-color
git diff --check
```

## Exit Condition

- release owner makes an explicit publish/no-publish decision
- if approved, `TRK-058 Public Release Execution` becomes active
- if not approved, remaining user-acceptance gaps are recorded as the next active slice
