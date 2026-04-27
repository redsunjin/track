# Harness Worksheet

## 1. Work Identity

- slice_id: `TRK-058`
- title: `Public Release Execution`
- branch_scope: current repo mainline slice
- official_active_loop: yes
- user_visible_change: Track is ready for the actual public npm release once the release owner explicitly approves publish execution

## 2. Scope

- in:
  - release-owner approval gate
  - release tag creation and push after approval
  - `npm publish --access public`
  - npm registry metadata verification
  - clean consumer install verification
  - published CLI smoke verification
- out:
  - changing package identity
  - publishing under unscoped `track`
  - publishing without explicit final approval
  - credential handling by Codex
- assumptions:
  - npm CLI authentication is already available as `redsunjin`
  - `TRK-057` dry-run lane is green

## 3. Record System

- source_of_truth_docs:
  - [TODO.md](../../TODO.md)
  - [NEXT_SESSION_PLAN.md](../../NEXT_SESSION_PLAN.md)
  - [docs/package-layout.md](../package-layout.md)
  - [docs/public-npm-release-roadmap.md](../public-npm-release-roadmap.md)
- execution_doc:
  - this worksheet
- state_files_touched:
  - `.track/state.yaml`
  - `TODO.md`
  - `NEXT_SESSION_PLAN.md`

## 4. Evaluators

- static_checks:
  - `npm test`
  - `npm run typecheck`
  - `npm run check:harness`
- runtime_checks:
  - `npm whoami`
  - `npm run package:publish-dry-run`
  - `npm publish --access public`
  - `npm view @redsunjin/track version`
  - clean consumer `npm install @redsunjin/track`
  - clean consumer `npx @redsunjin/track status`
- control_surface_checks:
  - active slice points at `TRK-058`
  - `TRK-057` is recorded as done
  - final publish execution is still gated by explicit approval
- regression_gate:
  - published version matches `package.json.version`
  - installed `track` bin works from the published package

## 5. Guardrails

- do_not_expand_into:
  - package rename
  - extra feature work
  - unscoped npm package
  - unpublished local tarball-only verification as a substitute for registry verification
- escalation_conditions:
  - final approval is needed before tag creation, tag push, or npm publish
  - registry verification fails after publish
- rollback_or_recovery_path:
  - npm packages cannot be fully unpublished as a normal rollback path
  - if publish fails mid-flight, record exact registry/tag state before retrying

## 6. Drift / Hygiene

- likely_drift_points:
  - treating dry-run approval as publish approval
  - tag version drifting from `package.json.version`
  - local install smoke being mistaken for registry install verification
- required_doc_updates:
  - TODO
  - NEXT_SESSION_PLAN
  - public npm release roadmap
- candidate_future_automation:
  - post-publish verifier command that runs registry metadata, install, and CLI smoke checks together
