#!/bin/bash
# Builds the sample world for the takes' week and stages it where the demo user can read it (RUNBOOK §1, §5):
#   bash capture/takes/stage_world.sh [open-day YYYY-MM-DD, a Saturday; default 2026-11-07]
# From the person's account, at the repo root. Light: a few images drawn with Pillow and the project's tests run twice.
#   1. make_sample_world.py --open-day <day>  (into .work/sample-world; Calendar's week then shows the open day)
#   2. its manifest checks must pass: the project's tests (1 failed, 17 passed as shipped; 18 after the fix), the
#      privacy scan clean, nothing missing
#   3. a copy to /Users/Shared/pebble-sample-world (owned by the person's account, read-only for everyone else),
#      swapped in whole, and every file's SHA-256 checked against MANIFEST.json in the copy
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
REPO="$(cd "$HERE/../.." && pwd -P)"
DAY="${1:-2026-11-07}"
DEST=/Users/Shared/pebble-sample-world
PY=/Library/Frameworks/Python.framework/Versions/3.14/bin/python3

[ "$(id -un)" != studio ] || { echo "stage_world.sh: run this from the person's own account" >&2; exit 64; }
cd "$REPO"
/usr/sbin/taskpolicy -b "$PY" -I -B capture/sample-world-2.0/make_sample_world.py --open-day "$DAY"

"$PY" -I -B - .work/sample-world/MANIFEST.json "$DAY" <<'PY'
import json, sys
m = json.load(open(sys.argv[1], encoding="utf-8"))
c = m["checks"]
problems = []
if c.get("open_day") != sys.argv[2]:
    problems.append(f"open day {c.get('open_day')} is not {sys.argv[2]}")
if not (isinstance(c.get("project_tests"), dict) and c["project_tests"].get("ok")):
    problems.append(f"project tests: {c.get('project_tests')}")
if not (isinstance(c.get("privacy_scan"), str) and c["privacy_scan"].startswith("clean")):
    problems.append(f"privacy scan: {c.get('privacy_scan')}")
if c.get("missing"):
    problems.append(f"missing: {c['missing']}")
print(f"manifest: {len(m['files'])} files; open day {c.get('open_day')} ({c.get('weekday')}); tests {c.get('project_tests', {}).get('as_shipped')} / "
      f"{c.get('project_tests', {}).get('after_fix')}; privacy: {c.get('privacy_scan')}")
if problems:
    print("STOP: " + "; ".join(problems), file=sys.stderr)
    sys.exit(1)
PY

NEW="$DEST.new.$$"
rm -rf "$NEW"
/usr/bin/ditto .work/sample-world "$NEW"
chmod -R u+rwX,go+rX,go-w "$NEW"
"$PY" -I -B - "$NEW" <<'PY'
import hashlib, json, os, sys
root = sys.argv[1]
m = json.load(open(os.path.join(root, "MANIFEST.json"), encoding="utf-8"))
bad = [rel for rel, meta in m["files"].items()
       if not os.path.exists(os.path.join(root, rel)) or hashlib.sha256(open(os.path.join(root, rel), "rb").read()).hexdigest() != meta["sha256"]]
print(f"copy: {len(m['files'])} files checked against MANIFEST.json, {len(bad)} differ")
sys.exit(1 if bad else 0)
PY
if [ -e "$DEST" ]; then
  [ -f "$DEST/.sample-world-root" ] || { echo "stage_world.sh: $DEST exists and is not a sample world; not replaced" >&2; rm -rf "$NEW"; exit 1; }
  mv "$DEST" "$DEST.old.$$"
fi
mv "$NEW" "$DEST"
rm -rf "$DEST.old.$$"
echo "staged $DEST (open day $DAY)"
