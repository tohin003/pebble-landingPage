"""reel music lane: rank a measured track's downbeats by how hard they hit: the low-band and all-band onset strength
(from the curves NPZ of score2/measure_track.py) at the strongest peak within 60 ms of each downbeat, its time
offset from the grid, and the momentary-loudness jump across it. Reads JSON and NPZ only.
  python -I tools/audio/reel/hits.py MAP.json CURVES.npz [TOP]"""
import json
import sys

import numpy as np

d = json.load(open(sys.argv[1]))
z = np.load(sys.argv[2])
top = int(sys.argv[3]) if len(sys.argv) > 3 else 20
ot, oenv, olow = z["ot"], z["oenv"], z["olow"]
mom = z["mom"]
on_n, low_n = oenv / (np.percentile(oenv, 99) + 1e-9), olow / (np.percentile(olow, 99) + 1e-9)
rows = []
for i, t in enumerate(d["downbeats_s"]):
    m = (ot >= t - 0.06) & (ot <= t + 0.06)
    if not m.any():
        continue
    j = np.flatnonzero(m)[np.argmax(low_n[m] + on_n[m])]
    k = int(round(t / 0.1))
    jump = float(mom[min(len(mom) - 1, k + 3)] - mom[max(0, k - 3)])
    rows.append((float(low_n[j] + on_n[j]), i, t, float(ot[j] - t), float(low_n[j]), float(on_n[j]), jump))
for s, i, t, off, lo, al, jump in sorted(rows, reverse=True)[:top]:
    print(f"bar {i:3d} {t:8.3f}  hit {s:4.2f} (low {lo:4.2f}, all {al:4.2f})  attack {off * 1000:+5.0f} ms  "
          f"mom jump {jump:+5.1f} LU")
offs = [r[3] for r in rows if r[0] > 1.0]
if offs:
    print(f"median attack offset of the strong downbeats: {np.median(offs) * 1000:+.0f} ms (n={len(offs)})")
