# Next Session Plan

## Active Slice

- id: `TRK-058`
- title: `Public Release Execution`

## Goal

Execute the public npm release only after explicit release-owner approval, then verify the published package from a clean consumer path.

## First Steps

1. get explicit release-owner approval for actual public npm publish
2. verify `git status --short --branch`
3. rerun `npm run package:publish-dry-run`
4. create and push the release tag selected by the release owner
5. run `npm publish --access public`
6. verify registry metadata and clean consumer install

## Current Result

- `npm whoami`: passed as `redsunjin`
- `npm run package:publish-dry-run`: passed with `publish-dry-run-ready`
- final publish command: `npm publish --access public`
- no package has been published yet

## Constraints

- do not publish to npm without explicit final approval
- do not create or push git tags without explicit final approval
- do not change the package name away from `@redsunjin/track`
- keep release verification output available for handoff

## Verification

```bash
npm test
npm run typecheck
npm run check:harness
npm run package:publish-dry-run
npm whoami
npm view @redsunjin/track version
npm install @redsunjin/track
npx @redsunjin/track status
git diff --check
```

## Exit Condition

- release tag is created and pushed
- `@redsunjin/track` is published to npm
- clean consumer install works
- documented CLI entrypoint works from the published package
