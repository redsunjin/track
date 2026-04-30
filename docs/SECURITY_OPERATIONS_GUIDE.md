# Security Operations Guide

## Purpose

This guide defines the minimum operating model for running `Track` safely in local, team, and open-source environments.

`Track` is intentionally lightweight.
That means teams must keep the runtime defaults conservative and only opt into write-side automation when they actually need it.

## Security posture

Current baseline:

- local `.track/` files are the source of truth
- explicit `state` and `roadmap` paths are constrained to repo-local `.track/`
- MCP starts in read-only mode by default
- MCP write tools require explicit opt-in
- state writes use a lock file and atomic rename
- terminal surfaces sanitize ANSI escapes and control characters
- live `.track/events.ndjson` is runtime data and should not be committed

This is a good default for open-source distribution.
It is not a substitute for environment-specific access control.

## Recommended operating modes

### 1. Solo local mode

Use when one developer runs `Track` on a local machine.

Recommended settings:

- keep MCP in read-only mode unless mutation tools are needed
- store live `.track/events.ndjson` locally and keep it out of Git
- avoid putting secrets or internal ticket references into blocker reasons

### 2. Team local mode

Use when multiple agents or developers operate in the same repo or workspace.

Recommended settings:

- keep one repo-local `.track/` directory per project
- prefer CLI mutations over direct file edits
- enable MCP write tools only for trusted local clients
- treat blocker reasons and notes as potentially visible to the whole team

### 3. Open-source mode

Use when the repository is public or distributed as a template.

Recommended settings:

- keep MCP write tools disabled by default
- ship examples, not live runtime logs
- document how to enable writes instead of enabling them in the default config
- assume downstream users will replace owner labels, task ids, and process details

## Write-side controls

Default:

- `track mcp`
- write tools hidden

Opt-in:

- `track mcp --allow-write`
- `TRACK_MCP_WRITE=1 track mcp`

Do not enable write mode when:

- the MCP server is exposed beyond the local machine
- the caller identity is unclear
- the repo contains sensitive project metadata

## Data handling rules

Safe to commit:

- `.track/roadmap.yaml`
- `.track/state.yaml` when it is curated example or template data
- docs, schemas, examples, and tests

Do not commit by default:

- live `.track/events.ndjson`
- temporary lock files
- generated runtime traces that include internal blockers or timestamps

If a public template needs example runtime data, create a scrubbed sample file and label it clearly as non-live data.

## Threat model

Primary risks for this project:

- path escape through explicit file arguments
- untrusted MCP callers changing task state
- concurrent writers overwriting state
- terminal escape injection through task titles, reasons, or event summaries
- accidental publication of operational history

Current mitigations:

- repo-local `.track` path enforcement
- read-only MCP default
- locked atomic writes
- terminal text sanitization
- runtime log ignore rules

## Deployment checklist

Before turning on `Track` in a new environment, verify:

- `.track/events.ndjson` is ignored or redirected
- only trusted clients can reach the MCP server
- write mode is still off unless explicitly required
- task titles and blocker reasons do not carry secrets
- backup or branch strategy exists before enabling automated mutation flows

## Open-source guidance

For open-source distribution, the right model is:

- ship secure defaults
- make dangerous features explicit
- let each downstream team decide how much write automation they want

That means `Track` should behave safely out of the box, while still letting advanced users opt into more automation for their own environment.

## Public package hygiene

Before publishing or packaging `Track`, verify public markdown does not expose machine-local workspace roots, user names, private repository paths, or live operational logs.

Recommended documentation patterns:

- use repo-relative links for files inside this repository
- use `/path/to/workspace` or `<workspace-root>` in examples that need an external workspace
- describe local comparison repos by name or placeholder path, not by absolute filesystem path
- keep live `.track/events.ndjson` and generated traces out of package-ready docs
