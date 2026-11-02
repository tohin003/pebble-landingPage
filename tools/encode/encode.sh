#!/usr/bin/env bash
# tools/encode/encode.sh: the site's encodes of the Pebble 2.0 launch film, its 4:5 cut, the loops and the posters
# (MASTER_PLAN §5.5, OVERRIDES §4 and §8; .work/launch/briefs/site2.md). Homebrew FFmpeg ($FF, $FP from
# scripts/env.sh); bash 3.2 compatible.
#
# Usage, from the repo root after `source scripts/env.sh` (tools/encode/launch-site.sh runs them all, in order):
#   tools/encode/encode.sh mix    <master.wav|master.mp4> <out.wav>          the -16 LUFS web mix (D10), as deliver.sh
#   tools/encode/encode.sh film   <master_16x9.mp4> <mix.wav> [--only 1080.hevc,720.h264,1080.h264,720.hevc]
#   tools/encode/encode.sh phone  <master_4x5.mp4> <mix.wav> [--only hevc,h264]
#   tools/encode/encode.sh still  <master.mp4> <frame> <out.png> [--crop W:H:X:Y] [--scale W:H]
#   tools/encode/encode.sh loop   <id> <master.mp4> [<phone_master.mp4>]
#   tools/encode/encode.sh poster <png> <out-base> <width> <height>
#   tools/encode/encode.sh social <master.mp4> <soundtrack_social.wav> <out.mp4> [--crf <n>]
# Common options: --out-dir <dir> (film, phone, loop; default public/media/v3, src/lib/media.ts LAUNCH_MEDIA, or
# $ENCODE_OUT), --exact (keep the starting CRF even when a file misses its budget), --no-verify (skip the verify.mjs
# pass at the end).
#
# - One command = ONE scripts/heavy.sh job. Run directly, the script re-runs itself through heavy.sh (which waits for
#   the lock and refuses when disk or memory is short, or while .work/HOLD exists); started inside a heavy job, it runs.
# - Inputs are checked before the job queues: 30 fps masters (D7), the film at 1920x1080 and its cut at 1080x1350, as
#   many frames as the film has (src/content/chapters.ts FILM_DURATION_SECONDS at 30 fps: 2,982), a 48 kHz stereo
#   soundtrack whose length matches the picture within one frame.
# - The masters are the director's (video/out/launch/LaunchFilm-<16x9|4x5>-master.mp4: H.264 CRF 12 from Remotion,
#   video/src/launch/master/final.sh) with their mixes (…-master.wav). `mix` brings a mix to the site's -16 LUFS the way
#   deliver.sh makes the director's web copy: a 4x-oversampled peak limiter at MIX_LIMIT_DB (-4.0 dBFS), then a
#   two-pass loudnorm that must stay linear (one gain for the whole film), into a 48 kHz 24-bit WAV. It refuses a
#   result that isn't linear.
# - Encodes run in .work/tmp/encode/ and each output is moved into place only when complete and checked: the same frame
#   count as its master, and for HEVC a codecs string that fits the page's <source type> (src/lib/media.ts,
#   hvc1.1.6.L120.90). If x265 ever signals a higher level or the high tier, the file is re-encoded with level-idc=4.0
#   and high-tier=0.
# - Budgets: a file starts at its CRF. Over its budget, the CRF rises (an estimated step, then +1) until it fits, never
#   past the start + FILM_MAX_RAISE (film, default 4) or + 6 (loops); the resolution never drops. The first CRF that
#   fits wins; failing that, the lowest CRF under the hard limit; failing that, the command fails and the file is kept
#   in .work/tmp/encode-rejected/ for a look. tools/encode/README.md "The launch film's budget" has the plan:
#     film-1080.hevc CRF 27 <= 14 MB (hard 16)        film-720.h264 CRF 22 <= 11 MB (hard 12)     the plan's two 16:9
#     film-phone.hevc CRF 27 <= 11 MB (hard 12)       film-phone.h264 CRF 21 <= 12.5 MB (hard 14) files and the 4:5 cut
#     film-1080.h264 CRF 21 <= 18 MB, film-720.hevc CRF 28 <= 6 MB: C6's shares, encoded only when --only names them
#     (the film set, every film-*.mp4 in the folder, must stay within 50 MB, the director's phase-B answer 3 for a
#     clean dark ground: verify.mjs fails it above)
#     loop HEVC CRF 27 <= 0.9 MB; loop H.264 CRF 23 <= 1.2 MB (hard 1.5)   (and the -phone 4:5 cuts the same)
#     posters: AVIF q50 effort 6 <= 60 KB, WebP q76 <= 90 KB, quality lowered stepwise to fit (tools/encode/poster.mjs)
#   Starting CRFs move with FILM_HEVC_CRF / FILM_H264_CRF (the film and its cut) and LOOP_HEVC_CRF / LOOP_H264_CRF; the
#   budgets stay. FILM_VF puts a filter before the film's scaling and tags (the launch film's web files use
#   hqdn3d=0:0:4:4, a light temporal denoise of the film's grain, which costs the most bits at these sizes; the loops
#   take the same from tools/encode/launch-loops.json): tools/encode/README.md "The grain" has the calibration.
# - Every encode: yuv420p, BT.709 tags put on the frames with setparams (so they reach the VUI and the MP4 colr box),
#   +faststart, no global metadata (Remotion's "Made with Remotion" comment is dropped); x264 at -level:v 4.0; both
#   encoders' AQ at ENC_AQ (3: a bias to dark scenes); the HEVC film's first second at FILM_ZONE's bitrate factor.
#   Film and its cut: AAC 160 kb/s 48 kHz from the web mix (one AAC generation). Loops: -an.
#   Social: H.264 High CRF 18 (VBV 20 Mb/s inside level 4.0), AAC-LC 192 kb/s 48 kHz stereo.
# - At the end, tools/encode/verify.mjs checks the new files (codecs, colour, faststart, sizes, loudness, loop seams).
# - Retired with the 1.x trailer (2 Nov 2026; git history keeps them): `square` (its 1:1 phone film), `teaser` and
#   `social --cut` (its 30 s cut for X).
#
# Exit: 0 ok; 1 a failed encode or check; 64 usage; heavy.sh's own codes (73 refused: too little disk or memory, or a
# hold; 75 lock wait timed out).
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=/dev/null
source "$HERE/../../scripts/env.sh"
ORIG_ARGS=("$@")

