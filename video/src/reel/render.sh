#!/bin/bash
# Renders a reel composition in segments of at most 480 frames, each its own heavy job (scripts/heavy.sh, utility
# priority, one browser tab), joins them without re-encoding, and, given a WAV, muxes it as AAC (-aac_pns 0).
#   cd <repo> && source scripts/env.sh && bash video/src/reel/render.sh <composition> <out.mp4> [--scale 0.5] [--wav music.wav] [--frames N]
# The segments go to <out>.parts/ and are deleted after the join.
set -euo pipefail
COMP="$1"; OUT="$2"; shift 2
SCALE=1; WAV=""; FRAMES=""
while [ $# -gt 0 ]; do
  case "$1" in
    --scale) SCALE="$2"; shift 2 ;;
    --wav) WAV="$2"; shift 2 ;;
    --frames) FRAMES="$2"; shift 2 ;;
    *) echo "render.sh: unknown option $1" >&2; exit 64 ;;
  esac
done
REPO="$(cd "$(dirname "$0")/../../.." && pwd)"
# paths are taken from the caller's directory
case "$OUT" in /*) ;; *) OUT="$PWD/$OUT" ;; esac
if [ -n "$WAV" ]; then case "$WAV" in /*) ;; *) WAV="$PWD/$WAV" ;; esac; fi
SHELL145="$HOME/.cache/puppeteer/chrome-headless-shell/mac_arm-145.0.7632.77/chrome-headless-shell-mac-arm64/chrome-headless-shell"
[ -x "$SHELL145" ] || { echo "render.sh: the headless shell 145 is missing: $SHELL145" >&2; exit 69; }
FF="${FF:-/opt/homebrew/bin/ffmpeg}"
cd "$REPO/video"
if [ -z "$FRAMES" ]; then
  FRAMES=$(npx remotion compositions src/index.ts --log=error 2>/dev/null | awk -v c="$COMP" '$1==c {print $(NF-1)}' | head -1)
  [ -n "$FRAMES" ] || { echo "render.sh: could not read $COMP's length (pass --frames N)" >&2; exit 65; }
fi
PARTS="$OUT.parts"; mkdir -p "$PARTS"; : > "$PARTS/list.txt"
SEG=480; from=0; i=0
while [ "$from" -lt "$FRAMES" ]; do
  to=$(( from + SEG - 1 )); [ "$to" -ge "$FRAMES" ] && to=$(( FRAMES - 1 ))
  seg="$PARTS/seg$(printf %02d $i).mp4"
  if [ ! -s "$seg" ]; then
    "$REPO/scripts/heavy.sh" "reel-$COMP-$i" /usr/sbin/taskpolicy -c utility \
      npx remotion render src/index.ts "$COMP" "$seg" --frames="$from-$to" --scale="$SCALE" --codec=h264 --crf=16 \
      --image-format=jpeg --jpeg-quality=92 --x264-preset=medium --pixel-format=yuv420p --color-space=bt709 \
      --browser-executable="$SHELL145" --chrome-mode=headless-shell --gl=angle --concurrency=1 --log=error
  fi
  echo "file '$(basename "$seg")'" >> "$PARTS/list.txt"
  from=$(( to + 1 )); i=$(( i + 1 ))
done
SILENT="$OUT.silent.mp4"
(cd "$PARTS" && "$FF" -hide_banner -loglevel error -y -f concat -safe 0 -i list.txt -c copy "$SILENT")
if [ -n "$WAV" ]; then
  "$REPO/scripts/heavy.sh" "reel-$COMP-mux" /usr/sbin/taskpolicy -c utility \
    "$FF" -hide_banner -loglevel error -y -i "$SILENT" -i "$WAV" -map 0:v:0 -map 1:a:0 -c:v copy -af apad -c:a aac -b:a 256k -aac_pns 0 -ar 48000 -shortest -movflags +faststart "$OUT"
  rm -f "$SILENT"
else
  mv "$SILENT" "$OUT"
fi
rm -rf "$PARTS"
echo "render.sh: wrote $OUT"
