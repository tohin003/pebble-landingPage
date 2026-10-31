#!/usr/bin/env python3
"""Contact sheet of a reel render: every Nth frame (or a list), labelled with its frame and seconds.

  python3 -I video/src/reel/sheet.py <video.mp4> <out.jpg> [--every 15] [--frames 0,30,...] [--cols 6] [--width 480]

Decodes with FFmpeg ($FF, else /opt/homebrew/bin/ffmpeg) into a temporary folder, then tiles with Pillow.
"""
import os
import subprocess
import sys
import tempfile

from PIL import Image, ImageDraw


def main() -> None:
    args = sys.argv[1:]
    if len(args) < 2:
        print(__doc__)
        sys.exit(64)
    src, out = args[0], args[1]

    def opt(name: str, default: str) -> str:
        return args[args.index(name) + 1] if name in args else default

    every = int(opt("--every", "15"))
    cols = int(opt("--cols", "6"))
    width = int(opt("--width", "480"))
    fps = float(opt("--fps", "60"))
    frames = [int(x) for x in opt("--frames", "").split(",") if x.strip()]
    ff = os.environ.get("FF", "/opt/homebrew/bin/ffmpeg")
    with tempfile.TemporaryDirectory() as tmp:
        sel = "+".join(f"eq(n\\,{n})" for n in frames) if frames else f"not(mod(n\\,{every}))"
        subprocess.run(
            [ff, "-hide_banner", "-loglevel", "error", "-i", src, "-vf", f"select='{sel}',scale={width}:-2", "-fps_mode", "passthrough", "-q:v", "3", os.path.join(tmp, "%05d.jpg")],
            check=True,
        )
        files = sorted(f for f in os.listdir(tmp) if f.endswith(".jpg"))
        labels = frames if frames else [i * every for i in range(len(files))]
        tiles = []
        for f, n in zip(files, labels):
            im = Image.open(os.path.join(tmp, f)).convert("RGB")
            d = ImageDraw.Draw(im)
            d.rectangle([0, 0, 118, 16], fill=(0, 0, 0))
            d.text((3, 3), f"{n}  {n / fps:.2f}s", fill=(255, 230, 0))
            tiles.append(im)
        if not tiles:
            sys.exit("no frames decoded")
        w, h = tiles[0].size
        rows = (len(tiles) + cols - 1) // cols
        sheet = Image.new("RGB", (cols * w, rows * h), (30, 30, 30))
        for i, t in enumerate(tiles):
            sheet.paste(t, ((i % cols) * w, (i // cols) * h))
        sheet.save(out, quality=85)
        print(f"{out}: {len(tiles)} frames, {sheet.size[0]}x{sheet.size[1]}")


if __name__ == "__main__":
    main()
