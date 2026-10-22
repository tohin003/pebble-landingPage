#!/usr/bin/env bash
# tools/audio/fetch_track.sh <mixkit-id> [<mixkit-id> ...]
#
# Downloads Mixkit music tracks politely (one at a time, >= 1 s apart), checks or records their SHA-256 in
# tools/audio/sha256-sources.txt, and decodes each ONCE to .work/audio/src/mixkit-<id>.wav (48 kHz, 24-bit):
# FFmpeg is the only decoder, tools/audio/resample48.py (soxr VHQ) the only resampler.
#   - A hash already recorded for a file must match, otherwise the script stops (the source changed: re-audition it).
#   - Raw audio lives only in .work/audio/src/ (gitignored). Never commit or publish it: on its own it would be
#     standalone redistribution, which the Mixkit licence does not allow.
# Run from anywhere: the script sources scripts/env.sh itself.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=/dev/null
source "$HERE/../../scripts/env.sh"
PY="$REPO/.work/audio/.venv/bin/python"
SRC="$REPO/.work/audio/src"
SUMS="$REPO/tools/audio/sha256-sources.txt"
UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0 Safari/537.36'
[ -x "$PY" ] || { echo "fetch_track.sh: no audio venv at $PY (see tools/audio/requirements.txt)" >&2; exit 1; }
[ $# -ge 1 ] || { echo "usage: tools/audio/fetch_track.sh <mixkit-id> [...]" >&2; exit 64; }
mkdir -p "$SRC"
[ -f "$SUMS" ] || printf '# SHA-256 of every downloaded source file: <sha256>  <file>  <url>  <first download date, IST>\n' >"$SUMS"

for id in "$@"; do
  case "$id" in *[!0-9]*|'') echo "fetch_track.sh: not a Mixkit id: $id" >&2; exit 64 ;; esac
  name="mixkit-$id.mp3"; mp3="$SRC/$name"; url="https://assets.mixkit.co/music/$id/$id.mp3"
  if [ ! -s "$mp3" ]; then
    curl -sSf -A "$UA" --max-time 120 -o "$mp3.part" "$url"
    mv "$mp3.part" "$mp3"
    sleep 1.2   # polite: at most one request per second
  fi
  sum="$(shasum -a 256 "$mp3" | awk '{print $1}')"
  known="$(awk -v n="$name" '$2 == n {print $1; exit}' "$SUMS")"
  if [ -z "$known" ]; then
    printf '%s  %s  %s  %s\n' "$sum" "$name" "$url" "$(TZ=Asia/Kolkata date '+%Y-%m-%d')" >>"$SUMS"
  elif [ "$known" != "$sum" ]; then
    echo "fetch_track.sh: SHA-256 mismatch for $name (recorded $known, got $sum)" >&2; exit 1
  fi
  wav="$SRC/mixkit-$id.wav"
  if [ ! -s "$wav" ]; then
    tmp="$SRC/.decode-$id.wav"
    "$FF" -v error -y -i "$mp3" -map 0:a:0 -c:a pcm_f32le -f wav "$tmp"
    "$PY" -I "$HERE/resample48.py" "$tmp" "$wav"
    rm -f "$tmp"
  fi
  printf '%s  %s  %s\n' "$id" "$sum" "$("$FP" -v error -show_entries format=duration:stream=sample_rate,channels,bit_rate -of compact=p=0:nk=1 "$mp3" | tr '\n' ' ')"
done
