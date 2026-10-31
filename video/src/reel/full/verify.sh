#!/bin/bash
# Checks a delivered reel file (PRO_CHECKLIST, Delivery: "each final file is decoded and checked"): codec, profile,
# size, frame rate, colour tags, duration and frame count; loudness (integrated LUFS) and true peak after the AAC encode;
# black and frozen stretches; the photosensitivity flash scan. Decodes are heavy jobs: run it through scripts/heavy.sh.
#   cd <repo> && source scripts/env.sh && scripts/heavy.sh reel-verify /usr/sbin/taskpolicy -c utility \
#     bash video/src/reel/full/verify.sh <file.mp4> [expected_frames]
set -uo pipefail
F="$1"; EXPECT="${2:-3006}"
FF="${FF:-/opt/homebrew/bin/ffmpeg}"; FP="${FP:-/opt/homebrew/bin/ffprobe}"
REPO="$(cd "$(dirname "$0")/../../../.." && pwd)"
echo "== $F"
"$FP" -v error -select_streams v:0 -show_entries stream=codec_name,profile,width,height,r_frame_rate,pix_fmt,color_space,color_transfer,color_primaries,nb_frames -of default=nw=1 "$F"
"$FP" -v error -select_streams a:0 -show_entries stream=codec_name,sample_rate,channels -of default=nw=1 "$F"
"$FP" -v error -show_entries format=duration,bit_rate -of default=nw=1 "$F"
N=$("$FP" -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames -of csv=p=0 "$F")
echo "decoded frames: $N (expected $EXPECT)"; [ "$N" = "$EXPECT" ] || echo "FAIL: frame count"
echo "-- loudness (EBU R128) and true peak"
"$FF" -hide_banner -nostats -i "$F" -map 0:a:0 -af ebur128=peak=true -f null - 2>&1 | grep -E "^\s+(I:|Peak:)" | tail -2
echo "-- black stretches (>= 0.25 s) and frozen stretches (>= 0.6 s)"
"$FF" -hide_banner -nostats -i "$F" -map 0:v:0 -vf "blackdetect=d=0.25:pix_th=0.06,freezedetect=n=0.002:d=0.6" -f null - 2>&1 | grep -E "black_start|freeze_start" || echo "none"
echo "-- flashes"
bun "$REPO/video/src/film2/qa/flash-rgb-scan.ts" "$F" --fps 60 --name "$(basename "$F")" | tail -5