MB=1000000
FILM_MAX_RAISE="${FILM_MAX_RAISE:-4}"
MAX_RAISE=6
OUT="${ENCODE_OUT:-$REPO/public/media/v3}"
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
# The loops' budgets in bytes (verify.mjs's are the ceilings: 0.9 MB HEVC, 1.5 MB H.264). The launch loops run lower
# (tools/encode/loops.mjs sets them from tools/encode/launch-loops.json "budgets"), so fourteen clips fit the page.
LOOP_HEVC_BUDGET="${LOOP_HEVC_BUDGET:-900000}"
LOOP_H264_BUDGET="${LOOP_H264_BUDGET:-1200000}"
LOOP_H264_HARD="${LOOP_H264_HARD:-1500000}"
# The film's (see the header): FILM_HEVC_CRF for film-1080.hevc and film-phone.hevc (film-720.hevc starts 1 higher),
# FILM_H264_CRF for film-1080.h264 and film-phone.h264 (film-720.h264 starts 1 higher).
FILM_HEVC_CRF="${FILM_HEVC_CRF:-27}"
FILM_H264_CRF="${FILM_H264_CRF:-21}"
FILM_VF="${FILM_VF:-}"
# The encoders' adaptive quantisation for every film and loop file: 3 is auto-variance with a bias to dark scenes (x265
# aq-mode, x264 -aq-mode). Phase B's calibration (2 Nov 2026, tools/encode/README.md "The grain"): at these sizes the
# film's dark ground came out in flat blocks with each encoder's default AQ, and smooth with 3.
ENC_AQ="${ENC_AQ:-3}"
# The HEVC film's first second (frames 0-29, what follows the poster when Play is pressed) gets FILM_ZONE's bitrate
# factor (an x265 zone): at the film's CRF those frames started in blocks on the dark ground and took a second to clear.
# x264 needs none (its first second measured clean, and a zone only kept grain at 2.6 times the bits). Empty for none.
# ZONES is what ffenc applies; cmd_film and cmd_phone set it to FILM_ZONE.
FILM_ZONE="${FILM_ZONE-0,29,b=2.5}"
ZONES=""
# The web mix (D10: -16 LUFS, at most -1.5 dBTP after AAC; deliver.sh's limiter and linear loudnorm).
MIX_LUFS="${MIX_LUFS:--16}"
MIX_TP="${MIX_TP:--2.0}"
MIX_LIMIT_DB="${MIX_LIMIT_DB:--4.0}"
# The film set's ceiling (OVERRIDES §8, critic C6: 45 MB; 50 MB by the director's phase-B answer 3, "if clean needs
# it"): every film-*.mp4 in the folder together.
FILM_SET=$((50 * MB))

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
      -x265-params "log-level=warning:colorprim=bt709:transfer=bt709:colormatrix=bt709:aq-mode=$ENC_AQ${ZONES:+:zones=$ZONES}${extra:+:$extra}"
  else
    set -- "$@" -c:v libx264 -preset slow -crf "$crf" -profile:v high -level:v 4.0 -pix_fmt yuv420p -aq-mode "$ENC_AQ"
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
  POS="" ONLY="" SOCIAL_CRF=18 CROP="" SCALE=""
  while [ $# -gt 0 ]; do
    case "$1" in
    --exact) EXACT=1 ;;
    --no-verify) VERIFY=0 ;;
    --out-dir) [ $# -ge 2 ] || usage_die "--out-dir needs a folder"; OUT="$2"; shift ;;
    --only) [ $# -ge 2 ] || usage_die "--only needs a list"; ONLY="$2"; shift ;;
    --crf) [ $# -ge 2 ] || usage_die "--crf needs a number"; SOCIAL_CRF="$2"; shift ;;
    --crop) [ $# -ge 2 ] || usage_die "--crop needs W:H:X:Y"; CROP="$2"; shift ;;
    --scale) [ $# -ge 2 ] || usage_die "--scale needs W:H"; SCALE="$2"; shift ;;
    --cut) usage_die "--cut was the 1.x trailer's 30 s cut (retired on 2 Nov 2026; git history keeps it)" ;;
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

