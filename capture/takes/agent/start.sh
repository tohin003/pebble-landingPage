#!/bin/bash
# Starts the take agent in the Studio user (STUDIO_SETUP.md, last step). Paste in the Studio user's Terminal:
#   bash /Users/Shared/pebble-takes/agent/start.sh
# It checks the permissions, moves the pointer a little so you can see it works, then waits for the lead's jobs.
# To stop it: click Terminal in the Dock and press Control-C (or the lead writes /Users/Shared/pebble-takes/STOP).
set -u
if [ "$(id -un)" != "studio" ]; then
  echo "This is the account '$(id -un)'. The take agent runs only in the Studio user. Nothing was started." >&2
  exit 64
fi
if [ -e /Users/Shared/pebble-takes/STOP ]; then
  echo "The lead has set STOP (/Users/Shared/pebble-takes/STOP): the agent stays off until the lead removes it." >&2
  exit 65
fi
printf '\033]0;Pebble take agent\007'
exec /Library/Frameworks/Python.framework/Versions/3.14/bin/python3 -I -B /Users/Shared/pebble-takes/agent/takeagent.py --live
