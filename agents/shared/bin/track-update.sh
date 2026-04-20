#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT_DIR"

COMMAND="${1:-}"
shift || true

case "$COMMAND" in
  start)
    node --import tsx ./src/cli.ts start "$@"
    ;;
  done)
    node --import tsx ./src/cli.ts done "$@"
    ;;
  block)
    node --import tsx ./src/cli.ts block "$@"
    ;;
  unblock)
    node --import tsx ./src/cli.ts unblock "$@"
    ;;
  checkpoint-advance)
    node --import tsx ./src/cli.ts checkpoint advance "$@"
    ;;
  *)
    echo "usage: track-update.sh {start|done|block|unblock|checkpoint-advance} ..." >&2
    exit 1
    ;;
esac
