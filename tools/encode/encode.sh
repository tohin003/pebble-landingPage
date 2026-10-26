#!/usr/bin/env bash
# tools/encode/encode.sh: the web and social encodes of the film, teaser, loops and posters (MASTER_PLAN §5.5,
# OVERRIDES §4, §8 and §14). Homebrew FFmpeg ($FF, $FP from scripts/env.sh); bash 3.2 compatible.
#
# Usage, from the repo root after `source scripts/env.sh`:
#   tools/encode/encode.sh film   <master.mp4> <soundtrack_web.wav> [--only 1080.hevc,1080.h264,720.hevc,720.h264]
#   tools/encode/encode.sh square <square_master.mp4> <soundtrack_web.wav> <square_social.mp4> [--only hevc,h264]
#   tools/encode/encode.sh social <master.mp4> <soundtrack_social.wav> <out.mp4> [--cut <cut.json>] [--crf <n>]
#   tools/encode/encode.sh loop   <id> <master.mp4> [<phone_master.mp4>]
#   tools/encode/encode.sh teaser <master.mp4>
#   tools/encode/encode.sh poster <png> <out-base> <width> <height>
# Common options: --out-dir <dir> (film, square, loop, teaser; default public/media/v1, or $ENCODE_OUT), --exact (keep
# the starting CRF even when a file misses its budget), --no-verify (skip the verify.mjs pass at the end).
#
# - One command = ONE scripts/heavy.sh job. Run directly, the script re-runs itself through heavy.sh (which waits for
#   the lock and refuses when disk or memory is short); started by heavy.sh, it just runs.
# - Inputs are checked before the job queues: 30 fps masters (D7), the film at 1920x1080, a 48 kHz stereo soundtrack
#   whose length matches the picture within one frame.
# - Masters are high-quality H.264 renders from Remotion (CRF about 12; ProRes doesn't fit this disk).
# - Encodes run in .work/tmp/encode/ and each output is moved into place only when complete and checked: the same frame
#   count as its master, and for HEVC a codecs string that fits the page's <source type> (src/lib/media.ts,
#   hvc1.1.6.L120.90). If x265 ever signals a higher level or the high tier, the file is re-encoded with level-idc=4.0
#   and high-tier=0.
# - Budgets: a file starts at its MASTER_PLAN §5.5 CRF. Over its budget, the CRF rises (an estimated step, then +1)
#   until it fits, never past the start + 4 (film) or + 6 (loops, teaser); the resolution never drops. The first CRF that
#   fits wins; failing that, the lowest CRF under the hard limit; failing that, the command fails and the file is kept
#   in .work/tmp/encode-rejected/ for a look.
#     film-1080 HEVC CRF 25, H.264 CRF 20; film-720 CRF +1 (26, 21)       budget 12 / 18 / 6 / 9 MB (critic C6, adopted
#                                                                          by OVERRIDES §8: the film set <= ~45 MB);
#                                                                          hard limit = §5.5's 20 / 30 / 12 / 18 MB
#     loop HEVC CRF 27 <= 0.9 MB; loop H.264 CRF 23 <= 1.2 MB (hard 1.5)   (and the -phone 4:5 cuts the same)
#       A loop may start lower with LOOP_HEVC_CRF and LOOP_H264_CRF; its budgets stay. L1 (loop companion) uses 22 / 19:
#       its desktop is one smooth gradient, which blocked at 27 / 23 (critic C09), and it was far under budget.
#     teaser-720 HEVC CRF 26, H.264 CRF 21 (the film-720 settings) <= 1.5 MB each
#     posters: AVIF q50 effort 6 <= 60 KB, WebP q76 <= 90 KB, quality lowered stepwise to fit (tools/encode/poster.mjs);
#              a simple picture (under 1/4 of its budget at q50 / q76) gets more quality, up to q80 / q90, within 1/4
# - Every encode: yuv420p, BT.709 tags put on the frames with setparams (so they reach the VUI and the MP4 colr box),
#   +faststart, no global metadata (Remotion's "Made with Remotion" comment is dropped); x264 at -level:v 4.0.
#   Film: AAC 160 kb/s 48 kHz from the web soundtrack (one AAC generation). Loops and teaser: -an.
#   Social: H.264 High CRF 18 (VBV 20 Mb/s inside level 4.0), AAC-LC 192 kb/s 48 kHz stereo.
# - The 1:1 film for phones (OVERRIDES §46 P2-9; src/lib/media.ts phoneSources): film-square.h264.mp4 is the 1:1 social
#   film's video, copied (-c:v copy, no second encode), with the film's AAC 160 kb/s from the web soundtrack;
#   film-square.hevc.mp4 is its HEVC twin, encoded from the 1:1 master as film-1080.hevc is (CRF 25, budget 6 MB, hard
#   limit 12 MB), kept only while the film set (every film-*.mp4 in the folder) stays within 45 MB.
# - At the end, tools/encode/verify.mjs checks the new files (codecs, colour, faststart, sizes, loudness, loop seams).
#
# Exit: 0 ok; 1 a failed encode or check; 64 usage; heavy.sh's own codes (73 refused: too little disk or memory, or a
# hold; 75 lock wait timed out).
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=/dev/null
source "$HERE/../../scripts/env.sh"
ORIG_ARGS=("$@")

