"""Draw contact sheets for the kit (so a reviewer can LOOK at the sound): the reel's waveform, momentary and
short-term loudness, spectrogram, events and classifier windows; and one row per kit take.

Needs Pillow (the repo's .work/qa-venv has it):
  scripts/heavy.sh sfx2-sheet /usr/sbin/taskpolicy -c utility .work/qa-venv/bin/python -I tools/audio/sfx2/sheet.py \
      --work .work/sfx2 --reel .work/sfx2/audition/reel
Writes <reel>.sheet.png and <work>/audition/kit.sheet.png.
"""
import argparse
import json
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFont

here = os.path.dirname(os.path.abspath(__file__))
repo = os.path.abspath(os.path.join(here, "..", "..", ".."))
FONT_PATHS = ["/System/Library/Fonts/SFNSMono.ttf", "/System/Library/Fonts/Menlo.ttc",
              "/System/Library/Fonts/Helvetica.ttc"]
ROLE_COL = {"ui_tap": (90, 160, 255), "ring_sweep": (80, 200, 140), "whoosh_slide": (120, 220, 200),
            "whoosh_pickup": (160, 230, 160), "whoosh_whip": (200, 240, 160), "drop_impact": (255, 120, 90),
            "sub_boom": (220, 80, 200), "reverse_swell": (255, 190, 80), "riser": (255, 220, 120),
            "glass_shimmer": (180, 170, 255), "room_tone": (150, 150, 150), "standin_plunk": (90, 210, 255),
            "standin_tap": (210, 170, 120), "stinger": (255, 255, 255)}
LEVEL_COL = {"ok": (60, 150, 90), "note": (110, 110, 160), "warn": (220, 160, 40), "fail": (220, 60, 60)}


def font(size):
    for p in FONT_PATHS:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except OSError:
                pass
    return ImageFont.load_default()


def cmap(v):
    """Map 0..1 to a dark-blue -> teal -> yellow ramp (perceptually ordered, readable on dark)."""
    stops = np.array([[8, 10, 30], [30, 60, 120], [20, 140, 140], [120, 200, 90], [250, 235, 120]], dtype=float)
    x = np.clip(v, 0, 1) * (len(stops) - 1)
    i = np.minimum(x.astype(int), len(stops) - 2)
    f = (x - i)[..., None]
    return (stops[i] * (1 - f) + stops[i + 1] * f).astype(np.uint8)


def spec_img(S, w, h, lo_db=None, hi_db=None):
    hi_db = float(np.percentile(S, 99.5)) if hi_db is None else hi_db
    lo_db = hi_db - 80 if lo_db is None else lo_db
    v = (S - lo_db) / (hi_db - lo_db)
    rgb = cmap(v[::-1])  # low frequencies at the bottom
    return Image.fromarray(rgb, "RGB").resize((w, h), Image.BILINEAR)


