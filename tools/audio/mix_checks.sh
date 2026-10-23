#!/usr/bin/env bash
# Gate checks on both final soundtrack masters (lane M1): tools/audio/mix_checks.py on the web and the social master.
# Results: .work/audio/analysis/m1/{web,social}.checks.json (+ the SoundAnalysis JSONs and spectrogram PNGs: look at
# the PNGs, then delete them). Exit 1 when a gate fails. Run it through the heavy-job lock, from the repo root:
#   source scripts/env.sh && scripts/heavy.sh mix-checks tools/audio/mix_checks.sh
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=/dev/null
source "$HERE/../../scripts/env.sh"

PY="$REPO/.work/audio/.venv/bin/python"
TAGS="$REPO/.work/audio/sound_tags"
OUT="$REPO/.work/audio/analysis/m1"
RENDER="$REPO/.work/audio/render"
mkdir -p "$OUT"
if [ ! -x "$TAGS" ]; then # the SoundAnalysis helper (Apple's on-device classifier; nothing is downloaded)
  xcrun --sdk macosx swiftc -O -swift-version 5 "$REPO/tools/audio/sound_tags.swift" -o "$TAGS" || exit 1
fi
rc=0
"$PY" -I "$REPO/tools/audio/mix_checks.py" "$RENDER/soundtrack_web.wav" "$OUT" --name web --sound-tags "$TAGS" --ffmpeg "$FF" || rc=1
"$PY" -I "$REPO/tools/audio/mix_checks.py" "$RENDER/soundtrack_social.wav" "$OUT" --name social --sound-tags "$TAGS" --ffmpeg "$FF" || rc=1
exit "$rc"
