#!/usr/bin/env bash
# The film's final soundtrack masters (lane M1): the music bed plus the film's cue list, mastered twice.
#   web     -16 LUFS integrated, limiter ceiling -1.7 dBTP (D10)     -> .work/audio/render/soundtrack_web.wav
#   social  -14 LUFS integrated, limiter ceiling -1.5 dBTP (OVERRIDES §4; the AAC encode then stays <= -1.0 dBTP)
#                                                                     -> .work/audio/render/soundtrack_social.wav
# It refuses to mix when tools/audio/cues.json no longer matches the film's timeline (run
# `bun video/scripts/export-cues.ts` first), and prints the bed's SHA-256 so a swapped bed is visible.
# Run it through the heavy-job lock, from the repo root:
#   source scripts/env.sh && scripts/heavy.sh final-mix tools/audio/final_mix.sh
# Then check both masters: scripts/heavy.sh mix-checks tools/audio/mix_checks.sh
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=/dev/null
source "$HERE/../../scripts/env.sh"

PY="$REPO/.work/audio/.venv/bin/python"
BED="$REPO/.work/audio/render/music_bed.wav"
CUES="$REPO/tools/audio/cues.json"
OUT="$REPO/.work/audio/render"

[ -x "$PY" ] || { echo "final_mix: no venv at $PY (see tools/audio/requirements-mix.txt)" >&2; exit 1; }
[ -f "$BED" ] || { echo "final_mix: no bed at $BED (rebuild: tools/audio/use_music.sh original-sampled)" >&2; exit 1; }
(cd "$REPO" && bun video/scripts/export-cues.ts --check)
echo "final_mix: bed sha256 $(shasum -a 256 "$BED" | cut -d ' ' -f 1)"

"$PY" -I "$REPO/tools/audio/mix_master.py" "$BED" "$CUES" "$OUT/soundtrack_web.wav" --lufs -16 --tp -1.7
"$PY" -I "$REPO/tools/audio/mix_master.py" "$BED" "$CUES" "$OUT/soundtrack_social.wav" --lufs -14 --tp -1.5
shasum -a 256 "$OUT/soundtrack_web.wav" "$OUT/soundtrack_social.wav"
