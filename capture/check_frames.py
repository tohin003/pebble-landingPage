"""Flag frames whose pebble (bottom-right avatar) is missing: a sign of an incompletely rasterized screenshot.

Usage: python3 -I check_frames.py <frames-dir> [start] [--box=x0,y0,x1,y1] [--ink] [--alpha=N]
  start   the first frame to check (1-based; default 1)
  --box   check this region instead (fractions of the frame), e.g. the quick chat's card when the pebble was recorded
          hidden (record.mjs --hide=.pet-avatar): --box=0.06,0.06,0.94,0.74
  --ink   also flag a frame whose dark pixels (text) in the region drop below half of both neighbours' (text that
          failed to paint on one frame)
  --alpha the alpha above which a pixel counts as painted (default 200). Pebble 1.1.0's Veil (Stealth Lockdown's look)
          turns the pebble into a 70 % glass, alpha about 178, so check record.mjs pet-veil with a lower cut, e.g.
          --box=0.3,0.3,0.7,0.7 --alpha=120
"""
import sys
from pathlib import Path
from PIL import Image

args = [a for a in sys.argv[1:] if not a.startswith("--")]
opts = dict((a[2:].split("=", 1) + [""])[:2] for a in sys.argv[1:] if a.startswith("--"))
folder = Path(args[0]); start = int(args[1]) if len(args) > 1 else 1
region = tuple(float(v) for v in opts["box"].split(",")) if opts.get("box") else (0.80, 0.82, 0.95, 0.97)
cut = int(opts["alpha"]) if opts.get("alpha") else 200
what = "an opaque check region" if opts.get("box") else "the pebble"
bad = []
ink = []
files = sorted(folder.glob("*.png"))
for f in files[start - 1:]:
    im = Image.open(f).convert("RGBA")
    w, h = im.size
    crop = im.crop((int(w * region[0]), int(h * region[1]), int(w * region[2]), int(h * region[3])))
    alpha = crop.getchannel("A").tobytes()
    opaque = sum(1 for v in alpha if v > cut) / (crop.width * crop.height)
    if opaque < 0.3:
        bad.append(f.name)
    if "ink" in opts:
        lum = crop.convert("L").tobytes()
        ink.append(sum(1 for a, l in zip(alpha, lum) if a > cut and l < 128))
print(f"{len(bad)} of {len(files) - start + 1} frames missing {what}:", " ".join(bad[:40]))
if "ink" in opts:
    names = [f.name for f in files[start - 1:]]
    drops = [names[i] for i in range(1, len(ink) - 1) if ink[i] < 0.5 * min(ink[i - 1], ink[i + 1])]
    print(f"{len(drops)} frames whose text fails to paint:", " ".join(drops[:40]))
