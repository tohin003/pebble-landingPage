"""Assemble recorded PNG frames into an animated WebP preview (lossy, alpha kept). No ffmpeg needed.
Usage: python3 -I preview.py FRAMES_DIR OUT.webp [--fps=30] [--scale=0.5]"""
import sys
from pathlib import Path
from PIL import Image
args = [a for a in sys.argv[1:] if not a.startswith("--")]
opts = dict(a[2:].split("=", 1) for a in sys.argv[1:] if a.startswith("--"))
fps, scale = float(opts.get("fps", 30)), float(opts.get("scale", 0.5))
frames = []
for f in sorted(Path(args[0]).glob("*.png")):
    im = Image.open(f).convert("RGBA")
    frames.append(im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS) if scale != 1 else im)
frames[0].save(args[1], save_all=True, append_images=frames[1:], duration=round(1000 / fps), loop=0, quality=80, method=4)
print(args[1], len(frames), "frames", f"{len(frames) / fps:.1f} s", f"{Path(args[1]).stat().st_size / 1e6:.1f} MB")
