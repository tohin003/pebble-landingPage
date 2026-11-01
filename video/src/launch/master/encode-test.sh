#!/usr/bin/env bash
# LinkedIn's re-encode, simulated (REVIEW-1 S11): renders stretches of the film at 1080p30 (the master's own size and
# rate), re-encodes them as LinkedIn does at about 5 Mbps (H.264 High, 1080p30) and measures blocking on the dark
# grounds (master/blockiness.ts) before and after, with crops for the eye.
#   video/src/launch/master/encode-test.sh [16x9|4x5] [from-to …]     (seconds; default 0-12 72-80)
# Writes .work/launch/master/encode-test/<aspect>-<from>-<to>-{master,5mbps}.mp4, crops and report.txt. Every render
# and encode runs through scripts/heavy.sh, one at a time; don't wrap this script in it.
source "$(dirname "$0")/_common.sh"
ASPECT="16x9"
case "${1:-}" in 16x9|4x5) ASPECT="$1"; shift ;; esac
RANGES=("$@")
[ ${#RANGES[@]} -gt 0 ] || RANGES=(0-12 72-80)
OUT="$DRAFT_DIR/encode-test"
mkdir -p "$OUT"
HERE="$REPO/video/src/launch/master"
REPORT="$OUT/report-$ASPECT.txt"
echo "encode-test $ASPECT $(date '+%Y-%m-%d %H:%M'): 1080p30 master (CRF 12) against a 5 Mbps H.264 re-encode" > "$REPORT"
for r in "${RANGES[@]}"; do
  a="${r%-*}"; b="${r#*-}"
  f0=$(python3 -c "print(round($a*30))"); f1=$(python3 -c "print(round($b*30)-1)")
  M="$OUT/$ASPECT-$a-$b-master.mp4"; L="$OUT/$ASPECT-$a-$b-5mbps.mp4"
  (cd "$REPO/video" && "$HEAVY" "encode-test-$ASPECT-$a" /usr/sbin/taskpolicy -c utility npx remotion render src/index.ts \
    "LaunchFilm-$ASPECT-draft30" "$M" --frames="$f0-$f1" --scale=1 --concurrency=1 --codec=h264 --crf=12 \
    --pixel-format=yuv420p --color-space=bt709 --muted "${CHROME_FLAGS[@]}" > "$OUT/render-$a.log" 2>&1)
  # LinkedIn's ingest, approximated: 5 Mbps average, a 10 Mbit buffer, x264 medium, High profile, 2-s GOP
  "$HEAVY" "encode-test-5m-$a" "$FF" -hide_banner -loglevel error -y -i "$M" -c:v libx264 -preset medium -profile:v high \
    -b:v 5M -maxrate 5M -bufsize 10M -g 60 -pix_fmt yuv420p -an "$L"
  {
    echo "${a}-${b} s:"
    echo "  master: $(bun "$HERE/blockiness.ts" "$M" | sed 's/^[^:]*: //')"
    echo "  5 Mbps: $(bun "$HERE/blockiness.ts" "$L" | sed 's/^[^:]*: //')"
    echo "  5 Mbps bitrate: $("$FP" -v error -show_entries format=bit_rate -of csv=p=0 "$L" | awk '{printf "%.2f Mbps", $1/1e6}')"
  } >> "$REPORT"
  # crops of the darkest stretch for the eye: the frame at a third of the range, 3× contrast so blocking shows
  t=$(python3 -c "print(($b-$a)/3)")
  for v in master 5mbps; do
    src="$OUT/$ASPECT-$a-$b-$v.mp4"
    "$FF" -hide_banner -loglevel error -y -ss "$t" -i "$src" -frames:v 1 -vf "eq=contrast=3:brightness=0.15" "$OUT/$ASPECT-$a-$b-$v-x3.png"
  done
done
cat "$REPORT"
