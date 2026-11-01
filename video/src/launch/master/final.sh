#!/usr/bin/env bash
# The full-resolution 30 fps master (one browser tab; the owner's ruling, 1 Nov), and its mix as a 48 kHz WAV for delivery:
#   video/src/launch/master/final.sh 16x9|4x5            -> video/out/launch/LaunchFilm-<aspect>-master.mp4 (+ .wav)
#   video/src/launch/master/final.sh 16x9|4x5 --music-only
#        -> LaunchFilm-<aspect>-musiconly.mp4 (+ .wav): the master's picture with the bare music under it (no SFX at
#           all, scene-placed ones included). Needs the master first.
# Scan the master before encoding (qa.sh). Heavy steps go through scripts/heavy.sh; don't wrap this script in it.
source "$(dirname "$0")/_common.sh"
aspect_or_die "${1:-}"; shift
MASTER="$OUT_DIR/LaunchFilm-$ASPECT-master.mp4"
if [ "${1:-}" = "--music-only" ]; then
  [ -f "$MASTER" ] || { echo "final.sh: render the master first ($MASTER)" >&2; exit 66; }
  MUSIC="$(music_wav)"
  [ -f "$MUSIC" ] || { echo "final.sh: the music file is missing: $MUSIC" >&2; exit 66; }
  OUT="$OUT_DIR/LaunchFilm-$ASPECT-musiconly.mp4"
  "$HEAVY" "master-musiconly-$ASPECT" "$FF" -hide_banner -loglevel error -y -i "$MASTER" -i "$MUSIC" \
    -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 320k -ar 48000 -shortest -movflags +faststart "$OUT"
  "$HEAVY" "master-musiconly-wav-$ASPECT" "$FF" -hide_banner -loglevel error -y -i "$MUSIC" -ar 48000 -c:a pcm_s24le "${OUT%.mp4}.wav"
  echo "final.sh: $OUT"
  exit 0
fi
cd "$REPO/video"
"$HEAVY" "master-final-$ASPECT" /usr/sbin/taskpolicy -c utility npx remotion render src/index.ts "$COMP" "$MASTER" \
  --concurrency=1 --codec=h264 --crf=12 --pixel-format=yuv420p --color-space=bt709 \
  --audio-codec=aac --audio-bitrate=320k "${CHROME_FLAGS[@]}"
# the mix, uncompressed, for the loudness passes (deliver.sh)
"$HEAVY" "master-final-wav-$ASPECT" /usr/sbin/taskpolicy -c utility npx remotion render src/index.ts "$COMP" "${MASTER%.mp4}.wav" \
  --codec=wav --concurrency=1 "${CHROME_FLAGS[@]}"
echo "final.sh: $MASTER and ${MASTER%.mp4}.wav"
