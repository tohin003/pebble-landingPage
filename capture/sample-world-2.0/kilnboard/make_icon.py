"""Draws Kiln Board's app icon (a kiln on a dark tile) as an .iconset for iconutil. Self-made; Pillow only.

  "$PYQA" -I -B capture/sample-world-2.0/kilnboard/make_icon.py <out>/AppIcon.iconset
"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


def icon(size: int = 1024) -> Image.Image:
    s = size / 1024
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    shadow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle((100 * s, 118 * s, 924 * s, 942 * s), radius=190 * s, fill=(0, 0, 0, 90))
    img.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(18 * s)))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((100 * s, 100 * s, 924 * s, 924 * s), radius=190 * s, fill=(43, 39, 36, 255))
    # The kiln: a box with a lid and a grid of firebricks, a glow below.
    d.ellipse((330 * s, 700 * s, 694 * s, 820 * s), fill=(214, 112, 64, 120))
    d.rounded_rectangle((300 * s, 300 * s, 724 * s, 700 * s), radius=26 * s, fill=(122, 74, 50, 255))
    d.rectangle((300 * s, 300 * s, 724 * s, 352 * s), fill=(96, 58, 40, 255))
    for row in range(4):
        for col in range(5):
            x0 = 330 * s + col * 79 * s
            y0 = 380 * s + row * 76 * s
            d.rounded_rectangle((x0, y0, x0 + 66 * s, y0 + 62 * s), radius=8 * s, fill=(232, 214, 190, 255))
    d.rounded_rectangle((420 * s, 250 * s, 604 * s, 300 * s), radius=14 * s, fill=(96, 58, 40, 255))
    d.polygon([(512 * s, 720 * s), (470 * s, 800 * s), (512 * s, 780 * s), (554 * s, 800 * s)], fill=(242, 160, 90, 255))
    return img


def main() -> None:
    out = Path(sys.argv[1])
    out.mkdir(parents=True, exist_ok=True)
    big = icon(1024)
    for pt in (16, 32, 128, 256, 512):
        big.resize((pt, pt), Image.LANCZOS).save(out / f"icon_{pt}x{pt}.png")
        big.resize((pt * 2, pt * 2), Image.LANCZOS).save(out / f"icon_{pt}x{pt}@2x.png")


if __name__ == "__main__":
    main()
