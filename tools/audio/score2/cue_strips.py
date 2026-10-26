"""score2 lane: draw a cue plan's measured bed and its seams (pictures only; no audio is read or written).

Reads PLAN.json and OUT_PREFIX.npz / OUT_PREFIX.metrics.json from cue_plan.py. Runs in the qa venv (Pillow):

  python -I tools/audio/score2/cue_strips.py PLAN.json OUT_PREFIX
  -> OUT_PREFIX-overview.png (the whole film: spectrogram, loudness, cues, blocks, seams)
     OUT_PREFIX-seams.png    (each seam: the film around it, then the outgoing source at its out-point, then the
                              incoming source at its in-point, each with the cue's gain applied)
"""
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from strips import FONT, FONT_B, LM, LUT, W, fmt_t  # noqa: E402

COLS = {"BornOfTheSky": (120, 170, 255), "YourBreath": (255, 150, 60), "TechnoFestVibes": (255, 80, 160),
        "Starfire": (130, 220, 160), "Aphelion": (190, 160, 255), "Convergence": (90, 210, 230),
        "Wildflowers": (240, 230, 120), "MaskingTheMasters": (200, 200, 200), "AtomsInPeace": (160, 120, 90)}


def tx(t, t0, t1):
    return LM + (t - t0) / (t1 - t0) * (W - LM - 8)


def spec_panel(mel, mt, t0, t1, h, vmax, rng=80.0):
    m = (mt >= t0) & (mt <= t1)
    out = Image.new("RGB", (W, h), (0, 0, 0))
    if not m.any():
        return out
    sub = mel[:, m][::-1]
    cols = W - LM - 8
    if sub.shape[1] > cols:
        e = np.linspace(0, sub.shape[1], cols + 1).astype(int)
        img = np.stack([sub[:, e[i]:max(e[i] + 1, e[i + 1])].max(1) for i in range(cols)], 1)
    else:
        img = sub[:, np.clip(np.round(np.linspace(0, sub.shape[1] - 1, cols)).astype(int), 0, sub.shape[1] - 1)]
    # place the visible span correctly when the data does not cover the whole window
    xa = int(round(tx(max(t0, float(mt[m][0])), t0, t1))); xb = int(round(tx(min(t1, float(mt[m][-1])), t0, t1)))
    v = np.clip((img - (vmax - rng)) / rng, 0, 1)
    yi = np.clip(np.round(np.linspace(0, v.shape[0] - 1, h)).astype(int), 0, v.shape[0] - 1)
    rgb = LUT[(v[yi] * 255).astype(np.uint8)]
    im = Image.fromarray(rgb).resize((max(1, xb - xa), h))
    out.paste(im, (xa, 0))
    d = ImageDraw.Draw(out)
    for f_, lab in ((100, "100"), (1000, "1k"), (5000, "5k")):
        def hz2mel(f):
            return f / (200 / 3) if f < 1000 else 15 + np.log(f / 1000) / (np.log(6.4) / 27)
        yy = h - hz2mel(f_) / hz2mel(11025) * h
        d.text((4, yy - 7), lab, font=FONT, fill=(200, 200, 200))
    return out


def loud_panel(lt, mom, st, t0, t1, h, lo=-45.0, hi=-5.0, label="LUFS (music bed, before the master): momentary blue, short-term 3 s white"):
    out = Image.new("RGB", (W, h), (16, 18, 22)); d = ImageDraw.Draw(out)
    yv = lambda v: h - 4 - (np.clip(v, lo, hi) - lo) / (hi - lo) * (h - 8)  # noqa: E731
    for g in np.arange(lo, hi + 0.1, 5):
        d.line([(LM, yv(g)), (W - 8, yv(g))], fill=(50, 54, 60))
        d.text((4, yv(g) - 7), f"{g:.0f}", font=FONT, fill=(150, 150, 150))
    m = (lt >= t0) & (lt <= t1)
    if m.any():
        xs = tx(lt[m], t0, t1)
        d.line(list(zip(xs, yv(mom[m]))), fill=(110, 150, 200), width=1)
        d.line(list(zip(xs, yv(st[m]))), fill=(255, 255, 255), width=3)
    d.text((LM + 4, 2), label, font=FONT, fill=(180, 180, 180))
    return out


