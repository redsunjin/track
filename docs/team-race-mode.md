# Team Race Mode

## Status

Team Race Mode is a roadmap-only concept.
It should not change the current Track runtime, CLI contract, MCP write surface, `.track/` schema, or Pitwall behavior until the lower-level local state model is stable.

The immediate purpose of this document is to define the product boundary before implementation work starts.

## Product Intent

Track already uses racing language to make roadmap progress visible.
Team Race Mode extends that language to coding competitions and collaborative delivery drills without turning Track into a game server.

The useful product outcome is not entertainment by itself.
The useful outcome is a fair, auditable way to compare or coordinate implementation work while still rewarding code quality, review discipline, security hygiene, and reproducible verification.

## Competition Modes

### Solo Time Trial

One developer or agent runs against a defined task pack.

Use cases:

- onboarding challenge
- benchmark for a new agent setup
- personal practice run
- regression test for a workflow method

Scoring compares the run against the course baseline, not against another active participant.
The baseline can come from historical Track events, a curated sample run, or a previous accepted solution.

### Team Relay

Multiple participants complete sequential checkpoints on one shared track.
Each leg has an owner, handoff condition, and verification gate.

Use cases:

- multi-agent implementation with human review stops
- onboarding where a senior engineer hands off to a junior engineer
- sprint drill where design, implementation, test, and review are separate legs

Relay scoring should emphasize handoff quality.
A fast leg that leaves unclear state, missing tests, or unresolved blockers should reduce the whole team score.

### Versus Sprint

Two or more participants start from the same task pack and race toward the same acceptance criteria.

Use cases:

- comparing alternative implementation approaches
- evaluating agent configurations
- competitive coding event
- selecting the best solution path before merging

Versus scoring must require equivalent starting conditions and identical acceptance gates.
The winner should be the best accepted result, not simply the earliest commit.

### Ghost Run

A participant races against a replay of a previous accepted run.

Use cases:

- training against a known-good solution
- comparing current toolchain performance with older performance
- showing a live run against a historical pace line

Ghost runs should replay derived timing and checkpoint events only.
They should not expose private prompts, secrets, internal notes, or live event logs from the original run.

## Scoring Model

Score should balance speed and quality.
The default model should be weighted and transparent so teams can tune it without changing Track semantics.

Recommended top-level score:

```text
race_score = speed_score * 0.35
           + quality_score * 0.35
           + verification_score * 0.20
           + collaboration_score * 0.10
           - penalty_score
```

### Speed Score

Inputs:

- elapsed time from race start to accepted finish
- checkpoint split times
- blocked time separated from active work time
- rework loops after failed checks

Rules:

- measure against accepted completion, not first attempted completion
- pause or classify time explicitly when a race is blocked by organizer-controlled dependencies
- avoid rewarding hidden pre-work or untracked state edits

### Quality Score

Inputs:

- review findings
- defect count after acceptance
- maintainability notes
- scope discipline
- amount of unnecessary churn

Rules:

- accepted solutions must satisfy the same definition of done
- large unrelated edits should reduce score even if tests pass
- bypassed review or unclear implementation rationale should reduce score

### Verification Score

Inputs:

- required test commands
- smoke checks
- lint/typecheck/build gates
- reproducibility on a clean checkout
- evidence captured in Track events or run artifacts

Rules:

- a run cannot win without passing mandatory gates
- locally passing checks should be repeatable by the organizer
- missing verification evidence should be treated as unverified, not as implicitly successful

### Collaboration Score

Inputs:

- handoff notes
- owner transitions
- blocker clarity
- review response quality
- conflict avoidance in shared files

Rules:

- this score matters most in Team Relay mode
- stale or ambiguous handoffs should reduce score
- overwriting another participant's work should be a major penalty

### Penalties

Penalty examples:

- failed required gate: major penalty or disqualification
- direct mutation of restricted state files: major penalty
- touching out-of-scope files: proportional penalty
- missing handoff note in relay mode: moderate penalty
- unresolved security issue: major penalty
- unreproducible result: major penalty or disqualification

