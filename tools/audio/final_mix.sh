#!/usr/bin/env bash
# The trailer's final soundtrack masters (2026-10-26; TRAILER_RESEARCH §7 and report.music, OVERRIDES §37-§41): the chosen
# score's stems, the film's cue list (its effects and automation, tools/audio/cues.json) and the x30's
# (tools/audio/cues.x30.json), mastered four times:
#   web       -16 LUFS integrated, limiter ceiling -1.7 dBTP          -> .work/audio/render/soundtrack_web.wav
#   social    -14 LUFS, ceiling -1.5 dBTP                             -> .work/audio/render/soundtrack_social.wav
#   x30       -14 LUFS, ceiling -1.5 dBTP, on the x30's own stems and cue list; settled: the limiter takes 0.5 LU off
#             a cut this dense (it then reads -14.52), so 0.3 dB of make-up brings it to -14.3 (mix_master.py --settle; more
#             would flatten the push on f1723 under the tests passing on f1656 in its first 0.3 s)
#                                                                     -> .work/audio/render/soundtrack_x30_social.wav
#   narrated  the social master with the narrated twin's voice (OVERRIDES §38; docs/film-narration.json): the music and
#             effects duck 4.5 dB under each line (from its first sample, down in 40 ms, so the question hit 3 frames
#             before it plays whole), and the lines sit at -15 LUFS -> soundtrack_social_narrated.wav, plus
#             its music and effects alone (soundtrack_social_narrated_me.wav) for the classifier's gate
# Each master's AAC encode (the film's 160 kb/s, the social films' 192 kb/s, as tools/encode/encode.sh makes them) must
# stay under verify.mjs's gate (-1.5 dBTP film, -1.0 social): where the codec's overshoot would take it over, the ceiling
# comes down in 0.1 dB steps (mix_master.py --aac).
# The score: candidate B (tools/audio/scores/trailer_b.py, the judge's pick on 2026-10-26), its stems rendered into
# .work/audio/render/score/ (bed.wav, drive.wav, bed_x30.wav, drive_x30.wav): rendered first when one is missing or older
# than the score file; their SHA-256 are printed. Each master's mix_master.py report goes to
# .work/audio/analysis/trailer/<name>.mix.json. It refuses to mix when tools/audio/cues.json no longer matches the
# film's timeline or tools/audio/cues.x30.json is stale (run `bun video/scripts/export-cues.ts`, then
# `python3 -I tools/audio/cut_cues.py docs/film-cuts/x30.json`).
# Run it through the heavy-job lock, from the repo root:
#   source scripts/env.sh && scripts/heavy.sh final-mix /usr/sbin/taskpolicy -c utility tools/audio/final_mix.sh
# Then the gates: scripts/heavy.sh mix-checks /usr/sbin/taskpolicy -c utility tools/audio/mix_checks.sh
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=/dev/null
source "$HERE/../../scripts/env.sh"

PY="$REPO/.work/audio/.venv/bin/python"
SCORE="$REPO/tools/audio/scores/trailer_b.py"
S="$REPO/.work/audio/render/score"
VOICE="$REPO/.work/audio/render/candidates/voice/vo.wav"
OUT="$REPO/.work/audio/render"
AN="$REPO/.work/audio/analysis/trailer"
CUES="$REPO/tools/audio/cues.json"
CUES30="$REPO/tools/audio/cues.x30.json"

[ -x "$PY" ] || { echo "final_mix: no venv at $PY (see tools/audio/requirements-mix.txt)" >&2; exit 1; }
(cd "$REPO" && bun video/scripts/export-cues.ts --check)
"$PY" -I "$REPO/tools/audio/cut_cues.py" "$REPO/docs/film-cuts/x30.json" --check >/dev/null
mkdir -p "$S" "$AN"
stale=0
for f in bed drive bed_x30 drive_x30; do
  if [ ! -f "$S/$f.wav" ] || [ "$S/$f.wav" -ot "$SCORE" ]; then stale=1; fi
done
if [ "$stale" = 1 ]; then
  echo "final_mix: rendering the score's stems (one is missing from $S or older than $(basename "$SCORE"))"
  "$PY" -I -u "$SCORE" render --out "$S"
fi
for f in bed drive bed_x30 drive_x30; do
  echo "final_mix: $f.wav sha256 $(shasum -a 256 "$S/$f.wav" | cut -d ' ' -f 1)"
done

mix() { # <name> <mix_master.py arguments...>: the report to $AN/<name>.mix.json, a summary line to stdout
  local name="$1"
  shift
  "$PY" -I "$REPO/tools/audio/mix_master.py" "$@" --ffmpeg "$FF" | tail -n 1 >"$AN/$name.mix.json"
  "$PY" -I -c '
import json, sys
r = json.load(open(sys.argv[2]))
print("final_mix: %s: %s LUFS, %s dBTP, ceiling %s, AAC %s, settle %s" % (sys.argv[1], r["integrated_lufs"],
      r["true_peak_dbtp_4x"], r["ceiling_dbtp"], r.get("aac", {}).get("true_peak_dbtp"), r.get("settle", {}).get("gain_db")))
' "$name" "$AN/$name.mix.json"
}
mix web "$S/bed.wav" "$CUES" "$OUT/soundtrack_web.wav" --drive "$S/drive.wav" --lufs -16 --tp -1.7 --aac 160k:-1.5
mix social "$S/bed.wav" "$CUES" "$OUT/soundtrack_social.wav" --drive "$S/drive.wav" --lufs -14 --tp -1.5 --aac 192k:-1.0
mix x30 "$S/bed_x30.wav" "$CUES30" "$OUT/soundtrack_x30_social.wav" --drive "$S/drive_x30.wav" --lufs -14 --tp -1.5 \
  --aac 192k:-1.0 --settle --settle-max-db 0.3
if [ -f "$VOICE" ]; then
  echo "final_mix: voice sha256 $(shasum -a 256 "$VOICE" | cut -d ' ' -f 1)"
  mix narrated "$S/bed.wav" "$CUES" "$OUT/soundtrack_social_narrated.wav" --drive "$S/drive.wav" --lufs -14 --tp -1.5 \
    --aac 192k:-1.0 --voice "$VOICE" --voice-lufs -15 --voice-duck-db 4.5 --voice-attack-ms 40 --voice-lead-ms 0 \
    --voice-release-ms 300 \
    --me-out "$OUT/soundtrack_social_narrated_me.wav"
else
  echo "final_mix: no voice stem at $VOICE: the narrated twin is not mixed" >&2
fi
cd "$OUT" && shasum -a 256 soundtrack_web.wav soundtrack_social.wav soundtrack_x30_social.wav soundtrack_social_narrated*.wav
