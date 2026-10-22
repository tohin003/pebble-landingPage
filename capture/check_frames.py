"""Flag frames whose pebble (bottom-right avatar) is missing: a sign of an incompletely rasterized screenshot."""
import sys
from pathlib import Path
from PIL import Image
folder = Path(sys.argv[1]); start = int(sys.argv[2]) if len(sys.argv) > 2 else 1
bad = []
files = sorted(folder.glob("*.png"))
for f in files[start - 1:]:
    im = Image.open(f).convert("RGBA")
    w, h = im.size
    box = im.crop((int(w * 0.80), int(h * 0.82), int(w * 0.95), int(h * 0.97))).getchannel("A")
    opaque = sum(1 for v in box.tobytes() if v > 200) / (box.width * box.height)
    if opaque < 0.3:
        bad.append(f.name)
print(f"{len(bad)} of {len(files) - start + 1} frames missing the pebble:", " ".join(bad[:40]))
