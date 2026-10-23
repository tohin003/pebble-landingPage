#!/usr/bin/env bash
# A cut's soundtrack (lane fin-audio, from the x30 plan): its own arrangement of the score, its sound effects, and the
# social master, with the film's gates.
#   tools/audio/cut_soundtrack.sh <cut.json> [bed|mix|checks|all]        (default: all, in that order)
# The cut file (docs/film-cuts/<name>.json, schema pebble-film-cut/1) gives the arrangement: music.form, a FORMS entry
# of tools/audio/compose_score.py, and music.score_bars. It also gives the frame count: 12 bars, 864 frames for x30.
# Outputs go to .work/audio/render/ and are never committed:
#   bed     compose_score.py --form <form> --events -> <name>.events.json; then render_sampled.py, with --levels-from
#           the film bed's .score.json, -> music_bed_<name>.wav. Every bar the cut shares with the film then plays at the
#           film's gains, and the effects sit against it as in the film. Checks:
#           - validate_bed.py on the cut's grid: a downbeat every 72 frames and the exact length;
#           - the anchors: the reveal on the cut frame where the film's reveal (f504) plays, and the final chord on the
#             cut frame of the film's f2160 (each checked as validate_bed's "reveal", +-1 frame);
#           - each bar's loudness against the same bar of the film bed (a report, not a gate).
#   mix     export-cues.ts --check and tools/audio/cut_cues.py --check (tools/audio/cues.json must match the film's
#           timeline, and tools/audio/cues.<name>.json must be current against it), then mix_master.py
#           -> soundtrack_<name>_social.wav: -14 LUFS, limiter ceiling -1.5 dBTP so the AAC stays <= -1.0 dBTP;
#           exactly frames / fps long.
#   checks  mix_checks.py --target social --cut: length, loudness, true peak, AAC, SoundAnalysis (both window grids, the
#           opening after silence, the end card), mono, small speakers, cue audibility, spectrograms
#           -> .work/audio/analysis/<name>/ (look at the PNGs, then delete them).
# The film bed must be current and carry its measured levels: `tools/audio/use_music.sh original-sampled` writes it
# (the sample kit must be on disk for `bed`). Run it through the heavy-job lock, from the repo root:
#   source scripts/env.sh && scripts/heavy.sh cut-x30 tools/audio/cut_soundtrack.sh docs/film-cuts/x30.json
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=/dev/null
source "$HERE/../../scripts/env.sh"
cd "$REPO"

