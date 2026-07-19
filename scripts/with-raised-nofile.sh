#!/usr/bin/env bash
# Raise the soft file-descriptor limit before starting dev tools.
#
# Root cause of EMFILE / "Too many open files" on this host:
#   soft `ulimit -n` is often 1024, which Vite + Tauri file watchers exhaust.
# Hard limit is typically much higher (e.g. 1048576); raising soft needs no root.
#
# Usage (via package.json):  bash scripts/with-raised-nofile.sh vite
# Manual one-shot:           ulimit -S -n 65536

set -uo pipefail

TARGET="${GOALKEEPER_NOFILE:-65536}"

# Prefer soft/hard query forms; fall back for older shells.
SOFT="$(ulimit -Sn 2>/dev/null || ulimit -n 2>/dev/null || echo 0)"
HARD="$(ulimit -Hn 2>/dev/null || echo unlimited)"

raise_ok=0
if [[ "$SOFT" =~ ^[0-9]+$ ]] && (( SOFT < TARGET )); then
  WANT="$TARGET"
  if [[ "$HARD" =~ ^[0-9]+$ ]] && (( HARD > 0 && HARD < WANT )); then
    WANT="$HARD"
  fi
  # Only raise the soft limit — never lower the hard limit.
  if ulimit -S -n "$WANT" 2>/dev/null; then
    raise_ok=1
  elif ulimit -n "$WANT" 2>/dev/null; then
    raise_ok=1
  fi
fi

NEW="$(ulimit -Sn 2>/dev/null || ulimit -n 2>/dev/null || echo unknown)"
if [[ "$NEW" =~ ^[0-9]+$ ]] && (( NEW < 4096 )); then
  echo "warning: open-file soft limit is only $NEW (wanted >= 4096)." >&2
  echo "  GoalKeeper npm scripts try to raise it automatically when the hard limit allows." >&2
  echo "  If you still see EMFILE / Too many open files, run in this shell:" >&2
  echo "    ulimit -S -n 65536" >&2
  echo "  Optional permanent fix — add to ~/.bashrc:" >&2
  echo "    ulimit -S -n 65536" >&2
elif [[ "$raise_ok" -eq 1 ]]; then
  echo "goalkeeper: open-file soft limit raised to $NEW" >&2
fi

exec "$@"
