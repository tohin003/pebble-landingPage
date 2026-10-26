"""Make the reverse swell into a hit from the music itself (TREATMENT §4.6: 'Reverse swell | S25 into the title | the
track's own audio | ends on the beat'; MUSIC_RESEARCH §3.4: exactly 1 bar or half a bar long).

The slice of music that starts on the target downbeat (the chord the hit lands on) is smeared with a long reverb,
reversed, and faded in, so it swells for len seconds and stops exactly where that downbeat starts. Place the file with
its END on the downbeat (reel.py: "align": "end"; the mix: offset = downbeat time - duration).

  python -I reverse_swell.py --src TRACK.wav --at 118.5 --bpm 120 --beats 4 --out swell.wav
  python -I reverse_swell.py --src TAKE.wav --at 0 --len-s 2.0 --out swell.wav      # any source, e.g. a kit hit
Uses pedalboard's Reverb (GPL-3.0: run, never shipped).
"""
import argparse
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import audiolib as al  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True)
    ap.add_argument("--at", type=float, required=True, help="the downbeat the swell ends on, seconds into --src")
    ap.add_argument("--bpm", type=float)
    ap.add_argument("--beats", type=float, default=4.0, help="length in beats (4 = one 4/4 bar, 2 = half a bar)")
    ap.add_argument("--len-s", type=float, help="length in seconds (instead of --bpm/--beats)")
    ap.add_argument("--room", type=float, default=0.92)
    ap.add_argument("--peak-dbtp", type=float, default=-1.0)
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    if not a.len_s and not a.bpm:
        raise SystemExit("give --len-s, or --bpm (with --beats)")
    L = a.len_s if a.len_s else a.beats * 60.0 / a.bpm
    y, _ = al.load(a.src)
    sw = al.preverb(y, a.at, L, room=a.room)  # reversed reverb of the slice that starts on the downbeat
    sw, g = al.normalise_tp(np.asarray(sw, dtype=np.float32), a.peak_dbtp)
    al.write(a.out, sw)
    print(f"swell {L:.3f} s from {a.src} at {a.at:.3f} s -> {a.out} (place its end on the downbeat)")


if __name__ == "__main__":
    main()
