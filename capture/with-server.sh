#!/usr/bin/env bash
# capture/with-server.sh <command> [args...]
# Starts serve.mjs (Pebble's real UI with the demo IPC mock, http://127.0.0.1:${PORT:-5199}), waits until it answers,
# runs the command, then always stops the server. Run it through heavy.sh, for example:
#   (from the repo root) source scripts/env.sh &&
#   scripts/heavy.sh capture capture/with-server.sh node capture/capture.mjs main-done
# With a non-default PORT, also pass --base=http://127.0.0.1:$PORT/ to capture.mjs or record.mjs.
set -u
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=/dev/null
source "$HERE/../scripts/env.sh"
PORT="${PORT:-5199}"
LOGS="$HERE/logs"
mkdir -p "$LOGS"

if [ $# -lt 1 ]; then
  echo "usage: capture/with-server.sh <command> [args...]" >&2
  exit 64
fi
if curl -s -o /dev/null --max-time 2 "http://127.0.0.1:$PORT/"; then
  echo "with-server.sh: something already answers on port $PORT; stop it first (or set PORT)" >&2
  exit 69
fi

PORT="$PORT" node "$HERE/serve.mjs" >"$LOGS/vite.log" 2>&1 &
SERVER=$!
stop() {
  kill "$SERVER" 2>/dev/null
  wait "$SERVER" 2>/dev/null
}
trap stop EXIT
trap 'exit 130' INT TERM HUP

ready=0
for _ in $(seq 1 120); do
  if curl -sf -o /dev/null --max-time 5 "http://127.0.0.1:$PORT/"; then
    ready=1
    break
  fi
  if ! kill -0 "$SERVER" 2>/dev/null; then break; fi
  sleep 0.5
done
if [ "$ready" -ne 1 ]; then
  echo "with-server.sh: serve.mjs did not come up; last lines of $LOGS/vite.log:" >&2
  tail -n 20 "$LOGS/vite.log" >&2
  exit 70
fi

"$@"