MB=1000000
FILM_MAX_RAISE=4
MAX_RAISE=6
OUT="${ENCODE_OUT:-$REPO/public/media/v1}"
EXACT=0
VERIFY=1
WORK=""
OUTPUTS=""
STATS=-nostats
[ -t 2 ] && STATS=-stats
# Tests only: multiplies every budget, so tiny synthetic inputs exercise the CRF steps (verify.mjs keeps the real ones).
BUDGET_SCALE="${ENCODE_BUDGET_SCALE:-1}"
# The loops' starting CRFs (see the header): lower for a loop whose picture needs it, within the same budgets.
LOOP_HEVC_CRF="${LOOP_HEVC_CRF:-27}"
LOOP_H264_CRF="${LOOP_H264_CRF:-23}"

die() { printf 'encode.sh: %s\n' "$*" >&2; exit 1; }
usage_die() { printf 'encode.sh: %s\n' "$*" >&2; printf 'run "tools/encode/encode.sh --help" for usage\n' >&2; exit 64; }
note() { printf 'encode.sh: %s\n' "$*" >&2; }
fsize() { stat -f %z "$1"; }
human() { awk -v b="$1" 'BEGIN { if (b >= 1000000) printf "%.2f MB", b / 1000000; else printf "%.1f KB", b / 1000 }'; }
usage() { sed -n '2,/^set -euo/p' "$0" | sed -e '$d' -e 's/^# \{0,1\}//'; }
add_output() { OUTPUTS="${OUTPUTS}${OUTPUTS:+
}$1"; }

# ---- one heavy job ------------------------------------------------------------------------------------------------

# True when an ancestor of this process is the heavy.sh runner that holds the lock (heavy.sh writes its pid there
# before it starts the job, so there is no race).
in_heavy_job() {
  local runner pid
  runner="$(cat "$REPO/.work/heavy.lock/pid" 2>/dev/null || true)"
  [ -n "$runner" ] || return 1
  pid=$$
  while [ -n "$pid" ] && [ "$pid" -gt 1 ]; do
    [ "$pid" = "$runner" ] && return 0
    pid="$(ps -o ppid= -p "$pid" 2>/dev/null | tr -d ' ')"
  done
  return 1
}

# Re-run this command through heavy.sh unless it already runs inside the heavy job; then set up the work folder.
enter_heavy() {
  if ! in_heavy_job; then
    note "queueing '$1' as one heavy job (scripts/heavy.sh waits for the lock and checks disk and memory first)"
    exec "$REPO/scripts/heavy.sh" "$1" "$HERE/encode.sh" "${ORIG_ARGS[@]}"
  fi
  mkdir -p "$REPO/.work/tmp/encode"
  WORK="$(mktemp -d "$REPO/.work/tmp/encode/run.XXXXXX")"
  trap 'rm -rf "$WORK"' EXIT
  trap 'exit 143' TERM INT HUP
}

# ---- probes -------------------------------------------------------------------------------------------------------

kv() { printf '%s\n' "$2" | sed -n "s/^$1=//p" | head -n 1; }

# vprobe <file>: V_W V_H V_RATE V_FRAMES V_PIX and the colour tags V_SPACE V_PRIM V_TRC V_RANGE for the first video
# stream (frames counted if the container doesn't say).
vprobe() {
  local out
  [ -f "$1" ] || die "no such file: $1"
  out="$("$FP" -v error -select_streams v:0 -show_entries stream=width,height,r_frame_rate,nb_frames,pix_fmt,color_space,color_primaries,color_transfer,color_range -of default=nw=1 "$1")" || die "ffprobe cannot read $1"
  V_W="$(kv width "$out")"
  V_H="$(kv height "$out")"
  V_RATE="$(kv r_frame_rate "$out")"
  V_FRAMES="$(kv nb_frames "$out")"
  V_PIX="$(kv pix_fmt "$out")"
  V_SPACE="$(kv color_space "$out")"
  V_PRIM="$(kv color_primaries "$out")"
  V_TRC="$(kv color_transfer "$out")"
  V_RANGE="$(kv color_range "$out")"
  [ -n "$V_W" ] || die "$1 has no video stream"
  case "$V_FRAMES" in
  '' | N/A | *[!0-9]*) V_FRAMES="$("$FP" -v error -select_streams v:0 -count_packets -show_entries stream=nb_read_packets -of default=nw=1:nk=1 "$1")" ;;
  esac
}

