#!/usr/bin/env bash
# Segmented render for film-2.0 compositions (TREATMENT §7.6, OVERRIDES §49's machine note). Run it ONLY through
# heavy.sh, from the repo root, one job at a time:
#
#   source scripts/env.sh && scripts/heavy.sh f2-demo /usr/sbin/taskpolicy -c utility \
#     bash video/src/film2/render/render-segments.sh F2-Foundation-Demo .work/film2/demo 1680 [segment=480] [scale=0.5] [start=0]
#
# The third argument is the frame the render ends before (the composition's length for a whole render); `start` lets a
# test render a stretch (for example 160 220 for the 60-frame preflight measurement of §7.6).
#
# - Segments of at most 480 frames (8 s at 60 fps), each its own H.264 file with a closed GOP, joined at the end with
#   FFmpeg's concat demuxer without re-encoding.
# - Remotion streams frames to its encoder; the temporary space is its bundle and the browser profile. Before each
#   segment the script checks free disk against 2 × the largest drop it has measured (or 150 MiB before the first)
#   plus the 2 GiB floor, and it records the lowest free disk seen while each segment rendered.
# - The browser is the headless shell 145 already in ~/.cache/puppeteer (no download); scenes with HTML-in-canvas
#   presentations need Chrome ≥ 149 and are not rendered by this script.
# - Memory is the other limit: a render that pushes this 8 GB Mac into swap makes macOS add a 1 GiB swap file on the
#   same disk (measured on 26 Oct: a 60-frame test with CameraMotionBlur over the whole world, riverbed included, took
#   free disk from 2.72 to 1.57 GiB that way). Keep CameraMotionBlur on the foreground windows only, and short.
#   Renders use one browser tab by default (RENDER_CONCURRENCY=1; frames are identical at any concurrency, only slower):
#   on 27 Oct, with other sessions using the memory, half-size segments at concurrency 2 made macOS add swap files twice
#   (free disk 2.43 to 1.07 GiB, then 2.73 to 1.71 GiB). Set RENDER_CONCURRENCY=2 only when memory is plentiful.
set -euo pipefail

COMP="${1:?composition id}"
OUT="${2:?output folder (under .work/)}"
TOTAL="${3:?end frame (exclusive)}"
SEG="${4:-480}"
SCALE="${5:-0.5}"
START="${6:-0}"
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd -P)"
SHELL145="$HOME/.cache/puppeteer/chrome-headless-shell/mac_arm-145.0.7632.77/chrome-headless-shell-mac-arm64/chrome-headless-shell"
FF="${FF:-/opt/homebrew/bin/ffmpeg}"
VOLUME=/System/Volumes/Data
FLOOR_KB=$((2 * 1048576))

case "$OUT" in
/*) ABS_OUT="$OUT" ;;
*) ABS_OUT="$REPO/$OUT" ;;
esac
case "$ABS_OUT" in
"$REPO"/.work/*) ;;
*) echo "render-segments: the output must be under .work/ (got $ABS_OUT)" >&2; exit 64 ;;
esac
mkdir -p "$ABS_OUT"
[ -x "$SHELL145" ] || { echo "render-segments: the headless shell 145 is missing: $SHELL145" >&2; exit 69; }

free_kb() { df -k "$VOLUME" | awk 'NR == 2 { print $4 }'; }
NEED_KB=153600 # 150 MiB before the first measurement (the bundle, about 35 MB, plus the browser profile; the stills job moved free disk by under 5 MB)
LOG="$ABS_OUT/render-log.tsv"
printf 'segment\tfrom\tto\tseconds\tfree_before_kb\tlowest_free_kb\tdrop_kb\n' >"$LOG"
LIST="$ABS_OUT/concat.txt"
: >"$LIST"

cd "$REPO/video"
# a failed segment exits through `set -e`: stop its disk sampler then too (on 28 Oct six failed renders left six
# sampler loops running under launchd)
SAMPLER=""
trap '[ -n "$SAMPLER" ] && kill "$SAMPLER" 2>/dev/null; true' EXIT
i=0
from="$START"
while [ "$from" -lt "$TOTAL" ]; do
  to=$((from + SEG - 1))
  [ "$to" -ge "$TOTAL" ] && to=$((TOTAL - 1))
  f0="$(free_kb)"
  if [ "$f0" -lt $((FLOOR_KB + 2 * NEED_KB)) ]; then
    echo "render-segments: only $((f0 / 1024)) MiB free; segment $i needs $(((FLOOR_KB + 2 * NEED_KB) / 1024)) MiB (2 × $((NEED_KB / 1024)) MiB + the 2 GiB floor). Stopping." >&2
    exit 73
  fi
  seg="$(printf '%s/seg-%03d.mp4' "$ABS_OUT" "$i")"
  # sample free disk while the segment renders
  ( lowest="$f0"; while :; do f="$(free_kb)"; [ "$f" -lt "$lowest" ] && lowest="$f"; echo "$lowest" >"$ABS_OUT/.lowest"; sleep 1; done ) &
  SAMPLER=$!
  t0=$(date +%s)
  npx remotion render src/index.ts "$COMP" "$seg" --frames="$from-$to" --scale="$SCALE" --codec=h264 --crf=18 \
    --image-format=jpeg --jpeg-quality=90 --x264-preset=medium --pixel-format=yuv420p --color-space=bt709 \
    --browser-executable="$SHELL145" --chrome-mode=headless-shell --gl=angle --concurrency="${RENDER_CONCURRENCY:-1}" --log=error
  t1=$(date +%s)
  kill "$SAMPLER" 2>/dev/null || true
  wait "$SAMPLER" 2>/dev/null || true
  SAMPLER=""
  lowest="$(cat "$ABS_OUT/.lowest" 2>/dev/null || echo "$f0")"
  drop=$((f0 - lowest))
  [ "$drop" -gt "$NEED_KB" ] && NEED_KB="$drop"
  printf '%d\t%d\t%d\t%d\t%d\t%d\t%d\n' "$i" "$from" "$to" $((t1 - t0)) "$f0" "$lowest" "$drop" >>"$LOG"
  echo "file '$(basename "$seg")'" >>"$LIST"
  echo "render-segments: segment ${i} frames ${from}-${to} in $((t1 - t0)) s; lowest free $((lowest / 1024)) MiB (drop $((drop / 1024)) MiB)"
  i=$((i + 1))
  from=$((to + 1))
done
rm -f "$ABS_OUT/.lowest"

# join without re-encoding (identical encodes, each starting on a keyframe)
"$FF" -v error -y -f concat -safe 0 -i "$LIST" -c copy -movflags +faststart "$ABS_OUT/$COMP.mp4"
echo "render-segments: joined $i segments into $ABS_OUT/$COMP.mp4"
