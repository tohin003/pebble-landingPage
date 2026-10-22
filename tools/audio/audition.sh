#!/usr/bin/env bash
# tools/audio/audition.sh <mixkit-id> [...]      "audition without ears" (MASTER_PLAN §6.1 step 2)
#
# For each track already fetched with tools/audio/fetch_track.sh (.work/audio/src/mixkit-<id>.wav):
#   .work/audio/analysis/<id>.png          analyze_track.py: log spectrogram, energy with downbeats, brightness. LOOK AT IT.
#   .work/audio/analysis/<id>.json         analyze_track.py: tempo, beats, downbeats, sections, LUFS, energy per 2 s
#   .work/audio/analysis/<id>.tags.json    Apple SoundAnalysis (sound_tags): instruments, vocals, speech per 3 s window
#   .work/audio/analysis/<id>.metrics.json rubric_metrics.py: R128 loudness/LRA, small speaker, mono, refined grid, bars
# Several files make this a heavy job: run it as  scripts/heavy.sh audition tools/audio/audition.sh 282 431 ...
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=/dev/null
source "$HERE/../../scripts/env.sh"
PY="$REPO/.work/audio/.venv/bin/python"
TAGS="$REPO/.work/audio/sound_tags"
SRC="$REPO/.work/audio/src"
OUT="$REPO/.work/audio/analysis"
mkdir -p "$OUT"
[ -x "$TAGS" ] || xcrun --sdk macosx swiftc -O -swift-version 5 "$HERE/sound_tags.swift" -o "$TAGS"
export MPLCONFIGDIR="$REPO/.work/audio/mpl-cache" NUMBA_CACHE_DIR="$REPO/.work/audio/numba-cache"
for id in "$@"; do
  wav="$SRC/mixkit-$id.wav"
  [ -s "$wav" ] || { echo "audition.sh: missing $wav (run tools/audio/fetch_track.sh $id)" >&2; exit 1; }
  echo "== $id"
  "$PY" -I "$HERE/analyze_track.py" "$wav" "$OUT/$id.png" "$OUT/$id.json" >/dev/null
  "$TAGS" "$wav" >"$OUT/$id.tags.json"
  "$PY" -I "$HERE/rubric_metrics.py" "$wav" "$OUT/$id.metrics.json" --ffmpeg "$FF" >/dev/null
  "$PY" -I "$HERE/audition_summary.py" "$OUT/$id.json" "$OUT/$id.tags.json" "$OUT/$id.metrics.json"
done
