#!/usr/bin/env bash
# Gate checks on the trailer's final soundtrack masters (tools/audio/final_mix.sh makes them): tools/audio/mix_checks.py on
#   web       soundtrack_web.wav
#   social    soundtrack_social.wav
#   x30       soundtrack_x30_social.wav (--cut docs/film-cuts/x30.json, the x30's bed and cue list)
#   narrated  soundtrack_social_narrated.wav (--voice: speech is expected over the narrator's lines only; every other
#             gate holds everywhere)
#   narrated-me  soundtrack_social_narrated_me.wav, the narrated twin's music and effects alone, with every gate (the
#             'nothing voice-like' gate applies to the music and effects, OVERRIDES §38)
# The bed alone, for telling the effects from the music, is the score's bed (.work/audio/render/score/bed.wav, or the
# x30's bed_x30.wav). Results: .work/audio/analysis/trailer/<name>.checks.json (+ the SoundAnalysis JSONs and the
# spectrogram PNGs: look at the PNGs, then delete them). Exit 1 when a gate fails. Run it through the heavy-job lock,
# from the repo root:
#   source scripts/env.sh && scripts/heavy.sh mix-checks /usr/sbin/taskpolicy -c utility tools/audio/mix_checks.sh
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=/dev/null
source "$HERE/../../scripts/env.sh"

PY="$REPO/.work/audio/.venv/bin/python"
TAGS="$REPO/.work/audio/sound_tags"
OUT="$REPO/.work/audio/analysis/trailer"
RENDER="$REPO/.work/audio/render"
S="$RENDER/score"
VOICE="$RENDER/candidates/voice/vo.wav"
mkdir -p "$OUT"
if [ ! -x "$TAGS" ]; then # the SoundAnalysis helper (Apple's on-device classifier; nothing is downloaded)
  xcrun --sdk macosx swiftc -O -swift-version 5 "$REPO/tools/audio/sound_tags.swift" -o "$TAGS" || exit 1
fi
rc=0
check() { # <master> <name> [mix_checks.py arguments...]
  local master="$1" name="$2"
  shift 2
  if [ ! -f "$master" ]; then echo "mix_checks: no $master" >&2; rc=1; return; fi
  "$PY" -I "$REPO/tools/audio/mix_checks.py" "$master" "$OUT" --name "$name" --sound-tags "$TAGS" --ffmpeg "$FF" "$@" \
    >"$OUT/$name.summary.json" || rc=1
  "$PY" -I -c '
import json, sys
r = json.load(open(sys.argv[1]))
print("mix_checks: %s: pass %s, %s LUFS, TP %s, AAC %s, phone %s; fails %d, warnings %d, notes %d" % (r["name"], r["pass"],
      r["lufs"], r["tp"], r["aac_tp_160k_192k"], r["phone_max"], len(r["fails"]), len(r["warnings"]), len(r["notes"])))
for k in ("fails", "warnings", "notes"):
    for x in r[k]:
        print("   ", k[:-1], x)
' "$OUT/$name.summary.json"
}
check "$RENDER/soundtrack_web.wav" web --bed "$S/bed.wav"
check "$RENDER/soundtrack_social.wav" social --bed "$S/bed.wav" --no-png
check "$RENDER/soundtrack_x30_social.wav" x30 --target social --cut "$REPO/docs/film-cuts/x30.json" --bed "$S/bed_x30.wav" \
  --cues "$REPO/tools/audio/cues.x30.json"
if [ -f "$RENDER/soundtrack_social_narrated.wav" ]; then
  check "$RENDER/soundtrack_social_narrated.wav" narrated --target social --bed "$S/bed.wav" --voice "$VOICE" --no-png
  check "$RENDER/soundtrack_social_narrated_me.wav" narrated-me --target social --bed "$S/bed.wav" --no-png
fi
exit "$rc"
