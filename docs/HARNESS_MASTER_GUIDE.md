# Harness Master Guide

## Purpose

- define the `Track` harness as the operating system for long-running agent work
- adapt the referenced harness principles to this repo's actual product shape
- provide one reusable guide for future slices

Reference pattern:

- `trunk_rag/docs/HARNESS_MASTER_GUIDE.md` in the local workspace

This document is not a copy.
It is a `Track`-specific version.

## What "Harness" Means In Track

In `Track`, the harness is the structure that keeps four things aligned:

- the product boundary
- the active implementation slice
- the verification loop
- the visible execution state

That matters because `Track` is itself a progress-management system.
If the repo does not run on a clear harness, the product will drift from its own purpose.

## Distilled Principles

### 1. The active loop must be explicit

`Track` should always have one official active slice.

Current control-plane docs:

- [TODO.md](../TODO.md)
- [NEXT_SESSION_PLAN.md](../NEXT_SESSION_PLAN.md)
- [AGENTS.md](../AGENTS.md)

Rule:

- only one `active` slice at a time
- `NEXT_SESSION_PLAN` must mirror the active slice in `TODO`

### 2. Product boundary documents must stay stable

These are the current boundary docs:

- [README.md](../README.md)
- [plugin-architecture.md](./plugin-architecture.md)
- [runtime-feature-matrix.md](./runtime-feature-matrix.md)
- [pitwall-concept.md](./pitwall-concept.md)
- [track-generator-method.md](./track-generator-method.md)
- [visual-direction.md](./visual-direction.md)

Rule:

- implementation work should not quietly redefine the product
- if a slice changes the boundary, update the boundary docs intentionally

### 3. Execution state is part of the harness

`Track` is unusual because its own internal runtime state is also a product artifact.

Canonical state:

- `.track/roadmap.yaml`
- `.track/state.yaml`
- `.track/events.ndjson`

Rule:

- local Track state stays the canonical runtime record
- external adapters may project into it, but should not replace it

### 4. Verification must cover both code and operating behavior

Current evaluator set:

- `npm test`
- `npm run status`
- `npm run map`
- `npm run companion`
- `npm run import -- --source examples/external-plan.example.yaml --dry-run --json`
- `npm run pitwall -- --root /Users/Agent/ps-workspace`
- `node --import tsx ./src/cli.ts pitwall --root /Users/Agent/ps-workspace --detail track`

Rule:

- do not treat unit tests alone as sufficient
- verify the control surfaces that users will actually read

### 5. Guardrails must protect the shape of the product

Current guardrails:

- terminal-first before web-first
- Track and Pitwall remain separate roles
- one active loop only
- stable local schema before external source adapters
- shared core over client-specific hacks

### 6. Drift must be cleaned in small loops

Typical drift risks in this repo:

- `TODO` and `NEXT_SESSION_PLAN` going out of sync
- roadmap docs drifting from `.track/roadmap.yaml`
- state mutation features outrunning MCP or docs
- UI language drifting away from race telemetry semantics

Rule:

- clean drift in small slices
- promote recurring checks into scripts later

## Harness Layers For Track

### Layer 1. Control Plane

Purpose:

- determine the official active slice

Artifacts:

- [TODO.md](../TODO.md)
- [NEXT_SESSION_PLAN.md](../NEXT_SESSION_PLAN.md)
- [AGENTS.md](../AGENTS.md)

### Layer 2. Product Boundary

Purpose:

- define what Track is and is not

Artifacts:

- [README.md](../README.md)
- [plugin-architecture.md](./plugin-architecture.md)
- [runtime-feature-matrix.md](./runtime-feature-matrix.md)
- [pitwall-concept.md](./pitwall-concept.md)

### Layer 3. Evaluator / Gate

Purpose:

- decide what counts as done

Current gates:

- tests pass
- core terminal views still render
- state mutation flows still work
- generic import projection still dry-runs cleanly
- active slice has a worksheet

### Layer 4. Observability

Purpose:

- make failures and drift diagnosable

Signals:

- `.track/events.ndjson`
- `status --watch`
- `pitwall`
- `pitwall --queue`
- `pitwall --detail`

### Layer 5. Guardrails

Purpose:

- stop expansion into the wrong product too early

Examples:

- no browser-first dashboard as default
- no external planning tool as source of truth before local schema stabilizes
- no write-side MCP before read-side contract is stable

### Layer 6. Garbage Collection

Purpose:

- remove small inconsistencies before they become architecture drift

Current approach:

- doc review
- command verification
- active-loop hygiene

Future candidate:

- `npm run check:harness` or equivalent structural validation

## Workbook

Use the worksheet template for any non-trivial slice:

- [HARNESS_WORKSHEET_TEMPLATE.md](./HARNESS_WORKSHEET_TEMPLATE.md)

Current active worksheet:

- none selected

Last completed worksheet:

- [HW-005-generic-plan-import.md](./worksheets/HW-005-generic-plan-import.md)

## Adoption Rules

- a branch or idea does not become the active loop until `TODO.md` says so
- terminal UX remains the primary validation surface
- repeated rules should eventually become executable checks
- when Track cannot maintain its own clarity, fix the harness before adding features
