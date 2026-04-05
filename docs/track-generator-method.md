# Track Generator Method

## Goal

`Track` should not draw a fake race map.
It should generate the map from roadmap content.

That means the roadmap needs a scoring layer, and the generator needs rules that convert planning difficulty into track geometry.

## Core idea

Each roadmap checkpoint is scored on a few axes:

- effort
- uncertainty
- dependencies
- coordination
- risk
- approvals
- branch factor

Those scores produce three derived values:

- `difficulty score`
- `slope score`
- `pace score`

The generator then maps those values to track segments.

## Segment rules

### Straight

Use when:

- low uncertainty
- low dependency load
- routine implementation

Meaning:

- this part should move quickly if execution stays focused

### Sprint straight

Use when:

- low friction
- low risk
- short, clear work burst

Meaning:

- high-speed delivery zone

### Sweep

Use when:

- moderate effort
- manageable complexity
- not trivial, but still flowing

Meaning:

- progress is smooth but not fully linear

### Chicane

Use when:

- multiple small constraints
- sequencing matters
- context switching risk is real

Meaning:

- speed must drop and steering matters

### Hairpin

Use when:

- high difficulty
- high coordination
- likely rework or sharp decision change

Meaning:

- major execution turn

### Climb

Use when:

- uncertainty or dependency load is steep
- integration or unknowns dominate

Meaning:

- this is the "급경사" zone

### Pit

Use when:

- release gate
- QA gate
- approval gate

Meaning:

- the team must stop, inspect, or synchronize

### Fork

Use when:

- the roadmap has meaningful branching
- there are multiple delivery paths or adapters

Meaning:

- one roadmap section fans out into parallel or conditional tracks

## Why this matters

This method lets the roadmap express:

- where speed should be high
- where caution is required
- where execution will naturally slow down
- where leadership should expect coordination drag

So the track map becomes a planning artifact, not a skin.

## Minimal roadmap schema

Each checkpoint can include:

```yaml
difficulty:
  effort: 4
  uncertainty: 3
  dependencies: 4
  coordination: 3
  risk: 3
  approvals: 2
  branch_factor: 0
```

Values are on a simple 0-5 scale.

## Current implementation

Current generator command:

```bash
track map
track map --json
```

It reads:

- `.track/roadmap.yaml`
- `.track/state.yaml` when available

It then:

1. flattens roadmap checkpoints
2. scores each checkpoint
3. assigns segment type
4. overlays current progress state
5. prints a terminal course view