# aprobe <file>: A_CODEC A_RATE A_CH A_DUR for the first audio stream.
aprobe() {
  local out
  [ -f "$1" ] || die "no such file: $1"
  out="$("$FP" -v error -select_streams a:0 -show_entries stream=codec_name,sample_rate,channels,duration -of default=nw=1 "$1")" || die "ffprobe cannot read $1"
  A_CODEC="$(kv codec_name "$out")"
  A_RATE="$(kv sample_rate "$out")"
  A_CH="$(kv channels "$out")"
  A_DUR="$(kv duration "$out")"
  [ -n "$A_RATE" ] || die "$1 has no audio stream"
}

# master <file> <what>: a 30 fps (D7), limited-range video master, BT.709 or untagged (the encodes tag BT.709 and
# convert no colour, so a BT.601 or full-range master would come out wrong).
master() {
  local tag
  vprobe "$1"
  [ "$V_RATE" = "30/1" ] || die "$2 $1 runs at $V_RATE fps; every film and loop is 30 fps (D7)"
  [ "$V_FRAMES" -gt 0 ] 2>/dev/null || die "$2 $1 has no frames"
  case "$V_PIX:$V_RANGE" in
  yuvj* | *:pc | *:jpeg) die "$2 $1 is full range ($V_PIX, $V_RANGE); render it with --pixel-format=yuv420p --color-space=bt709" ;;
  yuv420p:*) ;;
  *) note "note: $2 is $V_PIX; the encodes convert it to yuv420p" ;;
  esac
  for tag in "$V_SPACE" "$V_PRIM" "$V_TRC"; do
    case "$tag" in '' | unknown | unspecified | reserved | bt709) ;; *) die "$2 $1 is tagged $tag, not BT.709; render it with --color-space=bt709" ;; esac
  done
  case "$V_SPACE $V_PRIM $V_TRC" in
  *bt709*) ;;
  *) note "note: $2 carries no colour tags; it is treated as BT.709 (Remotion --color-space=bt709)" ;;
  esac
}

# soundtrack <wav> <frames>: 48 kHz stereo, as long as <frames> at 30 fps within one frame.
soundtrack() {
  aprobe "$1"
  [ "$A_CH" = 2 ] || die "$1 has $A_CH channels; the soundtrack is stereo"
  [ "$A_RATE" = 48000 ] || note "note: $1 is $A_RATE Hz; it is resampled to 48 kHz"
  case "$A_CODEC" in pcm_*) ;; *) note "warning: $1 is $A_CODEC, not PCM: the AAC would be a second lossy generation (MASTER_PLAN §6.4)" ;; esac
  awk -v a="$A_DUR" -v f="$2" 'BEGIN { d = a - f / 30; if (d < 0) d = -d; exit (d <= 1 / 30 + 1e-6) ? 0 : 1 }' ||
    die "$1 lasts $A_DUR s but the picture is $2 frames ($(awk -v f="$2" 'BEGIN { printf "%.3f", f / 30 }') s): more than one frame apart"
}

# ---- encodes ------------------------------------------------------------------------------------------------------

# FFmpeg 9 takes colour primaries and transfer from the frames, not from -color_primaries / -color_trc (measured: an
# untagged source then encodes with them unset and no colr box). setparams tags the frames themselves; it converts no
# pixel, which is right because master() only accepts BT.709 or untagged limited-range masters.
TAG709="setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709:range=tv"

# ffenc <hevc|h264> <crf> <in> <out> <vf|""> <wav|""> <x265 extras|"">: one FFmpeg run with MASTER_PLAN §5.5's settings,
# plus x264 -level:v 4.0: with -preset slow's 5 reference frames x264 signals level 5.0 at 1920x1080 (measured), and
# FFmpeg's libx264 wrapper trims the references to the level's DPB, so avc1.640028 on the page stays true.
ffenc() {
  local codec="$1" crf="$2" in="$3" out="$4" vf="$5" wav="$6" extra="$7"
  set -- -hide_banner -nostdin -loglevel warning "$STATS" -y -i "$in"
  if [ -n "$wav" ]; then set -- "$@" -i "$wav" -map 0:v:0 -map 1:a:0; else set -- "$@" -map 0:v:0 -an; fi
  set -- "$@" -map_metadata -1 -map_chapters -1 -vf "${vf:+$vf,}$TAG709"
  if [ "$codec" = hevc ]; then
    set -- "$@" -c:v libx265 -preset slow -crf "$crf" -tag:v hvc1 -pix_fmt yuv420p \
      -x265-params "log-level=warning:colorprim=bt709:transfer=bt709:colormatrix=bt709${extra:+:$extra}"
  else
    set -- "$@" -c:v libx264 -preset slow -crf "$crf" -profile:v high -level:v 4.0 -pix_fmt yuv420p
  fi
  set -- "$@" -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv
  if [ -n "$wav" ]; then set -- "$@" -c:a aac -b:a 160k -ar 48000; fi
  "$FF" "$@" -movflags +faststart "$out"
}

