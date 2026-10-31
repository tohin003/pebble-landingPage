#!/bin/bash
# The take agent's recorder, run by the copied heavy.sh (so it holds heavy.sh's lock and its disk floors):
#   bash rec.sh <screencapture|avfoundation> <max seconds> <output .mov> <control fifo> <display number | screen index>
# Its standard input is the agent's control FIFO: screencapture -v stops when a character arrives ("type any character
# to stop"), FFmpeg stops on "q". Run as a background job, a program's stdin would otherwise be /dev/null, which ends a
# recording that waits for a key at once. Never overwrites a file.
set -u
[ $# -eq 5 ] || { echo "rec.sh: usage: rec.sh <method> <max_s> <out> <fifo> <display>" >&2; exit 64; }
METHOD="$1" MAX="$2" OUT="$3" FIFO="$4" DISP="$5"
case "$MAX" in ''|*[!0-9]*) echo "rec.sh: max seconds must be a number" >&2; exit 64 ;; esac
case "$DISP" in ''|*[!0-9]*) echo "rec.sh: display must be a number" >&2; exit 64 ;; esac
[ -p "$FIFO" ] || { echo "rec.sh: $FIFO is not a FIFO" >&2; exit 64; }
[ -e "$OUT" ] && { echo "rec.sh: $OUT exists; a take is never overwritten" >&2; exit 64; }
case "$METHOD" in
  screencapture)
    # -v video, -C with the pointer, -x no sound, -D the display, -V stop after MAX seconds (RUNBOOK §6.2 A)
    exec /usr/sbin/screencapture -v -C -x -D "$DISP" -V "$MAX" "$OUT" <"$FIFO" ;;
  avfoundation)
    # RUNBOOK §6.2 B: -r 60 is an OUTPUT option (after -i), so the capture's own timestamps are kept
    exec /opt/homebrew/bin/ffmpeg -hide_banner -nostats -n -f avfoundation -capture_cursor 1 -capture_mouse_clicks 0 \
      -framerate 60 -pixel_format nv12 -i "$DISP:none" -t "$MAX" -r 60 -c:v hevc_videotoolbox -b:v 24M -tag:v hvc1 -an \
      "$OUT" <"$FIFO" ;;
  *) echo "rec.sh: unknown method $METHOD" >&2; exit 64 ;;
esac
