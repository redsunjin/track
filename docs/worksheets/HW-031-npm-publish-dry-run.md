# Harness Worksheet

## 1. Work Identity

- slice_id: `TRK-057`
- title: `npm Publish Dry Run`
- branch_scope: current repo mainline slice
- official_active_loop: yes
- user_visible_change: Track's public npm dry-run status is explicit, including the remaining npm authentication blocker

## 2. Scope

- in:
  - npm authentication preflight
  - `npm pack --dry-run --json`
  - `npm publish --dry-run --access public`
  - package install smoke
  - `track package publish-dry-run`
  - `npm run package:publish-dry-run`
  - manifest normalization for the published `track` bin path
  - blocked-state handoff for release-owner npm authentication
- out:
  - actual npm publish
  - git tag creation or push
  - npm credential entry by Codex
  - registry metadata verification after publish
- assumptions:
  - the release owner owns npm authentication
  - dry-run success is not enough to proceed to public release while `npm whoami` fails

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
  - `src/package-layout.ts`
  - `src/cli.ts`
  - `src/index.ts`
  - `package.json`
  - `tests/package-layout.test.ts`

## 4. Evaluators

- static_checks:
  - `npm test`
  - `npm run typecheck`
  - `npm run check:harness`
- runtime_checks:
  - `npm run package:publish-dry-run`
  - `npm pack --dry-run --json`
  - `npm publish --dry-run --access public`
  - `npm run package:install-smoke`
  - `npm whoami`
  - `git diff --check`
- current_results:
  - `npm pack --dry-run --json`: passed
  - `npm publish --dry-run --access public`: passed as a dry-run after `bin.track` normalization
  - `npm run package:install-smoke`: passed
  - `npm whoami`: blocked with `ENEEDAUTH`
  - `npm run package:publish-dry-run`: reports `publish-dry-run-blocked` until npm auth passes
- control_surface_checks:
  - active slice points at `TRK-057`
  - next queued release slice is `TRK-058`
  - `TRK-058` remains gated behind release-owner confirmation
- regression_gate:
  - combined preflight command reports auth, pack dry-run, publish dry-run, install smoke, and final publish command
  - npm no longer reports a `bin[track]` auto-correction warning during publish dry-run
  - blocked npm auth is visible in Track state

## 5. Guardrails

- do_not_expand_into:
  - real npm publish
  - tag creation or push
  - credential handling
  - registry post-publish verification
- escalation_conditions:
  - release owner authenticates npm and asks to rerun the final dry-run lane
  - release owner explicitly confirms public release execution
- rollback_or_recovery_path:
  - keep `TRK-057` blocked until `npm whoami` passes
  - leave `TRK-058` queued until explicit release-owner approval

## 6. Drift / Hygiene

- likely_drift_points:
  - dry-run command passing without npm auth and being mistaken for release readiness
  - package manifest drifting back to npm-normalized `bin` syntax
  - TODO active slice not matching the blocked Track state
- required_doc_updates:
  - TODO
  - NEXT_SESSION_PLAN
  - package layout docs
  - public npm release roadmap
- candidate_future_automation:
  - persisted publish dry-run report artifact for release-owner handoff
