#!/usr/bin/env bash
# scripts/serial.sh <label> <command> [args...]      run ONE memory-hungry check at a time (type checks)
#
# On this 8 GB Mac, two `tsc` runs side by side push memory into swap, and each new 1 GiB swap file takes 1 GiB of the
# shared disk. This lock ($REPO/.work/serial.lock) is separate from heavy.sh's, so a type check can still run beside a
# render. scripts/env.sh routes `npm run typecheck` through it. After SERIAL_WAIT_SECS (default 900 s) of waiting, the
# command runs anyway, without the lock. While .work/HOLD exists (another session's load-sensitive tests), the command
# runs at background priority (taskpolicy -b: efficiency cores, throttled disk). Exit status: the command's own.
set -u

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
LOCK="$REPO/.work/serial.lock"
WAIT_SECS=${SERIAL_WAIT_SECS:-900}
mkdir -p "$REPO/.work"

if [ $# -lt 2 ]; then
  echo "usage: scripts/serial.sh <label> <command> [args...]" >&2
  exit 64
fi
LABEL="$1"
shift

mtime_age() { local m; m=$(stat -f %m "$1" 2>/dev/null) || { echo 0; return; }; echo $(($(date +%s) - m)); }

held=0
waited=0
while :; do
  if mkdir "$LOCK" 2>/dev/null; then
    echo "$$" >"$LOCK/pid"
    echo "$LABEL" >"$LOCK/label"
    held=1
    break
  fi
  holder="$(cat "$LOCK/pid" 2>/dev/null)"
  # Stale: the holder is gone, or it died between mkdir and writing its pid (no pid file after 10 s).
  if { [ -n "$holder" ] && ! kill -0 "$holder" 2>/dev/null; } || { [ -z "$holder" ] && [ "$(mtime_age "$LOCK")" -gt 10 ]; }; then
    rm -rf "$LOCK"
    continue
  fi
  if [ "$waited" -ge "$WAIT_SECS" ]; then
    echo "serial.sh: '$LABEL' waited ${WAIT_SECS} s for '$(cat "$LOCK/label" 2>/dev/null)'; running without the lock" >&2
    break
  fi
  [ "$waited" -eq 0 ] && echo "serial.sh: '$LABEL' waits for '$(cat "$LOCK/label" 2>/dev/null)' (one type check at a time)" >&2
  sleep 2
  waited=$((waited + 2))
done

release() { [ "$held" = 1 ] && [ "$(cat "$LOCK/pid" 2>/dev/null)" = "$$" ] && rm -rf "$LOCK"; }
trap release EXIT
trap 'exit 130' INT TERM

if [ -f "$REPO/.work/HOLD" ] && [ -x /usr/sbin/taskpolicy ]; then
  PEBBLE_SERIAL_HELD=1 /usr/sbin/taskpolicy -b "$@"
else
  PEBBLE_SERIAL_HELD=1 "$@"
fi
