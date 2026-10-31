#!/bin/bash
# Installs the take agent into /Users/Shared/pebble-takes, from the PERSON'S account (the folder's owner):
#   bash capture/takes/install.sh            (from the repo root; safe to run again: it never touches results or takes)
#
# Ownership (capture/takes/README.md, "Who can write what"):
#   /Users/Shared/pebble-takes            the person's account, 755: only our side creates STOP, PAUSE or code
#     agent/ scripts/                     the person's account, 755, files 644: the agent's code and heavy.sh's copy;
#                                         the demo user can run them, never change them
#     queue/                              the person's account, 755: only the lead writes jobs; the agent only reads
#     results/ raw/ conformed/ log/ run/ .work/
#                                         group staff, 2775 (setgid): the demo user writes there. Every account made in
#                                         Users & Groups is in staff, and this Mac has no other account, so in practice
#                                         that is the person's account and Studio. The agent's umask (002) keeps what
#                                         it writes readable and appendable by the lead.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
REPO="$(cd "$HERE/../.." && pwd -P)"
DEST=/Users/Shared/pebble-takes

if [ "$(id -un)" = studio ]; then
  echo "install.sh: run this from the person's own account, not the demo user" >&2
  exit 64
fi
if [ -f "$DEST/results/agent.json" ] && /usr/bin/python3 - "$DEST/results/agent.json" <<'PY'
import json, sys, time, os
h = json.load(open(sys.argv[1]))
sys.exit(0 if h.get("state") not in ("stopped", None) and time.time() - os.path.getmtime(sys.argv[1]) < 30 else 1)
PY
then
  echo "install.sh: the take agent is running (heartbeat under 30 s old). New code takes effect only when it restarts;" >&2
  echo "            installing anyway (it loaded its code at start, and its script hashes stop it running changed scripts)." >&2
fi

mkdir -p "$DEST"
chmod 755 "$DEST"
for d in agent scripts queue; do
  mkdir -p "$DEST/$d"
  chmod 755 "$DEST/$d"
done
for d in results raw conformed log run .work; do
  mkdir -p "$DEST/$d"
  chgrp staff "$DEST/$d"
  chmod 2775 "$DEST/$d"
done

for f in takeagent.py jobspec.py macos.py media.py ax.js config.json; do
  install -m 644 "$HERE/agent/$f" "$DEST/agent/$f"
done
for f in rec.sh setup.sh start.sh; do
  install -m 755 "$HERE/agent/$f" "$DEST/agent/$f"
done
install -m 755 "$REPO/scripts/heavy.sh" "$DEST/scripts/heavy.sh"
install -m 644 "$REPO/scripts/env.sh" "$DEST/scripts/env.sh"
if [ -f "$HERE/STUDIO_SETUP.md" ]; then
  install -m 644 "$HERE/STUDIO_SETUP.md" "$DEST/STUDIO_SETUP.md"
fi

# A record of what was installed, for the lead's checks.
/usr/bin/python3 - "$DEST" "$(/usr/bin/git -C "$REPO" rev-parse --short HEAD 2>/dev/null || echo unknown)" <<'PY'
import hashlib, json, os, sys, time
dest, commit = sys.argv[1], sys.argv[2]
files = {}
for sub in ("agent", "scripts"):
    for n in sorted(os.listdir(os.path.join(dest, sub))):
        p = os.path.join(dest, sub, n)
        files[f"{sub}/{n}"] = hashlib.sha256(open(p, "rb").read()).hexdigest()
json.dump({"installed": time.strftime("%Y-%m-%dT%H:%M:%S%z"), "commit": commit, "files": files},
          open(os.path.join(dest, "INSTALLED.json"), "w"), indent=1)
PY
chmod 644 "$DEST/INSTALLED.json"

echo "installed the take agent in $DEST:"
ls -la "$DEST" | sed 1d
echo "the Studio user's setup line:  bash $DEST/agent/setup.sh"
echo "the agent alone (a restart):   bash $DEST/agent/start.sh"