# The film's frame count: src/content/chapters.ts FILM_DURATION_SECONDS at 30 fps (2,982 for the master's 99.4 s).
film_frames() {
  sed -n 's/^export const FILM_DURATION_SECONDS: number | null = \([0-9.]*\);.*/\1/p' "$REPO/src/content/chapters.ts" | head -n 1 |
    awk '{ if ($1 > 0) printf "%d\n", $1 * 30 + 0.5; else print "?" }'
}

# check_film_master <file> <what> <WxH>: a 30 fps limited-range master of the film's length at that size.
check_film_master() {
  local expected
  master "$1" "$2"
  [ "${V_W}x${V_H}" = "$3" ] || die "$2 $1 is ${V_W}x${V_H}, not $3"
  expected="$(film_frames)"
  [ "$V_FRAMES" = "$expected" ] || die "$2 $1 has $V_FRAMES frames, and the film has $expected (src/content/chapters.ts FILM_DURATION_SECONDS): the tracks would drift"
}

# film_set_note: the film set's total so far (every film-*.mp4 in OUT), against its 50 MB ceiling.
film_set_note() {
  local f setsize=0
  for f in "$OUT"/film-*.mp4; do
    if [ -f "$f" ]; then setsize=$((setsize + $(fsize "$f"))); fi
  done
  if [ "$setsize" -gt "$FILM_SET" ]; then
    note "the film set is $(human "$setsize"), over $(human "$FILM_SET"): verify.mjs fails it (drop a file with --only, or raise a CRF)"
    return 1
  fi
  note "the film set is $(human "$setsize") of $(human "$FILM_SET")"
}