def reel_sheet(reel, out):
    d = np.load(reel + ".sheet.npz")
    an = json.load(open(reel + ".analysis.json"))
    cues = json.load(open(reel + ".cues.json"))
    W, X0, X1 = 1800, 90, 1780
    PW = X1 - X0
    dur = float(d["dur"])
    H = 1240
    im = Image.new("RGB", (W, H), (14, 16, 20))
    dr = ImageDraw.Draw(im)
    f14, f12, f18 = font(14), font(12), font(18)
    x_of = lambda t: X0 + int(PW * t / dur)  # noqa: E731
    L, A = an["loudness"], an["aac_192k"]
    dr.text((X0, 12), f"sfx2 audition reel  {dur:.1f} s   I {L['lufs_i']} LUFS  LRA {L['lra_lu']} LU  "
                      f"TP {L['true_peak_dbtp']} dBTP  M max {L['lufs_m_max']}   AAC 192k: I {A['lufs_i']} "
                      f"TP {A['true_peak_dbtp']}   mono loss {an['mono_fold_loss_db']} dB   classifier: "
                      f"{an['classifier']['verdict']}", fill=(230, 230, 230), font=f18)
    # sections
    secs = sorted(cues.get("sections", []), key=lambda s: s["t"])
    y_top, y_bot = 50, 1180
    for i, s in enumerate(secs):
        x = x_of(s["t"])
        dr.line([(x, y_top), (x, y_bot)], fill=(60, 64, 72))
        dr.text((x + 3, 44 + (i % 2) * 14), s["label"], fill=(200, 200, 210), font=f12)
    # waveform
    wy0, wh = 90, 150
    lo, hi = d["env_lo"], d["env_hi"]
    n = len(lo)
    for c in range(PW):
        k = int(c * n / PW)
        y1 = wy0 + wh // 2 - int(hi[k] * wh / 2)
        y2 = wy0 + wh // 2 - int(lo[k] * wh / 2)
        dr.line([(X0 + c, y1), (X0 + c, y2)], fill=(150, 190, 230))
    dr.text((8, wy0), "wave", fill=(160, 160, 160), font=f12)
    # loudness
    ly0, lh = 260, 230
    for lv in (0, -10, -20, -30, -40, -50, -60):
        yy = ly0 + int(-lv * lh / 60)
        dr.line([(X0, yy), (X1, yy)], fill=(40, 44, 52))
        dr.text((40, yy - 7), f"{lv}", fill=(140, 140, 140), font=f12)
    for key, col, w in (("st", (255, 190, 80), 2), ("mom", (110, 200, 255), 1)):
        tt, vv = d[key + "_t"] if key == "st" else d["mom_t"], d[key]
        pts = [(x_of(float(t) - (3.0 if key == "st" else 0.4) / 2), ly0 + int(min(60, max(0, -float(v))) * lh / 60))
               for t, v in zip(tt, vv)]
        dr.line(pts, fill=col, width=w)
    dr.text((8, ly0 + 2), "LUFS", fill=(160, 160, 160), font=f12)
    dr.text((X1 - 330, ly0 + 4), "blue: momentary 400 ms   amber: short-term 3 s", fill=(170, 170, 170), font=f12)
    # spectrogram
    sy0, sh = 510, 420
    im.paste(spec_img(d["spec"], PW, sh), (X0, sy0))
    edges = d["edges"]
    for fq in (50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000):
        r = np.searchsorted(edges, fq) / (len(edges) - 1)
        yy = sy0 + sh - int(r * sh)
        dr.line([(X0 - 6, yy), (X0, yy)], fill=(200, 200, 200))
        dr.text((22, yy - 7), f"{fq if fq < 1000 else str(fq // 1000) + 'k'}", fill=(170, 170, 170), font=f12)
    # events
    ey0 = 945
    evs = [c for c in cues["cues"] if c["role"] != "room_tone"]
    for j, c in enumerate(sorted(evs, key=lambda c: c["t"])):
        col = ROLE_COL.get(c["role"], (220, 220, 220))
        xs, xe, xt = x_of(c["span_s"][0]), x_of(c["span_s"][1]), x_of(float(c["t"]))
        row = j % 5
        yy = ey0 + row * 30
        dr.rectangle([xs, yy + 16, max(xs + 2, xe), yy + 22], fill=col)
        dr.line([(xt, yy + 12), (xt, yy + 26)], fill=(255, 255, 255), width=2)
        dr.text((xs, yy), c["id"], fill=col, font=f12)
    # classifier windows
    cy0 = 1105
    for pi, (name, p) in enumerate((("0", an["classifier"]["pass_0"]), ("1.5", an["classifier"]["pass_shift_1.5s"]))):
        for w in p["windows"]:
            xs, xe = x_of(max(0.0, w["start_s"])), x_of(min(dur, w["start_s"] + 3.0))
            yy = cy0 + pi * 34
            dr.rectangle([xs + 1, yy, xe - 1, yy + 28], fill=LEVEL_COL[w["level"]])
            top = w["top"][0][0] if w["top"] else ""
            dr.text((xs + 4, yy + 2), top[:22], fill=(10, 10, 10), font=f12)
            fl = ",".join(f"{f['label']} {f['conf']}" for f in w["flags"])
            dr.text((xs + 4, yy + 15), fl[:26], fill=(10, 10, 10), font=f12)
        dr.text((8, cy0 + pi * 34 + 6), f"tags +{name}s", fill=(160, 160, 160), font=f12)
    for t in range(0, int(dur) + 1, 2):
        dr.text((x_of(t) - 6, 1188), f"{t}", fill=(150, 150, 150), font=f12)
    dr.text((X0, 1210), "colours: green ok, blue note (bell/horn-like >= 0.30), amber warn (phone/foghorn >= 0.25), "
                        "red fail (voice/alarm >= 0.30 or top 3; phone/foghorn >= 0.30)", fill=(150, 150, 150),
            font=f12)
    im.save(out)


def kit_sheet(work, out):
    d = np.load(os.path.join(work, "audition", "kit.sheet.npz"))
    meta = json.load(open(os.path.join(work, "audition", "kit.sheet.json")))
    RH, W = 64, 1700
    H = 40 + RH * len(meta)
    im = Image.new("RGB", (W, H), (14, 16, 20))
    dr = ImageDraw.Draw(im)
    f12, f14 = font(12), font(14)
    dr.text((10, 10), "sfx2 kit: one row per take (waveform | spectrogram 30 Hz-20 kHz, log; each row on its own "
                      "time scale)", fill=(230, 230, 230), font=f14)
    for r, m in enumerate(meta):
        y0 = 40 + r * RH
        col = ROLE_COL.get(m["role"], (220, 220, 220))
        dr.text((10, y0 + 4), m["id"], fill=col, font=f14)
        dr.text((10, y0 + 24), f"{m['role']}  {m['status'] or ''}", fill=(170, 170, 170), font=f12)
        dr.text((10, y0 + 40), f"{m['dur']:.2f} s  TP {m['tp']}  M {m['m']}  I {m['i_lufs']}", fill=(170, 170, 170),
                font=f12)
        vcol = LEVEL_COL.get(m["verdict"] or "ok", (120, 120, 120))
        dr.rectangle([360, y0 + 6, 372, y0 + 18], fill=vcol)
        lo, hi = d[f"lo_{m['i']}"], d[f"hi_{m['i']}"]
        x0, w, h = 390, 560, RH - 8
        for c in range(w):
            k = int(c * len(lo) / w)
            dr.line([(x0 + c, y0 + 4 + h // 2 - int(hi[k] * h / 2)), (x0 + c, y0 + 4 + h // 2 - int(lo[k] * h / 2))],
                    fill=col)
        im.paste(spec_img(d[f"spec_{m['i']}"], 720, h), (970, y0 + 4))
        dr.line([(0, y0 + RH - 1), (W, y0 + RH - 1)], fill=(40, 44, 52))
    im.save(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--work", default=os.path.join(repo, ".work", "sfx2"))
    ap.add_argument("--reel", required=True)
    a = ap.parse_args()
    reel_sheet(a.reel, a.reel + ".sheet.png")
    if os.path.exists(os.path.join(a.work, "audition", "kit.sheet.npz")):
        kit_sheet(a.work, os.path.join(a.work, "audition", "kit.sheet.png"))
    print("sheets written")


if __name__ == "__main__":
    main()
