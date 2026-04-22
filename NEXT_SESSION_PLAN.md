# Next Session Plan

## Active Slice

- id: `TRK-042`
- title: `Retro Track Color Pass`

## Goal

Make the terminal map feel more like a retro course board by adding wrapped track tokens, sector markers, type-aware color, and a clear legend.

## First Steps

1. replace the single-line course string with a wrapped course board
2. add sector markers and a state/type legend
3. preserve plain-text fallback while improving ANSI color output

## Constraints

- keep local `.track` files as the source of truth
- keep terminal UX as the primary validation surface
- keep ASCII fallback readable without ANSI color
- do not introduce a browser game surface in this slice
- avoid state mutations during visual checks

## Verification

```bash
npm test
npm run typecheck
npm run check:harness
npm run map -- --no-color
npm run map -- --color
npm run status -- --no-color
```

## Exit Condition

- `track map` renders a wrapped retro course board instead of one long course line
- segment tokens show sector number and progress marker
- ANSI color differentiates segment types while the table keeps done/active/upcoming state clear
- plain text remains readable with `--no-color`
