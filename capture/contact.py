"""Tile screenshots into one contact sheet (transparent PNGs over a checkerboard) for quick review.
Usage: python3 -I contact.py OUT.png [--width=W] [--cols=N] IN1.png IN2.png ...
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw

args = [a for a in sys.argv[1:] if not a.startswith("--")]
opts = dict(a[2:].split("=", 1) for a in sys.argv[1:] if a.startswith("--"))
out, files = Path(args[0]), [Path(p) for p in args[1:]]
cell_w = int(opts.get("width", 560))
cols = int(opts.get("cols", min(len(files), 3)))
label_h, pad = 34, 16


def checker(size, step=12):
    img = Image.new("RGB", size, (236, 236, 236))
    draw = ImageDraw.Draw(img)
    for y in range(0, size[1], step):
        for x in range((y // step) % 2 * step, size[0], step * 2):
            draw.rectangle([x, y, x + step - 1, y + step - 1], fill=(250, 250, 250))
    return img


cells = []
for f in files:
    im = Image.open(f).convert("RGBA")
    scale = cell_w / im.width
    im = im.resize((cell_w, max(1, round(im.height * scale))), Image.LANCZOS)
    bg = checker(im.size)
    bg.paste(im, (0, 0), im)
    cells.append((f.name, bg))
rows = (len(cells) + cols - 1) // cols
row_h = [max(c[1].height for c in cells[r * cols:(r + 1) * cols]) for r in range(rows)]
sheet = Image.new("RGB", (cols * (cell_w + pad) + pad, sum(h + label_h + pad for h in row_h) + pad), (255, 255, 255))
draw = ImageDraw.Draw(sheet)
y = pad
for r in range(rows):
    x = pad
    for name, img in cells[r * cols:(r + 1) * cols]:
        draw.text((x, y + 8), name, fill=(40, 40, 40))
        sheet.paste(img, (x, y + label_h))
        x += cell_w + pad
    y += row_h[r] + label_h + pad
sheet.save(out)
print(out, sheet.size)
