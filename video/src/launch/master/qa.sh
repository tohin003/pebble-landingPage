#!/usr/bin/env bash
# The checks on a render of the film (a draft or a master):
#   video/src/launch/master/qa.sh <file.mp4> [--out <dir>]
# Writes into <dir> (default .work/launch/master/qa/<file's name>/):
#   sheet-NN.jpg       contact sheets, a frame every 0.25 s (80 tiles a sheet: 20 s), each tile stamped with its time
#   seam-NN-<id>.jpg   a dense window round each seam (every frame at 30 fps, ±0.4 s; master/timeline.ts)
#   frames.txt         the blank and half-painted frame scan (black frames; one-frame luma outliers in either half)
#   flash.json         the flash scan (video/src/film2/qa/flash-rgb-scan.ts)
#   loudness.txt       EBU R128: integrated, LRA, true peak
# Every decode runs through scripts/heavy.sh; don't wrap this script in it.
source "$(dirname "$0")/_common.sh"
FILE="${1:-}"; shift || true
[ -f "$FILE" ] || { echo "usage: qa.sh <file.mp4> [--out dir]" >&2; exit 64; }
case "$FILE" in /*) ;; *) FILE="$OLDPWD/$FILE" ;; esac
NAME="$(basename "${FILE%.*}")"
OUT="$DRAFT_DIR/qa/$NAME"
[ "${1:-}" = "--out" ] && OUT="$2"
mkdir -p "$OUT"
HERE="$REPO/video/src/launch/master"
FPS="$("$FP" -v error -select_streams v:0 -show_entries stream=r_frame_rate -of csv=p=0 "$FILE" | python3 -c 'import sys; a,b=sys.stdin.read().strip().split("/"); print(round(int(a)/int(b)))')"
W="$("$FP" -v error -select_streams v:0 -show_entries stream=width -of csv=p=0 "$FILE")"
H="$("$FP" -v error -select_streams v:0 -show_entries stream=height -of csv=p=0 "$FILE")"
TW=240; TH=$(( TW * H / W / 2 * 2 ))
STAMP="drawtext=fontfile=/System/Library/Fonts/Menlo.ttc:text='%{pts\\:hms}':x=4:y=4:fontsize=13:fontcolor=white:box=1:boxcolor=black@0.6"

# 1. contact sheets: every 0.25 s, 10 × 8 tiles
"$HEAVY" "qa-sheets-$NAME" "$FF" -hide_banner -loglevel error -y -i "$FILE" \
  -vf "fps=4,scale=$TW:$TH,$STAMP,tile=10x8:padding=2:margin=2" -q:v 3 "$OUT/sheet-%02d.jpg"

# 2. the seams, densely
bun "$HERE/check.ts" --json "$OUT/plan.json" >/dev/null 2>&1 || true
python3 - "$OUT/plan.json" > "$OUT/seams.txt" <<'PY'
import json, sys
p = json.load(open(sys.argv[1]))
for i, s in enumerate(p["seams"]):
    print(i, f'{s["at"]:.3f}', s["from"] + "_" + s["kind"])
PY
while read -r i at id; do
  from=$(python3 -c "print(max(0, $at - 0.4))")
  "$HEAVY" "qa-seam-$NAME-$i" "$FF" -hide_banner -loglevel error -y -ss "$from" -t 0.8 -i "$FILE" \
    -vf "fps=30,scale=$TW:$TH,setpts=PTS+$from/TB,$STAMP,tile=8x3:padding=2:margin=2" -frames:v 1 -q:v 3 \
    "$OUT/seam-$(printf %02d "$i")-$id.jpg"
done < "$OUT/seams.txt"

# 3. blank and half-painted frames: luma per frame, top and bottom halves
"$HEAVY" "qa-frames-$NAME" "$FF" -hide_banner -loglevel error -i "$FILE" -filter_complex \
  "[0:v]scale=192:-2,split[a][b];[a]crop=iw:ih/2:0:0,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=$OUT/top.txt[x];[b]crop=iw:ih/2:0:ih/2,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=$OUT/bottom.txt[y];[x][y]vstack" \
  -f null -
python3 "$HERE/qa_frames.py" "$OUT/top.txt" "$OUT/bottom.txt" "$FPS" > "$OUT/frames.txt" || true
rm -f "$OUT/top.txt" "$OUT/bottom.txt"

# 4. flashes (the reference grid; a half-size draft is read as full size)
"$HEAVY" "qa-flash-$NAME" /usr/sbin/taskpolicy -c utility bun "$REPO/video/src/film2/qa/flash-rgb-scan.ts" "$FILE" \
  --fps "$FPS" --out "$OUT/flash.json" --name "$NAME" > "$OUT/flash.txt" 2>&1 || echo "qa.sh: the flash scan reports a failure (see flash.txt)"

# 5. loudness
"$HEAVY" "qa-loudness-$NAME" "$FF" -hide_banner -nostats -i "$FILE" -vn -af ebur128=peak=true -f null - 2>&1 \
  | sed -n '/Summary:/,$p' > "$OUT/loudness.txt" || true

echo "qa.sh: $OUT"
cat "$OUT/frames.txt"; tail -n 3 "$OUT/flash.txt" 2>/dev/null || true; cat "$OUT/loudness.txt"
