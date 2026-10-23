"""Compare two folders of captures pixel by pixel (a re-capture after a Pebble release against the stills' sources).

Usage: python3 -I diff.py <old-dir> <new-dir> [--out=DIR] [--threshold=N] [--cell=PX] [name-filter ...]
  For every PNG in <old-dir> that has a namesake in <new-dir>: "same" (no channel differs by more than --threshold,
  default 8), a size change, or the differing pixels and their regions (cells of --cell px, default 24, that touch are
  merged). With --out, each region is saved as old | new | difference, at full resolution, to look at.
Ends with a SUMMARY line. Pillow only.
"""
import sys
from array import array
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw

args = [a for a in sys.argv[1:] if not a.startswith("--")]
opts = dict((a[2:].split("=", 1) + [""])[:2] for a in sys.argv[1:] if a.startswith("--"))
old_dir, new_dir = Path(args[0]), Path(args[1])
filters = args[2:]
threshold = int(opts.get("threshold") or 8)
cell = int(opts.get("cell") or 24)
out = Path(opts["out"]) if opts.get("out") else None
if out:
    out.mkdir(parents=True, exist_ok=True)


def regions(mask):
    """Bounding boxes (full-res px) of touching groups of cells that hold a differing pixel."""
    w, h = mask.size
    gw, gh = (w + cell - 1) // cell, (h + cell - 1) // cell
    # the mean of each cell, in floats: > 0 if any pixel in it differs (an 8-bit mean would round one pixel to 0);
    # padded to whole cells first, so every grid cell is exactly cell × cell pixels of the mask
    padded = Image.new("F", (gw * cell, gh * cell), 0)
    padded.paste(mask.convert("F"), (0, 0))
    grid = padded.resize((gw, gh), Image.BOX, reducing_gap=None)
    on = [v > 0 for v in array("f", grid.tobytes())]
    seen = [False] * (gw * gh)
    boxes = []
    for start in range(gw * gh):
        if not on[start] or seen[start]:
            continue
        stack, cells = [start], []
        seen[start] = True
        while stack:
            i = stack.pop()
            cells.append(i)
            x, y = i % gw, i // gw
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < gw and 0 <= ny < gh:
                        j = ny * gw + nx
                        if on[j] and not seen[j]:
                            seen[j] = True
                            stack.append(j)
        xs, ys = [i % gw for i in cells], [i // gw for i in cells]
        box = (min(xs) * cell, min(ys) * cell, min(w, (max(xs) + 1) * cell), min(h, (max(ys) + 1) * cell))
        inner = mask.crop(box).getbbox()  # tighten the group to its differing pixels
        if inner:
            boxes.append((box[0] + inner[0], box[1] + inner[1], box[0] + inner[2], box[1] + inner[3]))
    return boxes


total = same = changed = 0
for old in sorted(old_dir.glob("*.png")):
    if filters and not any(f in old.name for f in filters):
        continue
    new = new_dir / old.name
    if not new.exists():
        continue
    total += 1
    a, b = Image.open(old).convert("RGBA"), Image.open(new).convert("RGBA")
    if a.size != b.size:
        changed += 1
        print(f"{old.name}: SIZE {a.size} -> {b.size}")
        continue
    diff = ImageChops.difference(a, b)
    channels = diff.split()
    peak = channels[0]
    for c in channels[1:]:
        peak = ImageChops.lighter(peak, c)
    mask = peak.point(lambda v: 255 if v > threshold else 0)
    count = mask.histogram()[255]
    if not count:
        same += 1
        print(f"{old.name}: same (max channel difference {max(peak.getextrema())})")
        continue
    changed += 1
    boxes = regions(mask)
    print(f"{old.name}: {count} px differ (> {threshold}) in {len(boxes)} region(s): " + "; ".join(f"x {x0}-{x1} y {y0}-{y1}" for x0, y0, x1, y1 in boxes[:12]))
    if out:
        for n, (x0, y0, x1, y1) in enumerate(boxes[:24]):
            pad = 2 * cell
            box = (max(0, x0 - pad), max(0, y0 - pad), min(a.width, x1 + pad), min(a.height, y1 + pad))
            pa, pb, pm = a.crop(box), b.crop(box), mask.crop(box)
            sheet = Image.new("RGBA", (pa.width * 3 + 32, pa.height + 28), (255, 255, 255, 255))
            draw = ImageDraw.Draw(sheet)
            for i, (label, img) in enumerate((("old", pa), ("new", pb), ("differs", pm.convert("RGBA")))):
                sheet.paste(img, (i * (pa.width + 16), 28), img)
                draw.text((i * (pa.width + 16) + 4, 8), label, fill=(30, 30, 30, 255))
            sheet.convert("RGB").save(out / f"{old.stem}-r{n + 1:02d}.png")
print(f"SUMMARY: {total} pairs, {same} same, {changed} differ (threshold {threshold})")
