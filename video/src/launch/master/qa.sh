#!/usr/bin/env bash
# The checks on a render of the film (a draft or a master):
#   video/src/launch/master/qa.sh <file.mp4> [--out <dir>] [--verify]
# Writes into <dir> (default .work/launch/master/qa/<file's name>/):
#   sheet-NN.jpg       contact sheets, a frame every 0.25 s (80 tiles a sheet: 20 s, row-major)
#   seam-NN-<id>.jpg   a dense window round each seam (every frame at 30 fps, ±0.4 s, row-major; the cut is tile 13)
#   frames.txt         the blank and half-painted frame scan (black frames; one-frame luma outliers in either half)
#   pops.txt           GATE: the neighbour scan (master/pop-scan.ts, the critic's REVIEW-1 M1 scan): a frame drawn
#                      with a layer missing (a take's window empty, a whole frame unpainted) fails it
#   flash.json         GATE: the flash scan (video/src/film2/qa/flash-rgb-scan.ts)
#   loudness.txt       EBU R128: integrated, LRA, true peak
#   gates.txt          the gates' verdicts in one place
# --verify renders every suspect of the neighbour scan again on its own (remotion still) and compares: a frame that
# comes out the same is the edit's own (a one-frame gap between two lines of type, say) and passes; one that comes out
# different was a paint fault in the render and fails.
# Every decode and render runs through scripts/heavy.sh; don't wrap this script in it.
source "$(dirname "$0")/_common.sh"
FILE="${1:-}"; shift || true
[ -f "$FILE" ] || { echo "usage: qa.sh <file.mp4> [--out dir] [--verify]" >&2; exit 64; }
case "$FILE" in /*) ;; *) FILE="$OLDPWD/$FILE" ;; esac
NAME="$(basename "${FILE%.*}")"
OUT="$DRAFT_DIR/qa/$NAME"
VERIFY=0
while [ $# -gt 0 ]; do
  case "$1" in
    --out) OUT="$2"; shift 2 ;;
    --verify) VERIFY=1; shift ;;
    *) echo "qa.sh: unknown option $1" >&2; exit 64 ;;
  esac
done
mkdir -p "$OUT"
HERE="$REPO/video/src/launch/master"
FPS="$("$FP" -v error -select_streams v:0 -show_entries stream=r_frame_rate -of csv=p=0 "$FILE" | python3 -c 'import sys; a,b=sys.stdin.read().strip().split("/"); print(round(int(a)/int(b)))')"
W="$("$FP" -v error -select_streams v:0 -show_entries stream=width -of csv=p=0 "$FILE")"
H="$("$FP" -v error -select_streams v:0 -show_entries stream=height -of csv=p=0 "$FILE")"
TW=240; TH=$(( TW * H / W / 2 * 2 ))
# (this FFmpeg has no drawtext: tiles are unstamped; sheet NN covers (NN−1)×20 s to NN×20 s, row-major, 0.25 s a tile)

# 1. contact sheets: every 0.25 s, 10 × 8 tiles
"$HEAVY" "qa-sheets-$NAME" "$FF" -hide_banner -loglevel error -y -i "$FILE" \
  -vf "fps=4,scale=$TW:$TH,tile=10x8:padding=2:margin=2" -q:v 3 "$OUT/sheet-%02d.jpg"

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
    -vf "fps=30,scale=$TW:$TH,tile=8x3:padding=2:margin=2" -frames:v 1 -q:v 3 \
    "$OUT/seam-$(printf %02d "$i")-$id.jpg"
done < "$OUT/seams.txt"

# 3. blank and half-painted frames: luma per frame, top and bottom halves
"$HEAVY" "qa-frames-$NAME" "$FF" -hide_banner -loglevel error -i "$FILE" -filter_complex \
  "[0:v]scale=192:-2,split[a][b];[a]crop=iw:ih/2:0:0,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=$OUT/top.txt[x];[b]crop=iw:ih/2:0:ih/2,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=$OUT/bottom.txt[y];[x][y]vstack" \
  -f null -
python3 "$HERE/qa_frames.py" "$OUT/top.txt" "$OUT/bottom.txt" "$FPS" > "$OUT/frames.txt" || true
rm -f "$OUT/top.txt" "$OUT/bottom.txt"

# 4. the neighbour scan (REVIEW-1 M1): a layer missing for one frame
"$HEAVY" "qa-pops-$NAME" bun "$HERE/pop-scan.ts" "$FILE" "$OUT/pops.txt" --fps "$FPS" > /dev/null || true
SUSPECTS="$(sed -n 's/^GATE: FAIL, [0-9]* suspect frame(s): //p' "$OUT/pops.txt")"
if [ -n "$SUSPECTS" ] && [ "$VERIFY" = 1 ]; then
  if [ "$W" -gt "$H" ]; then ASPECT=16x9; SCALE=$(python3 -c "print($W/1920)"); else ASPECT=4x5; SCALE=$(python3 -c "print($W/1080)"); fi
  : > "$OUT/verify.txt"
  SAME=""
  for f in $SUSPECTS; do
    png="$OUT/verify-$f.png"
    (cd "$REPO/video" && "$HEAVY" "qa-verify-$NAME-$f" /usr/sbin/taskpolicy -c utility npx remotion still src/index.ts \
      "LaunchFilm-$ASPECT-draft30" "$png" --frame="$f" --scale="$SCALE" "${CHROME_FLAGS[@]}" > /dev/null 2>&1) || true
    if [ -f "$png" ]; then
      v="$(bun "$HERE/pop-verify.ts" "$FILE" "$f" "$png")"
      echo "$v" >> "$OUT/verify.txt"
      case "$v" in SAME*) SAME="$SAME,$f" ;; esac
    else
      echo "UNVERIFIED frame $f: the still did not render" >> "$OUT/verify.txt"
    fi
  done
  bun "$HERE/pop-scan.ts" "$FILE" "$OUT/pops.txt" --fps "$FPS" --verified "${SAME#,}" > /dev/null || true
fi

# 5. flashes (the reference grid; a half-size draft is read as full size)
"$HEAVY" "qa-flash-$NAME" /usr/sbin/taskpolicy -c utility bun "$REPO/video/src/film2/qa/flash-rgb-scan.ts" "$FILE" \
  --fps "$FPS" --out "$OUT/flash.json" --name "$NAME" > "$OUT/flash.txt" 2>&1 || echo "qa.sh: the flash scan reports a failure (see flash.txt)"

# 6. loudness
"$HEAVY" "qa-loudness-$NAME" "$FF" -hide_banner -nostats -i "$FILE" -vn -af ebur128=peak=true -f null - 2>&1 \
  | sed -n '/Summary:/,$p' > "$OUT/loudness.txt" || true

# the gates in one place
{
  echo "qa.sh ${NAME} (${W}×${H}, ${FPS} fps)"
  if grep -q "^frame " "$OUT/frames.txt"; then echo "frames: FAIL ($(grep -c '^frame ' "$OUT/frames.txt") blank or half-painted)"; else echo "frames: PASS"; fi
  echo "pops:   $(sed -n 's/^GATE: //p' "$OUT/pops.txt")"
  [ -f "$OUT/verify.txt" ] && sed 's/^/        /' "$OUT/verify.txt"
  python3 - "$OUT/flash.json" <<'PY'
import json, sys
try:
    f = json.load(open(sys.argv[1])).get("fails", [])
except Exception as e:
    print(f"flash:  NO RESULT ({e})"); sys.exit()
print("flash:  PASS (no binding fails)" if not f else f"flash:  FAIL ({len(f)})")
for x in f: print("        " + x)
PY
  echo "loudness: $(grep -E '^\s+I:' "$OUT/loudness.txt" | head -1 | xargs) / true peak $(grep -E '^\s+Peak:' "$OUT/loudness.txt" | head -1 | xargs)"
} > "$OUT/gates.txt"
echo "qa.sh: $OUT"
cat "$OUT/gates.txt"