# fits_page <file>: the video track's codecs string fits the page's <source type> (prints it).
fits_page() { node "$HERE/mp4.mjs" fits "$1" >&2; }

# enc_checked <codec> <crf> <in> <out> <vf> <wav> <frames>: ffenc, the frame count, and the HEVC level guard.
enc_checked() {
  ffenc "$1" "$2" "$3" "$4" "$5" "$6" "" || return 1
  if ! fits_page "$4"; then
    [ "$1" = hevc ] || return 1
    note "re-encoding $(basename "$4") with level-idc=4.0 and high-tier=0, so the page's hvc1.1.6.L120.90 stays true"
    ffenc "$1" "$2" "$3" "$4" "$5" "$6" "level-idc=4.0:high-tier=0" || return 1
    fits_page "$4" || return 1
  fi
  vprobe "$4"
  [ "$V_FRAMES" = "$7" ] || die "$(basename "$4") has $V_FRAMES frames, its master $7"
}

# next_crf <crf> <size> <target> <fixed bytes> <crf0> <max raise>: the step that the bitrate's usual fall of about 14 %
# per CRF step (0.86; measured 0.855 on the test encodes, the textbook 2^(-1/6) is 0.89) says will fit; leaning to too
# small a step keeps the CRF as low as possible, and the loop then adds +1. At least +1, never past crf0 + max raise.
# Fixed bytes (the audio) don't shrink with the CRF.
next_crf() {
  awk -v c="$1" -v s="$2" -v t="$3" -v a="$4" -v c0="$5" -v m="$6" 'BEGIN {
    v = s - a; tv = t - a; step = 1
    if (v > 0 && tv > 0) { x = log(tv / v) / log(0.86); step = (x > int(x)) ? int(x) + 1 : int(x) }
    if (step < 1) step = 1
    n = c + step; if (n > c0 + m) n = c0 + m
    printf "%d\n", n }'
}

# fit <label> <codec> <crf0> <target> <hard> <max raise> <fixed bytes> <final> <in> <vf> <wav> <frames>
# Sets FIT_CRF, FIT_SIZE, FIT_NOTE. Returns 0 when <final> is written, 1 when nothing fits under <hard>.
fit() {
  local label="$1" codec="$2" crf0="$3" target="$4" hard="$5" maxr="$6" fixed="$7" final="$8" in="$9" vf="${10}" wav="${11}" frames="${12}"
  local crf="$crf0" tmp size fb="" fb_crf="" fb_size="" last=""
  FIT_CRF="" FIT_SIZE="" FIT_NOTE=""
  if [ "$BUDGET_SCALE" != 1 ]; then
    target="$(awk -v b="$target" -v s="$BUDGET_SCALE" 'BEGIN { printf "%d", b * s }')"
    hard="$(awk -v b="$hard" -v s="$BUDGET_SCALE" 'BEGIN { printf "%d", b * s }')"
    note "TEST MODE: ENCODE_BUDGET_SCALE=$BUDGET_SCALE, so $label's budget is $(human "$target") (hard $(human "$hard"))"
  fi
  while :; do
    tmp="$WORK/$(basename "$final" .mp4).crf$crf.mp4"
    note "$label: encoding at CRF $crf"
    enc_checked "$codec" "$crf" "$in" "$tmp" "$vf" "$wav" "$frames" || die "$label: the encode at CRF $crf failed"
    size="$(fsize "$tmp")"
    note "$label: CRF $crf gives $(human "$size") (budget $(human "$target"), hard limit $(human "$hard"))"
    if [ "$size" -le "$target" ]; then
      [ -z "$fb" ] || rm -f "$fb"
      [ -z "$last" ] || rm -f "$last"
      mv -f "$tmp" "$final"
      FIT_CRF="$crf" FIT_SIZE="$size"
      [ "$crf" = "$crf0" ] || FIT_NOTE="CRF raised from $crf0 to meet $(human "$target")"
      return 0
    fi
    [ -z "$last" ] || [ "$last" = "$fb" ] || rm -f "$last"
    last="$tmp"
    if [ "$size" -le "$hard" ] && [ -z "$fb" ]; then fb="$tmp" fb_crf="$crf" fb_size="$size"; fi
    if [ "$EXACT" = 1 ] || [ $((crf - crf0)) -ge "$maxr" ]; then break; fi
    crf="$(next_crf "$crf" "$size" "$target" "$fixed" "$crf0" "$maxr")"
  done
  if [ -n "$fb" ]; then
    [ "$last" = "$fb" ] || rm -f "$last"
    mv -f "$fb" "$final"
    FIT_CRF="$fb_crf" FIT_SIZE="$fb_size"
    FIT_NOTE="over its $(human "$target") budget, under the $(human "$hard") hard limit"
    [ "$EXACT" = 1 ] && FIT_NOTE="$FIT_NOTE (--exact)"
    return 0
  fi
  mkdir -p "$REPO/.work/tmp/encode-rejected"
  mv -f "$last" "$REPO/.work/tmp/encode-rejected/$(basename "$final")"
  FIT_CRF="$crf" FIT_SIZE="$size"
  FIT_NOTE="no CRF up to $crf fits $(human "$hard"); the last try is in .work/tmp/encode-rejected/"
  return 1
}

