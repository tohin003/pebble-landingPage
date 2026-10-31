#!/bin/bash
# The Studio user's ONE setup command (STUDIO_SETUP.md step 5). Paste in the Studio user's Terminal:
#   bash /Users/Shared/pebble-takes/agent/setup.sh
# Part 1 (about 5 minutes, scripted): quiet settings, the Dock, Finder, the wallpaper, the sample world copied in, the
# Notes, Calendar and Music sample data. macOS asks a few one-time questions on the way: each is printed first, with the
# button to click. Part 2: it waits while the person does the steps only a person can do (signing Pebble in, the
# permissions, Chrome, Pebble's settings, Lock Screen), then on Return it checks everything and starts the take agent.
# Safe to run again: what is done already is skipped. It refuses to run in any account but the demo user.
set -u
TAKES=/Users/Shared/pebble-takes
WORLD=/Users/Shared/pebble-sample-world
WANT=studio
PY=/Library/Frameworks/Python.framework/Versions/3.14/bin/python3

if [ "$(id -un)" != "$WANT" ]; then
  echo "This is the account '$(id -un)'. Run this only in the Studio user (account name '$WANT'). Nothing was changed." >&2
  exit 64
fi
step() { printf '\n\033[1m%s\033[0m\n' "$*"; }
ask() { printf '\n\033[1;34mmacOS will ask: %s\033[0m\n' "$*"; }
ok() { printf '  done: %s\n' "$*"; }
warn() { printf '  \033[1;31mnote:\033[0m %s\n' "$*"; }
wait_return() { printf '\n\033[1m%s\033[0m ' "$*"; read -r _ </dev/tty; }

step "Pebble film: setting up the Studio user (part 1 of 2, about 5 minutes)"
[ -f "$WORLD/.sample-world-root" ] || { echo "The sample world is missing from $WORLD: tell the lead." >&2; exit 65; }
[ -x "$PY" ] || { echo "Python 3.14 is missing ($PY): tell the lead." >&2; exit 65; }

step "1. Checking the sample world's files against its manifest"
"$PY" -I -B - "$WORLD" <<'PYCHECK' || { echo "The sample world doesn't match its manifest: tell the lead." >&2; exit 65; }
import hashlib, json, os, sys
root = sys.argv[1]
m = json.load(open(os.path.join(root, "MANIFEST.json"), encoding="utf-8"))
bad = []
for rel, meta in m["files"].items():
    p = os.path.join(root, rel)
    if not os.path.exists(p):
        bad.append(f"missing {rel}"); continue
    h = hashlib.sha256(open(p, "rb").read()).hexdigest()
    if h != meta["sha256"]:
        bad.append(f"changed {rel}")
print(f"  {len(m['files'])} files checked, {len(bad)} problems; open day {m['checks']['open_day']}")
for b in bad[:10]:
    print("  " + b)
sys.exit(1 if bad else 0)
PYCHECK

step "2. Quiet settings (no screen saver, no hot corners, no text substitutions, UK region, Spaces in a fixed order)"
defaults -currentHost write com.apple.screensaver idleTime -int 0
for c in tl tr bl br; do defaults write com.apple.dock "wvous-$c-corner" -int 1; defaults write com.apple.dock "wvous-$c-modifier" -int 0; done
defaults write com.apple.dock mru-spaces -bool false
defaults write com.apple.dock show-recents -bool false
defaults write com.apple.dock autohide -bool false
defaults write com.apple.WindowManager EnableStandardClickToShowDesktop -bool false
for k in NSAutomaticQuoteSubstitutionEnabled NSAutomaticDashSubstitutionEnabled NSAutomaticSpellingCorrectionEnabled \
         NSAutomaticCapitalizationEnabled NSAutomaticPeriodSubstitutionEnabled NSAutomaticTextCompletionEnabled \
         WebAutomaticSpellingCorrectionEnabled; do defaults write -g "$k" -bool false; done
defaults write -g AppleLocale -string en_GB
defaults write -g AppleLanguages -array en-GB
defaults write -g AppleICUForce24HourTime -bool true
defaults write -g AppleTemperatureUnit -string Celsius
defaults write -g AppleMeasurementUnits -string Centimeters
defaults write -g AppleMetricUnits -bool true
defaults write com.apple.finder CreateDesktop -bool false
for k in ShowHardDrivesOnDesktop ShowExternalHardDrivesOnDesktop ShowRemovableMediaOnDesktop ShowMountedServersOnDesktop; do
  defaults write com.apple.finder "$k" -bool false
done
defaults write com.apple.finder ShowRecentTags -bool false
# Fast User Switching's menu (it would show the account's name): Don't Show
defaults -currentHost write com.apple.controlcenter UserSwitcher -int 8 2>/dev/null
defaults write com.apple.controlcenter "NSStatusItem Visible UserSwitcher" -bool false 2>/dev/null
ok "settings written"

step "3. The sample world, copied into this user's home"
if [ -d "$HOME/Documents/Open day" ] && [ -n "$(ls -A "$HOME/Documents/Open day" 2>/dev/null)" ]; then
  ok "already copied (skipped)"
