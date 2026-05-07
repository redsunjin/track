# Harness Worksheet

## 1. Work Identity

- slice_id: `TRK-063`
- title: `CLI Korean Localization MVP`
- branch_scope: current repo mainline slice
- official_active_loop: yes
- user_visible_change: Core Track CLI views can render Korean labels with `--lang ko` or `TRACK_LANG=ko`.

## 2. Scope

- in:
  - language resolver for `en` and `ko`
  - `--lang ko` CLI flag
  - `TRACK_LANG=ko` environment variable
  - Korean labels for `status`, `next`, `init`, `bootstrap`, and `check:harness`
  - tests for language parsing and Korean renderer output
- out:
  - translating JSON output
  - translating package and release gate commands
  - full message catalog for every command
  - translating stored roadmap/task content
- assumptions:
  - default output remains English
  - Korean support is opt-in for the MVP
  - structured fields remain stable for agents and scripts

## 3. Record System

- source_of_truth_docs:
  - [TODO.md](../../TODO.md)
  - [NEXT_SESSION_PLAN.md](../../NEXT_SESSION_PLAN.md)
- execution_doc:
  - this worksheet
- state_files_touched:
  - `.track/state.yaml`
  - `.track/roadmap.yaml`

## 4. Evaluators

- static_checks:
  - `npm run typecheck`
  - `git diff --check`
  - `npm run check:harness`
- runtime_checks:
  - `node --import tsx --test tests/i18n.test.ts tests/init.test.ts tests/bootstrap.test.ts tests/harness.test.ts`
  - `node --import tsx ./src/cli.ts status --lang ko --no-color`
  - `TRACK_LANG=ko node --import tsx ./src/cli.ts next --no-color`
  - `node --import tsx ./src/cli.ts check:harness --lang ko`
- regression_gate:
  - English default output remains compatible with existing tests
  - `--json` output is not localized
  - package/release output remains English for this MVP

## 5. Guardrails

- do_not_expand_into:
  - full i18n framework
  - browser or VS Code localization
  - machine-readable JSON translation
  - changing package release behavior
- escalation_conditions:
  - release owner asks to publish during this slice
  - localization requires schema changes
  - generated docs or assets need external services
- rollback_or_recovery_path:
  - keep the language option opt-in
  - remove Korean render options without touching state schemas

## 6. Drift / Hygiene

- likely_drift_points:
  - tests assuming exact English spacing in localized renderers
  - docs overclaiming full multi-language support
  - CLI flag support drifting from `TRACK_LANG`
- required_doc_updates:
  - README
  - docs/runtime-feature-matrix.md
