"""reel music lane: the harmony of a stretch of a measured track: mean CQT chroma of the harmonic part (from the curves
NPZ of score2/measure_track.py) over [from, to), its strongest pitch classes, and its correlation with every major and
minor key (Krumhansl-Kessler). Reads NPZ only.
  python -I tools/audio/reel/chroma.py CURVES.npz FROM_S TO_S [LABEL]"""
import sys

import numpy as np

NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
MAJ = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
MIN = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
HOP = 512 / 22050


def keys(c):
    out = []
    for i in range(12):
        out.append((np.corrcoef(c, np.roll(MAJ, i))[0, 1], f"{NOTES[i]} major"))
        out.append((np.corrcoef(c, np.roll(MIN, i))[0, 1], f"{NOTES[i]} minor"))
    return sorted(out, reverse=True)


if __name__ == "__main__":
    z = np.load(sys.argv[1])
    a, b = float(sys.argv[2]), float(sys.argv[3])
    ch = z["chroma"].astype(np.float32)
    c = ch[:, int(a / HOP):int(b / HOP)].mean(1)
    c = c / (c.max() + 1e-9)
    top = np.argsort(-c)[:5]
    k = keys(c)[:3]
    print(f"{sys.argv[4] if len(sys.argv) > 4 else ''} {a:.2f}-{b:.2f}: top " + " ".join(f"{NOTES[i]}{c[i]:.2f}" for i in top)
          + " | keys " + ", ".join(f"{n} {r:.2f}" for r, n in k))
