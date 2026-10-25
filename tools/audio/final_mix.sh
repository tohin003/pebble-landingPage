#!/usr/bin/env bash
# The film's final soundtrack masters (lane M1; the energetic recut, ENERGY_SPEC §8.5): the music bed, the drive stem and
# the film's cue list (effects and automation), mastered twice.
#   web     -16 LUFS integrated, limiter ceiling -1.7 dBTP (D10)     -> .work/audio/render/soundtrack_web.wav
#   social  -14 LUFS integrated, limiter ceiling -1.5 dBTP (OVERRIDES §4; the AAC encode then stays <= -1.0 dBTP)
#                                                                     -> .work/audio/render/soundtrack_social.wav
# Each master is then encoded as tools/encode/encode.sh encodes it (the film's AAC 160 kb/s, the social films' 192 kb/s)
# and, where the codec's overshoot would take it over verify.mjs's gate (-1.5 dBTP film, -1.0 social), the ceiling comes
# down in 0.1 dB steps (mix_master.py --aac): the recut's drums made the 160 kb/s encode read up to 0.5 dB over it.
# The drive (tools/audio/drive.py -> .work/audio/render/drive.wav) is rendered first when it is missing or older than
# drive.py, and its SHA-256 is printed next to the bed's. It refuses to mix when tools/audio/cues.json no longer matches
# the film's timeline (run `bun video/scripts/export-cues.ts` first).
# Run it through the heavy-job lock, from the repo root:
#   source scripts/env.sh && scripts/heavy.sh final-mix tools/audio/final_mix.sh
# Then check both masters: scripts/heavy.sh mix-checks tools/audio/mix_checks.sh
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=/dev/null
source "$HERE/../../scripts/env.sh"

PY="$REPO/.work/audio/.venv/bin/python"
BED="$REPO/.work/audio/render/music_bed.wav"
DRIVE="$REPO/.work/audio/render/drive.wav"
CUES="$REPO/tools/audio/cues.json"
OUT="$REPO/.work/audio/render"

[ -x "$PY" ] || { echo "final_mix: no venv at $PY (see tools/audio/requirements-mix.txt)" >&2; exit 1; }
[ -f "$BED" ] || { echo "final_mix: no bed at $BED (rebuild: tools/audio/use_music.sh original-sampled)" >&2; exit 1; }
(cd "$REPO" && bun video/scripts/export-cues.ts --check)
echo "final_mix: bed sha256 $(shasum -a 256 "$BED" | cut -d ' ' -f 1)"
if [ ! -f "$DRIVE" ] || [ "$DRIVE" -ot "$REPO/tools/audio/drive.py" ]; then
  echo "final_mix: rendering the drive ($DRIVE is missing or older than tools/audio/drive.py)"
  "$PY" -I "$REPO/tools/audio/drive.py" --out "$DRIVE"
fi
echo "final_mix: drive sha256 $(shasum -a 256 "$DRIVE" | cut -d ' ' -f 1)"

"$PY" -I "$REPO/tools/audio/mix_master.py" "$BED" "$CUES" "$OUT/soundtrack_web.wav" --drive "$DRIVE" --lufs -16 --tp -1.7 \
  --aac 160k:-1.5 --ffmpeg "$FF"
"$PY" -I "$REPO/tools/audio/mix_master.py" "$BED" "$CUES" "$OUT/soundtrack_social.wav" --drive "$DRIVE" --lufs -14 --tp -1.5 \
  --aac 192k:-1.0 --ffmpeg "$FF"
shasum -a 256 "$OUT/soundtrack_web.wav" "$OUT/soundtrack_social.wav"
