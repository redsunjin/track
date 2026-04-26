# Harness Worksheet

## 1. Work Identity

- slice_id: `TRK-053`
- title: `Public NPM Release Roadmap Lock`
- branch_scope: current repo mainline slice
- official_active_loop: yes
- user_visible_change: Track has a locked public npm release path before manifest changes

## 2. Scope

- in:
  - public npm target decision
  - scoped package target `@redsunjin/track`
  - public release definition of done
  - locked TRK-054 through TRK-058 sequence
  - docs and harness state
- out:
  - changing `package.json.name`
  - changing `package.json.private`
  - adding `publishConfig`
  - npm publishing
  - creating or pushing git tags
- assumptions:
  - unscoped `track` is unavailable on npm
  - scoped package publishing will require npm authentication and scope permission

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
  - `.track/roadmap.yaml`

## 4. Evaluators

- static_checks:
  - `npm run check:harness`
- runtime_checks:
  - `npm run package:readiness`
  - `npm run package:publish-guard`
  - `npm run package:rc-tag`
- control_surface_checks:
  - active slice points at `TRK-053`
  - next queued implementation slice is scoped package switch
- regression_gate:
  - no package publish, tag creation, or manifest identity change in this slice

## 5. Guardrails

- do_not_expand_into:
  - actual npm publish
  - git tag creation
  - package identity switch
- escalation_conditions:
  - npm authentication or scope ownership is unavailable during publish dry-run
  - scoped package name is already taken or inaccessible
- rollback_or_recovery_path:
  - keep package manifest private until TRK-054 explicitly changes it

## 6. Drift / Hygiene

- likely_drift_points:
  - old `Release Notes Draft Generator` queue item taking priority too early
  - RC tag readiness implying public publish readiness while private-root remains active
- required_doc_updates:
  - TODO
  - NEXT_SESSION_PLAN
  - roadmap/state
  - public npm release roadmap
- candidate_future_automation:
  - public release checklist command
  - npm authentication preflight command
