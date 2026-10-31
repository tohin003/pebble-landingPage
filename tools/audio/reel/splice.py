"""reel music lane: find bar-line splices within one measured track (from bar i's end to bar j's start) that a listener
should not notice: bar j should sound like the bar that really follows i (bar i+1) in harmony (chroma cosine), timbre
(MFCC distance) and loudness, and bar j-1 should sound like bar i (so the phrase shape before the join matches).
JSON only.  python3 -I tools/audio/reel/splice.py MAP.json I_FROM I_TO J_FROM J_TO [TOP]"""
import json
import math
import sys

d = json.load(open(sys.argv[1]))
i0, i1, j0, j1 = (int(x) for x in sys.argv[2:6])
top = int(sys.argv[6]) if len(sys.argv) > 6 else 12
B = d["bar_table"]


def cos(a, b):
    return sum(x * y for x, y in zip(a, b)) / (math.sqrt(sum(x * x for x in a) * sum(y * y for y in b)) + 1e-9)


def mf(a, b):
    return math.sqrt(sum((x - y) ** 2 for x, y in zip(a["mfcc"][1:], b["mfcc"][1:])))


rows = []
for i in range(i0, i1 + 1):
    for j in range(j0, j1 + 1):
        nat, inc, prev, cur = B[i + 1], B[j], B[i], B[j - 1]
        c1, c0 = cos(nat["chroma"], inc["chroma"]), cos(prev["chroma"], cur["chroma"])
        m1 = mf(nat, inc)
        dl = inc["lufs"] - nat["lufs"]
        score = c1 + 0.5 * c0 - m1 / 60 - abs(dl) / 6
        rows.append((score, i, j, c1, c0, m1, dl))
for s, i, j, c1, c0, m1, dl in sorted(rows, reverse=True)[:top]:
    print(f"end of bar {i} ({B[i]['end']:.3f}) -> bar {j} ({B[j]['start']:.3f}): score {s:.2f}  chroma(next) {c1:.2f}  "
          f"chroma(prev) {c0:.2f}  mfcc {m1:.1f}  loudness step {dl:+.1f} LU")
