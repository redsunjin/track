# Shared Track Helpers

These helpers provide the common baseline used by every client-specific operating pack.

## Helpers

- `bin/track-context.sh`
  - prints the current Track context through `status` and `next`
- `bin/track-update.sh`
  - wraps the common Track mutation commands

## Rule

Client packs should point at these shared helpers instead of copying Track runtime logic into per-client wrappers.