else
  bash "$WORLD/setup/copy_in.sh" || { echo "copy_in.sh failed: tell the lead." >&2; exit 65; }
fi
mkdir -p "$HOME/Pebble Workbench"

step "4. The Dock: Finder, Pebble, Chrome, Calculator, Notes, Music, Calendar, Preview, Shortcuts, Kiln Board"
tile() { printf '<dict><key>tile-data</key><dict><key>file-data</key><dict><key>_CFURLString</key><string>file://%s/</string><key>_CFURLStringType</key><integer>15</integer></dict></dict></dict>' "$(printf '%s' "$1" | sed 's/ /%20/g')"; }
defaults write com.apple.dock persistent-apps -array
for app in "/Applications/Pebble.app" "/Applications/Google Chrome.app" "/System/Applications/Calculator.app" \
           "/System/Applications/Notes.app" "/System/Applications/Music.app" "/System/Applications/Calendar.app" \
           "/System/Applications/Preview.app" "/System/Applications/Shortcuts.app" "$HOME/Applications/Kiln Board.app"; do
  [ -d "$app" ] && defaults write com.apple.dock persistent-apps -array-add "$(tile "$app")"
done
defaults write com.apple.dock persistent-others -array
killall Dock 2>/dev/null; killall Finder 2>/dev/null
ok "Dock and Finder restarted"

step "5. The wallpaper (the page's riverbed)"
ask "\"Terminal\" wants access to control \"System Events\". Click Allow (the take agent needs it to read windows)."
if osascript -e "tell application \"System Events\" to tell every desktop to set picture to \"$WORLD/wallpaper/riverbed-light.png\"" >/dev/null 2>&1; then
  ok "wallpaper set"
else
  warn "the wallpaper could not be set by script; set it by hand: System Settings › Wallpaper › Add Photo… › $WORLD/wallpaper/riverbed-light.png"
fi

step "6. Music: the playlist"
echo "  Music opens now. If it shows a welcome screen, click Continue (no Apple Account needed), then come back here."
open -a Music
wait_return "Press Return here when Music's welcome screen is closed."
ask "\"Terminal\" wants access to control \"Music\". Click Allow."
n=$(osascript "$WORLD/setup/music.applescript" 2>&1) && ok "Studio playlist: $n tracks" || warn "Music: $n (tell the lead)"
osascript -e 'tell application "Music" to quit' >/dev/null 2>&1

step "7. Notes: the five sample notes"
ask "\"Terminal\" wants access to control \"Notes\". Click Allow."
out=$(osascript "$WORLD/setup/notes.applescript" 2>&1) && ok "notes made" || warn "Notes: $out (open Notes once, close its welcome, and run this command again)"

step "8. Calendar: the open-day week"
ask "\"Terminal\" wants access to control \"Calendar\" (and perhaps access to your calendars). Click Allow / Allow Full Access."
out=$(osascript "$WORLD/setup/calendar.applescript" 2>&1) && ok "calendar Studio made" || warn "Calendar: $out (open Calendar once, close its welcome, and run this command again)"
wait_return "If Notes or Calendar shows a welcome screen, click Continue in it. Then press Return here."
osascript -e 'tell application "Notes" to quit' >/dev/null 2>&1
osascript -e 'tell application "Calendar" to quit' >/dev/null 2>&1

step "9. Calculator (the reset between takes quits it)"
open -a Calculator; sleep 2
ask "\"Terminal\" wants access to control \"Calculator\". Click Allow."
osascript -e 'tell application "Calculator" to quit' >/dev/null 2>&1 && ok "Calculator answered" || warn "Calculator: allow Terminal in Privacy & Security › Automation"

step "10. A test picture of the screen"
echo "  (Terminal's Screen & System Audio Recording was turned on in step 4 of the checklist, so nothing should ask."
echo "   If macOS asks anyway, turn Terminal on, then quit Terminal, open it again and run this command again.)"
mkdir -p "$TAKES/results/setup" 2>/dev/null
if screencapture -x "$TAKES/results/setup/screen-$(date +%H%M%S).png" 2>/dev/null; then ok "screen picture saved"; else warn "no picture: Screen Recording for Terminal is still off"; fi

step "Part 1 is done."
cat <<'NEXT'

Now, outside this window, do the rest of STUDIO_SETUP.md (it is also at /Users/Shared/pebble-takes/STUDIO_SETUP.md):
  5. the Shortcuts shortcut "Open day checklist"
  6. sign Pebble in to its model (you type any password or key there only; nothing here sees it)
  7. Pebble's permissions
  8. Chrome with Pebble for Chrome, paired
  9. Pebble's own settings for the takes
 10. Lock Screen, sleep and the menu bar
Leave this Terminal window open. When you are done, come back here (step 11).
NEXT
wait_return "Press Return to check everything and start the take agent (or close this window to start it later with: bash $TAKES/agent/start.sh)."
exec bash "$TAKES/agent/start.sh"
