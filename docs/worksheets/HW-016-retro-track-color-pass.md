# Harness Worksheet

## 1. Work Identity

- slice_id: `TRK-042`
- title: `Retro Track Color Pass`
- branch_scope: current repo mainline slice
- official_active_loop: yes
- user_visible_change: Track map output looks more like a retro course board with color, sectors, and legend

## 2. Scope

- in:
  - wrapped terminal course board for `track map`
  - sector-numbered track tokens
  - progress markers for done, active, and upcoming sectors
  - type-aware ANSI colors for sprint, sweep, chicane, climb, fork, and straight segments
  - plain-text fallback for `--no-color`
- out:
  - browser game rendering
  - canvas or SVG track generation
  - changing roadmap/state schema
  - mutating active task state for demo data
- assumptions:
  - terminal UX remains the fastest product surface for Track
  - a better ASCII/ANSI course board is the right step before a browser dashboard

## 3. Record System

- source_of_truth_docs:
  - [TODO.md](../../TODO.md)
  - [NEXT_SESSION_PLAN.md](../../NEXT_SESSION_PLAN.md)
  - [README.md](../../README.md)
- execution_doc:
  - this worksheet
- state_files_touched:
  - `.track/state.yaml`
  - `.track/roadmap.yaml`

## 4. Outcome

Track should show a clearer retro course board in the terminal, with wrapped sectors, visible progress markers, a legend, and stronger color separation.

## 5. Checkpoints

1. replace the single-line course with a wrapped course board
2. add sector markers and type/state legend
3. verify color and no-color map output

## 6. Verification

```bash
npm test
npm run typecheck
npm run check:harness
npm run map -- --no-color
npm run map -- --color
npm run companion -- --color
```

## 7. Exit Condition

- `track map` renders a wrapped course board
- each segment token includes a progress marker and sector number
- color output differentiates segment types
- no-color output remains readable

## 8. Control Surface Checks

- `npm run check:harness` still points at this worksheet
- map rendering remains deterministic for tests
- visual checks do not mutate `.track/state.yaml`

## 9. Risks

- making the terminal output too noisy
- color encoding progress and segment type ambiguously
- breaking plain terminals by depending on color only

## 10. Mitigations

- keep the status table below the board
- use marker characters in addition to color
- test the plain `--no-color` output