# report <final> <status>: one summary line per output.
report() {
  local codecs
  codecs="$(node "$HERE/mp4.mjs" codecs "$1" 2>/dev/null || echo '?')"
  printf 'encode.sh: %-4s %-30s %10s  CRF %-3s %s%s\n' "$2" "$(basename "$1")" "$(human "$FIT_SIZE")" "$FIT_CRF" "$codecs" "${FIT_NOTE:+  ($FIT_NOTE)}" >&2
}

run_verify() {
  [ "$VERIFY" = 1 ] || return 0
  [ -n "$OUTPUTS" ] || return 0
  local files=() line
  while IFS= read -r line; do [ -n "$line" ] && files+=("$line"); done <<EOF
$OUTPUTS
EOF
  note "checking the new files with tools/encode/verify.mjs"
  node "$HERE/verify.mjs" --no-public "${files[@]}"
}

# ---- commands -----------------------------------------------------------------------------------------------------

# Splits common options out of the arguments; positional ones land in POS (newline-separated).
parse_common() {
  POS="" ONLY="" CUT="" SOCIAL_CRF=18
  while [ $# -gt 0 ]; do
    case "$1" in
    --exact) EXACT=1 ;;
    --no-verify) VERIFY=0 ;;
    --out-dir) [ $# -ge 2 ] || usage_die "--out-dir needs a folder"; OUT="$2"; shift ;;
    --only) [ $# -ge 2 ] || usage_die "--only needs a list"; ONLY="$2"; shift ;;
    --cut) [ $# -ge 2 ] || usage_die "--cut needs a file"; CUT="$2"; shift ;;
    --crf) [ $# -ge 2 ] || usage_die "--crf needs a number"; SOCIAL_CRF="$2"; shift ;;
    --*) usage_die "unknown option $1" ;;
    *) POS="${POS}${POS:+
}$1" ;;
    esac
    shift
  done
}
pos() { printf '%s\n' "$POS" | sed -n "${1}p"; }
npos() {
  if [ -z "$POS" ]; then echo 0; else printf '%s\n' "$POS" | wc -l | tr -d ' '; fi
}

cmd_film() {
  parse_common "$@"
  [ "$(npos)" = 2 ] || usage_die "film <master.mp4> <soundtrack_web.wav> [--only ...]"
  local master wav variants v res codec crf0 target hard fixed final expected failed=0
  master="$(pos 1)" wav="$(pos 2)"
  variants="$(printf '%s' "${ONLY:-1080.hevc,1080.h264,720.hevc,720.h264}" | tr ',' ' ')"
  for v in $variants; do
    case "$v" in 1080.hevc | 1080.h264 | 720.hevc | 720.h264) ;; *) usage_die "unknown film variant '$v' (1080.hevc, 1080.h264, 720.hevc, 720.h264)" ;; esac
  done
  master "$master" "the film master"
  [ "${V_W}x${V_H}" = 1920x1080 ] || die "the film master is ${V_W}x${V_H}; LaunchFilm renders 1920x1080"
  local frames="$V_FRAMES"
  soundtrack "$wav" "$frames"
  expected="$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).total_frames)' "$REPO/docs/film-captions.json" 2>/dev/null || echo '?')"
  [ "$frames" = "$expected" ] || note "warning: the master has $frames frames and docs/film-captions.json says $expected: captions and chapters would drift"
  enter_heavy encode-film
  mkdir -p "$OUT"
  fixed="$(awk -v d="$A_DUR" 'BEGIN { printf "%d", 160000 / 8 * d * 1.02 }')"
  for v in $variants; do
    res="${v%%.*}" codec="${v#*.}"
    case "$v" in
    1080.hevc) crf0=25 target=$((12 * MB)) hard=$((20 * MB)) ;;
    1080.h264) crf0=20 target=$((18 * MB)) hard=$((30 * MB)) ;;
    720.hevc) crf0=26 target=$((6 * MB)) hard=$((12 * MB)) ;;
    720.h264) crf0=21 target=$((9 * MB)) hard=$((18 * MB)) ;;
    esac
    final="$OUT/film-$v.mp4"
    local vf=""
    [ "$res" = 720 ] && vf="scale=1280:-2:flags=lanczos"
    if fit "film-$v" "$codec" "$crf0" "$target" "$hard" "$FILM_MAX_RAISE" "$fixed" "$final" "$master" "$vf" "$wav" "$frames"; then
      report "$final" ok
      add_output "$final"
    else
      report "$REPO/.work/tmp/encode-rejected/film-$v.mp4" FAIL
      failed=1
    fi
  done
  run_verify || failed=1
  return "$failed"
}

