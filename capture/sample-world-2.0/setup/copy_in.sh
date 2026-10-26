#!/usr/bin/env bash
# Copies the sample world into the demo user's home folder. Run it AS THE DEMO USER, never in the person's own account:
#   bash /Users/Shared/pebble-sample-world/setup/copy_in.sh
# It refuses to run as anyone but the demo user (default short name "studio"; PEBBLE_DEMO_USER=<name> to change it),
# and it never overwrites: if a target folder already holds files, it stops (use reset_take.sh between takes).
set -euo pipefail

WANT="${PEBBLE_DEMO_USER:-studio}"
if [ "$(id -un)" != "$WANT" ]; then
  echo "copy_in.sh: run this as the demo user '$WANT' (this is '$(id -un)'). Nothing was copied." >&2
  exit 64
fi
SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
if [ ! -f "$SRC/.sample-world-root" ] || [ ! -d "$SRC/home" ]; then
  echo "copy_in.sh: $SRC is not a sample world" >&2
  exit 64
fi
H="${HOME:?}"

for d in "Documents/Open day" "Pictures/Open day" "Projects/studio-bookings" "Music/Studio playlist" "Applications/Kiln Board.app"; do
  if [ -e "$H/$d" ] && [ -n "$(ls -A "$H/$d" 2>/dev/null)" ]; then
    echo "copy_in.sh: $H/$d already holds files; nothing was copied (between takes, use reset_take.sh)" >&2
    exit 65
  fi
done

mkdir -p "$H/Documents" "$H/Pictures" "$H/Projects" "$H/Music" "$H/Applications"
/usr/bin/ditto "$SRC/home/Documents/Open day" "$H/Documents/Open day"
/usr/bin/ditto "$SRC/home/Pictures/Open day" "$H/Pictures/Open day"
/usr/bin/ditto "$SRC/home/Projects/studio-bookings" "$H/Projects/studio-bookings"
if [ -d "$SRC/home/Music/Studio playlist" ]; then /usr/bin/ditto "$SRC/home/Music/Studio playlist" "$H/Music/Studio playlist"; fi
if [ -d "$SRC/home/Applications/Kiln Board.app" ]; then /usr/bin/ditto "$SRC/home/Applications/Kiln Board.app" "$H/Applications/Kiln Board.app"; fi

# The project's own Python, with pytest from the framework Python that every user on this Mac can run (no download).
FPY=/Library/Frameworks/Python.framework/Versions/3.14/bin/python3
"$FPY" -m venv --system-site-packages "$H/Projects/studio-bookings/.venv"
"$H/Projects/studio-bookings/.venv/bin/python" -m pytest --version

# A small Git history, so a reviewed Git plan (tour and kit) has something to show. The identity is the sample's.
(
  cd "$H/Projects/studio-bookings"
  /usr/bin/git init -q -b main
  /usr/bin/git -c user.name=Studio -c user.email=studio@example.com add -A
  /usr/bin/git -c user.name=Studio -c user.email=studio@example.com commit -q -m "Open-day bookings: slots, prices, programme and the booking page"
)

echo "Copied into $H. Next, one at a time (each asks once for permission):"
echo "  osascript \"$SRC/setup/notes.applescript\""
echo "  osascript \"$SRC/setup/calendar.applescript\""
echo "  osascript \"$SRC/setup/music.applescript\""