# The web mix (D10): deliver.sh's chain at the site's level. A 4x-oversampled peak limiter (auto level off, its
# look-ahead compensated), then loudnorm in two passes; the second must be linear, one gain for the whole film.
cmd_mix() {
  parse_common "$@"
  [ "$(npos)" = 2 ] || usage_die "mix <master.wav|master.mp4> <out.wav>"
  local in out lin json filter log
  in="$(pos 1)" out="$(pos 2)"
  case "$out" in *.wav) ;; *) usage_die "the web mix is a .wav" ;; esac
  aprobe "$in"
  [ "$A_CH" = 2 ] || die "$in has $A_CH channels; the mix is stereo"
  case "$A_CODEC" in pcm_*) ;; *) note "warning: $in is $A_CODEC, not PCM: prefer the master's .wav (video/src/launch/master/final.sh --wav-only)" ;; esac
  enter_heavy encode-mix
  lin="$(awk -v d="$MIX_LIMIT_DB" 'BEGIN { printf "%.4f", 10 ^ (d / 20) }')"
  "$FF" -hide_banner -nostdin -loglevel error -y -i "$in" -vn \
    -af "aresample=192000,alimiter=limit=$lin:attack=5:release=60:level=0:latency=1,aresample=48000" \
    -c:a pcm_s24le "$WORK/limited.wav" || die "mix: the limiter pass failed"
  json="$("$FF" -hide_banner -nostdin -nostats -i "$WORK/limited.wav" -vn -af "loudnorm=I=$MIX_LUFS:TP=$MIX_TP:LRA=20:print_format=json" -f null - 2>&1 | sed -n '/^{/,/^}/p')"
  [ -n "$json" ] || die "mix: the loudness measurement failed"
  filter="$(node -e '
const m = JSON.parse(process.argv[1]);
const [target, tp] = [Number(process.argv[2]), Number(process.argv[3])];
const after = Number(m.input_tp) + (target - Number(m.input_i));
if (after > tp || Number(m.input_lra) > 20) {
  console.error(`mix: loudnorm cannot stay linear for ${target} LUFS: the limited mix is ${m.input_i} LUFS and ${m.input_tp} dBTP (it would reach ${after.toFixed(2)} dBTP), LRA ${m.input_lra}; lower MIX_LIMIT_DB`);
  process.exit(1);
}
console.log(`loudnorm=I=${target}:TP=${tp}:LRA=20:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true:print_format=summary`);
' "$json" "$MIX_LUFS" "$MIX_TP")" || die "mix: no linear loudnorm (see above)"
  log="$WORK/mix.log"
  "$FF" -hide_banner -nostdin -nostats -loglevel info -y -i "$WORK/limited.wav" -vn -af "$filter,aresample=48000" \
    -c:a pcm_s24le "$WORK/mix.wav" 2>"$log" || die "mix: the loudnorm pass failed (see $log)"
  grep -q "Normalization Type: *Linear" "$log" || die "mix: loudnorm wasn't linear"
  mkdir -p "$(dirname "$out")"
  mv -f "$WORK/mix.wav" "$out"
  note "mix: $(basename "$out"), $MIX_LUFS LUFS by one linear gain after a limiter at $MIX_LIMIT_DB dBFS (from $(basename "$in"))"
}

cmd_film() {
  parse_common "$@"
  [ "$(npos)" = 2 ] || usage_die "film <master_16x9.mp4> <mix.wav> [--only ...]"
  local master wav variants v res codec crf0 target hard fixed final failed=0
  master="$(pos 1)" wav="$(pos 2)"
  variants="$(printf '%s' "${ONLY:-1080.hevc,720.h264}" | tr ',' ' ')"
  for v in $variants; do
    case "$v" in 1080.hevc | 1080.h264 | 720.hevc | 720.h264) ;; *) usage_die "unknown film variant '$v' (1080.hevc, 1080.h264, 720.hevc, 720.h264)" ;; esac
  done
  check_film_master "$master" "the film master" 1920x1080
  local frames="$V_FRAMES"
  soundtrack "$wav" "$frames"
  enter_heavy encode-film
  mkdir -p "$OUT"
  ZONES="$FILM_ZONE"
  fixed="$(awk -v d="$A_DUR" 'BEGIN { printf "%d", 160000 / 8 * d * 1.02 }')"
  for v in $variants; do
    res="${v%%.*}" codec="${v#*.}"
    case "$v" in
    1080.hevc) crf0=$FILM_HEVC_CRF target=$((14 * MB)) hard=$((16 * MB)) ;;
    1080.h264) crf0=$FILM_H264_CRF target=$((18 * MB)) hard=$((30 * MB)) ;;
    720.hevc) crf0=$((FILM_HEVC_CRF + 1)) target=$((6 * MB)) hard=$((12 * MB)) ;;
    720.h264) crf0=$((FILM_H264_CRF + 1)) target=$((11 * MB)) hard=$((12 * MB)) ;;
    esac
    final="$OUT/film-$v.mp4"
    local vf="$FILM_VF"
    [ "$res" = 720 ] && vf="${vf:+$vf,}scale=1280:-2:flags=lanczos"
    if fit "film-$v" "$codec" "$crf0" "$target" "$hard" "$FILM_MAX_RAISE" "$fixed" "$final" "$master" "$vf" "$wav" "$frames"; then
      report "$final" ok
      add_output "$final"
    else
      report "$REPO/.work/tmp/encode-rejected/film-$v.mp4" FAIL
      failed=1
    fi
  done
  ZONES=""
  film_set_note || failed=1
  run_verify || failed=1
  return "$failed"
}