# The 1:1 film for phones (OVERRIDES §46 P2-9): the H.264 file re-muxes the 1:1 social film's video with the web
# soundtrack; the HEVC twin is encoded from the 1:1 master, and kept only if the film set stays within FILM_SET bytes.
FILM_SET=$((45 * MB))
cmd_square() {
  parse_common "$@"
  [ "$(npos)" = 3 ] || usage_die "square <square_master.mp4> <soundtrack_web.wav> <square_social.mp4> [--only hevc,h264]"
  local master wav social variants v frames expected fixed final tmp setsize failed=0 f
  master="$(pos 1)" wav="$(pos 2)" social="$(pos 3)"
  variants="$(printf '%s' "${ONLY:-h264,hevc}" | tr ',' ' ')"
  for v in $variants; do
    case "$v" in hevc | h264) ;; *) usage_die "unknown square variant '$v' (hevc, h264)" ;; esac
  done
  master "$master" "the 1:1 master"
  [ "${V_W}x${V_H}" = 1080x1080 ] || die "the 1:1 master is ${V_W}x${V_H}; LaunchFilmSquare renders 1080x1080"
  frames="$V_FRAMES"
  soundtrack "$wav" "$frames"
  expected="$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).total_frames)' "$REPO/docs/film-captions.json" 2>/dev/null || echo '?')"
  [ "$frames" = "$expected" ] || note "warning: the 1:1 master has $frames frames and docs/film-captions.json says $expected: the shared text tracks would drift"
  case " $variants " in
  *" h264 "*)
    vprobe "$social"
    [ "${V_W}x${V_H}" = 1080x1080 ] || die "the 1:1 social film $social is ${V_W}x${V_H}, not 1080x1080"
    [ "$V_FRAMES" = "$frames" ] || die "the 1:1 social film $social has $V_FRAMES frames, its master $frames"
    [ "$("$FP" -v error -select_streams v:0 -show_entries stream=codec_name -of csv=p=0 "$social")" = h264 ] || die "the 1:1 social film $social is not H.264"
    ;;
  esac
  enter_heavy encode-square
  mkdir -p "$OUT"
  for v in $variants; do
    final="$OUT/film-square.$v.mp4"
    if [ "$v" = h264 ]; then
      tmp="$WORK/film-square.h264.mp4"
      note "film-square.h264: the 1:1 social film's video, copied, with AAC 160 kb/s from $(basename "$wav")"
      "$FF" -hide_banner -nostdin -loglevel warning "$STATS" -y -i "$social" -i "$wav" -map 0:v:0 -map 1:a:0 \
        -map_metadata -1 -map_chapters -1 -c:v copy -c:a aac -b:a 160k -ar 48000 -movflags +faststart "$tmp" ||
        die "film-square.h264: the re-mux failed"
      fits_page "$tmp" || die "film-square.h264: its codecs string does not fit the page's"
      vprobe "$tmp"
      [ "$V_FRAMES" = "$frames" ] || die "film-square.h264 has $V_FRAMES frames, its master $frames"
      mv -f "$tmp" "$final"
      FIT_CRF="copy" FIT_SIZE="$(fsize "$final")" FIT_NOTE="video copied from $(basename "$social")"
      report "$final" ok
      add_output "$final"
    else
      fixed="$(awk -v d="$A_DUR" 'BEGIN { printf "%d", 160000 / 8 * d * 1.02 }')"
      if fit film-square.hevc hevc 25 $((6 * MB)) $((12 * MB)) "$FILM_MAX_RAISE" "$fixed" "$final" "$master" "" "$wav" "$frames"; then
        setsize=0
        for f in "$OUT"/film-*.mp4; do
          if [ -f "$f" ]; then setsize=$((setsize + $(fsize "$f"))); fi
        done
        if [ "$setsize" -gt "$FILM_SET" ]; then
          mkdir -p "$REPO/.work/tmp/encode-rejected"
          mv -f "$final" "$REPO/.work/tmp/encode-rejected/film-square.hevc.mp4"
          FIT_NOTE="the film set would be $(human "$setsize"), over $(human "$FILM_SET"): no HEVC twin (moved to .work/tmp/encode-rejected/)"
          report "$REPO/.work/tmp/encode-rejected/film-square.hevc.mp4" FAIL
          failed=1
        else
          FIT_NOTE="${FIT_NOTE:+$FIT_NOTE; }the film set is $(human "$setsize") of $(human "$FILM_SET")"
          report "$final" ok
          add_output "$final"
        fi
      else
        report "$REPO/.work/tmp/encode-rejected/film-square.hevc.mp4" FAIL
        failed=1
      fi
    fi
  done
  run_verify || failed=1
  return "$failed"
}

