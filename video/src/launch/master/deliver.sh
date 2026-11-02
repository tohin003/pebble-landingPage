#!/usr/bin/env bash
# Loudness-normalised delivery encodes of a master (two-pass loudnorm, linear where the measurement allows):
#   video/src/launch/master/deliver.sh 16x9|4x5 [--music-only]
# From video/out/launch/LaunchFilm-<aspect>-master.mp4 (+ its .wav mix if present) it writes, beside it:
#   LaunchFilm-<aspect>-linkedin.mp4   −14 LUFS, −1 dBTP, 30 fps
#   LaunchFilm-<aspect>-web.mp4        −16 LUFS, −1 dBTP, 30 fps (the site's copy)
# 30 fps throughout: the master's own rate (the owner's ruling, 1 Nov); a 60 fps copy would only repeat frames.
# All H.264 High, CRF 16, yuv420p, BT.709, +faststart, AAC-LC 256 kbit/s 48 kHz stereo. Heavy steps via heavy.sh.
source "$(dirname "$0")/_common.sh"
aspect_or_die "${1:-}"; shift
KIND="master"; SUFFIX=""
if [ "${1:-}" = "--music-only" ]; then KIND="musiconly"; SUFFIX="-musiconly"; fi
SRC="$OUT_DIR/LaunchFilm-$ASPECT-$KIND.mp4"
[ -f "$SRC" ] || { echo "deliver.sh: no $SRC (run final.sh first)" >&2; exit 66; }
AUD="${SRC%.mp4}.wav"
[ -f "$AUD" ] || AUD="$SRC"

measure() { # $1 = target LUFS -> prints the loudnorm filter for pass 2
  local target="$1" json
  json="$("$HEAVY" "deliver-measure-$ASPECT" "$FF" -hide_banner -nostats -i "$AUD" -vn \
    -af "loudnorm=I=$target:TP=-1:LRA=11:print_format=json" -f null - 2>&1 | sed -n '/^{/,/^}/p')"
  [ -n "$json" ] || { echo "deliver.sh: loudnorm measurement failed" >&2; exit 70; }
  python3 -c '
import json, sys
m = json.loads(sys.stdin.read()); t = sys.argv[1]
print(f"loudnorm=I={t}:TP=-1:LRA=11:measured_I={m[\"input_i\"]}:measured_TP={m[\"input_tp\"]}:measured_LRA={m[\"input_lra\"]}:measured_thresh={m[\"input_thresh\"]}:offset={m[\"target_offset\"]}:linear=true:print_format=summary")
' "$target" <<<"$json"
}

encode() { # $1 = target LUFS, $2 = fps, $3 = out name
  local target="$1" fps="$2" out="$OUT_DIR/LaunchFilm-$ASPECT$SUFFIX-$3.mp4" af
  af="$(measure "$target"),aresample=48000"
  local vf="fps=$fps,format=yuv420p"
  "$HEAVY" "deliver-$3-$ASPECT" /usr/sbin/taskpolicy -c utility "$FF" -hide_banner -loglevel error -stats -y \
    -i "$SRC" -i "$AUD" -map 0:v:0 -map 1:a:0 \
    -vf "$vf" -c:v libx264 -profile:v high -preset slow -crf 16 -pix_fmt yuv420p \
    -color_primaries bt709 -color_trc bt709 -colorspace bt709 -r "$fps" \
    -af "$af" -c:a aac -b:a 256k -ar 48000 -ac 2 -movflags +faststart "$out"
  echo "deliver.sh: $out"
}

encode -14 30 linkedin
encode -16 30 web