# The 4:5 cut for phones (src/lib/media.ts FILM_PHONE_FRAME): the 4:5 master's own layout, the same timing as the 16:9
# film frame for frame (so the tracks are shared), with its own mix.
cmd_phone() {
  parse_common "$@"
  [ "$(npos)" = 2 ] || usage_die "phone <master_4x5.mp4> <mix.wav> [--only hevc,h264]"
  local master wav variants v crf0 target hard fixed final failed=0
  master="$(pos 1)" wav="$(pos 2)"
  variants="$(printf '%s' "${ONLY:-hevc,h264}" | tr ',' ' ')"
  for v in $variants; do
    case "$v" in hevc | h264) ;; *) usage_die "unknown phone variant '$v' (hevc, h264)" ;; esac
  done
  check_film_master "$master" "the 4:5 master" 1080x1350
  local frames="$V_FRAMES"
  soundtrack "$wav" "$frames"
  enter_heavy encode-phone
  mkdir -p "$OUT"
  ZONES="$FILM_ZONE"
  fixed="$(awk -v d="$A_DUR" 'BEGIN { printf "%d", 160000 / 8 * d * 1.02 }')"
  for v in $variants; do
    case "$v" in
    hevc) crf0=$FILM_HEVC_CRF target=$((11 * MB)) hard=$((12 * MB)) ;;
    h264) crf0=$FILM_H264_CRF target=$((12500000)) hard=$((14 * MB)) ;;
    esac
    final="$OUT/film-phone.$v.mp4"
    if fit "film-phone.$v" "$v" "$crf0" "$target" "$hard" "$FILM_MAX_RAISE" "$fixed" "$final" "$master" "$FILM_VF" "$wav" "$frames"; then
      report "$final" ok
      add_output "$final"
    else
      report "$REPO/.work/tmp/encode-rejected/film-phone.$v.mp4" FAIL
      failed=1
    fi
  done
  ZONES=""
  film_set_note || failed=1
  run_verify || failed=1
  return "$failed"
}

# One frame of a master as an sRGB PNG (a poster's source): frame N, BT.709 limited range read as such, optionally
# cropped (W:H:X:Y, before scaling) and scaled (W:H, lanczos).
cmd_still() {
  parse_common "$@"
  [ "$(npos)" = 3 ] || usage_die "still <master.mp4> <frame> <out.png> [--crop W:H:X:Y] [--scale W:H]"
  local master frame png vf
  master="$(pos 1)" frame="$(pos 2)" png="$(pos 3)"
  case "$frame" in '' | *[!0-9]*) usage_die "the frame is a whole number" ;; esac
  case "$png" in *.png) ;; *) usage_die "the still is a .png" ;; esac
  master "$master" "the master"
  [ "$frame" -lt "$V_FRAMES" ] || die "frame $frame is past the master's $V_FRAMES frames"
  enter_heavy encode-still
  vf="select=eq(n\\,$frame)"
  [ -z "$CROP" ] || vf="$vf,crop=$CROP"
  [ -z "$SCALE" ] || vf="$vf,scale=$SCALE:flags=lanczos"
  vf="$vf,scale=in_color_matrix=bt709:in_range=tv:out_range=pc,format=rgb24"
  mkdir -p "$(dirname "$png")"
  "$FF" -hide_banner -nostdin -loglevel error -y -i "$master" -vf "$vf" -frames:v 1 -update 1 "$WORK/still.png" || die "still: the frame could not be read"
  mv -f "$WORK/still.png" "$png"
  note "still: frame $frame of $(basename "$master") -> $png"
}