cmd_social() {
  parse_common "$@"
  [ "$(npos)" = 3 ] || usage_die "social <master.mp4> <soundtrack_social.wav> <out.mp4> [--cut <cut.json>] [--crf <n>]"
  local master wav out frames line i=0 filter="" inputs=() concat=""
  master="$(pos 1)" wav="$(pos 2)" out="$(pos 3)"
  case "$SOCIAL_CRF" in '' | *[!0-9]*) usage_die "--crf takes a whole number" ;; esac
  case "$out" in *.mp4) ;; *) usage_die "the social output must end in .mp4" ;; esac
  master "$master" "the social master"
  case "${V_W}x${V_H}" in 1920x1080 | 1080x1080 | 1080x1920) ;; *) note "warning: ${V_W}x${V_H} is none of 16:9 1920x1080, 1:1 1080x1080, 9:16 1080x1920 (OVERRIDES §14)" ;; esac
  frames="$V_FRAMES"
  if [ -n "$CUT" ]; then
    [ -f "$CUT" ] || die "no such cut file: $CUT"
    local plan
    plan="$(node "$REPO/tools/captions/cues.mjs" cut-inputs "$CUT" "$frames" 30)" || die "cannot read the cut $CUT"
    frames="$(printf '%s\n' "$plan" | sed -n 1p)"
    while IFS=' ' read -r seek count; do
      [ -n "$seek" ] || continue
      inputs+=(-ss "$seek" -i "$master")
      filter="${filter}[$i:v]trim=end_frame=$count,setpts=PTS-STARTPTS[v$i];"
      concat="${concat}[v$i]"
      i=$((i + 1))
    done <<EOF
$(printf '%s\n' "$plan" | sed -n '2,$p')
EOF
    filter="${filter}${concat}concat=n=$i:v=1:a=0,${TAG709}[v]"
  fi
  soundtrack "$wav" "$frames"
  awk -v f="$frames" 'BEGIN { exit (f / 30 >= 3 && f / 30 <= 140) ? 0 : 1 }' || note "warning: $(awk -v f="$frames" 'BEGIN { printf "%.1f", f / 30 }') s is outside X's 140 s / LinkedIn's 3 s limits"
  enter_heavy encode-social
  mkdir -p "$(dirname "$out")"
  local tmp="$WORK/social.mp4"
  if [ -n "$CUT" ]; then
    set -- "${inputs[@]}" -i "$wav" -filter_complex "$filter" -map "[v]" -map "$i:a:0"
  else
    set -- -i "$master" -i "$wav" -map 0:v:0 -map 1:a:0 -vf "$TAG709"
  fi
  note "social: H.264 High CRF $SOCIAL_CRF, AAC 192 kb/s, $frames frames"
  "$FF" -hide_banner -nostdin -loglevel warning "$STATS" -y "$@" -map_metadata -1 -map_chapters -1 \
    -c:v libx264 -preset slow -crf "$SOCIAL_CRF" -profile:v high -level:v 4.0 -pix_fmt yuv420p -maxrate 20M -bufsize 25M \
    -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv \
    -c:a aac -b:a 192k -ar 48000 -ac 2 -movflags +faststart "$tmp" || die "the social encode failed"
  vprobe "$tmp"
  [ "$V_FRAMES" = "$frames" ] || die "the social encode has $V_FRAMES frames, expected $frames"
  mv -f "$tmp" "$out"
  FIT_CRF="$SOCIAL_CRF" FIT_SIZE="$(fsize "$out")" FIT_NOTE=""
  report "$out" ok
  add_output "$out"
  run_verify
}

# The loop ids src/lib/media.ts knows (LoopId).
known_loop() {
  sed -n '/^export type LoopId =/,/;/p' "$REPO/src/lib/media.ts" | grep -o '"[a-z0-9-]*"' | tr -d '"' | grep -qx "$1"
}