def axis(img, y, t0, t1, d):
    span = t1 - t0
    step = next(s_ for s_ in (0.5, 1, 2, 5, 10, 15, 30, 60) if span / s_ <= 18)
    for t in np.arange(np.ceil(t0 / step) * step, t1 + 1e-6, step):
        x = tx(t, t0, t1)
        d.line([(x, y), (x, y + 5)], fill=(200, 200, 200))
        d.text((x - 18, y + 6), fmt_t(t), font=FONT, fill=(200, 200, 200))


def overview(plan, Z, M):
    t0, t1 = 0.0, plan["end_film_s"]
    vmax = float(np.percentile(Z["mel"], 99.9))
    hs, hl, hc = 170, 150, 70
    img = Image.new("RGB", (W, 26 + hs + hl + hc + 24), (0, 0, 0)); d = ImageDraw.Draw(img)
    b = M["bed"]
    d.text((6, 4), f"{plan['title']}  |  bed {b['integrated_lufs']} LUFS integrated, LRA {b['lra_lu']} LU, "
                   f"short-term max {b['st_max']}, sample peak {b['sample_peak_dbfs']} dBFS (music only, unmastered)",
           font=FONT_B, fill=(255, 255, 255))
    y = 26
    img.paste(spec_panel(Z["mel"], Z["mel_t"], t0, t1, hs, vmax), (0, y)); y += hs
    img.paste(loud_panel(Z["lt"], Z["mom"], Z["st"], t0, t1, hl), (0, y)); y += hl
    d = ImageDraw.Draw(img)
    # cues as spans, blocks as labels
    for k, c in enumerate(plan["cues"]):
        f0, f1, fout = M["cue_extents_film_s"][c["id"]]
        col = COLS.get(c["track"], (200, 200, 200))
        yy = y + 6 + (k % 2) * 14
        d.rectangle([tx(f0, t0, t1), yy, tx(f1, t0, t1), yy + 9], fill=col)
        d.text((tx(f0, t0, t1) + 3, yy - 2), f"{c['id']} {c['track']}", font=FONT, fill=(0, 0, 0))
    for a, bb, lab in plan["blocks"]:
        d.line([(tx(a, t0, t1), y + 36), (tx(a, t0, t1), y + 50)], fill=(250, 220, 40), width=2)
        d.text((tx(a, t0, t1) + 3, y + 38), lab, font=FONT, fill=(250, 220, 40))
    for s in plan["seams"]:
        x = tx(s["t"], t0, t1)
        d.line([(x, 26), (x, y)], fill=(255, 60, 255), width=2)
        d.text((x + 3, 28), s["id"], font=FONT_B, fill=(255, 120, 255))
    for e in plan.get("events", []):
        x = tx(e["t"], t0, t1)
        for yy in range(26, y, 8):
            d.line([(x, yy), (x, yy + 4)], fill=(250, 220, 40), width=1)
        d.text((x + 3, 26 + hs - 16), e["label"], font=FONT, fill=(250, 220, 40))
    axis(img, y + hc, t0, t1, d)
    return img


