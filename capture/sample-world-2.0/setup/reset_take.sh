#!/usr/bin/env bash
# Puts the sample world back the way it was before a take. Run AS THE DEMO USER:
#   bash /Users/Shared/pebble-sample-world/setup/reset_take.sh <photos|notes|app-actions|calculator|all>
# What it can't reset is Pebble's own state (a kept tool, an "Always allow", a remembered experience, an open tab):
# the runbook lists those per take, and they are done in Pebble by hand.
set -euo pipefail

WANT="${PEBBLE_DEMO_USER:-studio}"
if [ "$(id -un)" != "$WANT" ]; then
  echo "reset_take.sh: run this as the demo user '$WANT' (this is '$(id -un)')" >&2
  exit 64
fi
SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
[ -f "$SRC/.sample-world-root" ] || { echo "reset_take.sh: $SRC is not a sample world" >&2; exit 64; }
H="${HOME:?}"
WB="$H/Pebble Workbench"

reset_photos() {
  # S15-S16: the resized copies Pebble wrote into its workbench, and the flyer as it was.
  if [ -d "$WB" ]; then
    find "$WB" -mindepth 1 -maxdepth 1 -print -exec rm -rf {} +
  fi
  cp "$SRC/home/Documents/Open day/flyer.md" "$H/Documents/Open day/flyer.md"
  echo "photos: workbench emptied, flyer restored"
}

reset_notes() {
  # S13: the Delete card may have deleted "Old price list (2025)"; notes.applescript makes any missing note again.
  /usr/bin/osascript "$SRC/setup/notes.applescript" >/dev/null
  echo "notes: the five sample notes are present"
}

reset_app_actions() {
  # S14: the note and the event the app-action take made, and the music it started. Pebble names the note itself, so
  # every note in Notes › Notes that is not one of the five sample notes goes (the demo user has no other notes).
  local titles=()
  for f in "$SRC"/notes/*.txt; do titles+=("$(head -n 1 "$f")"); done
  /usr/bin/osascript - "${titles[@]}" <<'APPLESCRIPT' >/dev/null || true
on run keep
	tell application "Notes"
		set f to folder "Notes" of default account
		repeat with n in (every note of f)
			if (name of n) is not in keep then delete n
		end repeat
	end tell
end run
APPLESCRIPT
  /usr/bin/osascript -e 'tell application "Calendar" to repeat with c in calendars
	delete (every event of c whose summary is "Glaze order")
end repeat' >/dev/null || true
  /usr/bin/osascript -e 'tell application "Music" to stop' >/dev/null || true
  echo "app-actions: extra notes, the Glaze order event and the music reset (close Finder windows by hand)"
}

reset_calculator() {
  # S11: Calculator starts at 0, so Pebble never has to clear an old sum (1.9.13).
  /usr/bin/osascript -e 'tell application "Calculator" to quit' >/dev/null || true
  echo "calculator: quit; open it again before the take, and it shows 0"
}

case "${1:?usage: reset_take.sh <photos|notes|app-actions|calculator|all>}" in
  photos) reset_photos ;;
  notes) reset_notes ;;
  app-actions) reset_app_actions ;;
  calculator) reset_calculator ;;
  all) reset_photos; reset_notes; reset_app_actions; reset_calculator ;;
  *) echo "reset_take.sh: unknown take '$1'" >&2; exit 64 ;;
esac
