# Harness Worksheet

## 1. Work Identity

- slice_id: `TRK-054`
- title: `Scoped Package Manifest Switch`
- branch_scope: current repo mainline slice
- official_active_loop: yes
- user_visible_change: Track's npm package identity moves to `@redsunjin/track` while the CLI remains `track`

## 2. Scope

- in:
  - `package.json.name` switched to `@redsunjin/track`
  - `private: false`
  - `publishConfig.access: public`
  - scoped package imports in tests and install smoke
  - docs and harness state aligned to publishable manifest mode
- out:
  - npm publishing
  - npm publish dry-run against the registry
  - git tag creation or push
  - changing the CLI bin name
- assumptions:
  - the unscoped `track` package remains unavailable on npm
  - release owner credentials are required for publish dry-run and final publish

## 3. Record System

- source_of_truth_docs:
  - [TODO.md](../../TODO.md)
  - [NEXT_SESSION_PLAN.md](../../NEXT_SESSION_PLAN.md)
  - [docs/public-npm-release-roadmap.md](../public-npm-release-roadmap.md)
  - [docs/package-layout.md](../package-layout.md)
- execution_doc:
  - this worksheet
- state_files_touched:
  - `.track/state.yaml`
  - `package.json`
  - `package-lock.json`

## 4. Evaluators

- static_checks:
  - `npm test`
  - `npm run typecheck`
  - `npm run check:harness`
- runtime_checks:
  - `npm run package:check`
  - `npm run package:dry-run`
  - `npm run package:readiness`
  - `npm run package:publish-guard`
  - `node --import tsx ./src/cli.ts package publish-guard --target publishable`
  - `npm run package:rc-tag`
  - `npm run package:install-smoke`
  - `npm pack --dry-run --json`
- control_surface_checks:
  - active slice points at `TRK-054`
  - next queued implementation slice is `TRK-055`
- regression_gate:
  - scoped package imports resolve after tarball install
  - installed CLI command remains `track`

## 5. Guardrails

- do_not_expand_into:
  - actual npm publish
  - npm registry publish dry-run
  - git tag creation
  - package split extraction
- escalation_conditions:
  - npm authentication is unavailable when TRK-057 starts
  - scoped package name is inaccessible to the release owner
- rollback_or_recovery_path:
  - revert manifest identity only before publish if scoped access is blocked

## 6. Drift / Hygiene

- likely_drift_points:
  - docs still describing `private-root`
  - tests importing unscoped `track`
  - install smoke passing locally but not through tarball install
- required_doc_updates:
  - TODO
  - NEXT_SESSION_PLAN
  - package layout docs
  - public npm release roadmap
- candidate_future_automation:
  - release owner npm auth preflight
  - release notes draft generated from package readiness output
