"""Draws the sample world's printed matter with Pillow: the open-day poster (a 2560 x 1664 screen version, which fills
the demo Mac's display in Preview's full screen, and an A3 PDF) and the price list (an A4 PDF, the file for "open a
file in an app"). Self-made: shapes drawn in code, set in the site's own OFL fonts (Fraunces, Inter). Fictional.

Run (light, a few seconds; no Chrome, no FFmpeg):
  "$PYQA" -I capture/sample-world-2.0/art/make_art.py --out .work/sample-world/build/art [--open-day 2026-11-14]
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
FONTS = REPO / "src" / "fonts"

PAPER = (243, 236, 224)
PAPER_DEEP = (233, 220, 200)
INK = (59, 43, 34)
INK_SOFT = (110, 90, 76)
CLAY = (180, 95, 61)
GLAZE_DARK, GLAZE_MID, GLAZE_LIGHT = (78, 106, 98), (125, 156, 143), (176, 199, 186)
BARE_DARK, BARE_MID, BARE_LIGHT = (138, 75, 51), (178, 107, 74), (214, 148, 110)


def fraunces(size: int, weight: int = 500, soft: int = 100, wonk: int = 1) -> ImageFont.FreeTypeFont:
    font = ImageFont.truetype(str(FONTS / "Fraunces-Variable-latin.woff2"), size)
    font.set_variation_by_axes([min(144, max(9, size // 3)), weight, soft, wonk])  # opsz, wght, SOFT, WONK
    return font


def inter(size: int, weight: int = 400) -> ImageFont.FreeTypeFont:
    font = ImageFont.truetype(str(FONTS / "Inter-Variable-latin.woff2"), size)
    font.set_variation_by_axes([weight])
    return font


def paper(size: tuple[int, int], seed: int = 7) -> Image.Image:
    """Warm paper with a faint mottle from a seeded generator, so every build is byte-identical."""
    sw, sh = max(1, size[0] // 6), max(1, size[1] // 6)
    rng = random.Random(seed)
    small = Image.frombytes("L", (sw, sh), bytes(rng.getrandbits(8) for _ in range(sw * sh)))
    mottle = small.filter(ImageFilter.GaussianBlur(1.2)).resize(size, Image.BICUBIC)
    return Image.composite(Image.new("RGB", size, PAPER_DEEP), Image.new("RGB", size, PAPER),
                           mottle.point(lambda v: int(abs(v - 128) * 0.22)))


def catmull_rom(points: list[tuple[float, float]], steps: int = 24) -> list[tuple[float, float]]:
    out: list[tuple[float, float]] = []
    pts = [points[0], *points, points[-1]]
    for i in range(1, len(pts) - 2):
        p0, p1, p2, p3 = pts[i - 1], pts[i], pts[i + 1], pts[i + 2]
        for s in range(steps):
            t = s / steps
            t2, t3 = t * t, t * t * t
            out.append(tuple(0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2
                                     + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3) for k in range(2)))
    out.append(points[-1])
    return out


# A jar's profile: (height from the rim, 0..1; radius as a share of the jar's width).
PROFILE = [(0.00, 0.30), (0.04, 0.29), (0.12, 0.27), (0.30, 0.46), (0.52, 0.56), (0.70, 0.50), (0.86, 0.36),
           (0.97, 0.26), (1.00, 0.26)]


def shade(u: float, dark: tuple, mid: tuple, light: tuple) -> tuple:
    """Across the jar, left to right, lit from above left: dark edge, highlight at 0.3, mid, dark edge."""
    stops = [(0.0, dark), (0.30, light), (0.62, mid), (1.0, tuple(int(c * 0.82) for c in dark))]
    for (u0, c0), (u1, c1) in zip(stops, stops[1:]):
        if u <= u1:
            f = (u - u0) / (u1 - u0)
            return tuple(int(round(c0[k] + (c1[k] - c0[k]) * f)) for k in range(3))
    return stops[-1][1]


def draw_jar(canvas: Image.Image, cx: int, top: int, height: int, width: int) -> None:
    ss = 2  # supersampling
    w, h = int(width * 1.5 * ss), int(height * 1.2 * ss)
    ox, oy = w // 2, int(height * 0.05 * ss)
    curve = catmull_rom(PROFILE)
    right = [(ox + r * width * ss, oy + y * height * ss) for y, r in curve]
    left = [(ox - r * width * ss, oy + y * height * ss) for y, r in reversed(curve)]
    jar = Image.new("L", (w, h), 0)
    ImageDraw.Draw(jar).polygon(right + left, fill=255)

    # The glaze line: a soft wave with three drips, about three quarters of the way down.
    glaze_mask = Image.new("L", (w, h), 0)
    line = []
    x0, x1 = ox - 0.6 * width * ss, ox + 0.6 * width * ss
    for i in range(241):
        x = x0 + (x1 - x0) * i / 240
        u = (x - x0) / (x1 - x0)
        y = 0.70 + 0.012 * math.sin(u * 11.0)
        for c, depth, spread in ((0.28, 0.07, 0.025), (0.55, 0.045, 0.02), (0.74, 0.06, 0.022)):
            y += depth * math.exp(-((u - c) ** 2) / (2 * spread ** 2))
        line.append((x, oy + y * height * ss))
    ImageDraw.Draw(glaze_mask).polygon([(x0, 0), (x1, 0), *reversed(line)], fill=255)

    # One row of shading, stretched down the jar (the light comes from above left).
    glaze_row, bare_row = Image.new("RGB", (w, 1)), Image.new("RGB", (w, 1))
    for x in range(w):
        u = min(1.0, max(0.0, (x - (ox - 0.56 * width * ss)) / (1.12 * width * ss)))
        glaze_row.putpixel((x, 0), shade(u, GLAZE_DARK, GLAZE_MID, GLAZE_LIGHT))
        bare_row.putpixel((x, 0), shade(u, BARE_DARK, BARE_MID, BARE_LIGHT))
    body = Image.composite(glaze_row.resize((w, h), Image.NEAREST), bare_row.resize((w, h), Image.NEAREST), glaze_mask)

    # A soft highlight down the lit side, on the glaze.
    hl = Image.new("L", (w, h), 0)
    ImageDraw.Draw(hl).rounded_rectangle(
        (ox - 0.30 * width * ss, oy + 0.16 * height * ss, ox - 0.21 * width * ss, oy + 0.62 * height * ss),
        radius=int(0.05 * width * ss), fill=120)
    hl = hl.filter(ImageFilter.GaussianBlur(14 * ss)).point(lambda v: v // 2)
    body = Image.composite(Image.new("RGB", (w, h), (236, 244, 238)), body, hl)

    # The mouth: a dark opening inside a lighter lip.
    rim_w, rim_h = 0.30 * width * ss, 0.045 * height * ss
    d = ImageDraw.Draw(body)
    d.ellipse((ox - rim_w, oy - rim_h, ox + rim_w, oy + rim_h), fill=(150, 176, 164))
    d.ellipse((ox - rim_w * 0.82, oy - rim_h * 0.62, ox + rim_w * 0.82, oy + rim_h * 0.62), fill=(47, 63, 58))
    mouth = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mouth).ellipse((ox - rim_w, oy - rim_h, ox + rim_w, oy + rim_h), fill=255)
    shape = Image.composite(Image.new("L", (w, h), 255), jar, mouth)

    # The shadow on the table, under the foot.
    shadow = Image.new("L", (w, h), 0)
    fy = oy + 1.0 * height * ss
    ImageDraw.Draw(shadow).ellipse((ox - 0.62 * width * ss, fy - 0.035 * height * ss, ox + 0.66 * width * ss,
                                    fy + 0.035 * height * ss), fill=110)
    shadow = shadow.filter(ImageFilter.GaussianBlur(10 * ss))

    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    layer.paste((90, 60, 40, 255), (0, 0), shadow)
    layer.paste(body, (0, 0), shape)
    layer = layer.resize((w // ss, h // ss), Image.LANCZOS)
    canvas.paste(layer, (cx - layer.width // 2, top - oy // ss), layer)


def text(d: ImageDraw.ImageDraw, xy: tuple[int, int], s: str, font, fill=INK, spacing: float = 0.0, anchor: str = "la") -> int:
    """Draws text (letter-spaced when asked); returns its width."""
    if not spacing:
        d.text(xy, s, font=font, fill=fill, anchor=anchor)
        return int(d.textlength(s, font=font))
    x, y = xy
    for ch in s:
        d.text((x, y), ch, font=font, fill=fill, anchor=anchor)
        x += d.textlength(ch, font=font) + spacing
    return int(x - xy[0])


def long_date(day: dt.date) -> str:
    return f"{day.strftime('%A')} {day.day} {day.strftime('%B')}"


def poster_screen(world: dict, day: dt.date) -> Image.Image:
    W, H = 2560, 1664
    img = paper((W, H))
    d = ImageDraw.Draw(img)
    d.ellipse((1460, 170, 2360, 1070), fill=PAPER_DEEP)
    draw_jar(img, 1905, 300, 1060, 610)
    x = 196
    text(d, (x, 236), world["studio"]["name"].upper(), inter(42, 650), CLAY, spacing=9)
    text(d, (x - 10, 300), "Open day", fraunces(318, 520))
    text(d, (x, 690), long_date(day), fraunces(112, 430))
    text(d, (x, 842), f"{world['open_day']['opens']} to {world['open_day']['closes']}", inter(84, 620))
    d.line((x, 1000, x + 960, 1000), fill=(217, 203, 184), width=4)
    rows = [("Wheel tasters", "10:30, 12:00, 13:30, 15:00 (sold out)"),
            ("Glazing demos", "11:15 and 14:15, no ticket needed"),
            ("Hand-building", "the table is open all day")]
    y = 1044
    for head, rest in rows:
        text(d, (x, y), head, inter(50, 640))
        text(d, (x + 380, y), rest, inter(50, 420), INK_SOFT)
        y += 84
    text(d, (x, 1440), world["studio"]["website"], inter(46, 520), CLAY)
    text(d, (x, 1510), "A sample poster for a demo: every name and date is fictional.", inter(30, 400), INK_SOFT)
    return img


def poster_a3(world: dict, day: dt.date) -> Image.Image:
    W, H = 2339, 3307  # A3 at 200 dpi
    img = paper((W, H), seed=11)
    d = ImageDraw.Draw(img)
    cx = W // 2
    text(d, (cx, 250), world["studio"]["name"].upper(), inter(56, 650), CLAY, anchor="ma")
    text(d, (cx, 330), "Open day", fraunces(360, 520), anchor="ma")
    text(d, (cx, 760), long_date(day), fraunces(120, 430), anchor="ma")
    text(d, (cx, 920), f"{world['open_day']['opens']} to {world['open_day']['closes']}", inter(90, 620), anchor="ma")
    d.ellipse((cx - 560, 1120, cx + 560, 2240), fill=PAPER_DEEP)
    draw_jar(img, cx, 1200, 1150, 660)
    y = 2560
    for line in ("Wheel tasters at 10:30, 12:00, 13:30 and 15:00 (sold out)",
                 "Glazing demos at 11:15 and 14:15, no ticket needed",
                 "The hand-building table, all day"):
        text(d, (cx, y), line, inter(58, 450), INK, anchor="ma")
        y += 92
    text(d, (cx, 2960), world["studio"]["website"], inter(62, 560), CLAY, anchor="ma")
    text(d, (cx, 3090), "A sample poster for a demo: every name and date is fictional.", inter(36, 400), INK_SOFT, anchor="ma")
    return img


def price_list(world: dict, day: dt.date) -> Image.Image:
    W, H = 1654, 2339  # A4 at 200 dpi
    img = Image.new("RGB", (W, H), (251, 248, 242))
    d = ImageDraw.Draw(img)
    x0, x1 = 170, W - 170
    text(d, (x0, 190), world["studio"]["name"].upper(), inter(40, 650), CLAY, spacing=7)
    text(d, (x0, 250), "Price list", fraunces(170, 500))
    text(d, (x0, 470), f"Open day, {long_date(day)}, {world['open_day']['opens']} to {world['open_day']['closes']}",
         inter(46, 450), INK_SOFT)
    y = 640
    body, num = inter(54, 450), inter(54, 600)
    for row in world["prices"]:
        price = "Free" if row["price"] == "0.00" else ("from " if row.get("from") else "") + f"£{row['price']}"
        d.line((x0, y + 84, x1, y + 84), fill=(222, 211, 195), width=3)
        text(d, (x0, y), row["item"], body)
        text(d, (x1, y), price, num, anchor="ra")
        y += 128
    text(d, (x0, y + 70), "Wheel tasters include the clay, an apron and one firing.", inter(42, 420), INK_SOFT)
    text(d, (x0, H - 240), world["studio"]["website"], inter(44, 560), CLAY)
    text(d, (x0, H - 170), "A sample price list for a demo: every name and price is fictional.", inter(32, 400), INK_SOFT)
    return img


def playlist_cover(world: dict) -> Image.Image:
    """The cover of the sample Music playlist: the jar on paper, with the playlist's name (self-made)."""
    W = H = 1200
    img = paper((W, H), seed=23)
    d = ImageDraw.Draw(img)
    d.ellipse((260, 170, 940, 850), fill=PAPER_DEEP)
    draw_jar(img, 600, 220, 700, 400)
    text(d, (600, 990), "Studio playlist", fraunces(96, 480), anchor="ma")
    text(d, (600, 1110), world["studio"]["name"].upper(), inter(34, 650), CLAY, anchor="ma")
    return img


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True, type=Path)
    ap.add_argument("--world", type=Path, default=HERE.parent / "world.json")
    ap.add_argument("--open-day", default=None, help="YYYY-MM-DD, a Saturday (default: world.json)")
    a = ap.parse_args()
    world = json.loads(a.world.read_text(encoding="utf-8"))
    day = dt.date.fromisoformat(a.open_day or world["open_day"]["date"])
    a.out.mkdir(parents=True, exist_ok=True)
    screen, a3, prices = poster_screen(world, day), poster_a3(world, day), price_list(world, day)
    screen.save(a.out / "poster-screen.png", optimize=True)
    a3.save(a.out / "poster.pdf", resolution=200.0)
    prices.save(a.out / "price-list.pdf", resolution=200.0)
    # Small previews to look at (contact sheet input); the PDFs above are the sample files.
    a3.resize((585, 827), Image.LANCZOS).save(a.out / "_preview-poster-a3.png")
    prices.resize((551, 780), Image.LANCZOS).save(a.out / "_preview-price-list.png")
    print("wrote", sorted(p.name for p in a.out.iterdir()))


if __name__ == "__main__":
    main()
