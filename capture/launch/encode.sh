#!/usr/bin/env bash
# capture/launch/encode.sh <frames-dir> <out.mp4> [fps]
# One recorded clip (record.mjs PNG frames 00001.png …) to H.264 for the launch film: yuv420p, BT.709 (matrix, primaries,
# transfer, limited range, tagged on the frames with setparams so they reach the VUI and the MP4 colr box, as
# tools/encode/encode.sh does), x264 slow CRF 14, a keyframe every second (Remotion seeks), +faststart, no audio, no
# metadata. The frame count is checked against the PNGs; then the PNGs are deleted (timeline.json and probes.json are
# kept in .work/launch/ui/meta/ as <name>.timeline.json, for capture/launch/manifest.mjs). Run it through heavy.sh:
#   scripts/heavy.sh launch-encode capture/launch/encode.sh .work/launch/ui/frames/launch-agentguard \
#     video/public/launch/ui/launch-agentguard.mp4
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=/dev/null
source "$HERE/../../scripts/env.sh"
dir="${1:?frames dir}" out="${2:?out.mp4}" fps="${3:-60}"
[ -f "$dir/00001.png" ] || { echo "encode.sh: no 00001.png in $dir" >&2; exit 66; }
frames=$(find "$dir" -maxdepth 1 -name '[0-9][0-9][0-9][0-9][0-9].png' | wc -l | tr -d ' ')
mkdir -p "$(dirname "$out")"
tmp="${out%.mp4}.part.mp4"
"$FF" -v error -y -framerate "$fps" -start_number 1 -i "$dir/%05d.png" -an -map_metadata -1 \
  -vf "scale=out_color_matrix=bt709:out_range=tv:flags=lanczos+accurate_rnd+full_chroma_int,format=yuv420p,setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709:range=tv" \
  -c:v libx264 -preset slow -crf 14 -profile:v high -pix_fmt yuv420p -g "$fps" -keyint_min "$fps" -sc_threshold 0 \
  -r "$fps" -movflags +faststart "$tmp"
got=$("$FP" -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames -of csv=p=0 "$tmp")
if [ "$got" != "$frames" ]; then
  echo "encode.sh: $tmp has $got frames, the folder $frames; the PNGs are kept" >&2
  exit 65
fi
mv "$tmp" "$out"
meta="$REPO/.work/launch/ui/meta"; mkdir -p "$meta"
for f in timeline.json probes.json; do if [ -f "$dir/$f" ]; then cp "$dir/$f" "$meta/$(basename "${out%.mp4}").$f"; fi; done
find "$dir" -maxdepth 1 -name '[0-9][0-9][0-9][0-9][0-9].png' -delete
rmdir "$dir" 2>/dev/null || true
"$FP" -v error -select_streams v:0 -show_entries stream=width,height,r_frame_rate,nb_frames,pix_fmt,color_space,color_primaries,color_transfer,color_range,profile,level -show_entries format=duration,size -of default=nw=1 "$out"
echo "encode.sh: $frames frames -> $out; PNGs deleted"
