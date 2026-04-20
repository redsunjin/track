# Retro Telemetry Dashboard Plan

## Purpose

This document turns the existing `Track` UI direction into an implementation-ready dashboard plan.

It does three jobs:

- inventory the UI documents that already exist
- identify where the live surfaces still feel generic or underspecified
- define the next design checkpoints for a sharper retro telemetry system

The target is not a standalone web dashboard.
The target is a stronger information design language for `Track`, `Pitwall`, and the VS Code companion.

## Existing UI Documents

These documents already define meaningful parts of the product:

- [visual-direction.md](./visual-direction.md)
  - visual thesis and anti-patterns
- [runtime-feature-matrix.md](./runtime-feature-matrix.md)
  - per-surface visibility requirements
- [pitwall-concept.md](./pitwall-concept.md)
  - multi-project control-room model
- [plugin-architecture.md](./plugin-architecture.md)
  - UI rule: signals before metaphor
- [worksheets/HW-003-color-signal-pass.md](./worksheets/HW-003-color-signal-pass.md)
  - signal and ANSI treatment constraints
- [worksheets/HW-004-vscode-companion.md](./worksheets/HW-004-vscode-companion.md)
  - first companion-shell scope

Conclusion:

- the repo already has a UI philosophy
- the missing piece is a durable surface-level implementation plan

## Current Surface Audit

### 1. `track status`

Strengths:

- strong signal vocabulary
- clear top-to-bottom order
- terminal-friendly density

Current gaps:

- the HUD reads more like a clean admin panel than a distinctive retro dashboard
- progress and urgency are visible but not rhythmically dominant
- lap/checkpoint framing could feel more instrument-like

### 2. `track companion`

Strengths:

- compact shell
- good reuse of shared runtime data
- small course-strip concept already exists

Current gaps:

- the buddy face pulls the surface toward mascot UI more than telemetry UI
- hierarchy is cramped around one fixed-width box
- progress strip is evocative but not yet a true dashboard instrument

### 3. VS Code companion webview

Strengths:

- easiest place to express a stronger visual language
- already reuses `track status --json`
- has enough room for richer hierarchy

Current gaps:

- current shell is readable but visually generic
- cards and progress bar do not yet feel like a race-control instrument panel
- the panel lacks a strong “glance in 3 seconds” telemetry rhythm

### 4. `track pitwall`

Strengths:

- strong operator concept
- dense project roster
- useful queue/detail/owner variants

Current gaps:

- summary, roster, and detail hierarchy can be more board-like
- overview still reads like structured terminal output instead of a distinct race board
- project rows need a clearer balance between flag, checkpoint, owner, and pace

## Direction Decision

The repo should keep the existing early-racing telemetry base and sharpen it with selective 1980s drive-dashboard cues.

Use:

- segmented progress bars
- timing-board numerics
- warning-lamp emphasis
- horizon or lane framing where it improves scanability
- crisp grid and scanline-inspired texture in companion surfaces

Do not use:

- neon synthwave posters
- glossy cyberpunk chrome
- soft SaaS cards
- decorative gradients without operational meaning
- mascot-first layout decisions

The correct target is:

- race telemetry first
- retro dashboard second

## Shared Design Tokens

### Signal hierarchy

Order of importance on every surface:

1. flag / health
2. current checkpoint
3. next action
4. owner
5. lap and percent
6. recent events

### Palette

Base:

- charcoal or off-black background
- bright neutral foreground

Signal colors:

- red for blocked / failure
- yellow for caution / stale
- green for healthy run
- cyan for active telemetry focus
- amber for lap or timing emphasis

### Typography

Use typography that feels mechanical and timing-board oriented.

Prefer:

- monospaced or pixel-logic display treatment
- hard uppercase labels
- restrained numeric emphasis

Avoid:

- rounded SaaS typography
- soft display fonts
- overdecorated retro fonts that hurt readability

## Surface Priorities

### Priority 1. VS Code companion shell

Why first:

- highest visual leverage
- lowest risk to terminal clarity
- easiest place to validate the retro telemetry direction without inventing a browser product

Implementation target:

- replace the current generic card shell with a telemetry-board layout
- make flag, checkpoint, and next action the dominant visual rhythm
- use segmented instruments instead of a single generic progress bar

### Priority 2. `track pitwall`

Why second:

- strongest candidate for the “dashboard” metaphor
- highest operator value once hierarchy is tightened

Implementation target:

- clearer race-board summary strip
- denser but more legible project roster rows
- more distinct control-room identity in overview and detail views

### Priority 3. terminal `status` and `companion`

Why third:

- important, but terminal surfaces already have acceptable structure
- should absorb the same vocabulary after companion and pitwall prove the hierarchy

Implementation target:

- keep the current shells compact
- strengthen instrument rhythm without adding noisy ASCII art

## Checkpoint Plan

### `cp-10` Dashboard direction audit

Done in this slice kickoff:

- consolidate the existing UI docs
- name the current gaps in live surfaces
- define the target retro telemetry language

### `cp-11` Companion telemetry shell

Implemented in this slice:

- redesign the VS Code companion panel around telemetry-board hierarchy
- remove or demote mascot-like elements in favor of instrument cues

### `cp-12` Pitwall race-board hierarchy

Implemented in this slice:

- carry the same signal vocabulary into the next `Pitwall` pass
- tighten the race-board summary strip and project-row hierarchy
- make flag, checkpoint, owner, and pace read faster than decorative framing

### `cp-13` Terminal telemetry alignment

Implemented in this slice:

- align `track status` and `track companion` with the newer telemetry-board vocabulary
- keep the terminal HUD compact and plain-text readable
- reduce mascot-like emphasis where it weakens operational scan speed

## Acceptance Criteria

The design direction is working when:

- a user can identify flag, checkpoint, owner, and next action in under 3 seconds
- companion and pitwall use the same signal vocabulary as terminal Track
- retro cues reinforce the operational model instead of replacing it
- no surface starts behaving like a separate browser dashboard product
