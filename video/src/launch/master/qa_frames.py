"""Blank and half-painted frames from two ffmpeg `metadata=print` logs (the top and bottom halves' mean luma).

usage: python3 qa_frames.py top.txt bottom.txt <fps>
Reports frames whose either half is black (mean luma < 3 on 0-255 where its neighbours aren't), and one-frame outliers:
a half whose luma jumps by more than 18 against both neighbours while the neighbours agree (within 6): what a frame
painted late or half-painted looks like. Cuts are two-frame changes, so they don't trip it.
"""
import re
import sys


def read(path):
    vals = []
    for line in open(path):
        m = re.search(r"YAVG=([0-9.]+)", line)
        if m:
            vals.append(float(m.group(1)))
    return vals


top, bot, fps = read(sys.argv[1]), read(sys.argv[2]), float(sys.argv[3])
n = min(len(top), len(bot))
found = []
for name, v in (("top", top), ("bottom", bot)):
    for i in range(1, n - 1):
        a, b, c = v[i - 1], v[i], v[i + 1]
        if b < 3 and (a >= 3 or c >= 3):
            found.append((i, name, f"black half (luma {b:.1f}; neighbours {a:.1f}, {c:.1f})"))
        elif abs(b - a) > 18 and abs(b - c) > 18 and abs(a - c) < 6:
            found.append((i, name, f"one-frame outlier (luma {b:.1f}; neighbours {a:.1f}, {c:.1f})"))
print(f"frames scanned: {n} at {fps:g} fps")
if not found:
    print("no blank or half-painted frames found")
for i, name, what in sorted(found):
    print(f"frame {i} ({i / fps:.3f} s), {name}: {what}")
