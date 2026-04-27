# Harness Worksheet

## 1. Work Identity

- slice_id: `TRK-055`
- title: `Publishable RC Gate Tightening`
- branch_scope: current repo mainline slice
- official_active_loop: yes
- user_visible_change: RC tag dry-run now means publishable public-release readiness by default

## 2. Scope

- in:
  - default RC tag dry-run requires `publishable-ready`
  - private-root artifact RC tags are blocked by default
  - explicit `--allow-private-root` artifact override
  - regression coverage for default block and explicit override
  - docs and harness state aligned to the tightened rule
- out:
  - npm publishing
  - npm publish dry-run against the registry
  - git tag creation or push
  - release notes generation
- assumptions:
  - public release RCs should not be prepared while the package is private-root
  - private-root artifact tags may still be useful, but only when intentionally requested

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

## 4. Evaluators

- static_checks:
  - `npm test`
  - `npm run typecheck`
  - `npm run check:harness`
- runtime_checks:
  - `npm run package:readiness`
  - `npm run package:publish-guard`
  - `npm run package:rc-tag`
  - `node --import tsx ./src/cli.ts package rc-tag --allow-private-root`
  - `git diff --check`
- control_surface_checks:
  - active slice points at `TRK-055`
  - next queued implementation slice is `TRK-056`
- regression_gate:
  - private-root fixture cannot return `tag-dry-run-ready` by default
  - explicit private-root artifact override remains visibly separate

## 5. Guardrails

- do_not_expand_into:
  - actual npm publish
  - registry publish dry-run
  - git tag creation
  - release notes generator implementation
- escalation_conditions:
  - release owner wants to create or push the RC tag
  - npm authentication is required for TRK-057
- rollback_or_recovery_path:
  - remove the explicit artifact override if private-root RC tags become too risky

## 6. Drift / Hygiene

- likely_drift_points:
  - docs saying RC readiness only needs a green publish guard
  - tests not covering private-root behavior after the package is publishable
  - users mistaking `--allow-private-root` for public release readiness
- required_doc_updates:
  - TODO
  - NEXT_SESSION_PLAN
  - package layout docs
  - public npm release roadmap
- candidate_future_automation:
  - release notes draft command consuming RC readiness output
  - npm auth preflight gate before publish dry-run