cmd_loop() {
  parse_common "$@"
  local n
  n="$(npos)"
  [ "$n" = 2 ] || [ "$n" = 3 ] || usage_die "loop <id> <master.mp4> [<phone_master.mp4>]"
  local id master phone failed=0 name src codec frames
  id="$(pos 1)" master="$(pos 2)" phone="$(pos 3)"
  case "$id" in '' | *[!a-z0-9-]*) usage_die "a loop id is lower-case letters, digits and hyphens" ;; esac
  case "$LOOP_HEVC_CRF" in '' | *[!0-9]*) usage_die "LOOP_HEVC_CRF takes a whole number" ;; esac
  case "$LOOP_H264_CRF" in '' | *[!0-9]*) usage_die "LOOP_H264_CRF takes a whole number" ;; esac
  known_loop "$id" || note "warning: '$id' is not a LoopId in src/lib/media.ts, so the page won't show it"
  master "$master" "the loop master"
  [ -z "$phone" ] || master "$phone" "the phone master"
  enter_heavy "encode-loop-$id"
  mkdir -p "$OUT"
  for name in "loop-$id" ${phone:+"loop-$id-phone"}; do
    src="$master"
    [ "$name" = "loop-$id" ] || src="$phone"
    vprobe "$src"
    frames="$V_FRAMES"
    [ "$name" = "loop-$id-phone" ] && [ "${V_W}x${V_H}" != 1080x1350 ] && note "note: the phone cut is ${V_W}x${V_H}; the 4:5 cuts render at 1080x1350"
    for codec in hevc h264; do
      if [ "$codec" = hevc ]; then
        fit "$name.hevc" hevc "$LOOP_HEVC_CRF" 900000 900000 "$MAX_RAISE" 0 "$OUT/$name.hevc.mp4" "$src" "" "" "$frames" && st=ok || st=FAIL
      else
        fit "$name.h264" h264 "$LOOP_H264_CRF" 1200000 1500000 "$MAX_RAISE" 0 "$OUT/$name.h264.mp4" "$src" "" "" "$frames" && st=ok || st=FAIL
      fi
      if [ "$st" = ok ]; then
        report "$OUT/$name.$codec.mp4" ok
        add_output "$OUT/$name.$codec.mp4"
      else
        report "$REPO/.work/tmp/encode-rejected/$name.$codec.mp4" FAIL
        failed=1
      fi
    done
  done
  run_verify || failed=1
  return "$failed"
}

cmd_teaser() {
  parse_common "$@"
  [ "$(npos)" = 1 ] || usage_die "teaser <master.mp4>"
  local master vf="" failed=0 codec st
  master="$(pos 1)"
  master "$master" "the teaser master"
  awk -v w="$V_W" -v h="$V_H" 'BEGIN { r = w / h - 16 / 9; if (r < 0) r = -r; exit (r < 0.01) ? 0 : 1 }' || die "the teaser master is ${V_W}x${V_H}, not 16:9 (FilmTeaser renders 1280x720)"
  [ "$V_W" -ge 1280 ] || die "the teaser master is ${V_W}x${V_H}, smaller than 1280x720"
  [ "$V_W" = 1280 ] || vf="scale=1280:-2:flags=lanczos"
  local frames="$V_FRAMES"
  enter_heavy encode-teaser
  mkdir -p "$OUT"
  for codec in hevc h264; do
    if [ "$codec" = hevc ]; then
      fit teaser-720.hevc hevc 26 1500000 1500000 "$MAX_RAISE" 0 "$OUT/teaser-720.hevc.mp4" "$master" "$vf" "" "$frames" && st=ok || st=FAIL
    else
      fit teaser-720.h264 h264 21 1500000 1500000 "$MAX_RAISE" 0 "$OUT/teaser-720.h264.mp4" "$master" "$vf" "" "$frames" && st=ok || st=FAIL
    fi
    if [ "$st" = ok ]; then
      report "$OUT/teaser-720.$codec.mp4" ok
      add_output "$OUT/teaser-720.$codec.mp4"
    else
      report "$REPO/.work/tmp/encode-rejected/teaser-720.$codec.mp4" FAIL
      failed=1
    fi
  done
  run_verify || failed=1
  return "$failed"
}

cmd_poster() {
  parse_common "$@"
  [ "$(npos)" = 4 ] || usage_die "poster <png> <out-base> <width> <height>"
  local png base w h rc=0
  png="$(pos 1)" base="$(pos 2)" w="$(pos 3)" h="$(pos 4)"
  [ -f "$png" ] || die "no such file: $png"
  case "$w$h" in *[!0-9]*) usage_die "width and height are whole pixels" ;; esac
  case "$base" in *.avif | *.webp | *.png) usage_die "out-base has no extension: poster.mjs writes <out-base>.avif and <out-base>.webp" ;; esac
  enter_heavy encode-poster
  node "$HERE/poster.mjs" "$png" "$base" "$w" "$h" || rc=1
  [ ! -f "$base.avif" ] || add_output "$base.avif"
  [ ! -f "$base.webp" ] || add_output "$base.webp"
  run_verify || rc=1
  return "$rc"
}

# ---- main ---------------------------------------------------------------------------------------------------------

[ $# -ge 1 ] || { usage; exit 64; }
command="$1"
shift
case "$command" in
-h | --help | help) usage ;;
film) cmd_film "$@" ;;
square) cmd_square "$@" ;;
social) cmd_social "$@" ;;
loop) cmd_loop "$@" ;;
teaser) cmd_teaser "$@" ;;
poster) cmd_poster "$@" ;;
*) usage_die "unknown command '$command' (film, square, social, loop, teaser, poster)" ;;
esac
