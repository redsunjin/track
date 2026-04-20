# Track / Pitwall Visual Direction

## Visual thesis

Use the feeling of early 8-bit Formula 1 games, especially the compact clarity of `NES F-1 RACE` era presentation, as inspiration for `Track` and `Pitwall`.

The goal is not nostalgia for its own sake.
The goal is to make progress, pace, flags, checkpoints, and urgency readable with the same immediacy as an old racing HUD.

## Product translation

Translate the old racing-game feel into these interface qualities:

- sharp scanability
- hard state changes
- simple but high-contrast telemetry
- obvious lap and split-time framing
- compact course awareness
- strong sense of motion without heavy animation

Do not copy old game screens literally.
Reuse the logic of the presentation, not the exact layout.

For the current surface audit, rollout order, and dashboard-specific design checkpoints, see [retro-telemetry-dashboard-plan.md](./retro-telemetry-dashboard-plan.md).

## Style principles

### 1. Pixel discipline

Use a terminal-first, grid-aware layout.

- strong rows and columns
- dense but ordered information
- box-drawing or pixel-adjacent separators
- minimal soft chrome

### 2. Race telemetry first

The first things visible should be:

- current checkpoint
- current lap
- percent complete
- pace drift
- owner
- flag state

Decorative elements come later.

### 3. Hard flags

Status should feel like race flags, not soft product badges.

- `green`: healthy run
- `yellow`: caution
- `red`: blocked or failed
- `blue`: dependency wait
- `checkered`: lap complete

These should change the rhythm of the screen immediately.

### 4. Retro motion, not modern micro-interaction

If motion is used later, it should feel like:

- tick refresh
- flashing sector marker
- lap completion burst
- warning blink

Avoid soft easing-heavy modern dashboard motion.

## Terminal language

`Pitwall` should feel like a pit monitor or race control terminal.

Recommended ingredients:

- monospaced layout only
- short labels
- fixed-width columns
- sector or lap summaries
- split-time style deltas
- compact event feed

Example tone:

- `LAP 2/5`
- `CP 03 MCP CONTRACT`
- `PACE +12m`
- `FLAG YELLOW`
- `OWNER CODEX`

## Track language

`Track` inside a coding tool can be lighter, but should still borrow:

- mini course strip
- lap markers
- checkpoint nodes
- pit-stop state
- checkered completion state

The bottom-right buddy concept should look more like a tiny race marshal, telemetry pod, or car-status light than a generic mascot.

In Claude Code specifically, this should be treated as a `buddy-like companion mode`, not an assumption that the native built-in buddy area can be directly extended.

## Color direction

Stay close to old racing-game clarity:

- off-black or terminal charcoal background
- bright neutral text
- saturated red, yellow, green, blue for flag states
- one warm accent for active lap or timing focus

Avoid pastel UI.
Avoid rainbow dashboards.

## Typography direction

Prefer fonts or rendering choices that suggest:

- pixel logic
- arcade timing board
- terminal instrumentation

For terminal mode this is naturally inherited.
For companion views, keep typography crisp and mechanical.

## Information hierarchy

### Pitwall

Top level:

- workspace summary
- flags and blocked count
- project roster

Second level:

- checkpoint title
- owner
- next action
- pace drift

Third level:

- recent events
- artifacts
- detail logs

### Track

Top level:

- current checkpoint
- next action
- owner

Second level:

- lap progress
- local track strip
- recent event

Third level:

- deeper event timeline
- branch and artifact context

## Anti-patterns

Avoid:

- glossy cyberpunk dashboard styling
- soft SaaS cards everywhere
- overgrown mascot animation
- decorative gradients replacing hierarchy
- tiny unreadable telemetry text
- generic kanban colors pretending to be racing language

## Implementation guidance

For the terminal MVP:

1. use compact all-caps labels for race-critical fields
2. keep one-line project roster entries dense and aligned
3. make flag state the strongest visual variable
4. add split or pace delta fields before adding ASCII art
5. reserve ASCII track maps for focused detail mode, not the default overview

For later companion UI:

1. use the same state vocabulary as terminal mode
2. keep pixel and telemetry cues
3. avoid smoothing away the crisp race-control feeling