The penalty system should be explicit before the race starts.
Participants should not discover hidden scoring rules after completion.

## Fairness Guardrails

Fair competition requires controlled inputs.
Track should support that through metadata and evidence, but the organizer remains responsible for the rules.

Required race setup:

- same starting commit or tarball
- same task pack and acceptance criteria
- same allowed tools, model access, and dependency policy
- same time limit and pause policy
- same mandatory verification commands
- same out-of-scope file list

Required run evidence:

- start time and finish time
- checkpoint transitions
- owner changes
- blocked intervals
- verification command names and outcomes
- final diff summary or artifact reference

Anti-gaming rules:

- do not count unverified completion as finish
- do not let participants edit scoring inputs directly
- do not allow hidden setup work after the clock starts
- do not compare runs with materially different model, dependency, or hardware constraints unless labeled as different classes
- do not let generated logs become the only proof of correctness

## Security Guardrails

Team Race Mode should inherit Track's conservative security posture.

Security requirements:

- MCP write tools stay opt-in
- organizer-controlled scoring files are read-only to participants during a race
- `.track/events.ndjson` remains runtime data and should not be committed by default
- terminal output must continue sanitizing control characters
- race exports must redact secrets, tokens, prompts, private notes, and local absolute paths where possible
- Pitwall must not provide bypass actions that mutate per-repo Track state outside normal Track controls

Sensitive data rules:

- ghost replays expose normalized events, not raw prompt logs
- public leaderboards publish aggregate score and accepted artifacts only
- blocker notes and review notes are treated as team-visible unless explicitly scrubbed
- organizer audit logs should be separate from participant-visible summaries

Disqualification-level issues:

- credential exposure
- tampering with scoring metadata
- bypassing verification gates
- impersonating another owner or agent
- modifying restricted files outside the race rules

## Track Integration

Track remains the per-repo source of truth.
Team Race Mode should eventually be represented as structured metadata around the existing roadmap, state, and event model instead of a separate runtime.

Candidate Track concepts:

- race id
- mode
- participant roster
- class or environment label
- start and finish event
- checkpoint split events
- verification gate events
- penalty events
- accepted artifact reference

Candidate commands, deferred:

- `track race plan`
- `track race start`
- `track race split`
- `track race finish`
- `track race score`
- `track race export`

These commands should be deferred until `track init`, `track bootstrap`, controlled state mutation, and event durability are stable enough to carry race evidence without schema churn.

## Pitwall Integration

Pitwall should be the race-control surface, not the scoring source of truth.

Pitwall can eventually show:

- active races across repos
- participant position by checkpoint
- flag state by run
- blocked or disputed runs
- verification gate status
- relay handoff queue
- ghost pace delta
- provisional leaderboard

Pitwall should compute displays from Track state and events.
It should not invent its own participant state, mutate scores directly, or store the canonical race result.

Operator actions should stay conservative:

- acknowledge dispute
- mark review required
- request rerun of a verification gate
- open run artifact
- export scoreboard

Direct score editing, forced finish, or hidden penalty changes should be deferred until there is an auditable mutation path.

## Roadmap-Only Rationale

Team Race Mode should wait because the current product priority is making Track useful from a clean project.

Blocking prerequisites:

- stable `track init` and `track bootstrap`
- stable `.track/roadmap.yaml` and `.track/state.yaml` lifecycle
- reliable append-only event history
- controlled MCP write path
- durable Pitwall aggregation
- clear security defaults for team and open-source use

Implementing race features before those foundations would create avoidable risks:

- a second state model for competitions
- unfair or unverifiable scoring
- pressure to expose write automation too early
- unstable schema commitments
- confusion between Track as a progress layer and Pitwall as an operator surface

The correct near-term action is to keep this as a design reference.
Future implementation should start only after the core local-first Track workflow can initialize, mutate, verify, and aggregate state without manual setup.

