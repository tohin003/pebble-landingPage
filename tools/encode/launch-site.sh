#!/usr/bin/env bash
# tools/encode/launch-site.sh: every site file of the Pebble 2.0 launch film, from the director's masters, in order.
# If the film changes (a critic's fix re-renders a master or re-times the captions), run it again: a published v3 file
# is never overwritten, so after the page is deployed a change goes to v4 instead (CLAUDE.md "Media versioning").
#
#   tools/encode/launch-site.sh                 all the steps below, in order
#   tools/encode/launch-site.sh film loops      only these steps (any of: tracks mix film posters loops verify clean)
#
#   tracks   bun video/src/launch/master/captions.ts --write (the film's VTT, checked by its own rules), then
#            node tools/captions/build.mjs: film.en.vtt, film.chapters.vtt, film.descriptions.en.vtt in public/media/v3
#   mix      the -16 LUFS web mixes from the masters' WAVs (encode.sh mix), into .work/launch/site/
#   film     encode.sh film (film-1080.hevc, film-720.h264) and encode.sh phone (film-phone.hevc, .h264)
#   posters  each master's frame 0 (a finished composition) -> film.poster and film-phone.poster, AVIF and WebP
#   loops    node tools/encode/loops.mjs: the loops in tools/encode/launch-loops.json, their posters and encodes
#   verify   node tools/encode/verify.mjs: every file in public/media, loudness and seams included
#   clean    delete the intermediate mixes, stills and loop masters in .work/launch/site/ (after verify passes)
#
# Don't wrap this script in scripts/heavy.sh: each heavy step queues itself through it, one at a time, so another
# session's job can take the lock in between, and a hold (.work/HOLD) stops the chain where it is. Environment knobs
# pass through to encode.sh (FILM_HEVC_CRF, FILM_H264_CRF, FILM_VF, FILM_MAX_RAISE, MIX_LIMIT_DB, …): see its header.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=/dev/null
source "$HERE/../../scripts/env.sh"
cd "$REPO"

ENC="$HERE/encode.sh"
OUT_DIR="$REPO/video/out/launch"
M16="$OUT_DIR/LaunchFilm-16x9-master.mp4"
M45="$OUT_DIR/LaunchFilm-4x5-master.mp4"
WORK="$REPO/.work/launch/site"
MIX16="$WORK/mix-16x9-web.wav"
MIX45="$WORK/mix-4x5-web.wav"
V3="$REPO/public/media/v3"

say() { printf 'launch-site.sh: %s\n' "$*" >&2; }
die() { say "$*"; exit 1; }
need() { [ -f "$1" ] || die "no $1 ($2)"; }
# the master's own mix if it exists (final.sh writes it beside the master), else the master's AAC track
mix_source() { if [ -f "${1%.mp4}.wav" ]; then printf '%s\n' "${1%.mp4}.wav"; else printf '%s\n' "$1"; fi; }

step_tracks() {
  command -v bun >/dev/null || die "bun is not on PATH (source scripts/env.sh)"
  bun video/src/launch/master/captions.ts --write
  node tools/captions/build.mjs --out-dir "$V3"
}

step_mix() {
  need "$M16" "the 16:9 master: video/src/launch/master/final.sh 16x9"
  need "$M45" "the 4:5 master: video/src/launch/master/final.sh 4x5"
  mkdir -p "$WORK"
  "$ENC" mix "$(mix_source "$M16")" "$MIX16"
  "$ENC" mix "$(mix_source "$M45")" "$MIX45"
}

step_film() {
  need "$MIX16" "the 16:9 web mix: run the mix step"
  need "$MIX45" "the 4:5 web mix: run the mix step"
  "$ENC" film "$M16" "$MIX16" --out-dir "$V3" --no-verify
  "$ENC" phone "$M45" "$MIX45" --out-dir "$V3" --no-verify
}

step_posters() {
  mkdir -p "$WORK"
  "$ENC" still "$M16" 0 "$WORK/film.poster.png"
  "$ENC" poster "$WORK/film.poster.png" "$V3/film.poster" 1920 1080 --no-verify
  "$ENC" still "$M45" 0 "$WORK/film-phone.poster.png"
  "$ENC" poster "$WORK/film-phone.poster.png" "$V3/film-phone.poster" 1080 1350 --no-verify
}

step_loops() {
  node tools/encode/loops.mjs
}

step_verify() {
  node tools/encode/verify.mjs
}

step_clean() {
  rm -f "$MIX16" "$MIX45" "$WORK/film.poster.png" "$WORK/film-phone.poster.png"
  rm -rf "$WORK/loops"
  say "removed the intermediate mixes, stills and loop masters in ${WORK#"$REPO/"}"
}

STEPS="${*:-tracks mix film posters loops verify}"
for step in $STEPS; do
  case "$step" in
  tracks | mix | film | posters | loops | verify | clean) ;;
  *) die "unknown step '$step' (tracks mix film posters loops verify clean)" ;;
  esac
done
for step in $STEPS; do
  say "step: $step"
  "step_$step"
done
say "done: $STEPS"
