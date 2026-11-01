#!/usr/bin/env bash
# A half-scale 30 fps preview of the whole film, with the music and the SFX (AAC), for review:
#   video/src/launch/master/draft.sh 16x9|4x5 [--frames a-b] [--muted]
# Writes .work/launch/master/draft-<aspect>.mp4. One heavy job (scripts/heavy.sh); don't wrap this script in heavy.sh.
source "$(dirname "$0")/_common.sh"
aspect_or_die "${1:-}"; shift
EXTRA=()
while [ $# -gt 0 ]; do
  case "$1" in
    --frames) EXTRA+=(--frames="$2"); shift 2 ;;
    --muted) EXTRA+=(--muted); shift ;;
    *) echo "draft.sh: unknown option $1" >&2; exit 64 ;;
  esac
done
OUT="$DRAFT_DIR/draft-$ASPECT.mp4"
cd "$REPO/video"
"$HEAVY" "master-draft-$ASPECT" /usr/sbin/taskpolicy -c utility npx remotion render src/index.ts "$COMP-draft30" "$OUT" \
  --scale=0.5 --concurrency=1 --codec=h264 --crf=20 --pixel-format=yuv420p --color-space=bt709 \
  --audio-codec=aac --audio-bitrate=192k "${CHROME_FLAGS[@]}" ${EXTRA[@]+"${EXTRA[@]}"}
echo "draft.sh: $OUT"
