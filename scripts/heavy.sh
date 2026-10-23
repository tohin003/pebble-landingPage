#!/usr/bin/env bash
# scripts/heavy.sh <label> <command> [args...]      run ONE heavy job at a time
# scripts/heavy.sh --status                         who holds the lock, plus the last log lines
#
# Heavy jobs on this 8 GB Mac with a small disk: Remotion renders, stills and Studio; `next build`; `next start` with
# Lighthouse; Playwright; UI capture or record (Vite + headless Chrome); FFmpeg batch encodes; multi-file audio analysis;
# headless-Chrome screenshot batches.
#   - Lock: an atomic `mkdir` lock at $REPO/.work/heavy.lock. While another live job holds it, this waits (up to
#     HEAVY_WAIT_SECS, default 3600 s). A stale lock (its runner and its job are both dead) is taken over.
#   - Disk: refuses to start below 1.7 GiB free on /System/Volumes/Data, and stops the job if free space falls below the
#     1.5 GiB floor while it runs.
#   - Memory: warns when memory_pressure reports less than 20 % free.
#   - Log: start, end, exit code, duration and free disk go to $REPO/.work/heavy.log.
# Exit status: the job's own; or 64 usage, 73 too little disk to start, 74 stopped at the disk floor, 75 lock wait timed out.
# Example, from the repo root: source scripts/env.sh && scripts/heavy.sh next-build npm run build
set -u

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=/dev/null
source "$HERE/env.sh"

VOLUME=/System/Volumes/Data
START_MIN_KB=${HEAVY_START_MIN_KB:-1782580} # 1.7 GiB
FLOOR_KB=${HEAVY_FLOOR_KB:-1572864}         # 1.5 GiB
WAIT_SECS=${HEAVY_WAIT_SECS:-3600}
LOCK="$REPO/.work/heavy.lock"
LOG="$REPO/.work/heavy.log"
mkdir -p "$REPO/.work"
# A disk reservation for another session on this Mac: .work/RESERVE holds the GiB to keep free on line 1 and the
# reason on the lines after. While it exists, a heavy job starts only with floor + reserve free, and a running job is
# stopped 0.5 GiB above the usual floor.
RESERVE_FILE="$REPO/.work/RESERVE"
RESERVE_KB=0
RESERVE_WHY=""
if [ -f "$RESERVE_FILE" ]; then
  RESERVE_KB=$(awk -v g="$(head -n 1 "$RESERVE_FILE" | tr -dc '0-9.')" 'BEGIN { printf "%d", (g + 0) * 1048576 }')
  RESERVE_WHY="$(sed -n '2,$p' "$RESERVE_FILE" | tr '\n' ' ')"
  START_MIN_KB=$((START_MIN_KB + RESERVE_KB))
  FLOOR_KB=$((FLOOR_KB + 524288))
fi
# A CPU hold for another session's load-sensitive work: while .work/HOLD exists, no heavy job starts at all.
# `scripts/heavy.sh --wait-hold` blocks (up to HEAVY_HOLD_WAIT_SECS, default 540 s) until the hold is lifted:
# exit 0 when lifted, 75 when still held.
HOLD_FILE="$REPO/.work/HOLD"
hold_active() { [ -f "$HOLD_FILE" ]; }
hold_reason() { sed -n '1,3p' "$HOLD_FILE" 2>/dev/null | tr '\n' ' '; }

now() { date '+%Y-%m-%dT%H:%M:%S%z'; }
free_kb() { df -k "$VOLUME" | awk 'NR == 2 { print $4 }'; }
human() { awk -v k="$1" 'BEGIN { printf "%.2f GiB", k / 1048576 }'; }
log() { printf '%s %s\n' "$(now)" "$*" >>"$LOG"; }
say() { printf 'heavy.sh: %s\n' "$*" >&2; }
proc_start() { ps -o lstart= -p "$1" 2>/dev/null | sed -e 's/  */ /g' -e 's/^ //' -e 's/ $//'; }
mtime_age() { local m; m=$(stat -f %m "$1" 2>/dev/null) || { echo 0; return; }; echo $(($(date +%s) - m)); }

