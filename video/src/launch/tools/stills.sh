#!/usr/bin/env bash
# Renders stills of a launch composition: bundles video/ once, then one `remotion still` per frame (one browser at a
# time, the headless shell 145). Run it as ONE heavy job, from the repo root:
#   source scripts/env.sh && scripts/heavy.sh launch-stills bash video/src/launch/tools/stills.sh \
#     [--comp LaunchStyle] [--aspects "16x9 4x5"] [--frames "102 222 342 462 582 702"] [--out .work/launch/style] [--prefix style]
# Writes <out>/<prefix>-<aspect>-<n>.png (n from 1) and deletes the bundle afterwards (it copies video/public).
set -euo pipefail
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd -P)"
COMP="LaunchStyle"; ASPECTS="16x9 4x5"; FRAMES="102 222 342 462 582 702"; OUT="$REPO/.work/launch/style"; PREFIX="style"; SCALE=1
while [ $# -gt 0 ]; do
  case "$1" in
    --comp) COMP="$2"; shift 2 ;;
    --aspects) ASPECTS="$2"; shift 2 ;;
    --frames) FRAMES="$2"; shift 2 ;;
    --out) OUT="$2"; shift 2 ;;
    --prefix) PREFIX="$2"; shift 2 ;;
    --scale) SCALE="$2"; shift 2 ;;
    *) echo "stills.sh: unknown option $1" >&2; exit 64 ;;
  esac
done
case "$OUT" in /*) ;; *) OUT="$REPO/$OUT" ;; esac
SHELL145="$HOME/.cache/puppeteer/chrome-headless-shell/mac_arm-145.0.7632.77/chrome-headless-shell-mac-arm64/chrome-headless-shell"
[ -x "$SHELL145" ] || { echo "stills.sh: the headless shell 145 is missing: $SHELL145" >&2; exit 69; }
BUNDLE="$REPO/.work/launch/bundle-stills"
mkdir -p "$OUT"
cd "$REPO/video"
rm -rf "$BUNDLE"
npx remotion bundle src/index.ts --out-dir="$BUNDLE" --log=error
trap 'rm -rf "$BUNDLE"' EXIT
for aspect in $ASPECTS; do
  n=1
  for f in $FRAMES; do
    npx remotion still "$BUNDLE" "$COMP-$aspect" "$OUT/$PREFIX-$aspect-$n.png" --frame="$f" --scale="$SCALE" \
      --browser-executable="$SHELL145" --chrome-mode=headless-shell --gl=angle --log=error
    echo "stills.sh: $COMP-$aspect frame $f -> $OUT/$PREFIX-$aspect-$n.png"
    n=$((n + 1))
  done
done
