# CLI Sound Design

Track can play short optional sound cues from terminal commands.
Sound is a UX layer only; it must never change Track state or appear in JSON output.

## Defaults

- sound is off by default
- `--sound` enables sound for one command
- `--no-sound` disables sound even when environment variables are set
- `TRACK_SOUND=1` enables sound for a shell session
- `--sound-theme retro` selects the initial retro race theme
- `--sound-mode auto|afplay|bell` controls the playback backend

Examples:

```bash
track status --sound
track next --sound --sound-theme retro
track watch --sound
TRACK_SOUND=1 track status
TRACK_SOUND=1 track done task-123
```

## Playback

The initial CLI implementation is intentionally local and dependency-free.

- macOS uses `afplay` with built-in system sounds when available
- non-macOS platforms fall back to terminal bell
- `--json` disables sound even if `--sound` is passed
- watch mode plays only when the rendered output changes

## Cue Map

| State or event | Cue |
| --- | --- |
| green status | short go cue |
| yellow status | warning cue |
| red or blocked status | alert cue |
| task completed | checkpoint pass cue |
| checkpoint advanced | stronger checkpoint cue |
| lap completed | reserved lap-finish cue |

## Guardrails

- no auto-sound in CI by default
- no bundled audio assets in the first implementation
- no sound effects from MCP server responses
- no sound in machine-readable JSON output
- no long-running audio process should block CLI completion

## Future UI

The browser or VS Code companion can later use Web Audio API synth tones for a stronger 80s dashboard feel.
That should stay separate from the CLI backend so terminal users keep predictable behavior.