# Alive = the pid exists AND is the same process that wrote it (start times match), so a reused pid doesn't count.
pid_alive() { # <pid-file> <start-file>
  local pid start
  pid="$(cat "$1" 2>/dev/null)"
  [ -n "$pid" ] || return 1
  kill -0 "$pid" 2>/dev/null || return 1
  start="$(cat "$2" 2>/dev/null)"
  [ -z "$start" ] || [ "$start" = "$(proc_start "$pid")" ]
}
# The lock is live while its runner (heavy.sh) or its job is alive: a killed runner can leave an orphaned job behind.
owner_alive() { pid_alive "$LOCK/pid" "$LOCK/start" || pid_alive "$LOCK/job" "$LOCK/jobstart"; }
holder() { printf "'%s' (pid %s, since %s)" "$(cat "$LOCK/label" 2>/dev/null || echo '?')" "$(cat "$LOCK/pid" 2>/dev/null || echo '?')" "$(cat "$LOCK/since" 2>/dev/null || echo '?')"; }

if [ "${1:-}" = "--wait-hold" ]; then
  waited=0
  limit=${HEAVY_HOLD_WAIT_SECS:-540}
  while hold_active && [ "$waited" -lt "$limit" ]; do
    sleep 15
    waited=$((waited + 15))
  done
  if hold_active; then
    say "still on hold after ${waited}s: $(hold_reason)"
    exit 75
  fi
  say "no hold: heavy jobs may run"
  exit 0
fi

if [ "${1:-}" = "--status" ]; then
  hold_active && echo "HOLD: $(hold_reason)"
  if [ -d "$LOCK" ]; then
    if owner_alive; then echo "held by $(holder)"; else echo "stale lock left by $(holder) (the next job takes it over)"; fi
  else
    echo "free (no heavy job running)"
  fi
  echo "disk: $(human "$(free_kb)") free on $VOLUME"
  [ -f "$LOG" ] && tail -n 8 "$LOG"
  exit 0
fi

if [ $# -lt 2 ]; then
  echo "usage: scripts/heavy.sh <label> <command> [args...]   |   scripts/heavy.sh --status" >&2
  exit 64
fi
LABEL="$1"
shift
# A Remotion job downloads its headless browser (about 570 MB) when it's missing: budget for it up front, so the
# download can't cross the disk floor halfway and leave a broken partial copy behind.
case "$*" in
*remotion*)
  if [ ! -d "$REPO/video/node_modules/.remotion/chrome-headless-shell" ]; then
    START_MIN_KB=$((START_MIN_KB + 614400))
    say "note: Remotion's headless browser is missing and will download first; this job needs 0.6 GiB extra free"
  fi
  ;;
esac

refuse_if_low_disk() {
  local f
  if hold_active; then
    say "HOLD: refusing '$LABEL': $(hold_reason)"
    say "keep doing code and text work; when only heavy work is left, run 'scripts/heavy.sh --wait-hold' (Bash timeout 600000 ms) until it exits 0, then retry"
    log "HOLD label=$LABEL"
    exit 73
  fi
  f="$(free_kb)"
  if [ "$f" -lt "$START_MIN_KB" ]; then
    say "refusing '$LABEL': only $(human "$f") free on $VOLUME (a heavy job needs at least $(human "$START_MIN_KB"))"
    if [ "$RESERVE_KB" -gt 0 ]; then
      say "$(human "$RESERVE_KB") of that is reserved for another session: $RESERVE_WHY"
      say "do non-heavy work now and retry this job later; the lead removes .work/RESERVE when the reservation ends"
    fi
    log "REFUSE label=$LABEL free=$(human "$f") reserve=$(human "$RESERVE_KB")"
    exit 73
  fi
}
refuse_if_low_disk

