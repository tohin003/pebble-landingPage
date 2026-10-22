#!/usr/bin/env bash
# tools/audio/use_music.sh <option-id>      switch the film's music in one command
#
# Options are listed in tools/audio/music_options.json (its "default" names the film's current music):
# "original-sampled" (the composed score played on recorded CC0 instruments), "original" (the same score synthesised
# in code) and the three Mixkit alternates ("mixkit-431", "mixkit-282", "mixkit-79"). The script:
#   1. rebuilds the bed at .work/audio/render/music_bed.wav: composes it; or fetches and verifies the CC0 sample kit
#      (tools/audio/sample_kit.py) and renders it (tools/audio/render_sampled.py); or fetches the Mixkit track, checks
#      its SHA-256 against tools/audio/sha256-sources.txt and fits it to the film with fit_music.py film mode;
#   2. validates it against the option's beat map (validate_bed.py: downbeats, reveal frame, exact length);
#   3. copies the option's beat map to tools/audio/beatmap.json, which the film timeline imports.
# After a switch: re-snap the film to the new beat map, re-export tools/audio/cues.json and re-run the mix (§6.4).
# Needs the audio venv (.work/audio/.venv, Python 3.13). If it is missing, recreate it first:
#   uv venv --python 3.13 .work/audio/.venv && uv pip install --python .work/audio/.venv/bin/python \
#     -r tools/audio/requirements.txt && rm -rf "$UV_CACHE_DIR"
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=/dev/null
source "$HERE/../../scripts/env.sh"
cd "$REPO"
ID="${1:-}"
PY=".work/audio/.venv/bin/python"
OPTS="tools/audio/music_options.json"
[ -x "$PY" ] || { echo "use_music.sh: no audio venv; see the header of this script to recreate it" >&2; exit 1; }
LIST="$("$PY" -I -c "import json; print(' '.join(json.load(open('$OPTS'))['options']))")"
case " $LIST " in
  *" $ID "*) ;;
  *) echo "usage: tools/audio/use_music.sh <option>   options: $LIST" >&2; exit 64 ;;
esac
export MPLCONFIGDIR="$REPO/.work/audio/mpl-cache" NUMBA_CACHE_DIR="$REPO/.work/audio/numba-cache"
read -r KIND MID BEATMAP < <("$PY" -I -c "
import json
o = json.load(open('$OPTS'))['options']['$ID']
print(o['kind'], o.get('mixkit_id', '-'), o['beatmap'])")
[ -n "${BEATMAP:-}" ] || { echo "use_music.sh: could not read option $ID from $OPTS" >&2; exit 1; }
OUT=".work/audio/render/music_bed.wav"
mkdir -p .work/audio/render .work/audio/analysis
BUILD="$("$PY" -I -c "import json; print(' '.join(json.load(open('$OPTS'))['options']['$ID'].get('build', [])))")"
BUILD_SCRIPT="${BUILD%% *}"
BUILD_ARGS="${BUILD#"$BUILD_SCRIPT"}"
if [ "$KIND" = composed ]; then
  # shellcheck disable=SC2086
  "$PY" -I $BUILD_SCRIPT "$OUT" $BUILD_ARGS
elif [ "$KIND" = sampled ]; then
  "$PY" -I tools/audio/sample_kit.py fetch
  # shellcheck disable=SC2086
  "$PY" -I $BUILD_SCRIPT "$OUT" $BUILD_ARGS
else
  bash tools/audio/fetch_track.sh "$MID"
  # shellcheck disable=SC2046
  "$PY" -I tools/audio/fit_music.py ".work/audio/src/mixkit-$MID.wav" "$OUT" \
    $("$PY" -I -c "import json; print(' '.join(json.load(open('$OPTS'))['options']['$ID']['fit']))") >/dev/null
fi
"$PY" -I tools/audio/validate_bed.py "$OUT" "$BEATMAP" .work/audio/analysis/music_bed.validation.json | tail -n 14
cp "$BEATMAP" tools/audio/beatmap.json
echo "use_music.sh: tools/audio/beatmap.json is now '$ID' ($BEATMAP); bed: $OUT"
echo "next: re-snap the film to the new beat map, re-export tools/audio/cues.json, re-run tools/audio/mix_master.py"
