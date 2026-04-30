# AGENTS.md

## Purpose

This repo treats the harness as a practical operating system for long-running agent work.

The goal is not only to write code, but to keep `Track` aligned across:

- roadmap and product boundary
- execution state
- verification
- control-room visibility

## Canonical Entry Points

Read these first:

1. [README.md](README.md)
2. [TODO.md](TODO.md)
3. [NEXT_SESSION_PLAN.md](NEXT_SESSION_PLAN.md)
4. [HARNESS_MASTER_GUIDE.md](docs/HARNESS_MASTER_GUIDE.md)

Then use supporting docs as needed:

- [plugin-architecture.md](docs/plugin-architecture.md)
- [runtime-feature-matrix.md](docs/runtime-feature-matrix.md)
- [pitwall-concept.md](docs/pitwall-concept.md)
- [track-generator-method.md](docs/track-generator-method.md)
- [visual-direction.md](docs/visual-direction.md)

## Active Loop Rule

- `TODO.md` may contain only one `active` item.
- `NEXT_SESSION_PLAN.md` must reflect that same active item.
- Branch experiments do not replace the official active loop unless the docs are updated.

## Track Product Rule

`Track` is the developer and agent progress plugin.
`Pitwall` is the monitoring surface.

Do not collapse them into one vague dashboard product.

## Execution Loop

Default loop:

1. confirm active slice in `TODO.md`
2. open or update a harness worksheet for the slice
3. implement the smallest meaningful slice
4. run verification
5. update durable docs only if the project boundary or active loop changed

## Required Verification

For code changes, default verification is:

```bash
npm test
```

Useful runtime checks:

```bash
npm run mcp:smoke -- --root /path/to/workspace
npm run status
npm run map
npm run companion
npm run pitwall -- --root /path/to/workspace
node --import tsx ./src/cli.ts pitwall --root /path/to/workspace --detail track
```

## Guardrails

- Keep terminal-first behavior as the default.
- Do not introduce browser-first dashboard work unless the active loop explicitly calls for it.
- Do not add external sync sources as the system of record before the local Track schema is stable.
- Prefer extending the shared core over per-client special cases.

## Drift Rules

When a slice changes the product boundary, update:

- `README.md`
- `TODO.md`
- `NEXT_SESSION_PLAN.md`
- the relevant worksheet under `docs/worksheets/`

When a slice is implementation-only, do not churn docs without reason.