def seam_sheet(plan, Z, M, s, half=5.0):
    sm = next(x for x in M["seams"] if x["id"] == s["id"])
    vmax = float(np.percentile(Z["mel"], 99.9))
    rows = []
    hs, hl = 120, 100
    # 1: the film around the seam
    ts, tin = s["t"], s.get("in_film", s["t"])
    t0, t1 = ts - half, max(ts, tin) + half
    im = Image.new("RGB", (W, 22 + hs + hl + 22), (0, 0, 0)); d = ImageDraw.Draw(im)
    d.text((6, 3), f"{s['id']} FILM {fmt_t(ts)}: {s['label']}", font=FONT_B, fill=(255, 255, 255))
    im.paste(spec_panel(Z["mel"], Z["mel_t"], t0, t1, hs, vmax), (0, 22))
    im.paste(loud_panel(Z["lt"], Z["mom"], Z["st"], t0, t1, hl), (0, 22 + hs))
    d = ImageDraw.Draw(im)
    for t, lab in ((ts, "seam"), (tin, "in") if tin != ts else (None, None)):
        if t is None:
            continue
        x = tx(t, t0, t1); d.line([(x, 22), (x, 22 + hs + hl)], fill=(255, 60, 255), width=2)
        d.text((x + 3, 24), lab, font=FONT, fill=(255, 120, 255))
    axis(im, 22 + hs + hl, t0, t1, d)
    rows.append(im)
    # 2 and 3: the two sources around their cut points (gain applied)
    for side, title in (("out", "outgoing source at its out-point"), ("in", "incoming source at its in-point")):
        c = next(cc for cc in plan["cues"] if cc["id"] == (s["from"] if side == "out" else s["to"]))
        p = c["src_out"] if side == "out" else c["src_in"]
        a0, a1 = p - half, p + half
        im = Image.new("RGB", (W, 22 + hs + hl + 22), (0, 0, 0)); d = ImageDraw.Draw(im)
        d.text((6, 3), f"    {title}: {c['id']} {c['track']} {fmt_t(p)} (gain {sm['gain_db_' + side]} dB)", font=FONT_B,
               fill=COLS.get(c["track"], (255, 255, 255)))
        k = f"{s['id']}_{side}"
        im.paste(spec_panel(Z[k + "_mel"], Z[k + "_mel_t"], a0, a1, hs, vmax), (0, 22))
        im.paste(loud_panel(Z[k + "_lt"], Z[k + "_mom"], Z[k + "_st"], a0, a1, hl, label="LUFS of the source with the cue's gain"), (0, 22 + hs))
        d = ImageDraw.Draw(im)
        x = tx(p, a0, a1); d.line([(x, 22), (x, 22 + hs + hl)], fill=(255, 60, 255), width=2)
        axis(im, 22 + hs + hl, a0, a1, d)
        rows.append(im)
    txt = (f"    step 3 s {sm['film_step_3s_lu']} LU (incoming source's own {sm['incoming_source_own_step_3s_lu']}); "
           f"400 ms {sm['film_step_400ms_lu']} LU; LSD {sm['lsd_film_db']} dB vs source {sm['lsd_incoming_source_db']} "
           f"(extra {sm['extra_lsd_db']}); HF click {sm['hf_click_film_db']} dB (extra {sm['extra_hf_db']}); attack {sm['attack_film_vs_source_db']} dB")
    cap = Image.new("RGB", (W, 22), (30, 30, 30)); ImageDraw.Draw(cap).text((6, 3), txt, font=FONT, fill=(255, 255, 160))
    rows.append(cap)
    hgt = sum(r_.size[1] for r_ in rows)
    out = Image.new("RGB", (W, hgt), (0, 0, 0)); y = 0
    for r_ in rows:
        out.paste(r_, (0, y)); y += r_.size[1]
    return out


def main():
    plan = json.load(open(sys.argv[1])); pre = sys.argv[2]
    Z = dict(np.load(pre + ".npz")); M = json.load(open(pre + ".metrics.json"))
    overview(plan, Z, M).save(pre + "-overview.png")
    sheets = [seam_sheet(plan, Z, M, s) for s in plan["seams"]]
    h = sum(s_.size[1] for s_ in sheets) + 8 * (len(sheets) - 1)
    out = Image.new("RGB", (W, h), (60, 60, 60)); y = 0
    for s_ in sheets:
        out.paste(s_, (0, y)); y += s_.size[1] + 8
    out.save(pre + "-seams.png")
    print("ok", pre)


if __name__ == "__main__":
    main()
