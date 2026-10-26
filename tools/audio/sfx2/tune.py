"""Tune a kit take to the chosen track's key (TREATMENT §4.6: ticks 'tuned to the key'; MUSIC_RESEARCH §3.3: risers and
impacts pitched to the key). The kit records each take's strongest pitch (KIT.json measure.pitch_hz / note).

  python -I tune.py IN.wav OUT.wav --to-note A4            # from the take's measured pitch to the nearest A
  python -I tune.py IN.wav OUT.wav --semitones -2          # a fixed shift
  python -I tune.py IN.wav OUT.wav --to-note D3 --keep-length   # pitch only (Rubber Band via pedalboard, GPL: run,
                                                                # never shipped); default is varispeed
Varispeed (resampling) moves pitch and length together, the cleanest choice for one-shots under about a second.
--to-note picks the octave of that note nearest to the measured pitch, so a shift is never more than 6 semitones.
"""
import argparse
import math
import os
import sys

import numpy as np
from scipy.signal import resample_poly

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import audiolib as al  # noqa: E402


def note_hz(name):
    n = name[:-1].upper().replace("DB", "C#").replace("EB", "D#").replace("GB", "F#").replace("AB", "G#").replace(
        "BB", "A#")
    return 440.0 * 2 ** ((al.NOTES.index(n) + 12 * (int(name[-1]) + 1) - 69) / 12)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("inp")
    ap.add_argument("out")
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--to-note")
    g.add_argument("--semitones", type=float)
    ap.add_argument("--keep-length", action="store_true")
    a = ap.parse_args()
    y, _ = al.load(a.inp)
    if a.to_note:
        hz = al.pitch(y)["pitch_hz"]
        target = note_hz(a.to_note)
        semis = 12 * math.log2(target / hz)
        semis -= 12 * round(semis / 12)  # nearest octave of that note
    else:
        semis = a.semitones
    if a.keep_length:
        import pedalboard  # GPL-3.0: run here, never shipped
        z = pedalboard.Pedalboard([pedalboard.PitchShift(semitones=semis)])(y.T, al.SR).T
    else:
        ratio = 2 ** (semis / 12)  # play faster by ratio: resample to len / ratio
        up, down = 1000, int(round(1000 * ratio))
        z = resample_poly(y, up, down, axis=0, window=("kaiser", 9.0))
    z, gdb = al.normalise_tp(np.asarray(z, dtype=np.float32), al.db(al.true_peak(y)))
    al.write(a.out, z)
    print(f"{a.inp} -> {a.out}: {semis:+.2f} semitones ({'pitch only' if a.keep_length else 'varispeed'})")


if __name__ == "__main__":
    main()