acquire() {
  local waited=0
  while :; do
    if mkdir "$LOCK" 2>/dev/null; then
      echo $$ >"$LOCK/pid"
      proc_start $$ >"$LOCK/start"
      printf '%s\n' "$LABEL" >"$LOCK/label"
      now >"$LOCK/since"
      return 0
    fi
    # Stale: nobody alive owns it, and its pid file was written (or the lock is older than 30 s).
    if [ -d "$LOCK" ] && ! owner_alive && { [ -s "$LOCK/pid" ] || [ "$(mtime_age "$LOCK")" -gt 30 ]; }; then
      if mkdir "$LOCK.takeover" 2>/dev/null; then
        if [ -d "$LOCK" ] && ! owner_alive && { [ -s "$LOCK/pid" ] || [ "$(mtime_age "$LOCK")" -gt 30 ]; }; then
          say "taking over a stale lock left by $(holder)"
          log "TAKEOVER label=$LABEL stale=$(holder)"
          rm -rf "$LOCK"
        fi
        rmdir "$LOCK.takeover" 2>/dev/null
        continue
      elif [ "$(mtime_age "$LOCK.takeover")" -gt 60 ]; then
        rmdir "$LOCK.takeover" 2>/dev/null
      fi
    fi
    if [ "$waited" -ge "$WAIT_SECS" ]; then
      say "gave up on '$LABEL' after waiting ${waited}s for $(holder)"
      log "TIMEOUT label=$LABEL waited=${waited}s holder=$(holder)"
      exit 75
    fi
    if [ $((waited % 60)) -eq 0 ]; then
      say "waiting: another heavy job holds the lock: $(holder)"
      [ "$waited" -eq 0 ] && log "WAIT label=$LABEL holder=$(holder)"
    fi
    sleep 2
    waited=$((waited + 2))
  done
}

kill_tree() { # <pid> [signal]: children first, then the process itself
  local pid="$1" sig="${2:-TERM}" child
  for child in $(pgrep -P "$pid" 2>/dev/null); do kill_tree "$child" "$sig"; done
  kill "-$sig" "$pid" 2>/dev/null
}

acquire
release() { [ "$(cat "$LOCK/pid" 2>/dev/null)" = "$$" ] && rm -rf "$LOCK"; }
trap release EXIT
refuse_if_low_disk # the disk may have changed while waiting

FREE0="$(free_kb)"
MEM="$(memory_pressure 2>/dev/null | awk -F': ' '/System-wide memory free percentage/ { gsub("%", "", $2); print $2 }')"
if [ -n "$MEM" ] && [ "$MEM" -lt 20 ]; then
  say "warning: memory is tight (${MEM}% free); close Studio, next dev and spare Chrome tabs first"
fi
log "START label=$LABEL pid=$$ free=$(human "$FREE0") mem_free=${MEM:-?}% cwd=$PWD cmd=$*"
say "start '$LABEL' ($(human "$FREE0") free, ${MEM:-?}% memory free)"
T0=$(date +%s)

"$@" &
JOB=$!
echo "$JOB" >"$LOCK/job"
proc_start "$JOB" >"$LOCK/jobstart"

# Watchdog: stop the job if free disk drops below the floor.
(
  while kill -0 "$JOB" 2>/dev/null; do
    sleep 5
    f="$(free_kb)"
    if [ -n "$f" ] && [ "$f" -lt "$FLOOR_KB" ]; then
      echo "$f" >"$LOCK/floor-hit"
      log "FLOOR label=$LABEL free=$(human "$f") -> stopping the job"
      say "free disk fell to $(human "$f"), below the $(human "$FLOOR_KB") floor: stopping '$LABEL'"
      kill_tree "$JOB" TERM
      sleep 10
      kill_tree "$JOB" KILL
      break
    fi
  done
) &
WATCH=$!

on_signal() {
  say "interrupted: stopping '$LABEL'"
  kill_tree "$JOB" TERM
}
trap on_signal INT TERM HUP

wait "$JOB"
RC=$?
while kill -0 "$JOB" 2>/dev/null; do # `wait` returns early when a trapped signal arrives
  wait "$JOB"
  RC=$?
done
kill_tree "$WATCH" TERM
wait "$WATCH" 2>/dev/null

[ -f "$LOCK/floor-hit" ] && RC=74
FREE1="$(free_kb)"
log "END label=$LABEL pid=$$ exit=$RC secs=$(($(date +%s) - T0)) free=$(human "$FREE1")"
say "end '$LABEL': exit $RC after $(($(date +%s) - T0)) s; $(human "$FREE1") free"
exit "$RC"