CUT="${1:-}"
STEP="${2:-all}"
[ -f "$CUT" ] || { echo "usage: tools/audio/cut_soundtrack.sh <cut.json> [bed|mix|checks|all]" >&2; exit 64; }
case "$STEP" in bed | mix | checks | all) ;; *) echo "cut_soundtrack: unknown step '$STEP'" >&2; exit 64 ;; esac
PY="$REPO/.work/audio/.venv/bin/python"
[ -x "$PY" ] || { echo "cut_soundtrack: no venv at $PY (see tools/audio/requirements-mix.txt)" >&2; exit 1; }
export PYTHONDONTWRITEBYTECODE=1
R=".work/audio/render"
read -r NAME FORM FRAMES FPS < <("$PY" -I -c "
import json, sys
c = json.load(open(sys.argv[1]))
print(c['name'], c['music']['form'], c['frames'], c.get('fps', 30))" "$CUT")
BED="$R/music_bed_$NAME.wav"
MASTER="$R/soundtrack_${NAME}_social.wav"
CUES="tools/audio/cues.$NAME.json"
AN=".work/audio/analysis/$NAME"
mkdir -p "$R" "$AN"
echo "cut_soundtrack: cut '$NAME' ($CUT): form '$FORM', $FRAMES frames at $FPS fps"

if [ "$STEP" = bed ] || [ "$STEP" = all ]; then
  "$PY" -I -c "
import json, sys
s = json.load(open(sys.argv[1]))
sys.exit(0 if 'levels' in s else 'the film bed has no measured levels: run tools/audio/use_music.sh original-sampled')" \
    "$R/music_bed.score.json"
  echo "cut_soundtrack: film bed sha256 $(shasum -a 256 "$R/music_bed.wav" | cut -d ' ' -f 1)"
  # the arrangement's note events (compose_score.py also renders its synthesised bed: a by-product, deleted)
  "$PY" -I tools/audio/compose_score.py "$R/.cut-$NAME-synth.wav" --seed 7 --form "$FORM" --events "$R/$NAME.events.json" \
    | tail -n 1
  rm -f "$R/.cut-$NAME-synth.wav" "$R/.cut-$NAME-synth.score.json"
  "$PY" -I tools/audio/render_sampled.py "$BED" --seed 7 --events "$R/$NAME.events.json" \
    --levels-from "$R/music_bed.score.json" | tail -n 1
  # the cut's grid and anchors, from the cut file and the film's beat map; then validate_bed.py once per anchor
  "$PY" -I - "$CUT" tools/audio/beatmap.json "$R/$NAME.events.json" "$AN" <<'EOF'
import json, sys
cut, bm, ev = (json.load(open(p)) for p in sys.argv[1:4])
an = sys.argv[4]
bar = bm["bar_frames"]
form = ev["form"]["score_bars"]
if form != cut["music"]["score_bars"]:
    sys.exit(f"compose_score.py's form {form} is not the cut file's music.score_bars {cut['music']['score_bars']}")
if len(form) * bar != cut["frames"]:
    sys.exit(f"{len(form)} bars of {bar} frames is not the cut's {cut['frames']} frames")
ranges, at = [], 0
for first, end in cut["ranges"]:
    ranges.append((first, end, at))
    at += end - first


def to_cut(f):
    return next((s + f - first for first, end, s in ranges if first <= f < end), None)


anchors = {"reveal": bm["reveal"]["frame"], "final-chord": bm["cues"]["final_chord_frame"]}
for name, f in anchors.items():
    c = to_cut(f)
    if c is None:
        print(f"anchor {name}: film f{f} is not in the cut")
        continue
    if c % bar:
        sys.exit(f"anchor {name}: film f{f} plays on cut frame {c}, not on a downbeat")
    m = {"fps": bm["fps"], "total_frames": cut["frames"], "downbeat_frames": list(range(0, cut["frames"], bar)),
         "reveal": {"frame": c, "anchor": name, "film_frame": f}}
    json.dump(m, open(f"{an}/{cut['name']}.beatmap.{name}.json", "w"), indent=1)
    print(f"anchor {name}: film f{f} -> cut f{c} (bar {c // bar + 1}, score bar {form[c // bar]})")
EOF
  for anchor in reveal final-chord; do
    BM="$AN/$NAME.beatmap.$anchor.json"
    [ -f "$BM" ] || continue
    echo "cut_soundtrack: validate_bed, anchor '$anchor'"
    "$PY" -I tools/audio/validate_bed.py "$BED" "$BM" "$AN/$NAME.bed.validation.$anchor.json" \
      | "$PY" -I -c "
import json, sys
t = sys.stdin.read()
r = json.loads(t[: t.rindex('}') + 1])
v = r['reveal']
print(f\"  pass {r['pass']}: {r['downbeats_measured']}/{r['downbeats_total']} downbeats, median |offset| \"
      f\"{r['median_abs_offset_ms']} ms (max {r['max_abs_offset_ms']}), {r['duration_s']} s (want {r['expected_duration_s']}); \"
      f\"anchor f{v['planned_frame']}: attack f{v['attack_frame']}, {v['offset_ms']} ms, strength {v['strength']}\")
sys.exit(0 if r['pass'] else 1)"
  done
  # each bar of the cut against the same bar of the film bed (both at the film's levels): a report, not a gate
  "$PY" -I - "$R/music_bed.score.json" "${BED%.wav}.score.json" "$AN/$NAME.bed.bars.json" <<'EOF'
import json, sys
film, cutb = (json.load(open(p)) for p in sys.argv[1:3])
form = cutb["form"]["score_bars"]
rows = [{"cut_bar": i + 1, "score_bar": b, "cut_db": cutb["bar_rms_db"][i], "film_db": film["bar_rms_db"][b - 1],
         "delta_db": round(cutb["bar_rms_db"][i] - film["bar_rms_db"][b - 1], 1)} for i, b in enumerate(form)]
json.dump({"about": "bar RMS (dB) of the cut's bed against the same score bar in the film bed, both at the film's levels",
           "integrated_lufs": cutb["integrated_lufs"], "rows": rows}, open(sys.argv[3], "w"), indent=1)
print(f"  cut bed {cutb['integrated_lufs']} LUFS; bar RMS vs the film's same bar (dB): " +
      " ".join(f"{r['cut_bar']}={r['score_bar']}:{r['delta_db']:+.1f}" for r in rows))
EOF
  echo "cut_soundtrack: bed $BED sha256 $(shasum -a 256 "$BED" | cut -d ' ' -f 1)"
fi

if [ "$STEP" = mix ] || [ "$STEP" = all ]; then
  [ -f "$BED" ] || { echo "cut_soundtrack: no bed at $BED (run the 'bed' step)" >&2; exit 1; }
  bun video/scripts/export-cues.ts --check                      # the film's cue list matches the timeline ...
  "$PY" -I tools/audio/cut_cues.py "$CUT" --check               # ... and the cut's list matches the film's
  echo "cut_soundtrack: bed sha256 $(shasum -a 256 "$BED" | cut -d ' ' -f 1)"
  "$PY" -I tools/audio/mix_master.py "$BED" "$CUES" "$MASTER" --lufs -14 --tp -1.5
  "$PY" -I -c "
import sys, soundfile as sf
i = sf.info(sys.argv[1])
want = round(int(sys.argv[2]) / int(sys.argv[3]) * i.samplerate)
print(f'cut_soundtrack: {i.frames} samples at {i.samplerate} Hz = {i.frames / i.samplerate} s (want {want} samples)')
sys.exit(0 if i.frames == want else 1)" "$MASTER" "$FRAMES" "$FPS"
  shasum -a 256 "$MASTER"
fi

if [ "$STEP" = checks ] || [ "$STEP" = all ]; then
  TAGS="$REPO/.work/audio/sound_tags"
  if [ ! -x "$TAGS" ]; then # the SoundAnalysis helper (Apple's on-device classifier; nothing is downloaded)
    xcrun --sdk macosx swiftc -O -swift-version 5 "$REPO/tools/audio/sound_tags.swift" -o "$TAGS"
  fi
  "$PY" -I tools/audio/mix_checks.py "$MASTER" "$AN" --name "$NAME" --target social --cut "$CUT" --bed "$BED" \
    --cues "$CUES" --sound-tags "$TAGS" --ffmpeg "$FF"
fi
