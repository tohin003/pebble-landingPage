#!/usr/bin/env bash
# Builds "Kiln Board.app", the sample app for the click by picture (TREATMENT S12, RS-7), into the sample world:
#   <sample-world>/home/Applications/Kiln Board.app
# and draws two looks at it without opening a window:
#   <sample-world>/build/kilnboard-idle.png and kilnboard-running.png
#
# A compile is a heavy job on this Mac: run it through heavy.sh, from the repo root, never while .work/HOLD exists:
#   source scripts/env.sh && /usr/sbin/taskpolicy -c utility scripts/heavy.sh kilnboard \
#     capture/sample-world-2.0/kilnboard/build.sh .work/sample-world
# The app is signed ad hoc (codesign -s -): it runs on this Mac, it is never distributed, and it controls nothing.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
OUT="$(cd "${1:?usage: build.sh <sample-world folder>}" && pwd -P)"
[ -f "$OUT/.sample-world-root" ] || { echo "build.sh: $OUT is not a sample-world folder (no .sample-world-root)" >&2; exit 64; }
PY="${PYQA:-/Library/Frameworks/Python.framework/Versions/3.14/bin/python3}"
APP="$OUT/home/Applications/Kiln Board.app"
TMP="$(mktemp -d "${TMPDIR:-/tmp}/kilnboard.XXXXXX")"
trap 'rm -rf "${TMP:?}"' EXIT

rm -rf "${APP:?}"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources" "$OUT/build"
xcrun swiftc -O -swift-version 5 -target arm64-apple-macos13.0 -module-name KilnBoard \
  -o "$APP/Contents/MacOS/KilnBoard" "$HERE/KilnBoard.swift"
cp "$HERE/Info.plist" "$APP/Contents/Info.plist"
"$PY" -I -B "$HERE/make_icon.py" "$TMP/AppIcon.iconset"
/usr/bin/iconutil -c icns "$TMP/AppIcon.iconset" -o "$APP/Contents/Resources/AppIcon.icns"
/usr/bin/codesign --force --sign - --timestamp=none "$APP"
/usr/bin/codesign --verify --deep --strict "$APP"
"$APP/Contents/MacOS/KilnBoard" --render "$OUT/build/kilnboard-idle.png" --render-running "$OUT/build/kilnboard-running.png"
echo "built: $APP"
ls -la "$OUT/build/kilnboard-idle.png" "$OUT/build/kilnboard-running.png"