cmd_social() {
  parse_common "$@"
  [ "$(npos)" = 3 ] || usage_die "social <master.mp4> <soundtrack_social.wav> <out.mp4> [--crf <n>]"
  local master wav out frames
  master="$(pos 1)" wav="$(pos 2)" out="$(pos 3)"
  case "$SOCIAL_CRF" in '' | *[!0-9]*) usage_die "--crf takes a whole number" ;; esac
  case "$out" in *.mp4) ;; *) usage_die "the social output must end in .mp4" ;; esac
  master "$master" "the social master"
  case "${V_W}x${V_H}" in 1920x1080 | 1080x1080 | 1080x1920 | 1080x1350) ;; *) note "warning: ${V_W}x${V_H} is none of 16:9 1920x1080, 1:1 1080x1080, 9:16 1080x1920, 4:5 1080x1350" ;; esac
  frames="$V_FRAMES"
  soundtrack "$wav" "$frames"
  awk -v f="$frames" 'BEGIN { exit (f / 30 >= 3 && f / 30 <= 140) ? 0 : 1 }' || note "warning: $(awk -v f="$frames" 'BEGIN { printf "%.1f", f / 30 }') s is outside X's 140 s / LinkedIn's 3 s limits"
  enter_heavy encode-social
  mkdir -p "$(dirname "$out")"
  local tmp="$WORK/social.mp4"
  note "social: H.264 High CRF $SOCIAL_CRF, AAC 192 kb/s, $frames frames"
  "$FF" -hide_banner -nostdin -loglevel warning "$STATS" -y -i "$master" -i "$wav" -map 0:v:0 -map 1:a:0 -vf "$TAG709" \
    -map_metadata -1 -map_chapters -1 \
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

# The loop ids src/lib/media.ts knows: the 1.x LoopId (in /media/v1) and the 2.0 LaunchLoopId (in /media/v3).
known_loop() {
  sed -n '/^export type \(Launch\)\{0,1\}LoopId =/,/;/p' "$REPO/src/lib/media.ts" | grep -o '"[a-z0-9-]*"' | tr -d '"' | grep -qx "$1"
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
  case "$LOOP_HEVC_BUDGET$LOOP_H264_BUDGET$LOOP_H264_HARD" in '' | *[!0-9]*) usage_die "the LOOP_*_BUDGET and LOOP_H264_HARD values are whole bytes" ;; esac
  [ "$LOOP_HEVC_BUDGET" -le 900000 ] && [ "$LOOP_H264_HARD" -le 1500000 ] || usage_die "a loop's budget can't pass verify.mjs's ceilings (0.9 MB HEVC, 1.5 MB H.264)"
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
        fit "$name.hevc" hevc "$LOOP_HEVC_CRF" "$LOOP_HEVC_BUDGET" "$LOOP_HEVC_BUDGET" "$MAX_RAISE" 0 "$OUT/$name.hevc.mp4" "$src" "" "" "$frames" && st=ok || st=FAIL
      else
        fit "$name.h264" h264 "$LOOP_H264_CRF" "$LOOP_H264_BUDGET" "$LOOP_H264_HARD" "$MAX_RAISE" 0 "$OUT/$name.h264.mp4" "$src" "" "" "$frames" && st=ok || st=FAIL
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
mix) cmd_mix "$@" ;;
film) cmd_film "$@" ;;
phone) cmd_phone "$@" ;;
still) cmd_still "$@" ;;
social) cmd_social "$@" ;;
loop) cmd_loop "$@" ;;
poster) cmd_poster "$@" ;;
square | teaser) usage_die "'$command' was the 1.x trailer's (retired on 2 Nov 2026; git history keeps it)" ;;
*) usage_die "unknown command '$command' (mix, film, phone, still, social, loop, poster)" ;;
esac
