#!/usr/bin/env bash
# Contact sheets and seam strips from a render, for LOOKING at motion (TREATMENT §7.3 G3; the brief: "look at what you
# make: contact sheets of demo stills and strips across every seam"). FFmpeg is a heavy job: run it through heavy.sh.
#
#   source scripts/env.sh && scripts/heavy.sh f2-sheets /usr/sbin/taskpolicy -c utility \
#     bash video/src/film2/render/sheets.sh .work/film2/demo/F2-Foundation-Demo.mp4 .work/film2/look 30 350,994,1364 [window=6]
#
# Writes <out>/sheet.jpg (every Nth frame, 6 across) and <out>/seam-<frame>.jpg (frames seam−window … seam+window−1 in
# one row, so the frames on both sides of each cut sit side by side), each tile labelled with its frame number (drawn
# before the select, so the label is the frame's number in the film).
set -euo pipefail
VIDEO="${1:?video}"
OUT="${2:?output folder}"
EVERY="${3:-30}"
SEAMS="${4:-}"
WIN="${5:-6}"
FF="${FF:-/opt/homebrew/bin/ffmpeg}"
FP="${FP:-/opt/homebrew/bin/ffprobe}"
mkdir -p "$OUT"
N="$("$FP" -v error -select_streams v:0 -count_packets -show_entries stream=nb_read_packets -of csv=p=0 "$VIDEO")"
ROWS=$(((N / EVERY + 5) / 6))
LABEL="drawtext=text='%{n}':x=6:y=6:fontsize=16:fontcolor=white:box=1:boxcolor=black@0.55"
# drawtext needs a font; fall back to no labels if this FFmpeg has none configured
if ! "$FF" -v error -f lavfi -i color=c=black:s=32x32:d=0.1 -vf "$LABEL" -f null - 2>/dev/null; then LABEL="null"; fi
"$FF" -v error -y -i "$VIDEO" -vf "$LABEL,select='not(mod(n\,$EVERY))',scale=320:-2,tile=6x$ROWS:padding=4:color=0x1e201e" -frames:v 1 -q:v 3 "$OUT/sheet.jpg"
echo "sheets: $OUT/sheet.jpg ($N frames, every $EVERY)"
IFS=',' read -r -a list <<<"$SEAMS"
for s in "${list[@]}"; do
  [ -n "$s" ] || continue
  a=$((s - WIN))
  b=$((s + WIN - 1))
  [ "$a" -lt 0 ] && a=0
  "$FF" -v error -y -i "$VIDEO" -vf "$LABEL,select='between(n\,$a\,$b)',scale=320:-2,tile=$((b - a + 1))x1:padding=4:color=0x1e201e" -frames:v 1 -q:v 3 "$OUT/seam-$s.jpg"
  echo "sheets: $OUT/seam-$s.jpg (frames $a-$b)"
done
