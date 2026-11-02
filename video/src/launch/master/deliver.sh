#!/usr/bin/env bash
# Loudness-normalised delivery encodes of a master:
#   video/src/launch/master/deliver.sh 16x9|4x5 [--music-only]        (LIMIT_DB=<dBFS> overrides the limiter, −4.0;
#                                                                      ONLY=linkedin|web delivers just that file)
# From video/out/launch/LaunchFilm-<aspect>-master.mp4 (+ its .wav mix if present) it writes, beside it:
#   LaunchFilm-<aspect>-linkedin.mp4   −14 LUFS, ≤ −1 dBTP, 30 fps
#   LaunchFilm-<aspect>-web.mp4        −16 LUFS, ≤ −1 dBTP, 30 fps (the site's copy)
# 30 fps throughout: the master's own rate (the owner's ruling, 1 Nov); a 60 fps copy would only repeat frames.
# All H.264 High, CRF 16, yuv420p, BT.709, +faststart, AAC-LC 256 kbit/s 48 kHz stereo. Heavy steps via heavy.sh.
#
# The audio (REVIEW-4 M-1). The mix peaks at about 0 dBTP, so a −1 dBTP loudnorm can't stay linear on it and would
# ride the gain (+6 dB on the cold open against +1 dB on the payoff). So the mix first goes through a 4×-oversampled
# peak limiter at LIMIT_DB (auto level off, its look-ahead compensated so the sound stays in sync), and two-pass
# loudnorm then applies one gain to the whole film. The script stops if loudnorm couldn't stay linear, and measures
# every delivered file after AAC: integrated within ±0.5 LU of its target, true peak ≤ −1.0 dBTP.
source "$(dirname "$0")/_common.sh"
aspect_or_die "${1:-}"; shift
KIND="master"; SUFFIX=""
if [ "${1:-}" = "--music-only" ]; then KIND="musiconly"; SUFFIX="-musiconly"; fi
SRC="$OUT_DIR/LaunchFilm-$ASPECT-$KIND.mp4"
[ -f "$SRC" ] || { echo "deliver.sh: no $SRC (run final.sh first)" >&2; exit 66; }
AUD="${SRC%.mp4}.wav"
[ -f "$AUD" ] || AUD="$SRC"
LIMIT_DB="${LIMIT_DB:--4.0}"
LRA_TARGET=20 # linear mode doesn't use it; loudnorm only needs the measured LRA under it to stay linear
LOGS="$DRAFT_DIR/deliver"
mkdir -p "$LOGS"
LIMITED="$LOGS/LaunchFilm-$ASPECT$SUFFIX-limited.wav"

# 1. the limited mix (48 kHz, 24-bit), once for both targets
LIMIT_LIN="$(python3 -c "print(round(10 ** ($LIMIT_DB / 20), 4))")"
"$HEAVY" "deliver-limit-$ASPECT" "$FF" -hide_banner -loglevel error -y -i "$AUD" -vn \
  -af "aresample=192000,alimiter=limit=$LIMIT_LIN:attack=5:release=60:level=0:latency=1,aresample=48000" \
  -c:a pcm_s24le "$LIMITED"

measure() { # $1 = target LUFS -> prints loudnorm's linear pass-2 filter, or fails
  local target="$1" json
  json="$("$HEAVY" "deliver-measure-$ASPECT" "$FF" -hide_banner -nostats -i "$LIMITED" -vn \
    -af "loudnorm=I=$target:TP=-1:LRA=$LRA_TARGET:print_format=json" -f null - 2>&1 | sed -n '/^{/,/^}/p')"
  [ -n "$json" ] || { echo "deliver.sh: loudnorm measurement failed" >&2; return 70; }
  python3 -c '
import json, sys
m = json.loads(sys.stdin.read())
t, lra = float(sys.argv[1]), float(sys.argv[2])
i, tp, mlra = float(m["input_i"]), float(m["input_tp"]), float(m["input_lra"])
after = tp + (t - i)
if after > -1.0 or mlra > lra:
    sys.exit("deliver.sh: loudnorm cannot stay linear for %s LUFS: the limited mix is %.1f LUFS and %.2f dBTP (it would reach %.2f dBTP), LRA %.1f; lower LIMIT_DB" % (sys.argv[1], i, tp, after, mlra))
print("loudnorm=I={t}:TP=-1:LRA={lra}:measured_I={input_i}:measured_TP={input_tp}:measured_LRA={input_lra}:measured_thresh={input_thresh}:offset={target_offset}:linear=true:print_format=summary".format(t=sys.argv[1], lra=sys.argv[2], **m))
' "$target" "$LRA_TARGET" <<<"$json"
}

check() { # $1 = a delivered file, $2 = its target LUFS: its audio as delivered (after AAC)
  local f="$1" target="$2" summary
  summary="$("$HEAVY" "deliver-check-$ASPECT" "$FF" -hide_banner -nostats -i "$f" -vn -af ebur128=peak=true -f null - 2>&1 | sed -n '/Summary:/,$p')"
  python3 -c '
import re, sys
s = sys.stdin.read()
t, name = float(sys.argv[1]), sys.argv[2]
i = float(re.search(r"I:\s+(-?[\d.]+) LUFS", s).group(1))
tp = float(re.search(r"True peak:\s+Peak:\s+(-?[\d.]+) dBFS", s).group(1))
print("deliver.sh: %s: %.1f LUFS integrated, true peak %.1f dBTP" % (name, i, tp))
if abs(i - t) > 0.5 or tp > -1.0:
    sys.exit("deliver.sh: %s is out of spec (%s LUFS within 0.5 LU, true peak at most -1.0 dBTP); lower LIMIT_DB" % (name, sys.argv[1]))
' "$target" "$(basename "$f")" <<<"$summary"
}

encode() { # $1 = target LUFS, $2 = fps, $3 = out name
  local target="$1" fps="$2" out="$OUT_DIR/LaunchFilm-$ASPECT$SUFFIX-$3.mp4" af log
  af="$(measure "$target"),aresample=48000"
  log="$LOGS/LaunchFilm-$ASPECT$SUFFIX-$3.pass2.log"
  "$HEAVY" "deliver-$3-$ASPECT" /usr/sbin/taskpolicy -c utility "$FF" -hide_banner -nostats -loglevel info -y \
    -i "$SRC" -i "$LIMITED" -map 0:v:0 -map 1:a:0 \
    -vf "fps=$fps,format=yuv420p" -c:v libx264 -profile:v high -preset slow -crf 16 -pix_fmt yuv420p \
    -color_primaries bt709 -color_trc bt709 -colorspace bt709 -r "$fps" \
    -af "$af" -c:a aac -b:a 256k -ar 48000 -ac 2 -movflags +faststart "$out" 2> "$log"
  grep -q "Normalization Type: *Linear" "$log" || { echo "deliver.sh: loudnorm wasn't linear for $out (see $log)" >&2; return 71; }
  check "$out" "$target"
  echo "deliver.sh: $out"
}

# ONLY=web (or ONLY=linkedin) encodes just that one: for a run a HOLD stopped after the other was delivered
for k in ${ONLY:-linkedin web}; do
  case "$k" in
    linkedin) encode -14 30 linkedin ;;
    web) encode -16 30 web ;;
    *) echo "deliver.sh: ONLY=$k? (linkedin or web)" >&2; exit 64 ;;
  esac
done
rm -f "$LIMITED"
