"""score2 lane: draw the built score's master and every cue change (pictures only; no audio is read or written).

Reads PLAN.json, LAYERS.json and OUT_DIR/NAME.npz + NAME.build.json from score_build.py. Runs in the qa venv (Pillow):

  .work/qa-venv/bin/python -I tools/audio/score2/score_strips.py PLAN.json LAYERS.json OUT_DIR NAME
  -> OUT_DIR/NAME-overview.png  the whole film: the web master's spectrogram; loudness (master short-term white,
                                momentary blue; the music bed short-term grey; the sound-design layers momentary
                                orange); the limiter's gain reduction (web red, social pink); cues, blocks, seams,
                                layers
     OUT_DIR/NAME-seams.png     each cue change: the film around it with both cues' mapped beats (downbeats red) and
                                the layers; the outgoing source at its out-point and the incoming source at its
                                in-point (cue gain applied); a 50 ms waveform at the seam and at the in-point
"""
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cue_strips import COLS, axis, spec_panel, tx  # noqa: E402
from score_common import apply_corrections  # noqa: E402
from strips import FONT, FONT_B, LM, W, fmt_t  # noqa: E402

SFX_COL = (255, 170, 60)


def loud(Z, t0, t1, h, series, lo=-50.0, hi=-4.0, label=""):
    out = Image.new("RGB", (W, h), (16, 18, 22))
    d = ImageDraw.Draw(out)
    yv = lambda v: h - 4 - (np.clip(v, lo, hi) - lo) / (hi - lo) * (h - 8)  # noqa: E731
    for g in np.arange(lo, hi + 0.1, 5):
        d.line([(LM, yv(g)), (W - 8, yv(g))], fill=(46, 50, 56))
        d.text((4, yv(g) - 7), f"{g:.0f}", font=FONT, fill=(150, 150, 150))
    lt = Z["lt"]
    m = (lt >= t0) & (lt <= t1)
    if m.any():
        xs = tx(lt[m], t0, t1)
        for key, col, wdt in series:
            d.line(list(zip(xs, yv(Z[key][m]))), fill=col, width=wdt)
    d.text((LM + 4, 2), label, font=FONT, fill=(190, 190, 190))
    return out


def gr_panel(Z, t0, t1, h):
    out = Image.new("RGB", (W, h), (16, 18, 22))
    d = ImageDraw.Draw(out)
    lo = -6.0
    yv = lambda v: 4 + (np.clip(-v, 0, -lo)) / (-lo) * (h - 8)  # noqa: E731
    for g in (0, -1, -2, -3, -6):
        d.line([(LM, yv(g)), (W - 8, yv(g))], fill=(46, 50, 56))
        d.text((4, yv(g) - 7), f"{g:.0f}", font=FONT, fill=(150, 150, 150))
    for key, col in (("gr_social_music", (120, 120, 120)), ("gr_social", (255, 150, 190)), ("gr_web", (255, 70, 70))):
        if key not in Z:
            continue
        g = Z[key]
        t = np.arange(len(g)) * 0.01 + 0.005
        m = (t >= t0) & (t <= t1)
        if m.any():
            d.line(list(zip(tx(t[m], t0, t1), yv(g[m]))), fill=col, width=1)
    d.text((LM + 4, 2), "limiter gain reduction, dB (web red, social pink; the music alone at the social gain grey)",
           font=FONT, fill=(190, 190, 190))
    return out


def marks(d, t0, t1, y0, y1, plan, sheet, M, cues_shown=None):
    for L in M["layers"]:
        a, b = L["film_s"]
        if b < t0 or a > t1:
            continue
        x = tx(L["t"], t0, t1)
        for yy in range(int(y0), int(y1), 6):
            d.line([(x, yy), (x, yy + 2)], fill=SFX_COL, width=1)
        d.text((x + 3, y1 - 30), L["id"], font=FONT, fill=SFX_COL)
    for s in plan["seams"]:
        for t, lab in ((s["t"], s["id"]), (s.get("in_film"), s["id"] + " in")):
            if t is None or not (t0 <= t <= t1) or (lab.endswith(" in") and t == s["t"]):
                continue
            x = tx(t, t0, t1)
            d.line([(x, y0), (x, y1)], fill=(255, 60, 255), width=2)
            d.text((x + 3, y0 + 2), lab, font=FONT_B, fill=(255, 120, 255))


def beat_row(Z, plan, t0, t1, h, only=None):
    out = Image.new("RGB", (W, h), (8, 8, 10))
    d = ImageDraw.Draw(out)
    for k, c in enumerate(plan["cues"]):
        if only and c["id"] not in only:
            continue
        col = COLS.get(c["track"], (200, 200, 200))
        b = Z.get(f"{c['id']}_beats_s")
        db = Z.get(f"{c['id']}_downbeats_s")
        if b is None:
            continue
        lo, hi = (only or {}).get(c["id"], (-1e9, 1e9))
        for t in b:
            if t0 <= t <= t1 and lo <= t <= hi:
                x = tx(t, t0, t1)
                d.line([(x, h * 0.45), (x, h - 2)], fill=col, width=1)
        for t in db:
            if t0 <= t <= t1 and lo <= t <= hi:
                x = tx(t, t0, t1)
                d.line([(x, 2), (x, h - 2)], fill=(255, 50, 50), width=2)
    d.text((4, 2), "beats", font=FONT, fill=(170, 170, 170))
    return out


def wave(z, t0z, tmark, h, title, zb=None):
    out = Image.new("RGB", (W, h), (12, 12, 14))
    d = ImageDraw.Draw(out)
    n = len(z)
    t = t0z + np.arange(n) / 48000.0
    a, b = t[0], t[-1]
    mx = max(float(np.abs(z).max()), 1e-4)
    if zb is not None:  # the music alone (the bed), in grey, on the master's scale
        ys = h / 2 - zb.mean(1) / mx * (h / 2 - 12)
        d.line(list(zip(tx(t, a, b), ys)), fill=(110, 110, 110), width=1)
    for ch, col in ((0, (120, 200, 255)), (1, (255, 200, 120))):
        ys = h / 2 - z[:, ch] / mx * (h / 2 - 12)
        d.line(list(zip(tx(t, a, b), ys)), fill=col, width=1)
    for tm in tmark:
        x = tx(tm, a, b)
        d.line([(x, 0), (x, h)], fill=(255, 60, 255), width=1)
    d.line([(LM, h / 2), (W - 8, h / 2)], fill=(60, 60, 60))
    d.text((LM + 4, 2), f"{title}: 50 ms of the web master, L blue, R amber (the music alone grey), scaled to the "
                         f"master's peak ({20 * np.log10(mx):.1f} dBFS); magenta = the seam", font=FONT, fill=(190, 190, 190))
    for k in (0, 10, 20, 25, 30, 40, 50):
        x = tx(a + k / 1000, a, b)
        d.text((x - 10, h - 15), f"{k - 25:+d}", font=FONT, fill=(150, 150, 150))
    return out


def overview(plan, sheet, Z, M):
    t0, t1 = 0.0, plan["end_film_s"]
    vmax = float(np.percentile(Z["mel"], 99.9))
    hs, hl, hg, hc = 180, 170, 90, 76
    img = Image.new("RGB", (W, 26 + hs + hl + hg + hc + 24), (0, 0, 0))
    d = ImageDraw.Draw(img)
    w, s = M["masters"]["web"], M["masters"]["social"]
    wa, sa = w["aac"]["apple_audiotoolbox_cbr"], s["aac"]["apple_audiotoolbox_cbr"]
    d.text((6, 4), f"{plan['title']} | web {w['integrated_lufs']} LUFS, TP {w['true_peak_dbtp']} dBTP, LRA {w['lra_lu']} LU "
                   f"(AAC {wa['integrated_lufs']} / {wa['true_peak_dbtp']}) | social {s['integrated_lufs']} LUFS, "
                   f"TP {s['true_peak_dbtp']} (AAC {sa['integrated_lufs']} / {sa['true_peak_dbtp']}); AAC = Apple's encoder",
           font=FONT_B, fill=(255, 255, 255))
    y = 26
    img.paste(spec_panel(Z["mel"], Z["mel_t"], t0, t1, hs, vmax), (0, y))
    y += hs
    img.paste(loud(Z, t0, t1, hl, [("st_bed", (120, 120, 120), 2), ("mom_sfx", SFX_COL, 1), ("mom", (110, 150, 200), 1),
                                   ("st", (255, 255, 255), 2)],
                   label="LUFS: web master short-term white, momentary blue; music bed short-term grey; layers momentary orange"),
              (0, y))
    y += hl
    img.paste(gr_panel(Z, t0, t1, hg), (0, y))
    y += hg
    d = ImageDraw.Draw(img)
    for k, c in enumerate(plan["cues"]):
        f0, f1 = M["cues"][c["id"]]["film_s"]
        col = COLS.get(c["track"], (200, 200, 200))
        yy = y + 6 + (k % 2) * 14
        d.rectangle([tx(f0, t0, t1), yy, tx(f1, t0, t1), yy + 9], fill=col)
        d.text((tx(f0, t0, t1) + 3, yy - 2), f"{c['id']} {c['track']}", font=FONT, fill=(0, 0, 0))
    for a, b, lab in plan["blocks"]:
        d.line([(tx(a, t0, t1), y + 36), (tx(a, t0, t1), y + 50)], fill=(250, 220, 40), width=2)
        d.text((tx(a, t0, t1) + 3, y + 38), lab, font=FONT, fill=(250, 220, 40))
    marks(d, t0, t1, 26, y, plan, sheet, M)
    axis(img, y + hc - 18, t0, t1, d)
    return img


def seam_sheet(plan, sheet, Z, M, s, half=5.0):
    sm = next(x for x in M["seams"] if x["id"] == s["id"])
    vmax = float(np.percentile(Z["mel"], 99.9))
    ts, tin = s["t"], s.get("in_film", s["t"])
    t0, t1 = ts - half, max(ts, tin) + half
    rows = []
    hs, hl, hb, hg = 130, 120, 26, 60
    im = Image.new("RGB", (W, 22 + hs + hl + hg + hb + 24), (0, 0, 0))
    d = ImageDraw.Draw(im)
    d.text((6, 3), f"{s['id']} FILM {fmt_t(ts)} (frame {sm['frame_60fps']} at 60 fps): {s['label']}", font=FONT_B,
           fill=(255, 255, 255))
    im.paste(spec_panel(Z["mel"], Z["mel_t"], t0, t1, hs, vmax), (0, 22))
    im.paste(loud(Z, t0, t1, hl, [("st_bed", (120, 120, 120), 2), ("mom_sfx", SFX_COL, 1), ("mom", (110, 150, 200), 1),
                                  ("st", (255, 255, 255), 2)], label="web master ST white / M blue; bed ST grey; layers M orange"),
             (0, 22 + hs))
    cin, cout = s["to"], s["from"]
    fo = next(c for c in plan["cues"] if c["id"] == cout)
    fi = next(c for c in plan["cues"] if c["id"] == cin)
    only = {cout: (-1e9, ts), cin: (tin - fi["head"].get("len", 0) if fi["head"]["mode"] == "preroll" else tin, 1e9)}
    im.paste(gr_panel(Z, t0, t1, hg), (0, 22 + hs + hl))
    im.paste(beat_row(Z, plan, t0, t1, hb, only=only), (0, 22 + hs + hl + hg))
    d = ImageDraw.Draw(im)
    marks(d, t0, t1, 22, 22 + hs + hl + hg + hb, plan, sheet, M)
    axis(im, 22 + hs + hl + hg + hb, t0, t1, d)
    rows.append(im)
    for side, title in (("out", "outgoing source at its out-point"), ("in", "incoming source at its in-point")):
        c = fo if side == "out" else fi
        p = c["src_out"] if side == "out" else c["src_in"]
        a0, a1 = p - half, p + half
        im = Image.new("RGB", (W, 22 + 100 + 80 + 22), (0, 0, 0))
        d = ImageDraw.Draw(im)
        d.text((6, 3), f"    {title}: {c['id']} {c['track']} {fmt_t(p)} (gain {sm['gain_db_' + side]} dB)", font=FONT_B,
               fill=COLS.get(c["track"], (255, 255, 255)))
        k = f"{s['id']}_{side}"
        im.paste(spec_panel(Z[k + "_mel"], Z[k + "_mel_t"], a0, a1, 100, vmax), (0, 22))
        Zs = {"lt": Z[k + "_lt"], "m": Z[k + "_mom"], "s": Z[k + "_st"]}
        im.paste(loud(Zs, a0, a1, 80, [("m", (110, 150, 200), 1), ("s", (255, 255, 255), 2)],
                      label="LUFS of the source with the cue's gain"), (0, 122))
        d = ImageDraw.Draw(im)
        x = tx(p, a0, a1)
        d.line([(x, 22), (x, 202)], fill=(255, 60, 255), width=2)
        axis(im, 202, a0, a1, d)
        rows.append(im)
    rows.append(wave(Z[f"z_{s['id']}_seam"], float(Z[f"z_{s['id']}_seam_t0"][0]), [ts, ts - sm["xfade_s"]], 110,
                     f"{s['id']} at the seam {fmt_t(ts)} (lines: the downbeat and the crossfade's start)",
                     Z.get(f"z_{s['id']}_seam_bed")))
    if tin != ts:
        rows.append(wave(Z[f"z_{s['id']}_in"], float(Z[f"z_{s['id']}_in_t0"][0]), [tin], 110,
                         f"{s['id']} where the incoming cue starts, {fmt_t(tin)}", Z.get(f"z_{s['id']}_in_bed")))
    st = sm["master_web"]
    g = sm["grid"]
    c = sm["click"]
    bx = sm.get("beats_across", {})
    an = sm.get("attack_near_seam", {})
    txt = (f"    master step 3 s {st['step_3s_lu']} LU, 400 ms {st['step_400ms_lu']} LU (bed {sm['bed']['step_3s_lu']}; incoming "
           f"source's own {sm['incoming_source_own_step_3s_lu']}) | bed LSD {sm['bed']['lsd_db']} dB vs source "
           f"{sm['lsd_incoming_source_db']} (extra {sm['extra_lsd_db']}) | lags: bed/in {g['lag_bed_vs_incoming_source_samples']}, "
           f"bed/out {g['lag_bed_vs_outgoing_source_samples']}, master/bed {g['lag_master_vs_bed_samples']} | beats across "
           f"{bx.get('interval_ms')} ms | strongest attack {an.get('vs_seam_ms')} ms from the seam | HF extra {c['extra_hf_db']} dB, "
           f"d2 bed {c['d2_ratio_bed_at_seam']} (source {c['d2_ratio_source_at_its_in_point']})")
    bands = "    six bands, the change across the seam minus the incoming source's own change at its in-point (dB): bed " + ", ".join(
        f"{k} {v['extra']:+.1f}" for k, v in sm["bands_db"]["bed"].items() if v["extra"] is not None) + " | master " + ", ".join(
        f"{k} {v['extra']:+.1f}" for k, v in sm["bands_db"]["master_web"].items() if v["extra"] is not None)
    cap = Image.new("RGB", (W, 40), (30, 30, 30))
    dc = ImageDraw.Draw(cap)
    dc.text((6, 3), txt, font=FONT, fill=(255, 255, 160))
    dc.text((6, 21), bands, font=FONT, fill=(255, 255, 160))
    rows.append(cap)
    out = Image.new("RGB", (W, sum(r_.size[1] for r_ in rows)), (0, 0, 0))
    y = 0
    for r_ in rows:
        out.paste(r_, (0, y))
        y += r_.size[1]
    return out


def hits_sheet(plan, sheet, Z, M, half=3.0):
    """Each composite hit (the ducks): the film around it, its loudness and the limiter's gain reduction."""
    vmax = float(np.percentile(Z["mel"], 99.9))
    rows = []
    for d0 in sheet.get("ducks", []):
        t = d0["t"]
        t0, t1 = t - half, t + half
        comp = next((c for c in M.get("composites", []) if c["duck"] == d0["id"]), {})
        hs, hl, hg = 130, 120, 80
        im = Image.new("RGB", (W, 22 + hs + hl + hg + 24), (0, 0, 0))
        d = ImageDraw.Draw(im)
        d.text((6, 3), f"the {d0['id']} hit at {fmt_t(t)}: composite {comp.get('composite_over_bed_db')} dB over the music "
                       f"alone in the 400 ms from the hit (music ducked {d0['db']} dB, held {d0['hold_s']} s)",
               font=FONT_B, fill=(255, 255, 255))
        im.paste(spec_panel(Z["mel"], Z["mel_t"], t0, t1, hs, vmax), (0, 22))
        im.paste(loud(Z, t0, t1, hl, [("st_bed", (120, 120, 120), 2), ("mom_sfx", SFX_COL, 1), ("mom", (110, 150, 200), 1),
                                      ("st", (255, 255, 255), 2)], label="web master ST white / M blue; bed ST grey; layers M orange"),
                 (0, 22 + hs))
        im.paste(gr_panel(Z, t0, t1, hg), (0, 22 + hs + hl))
        d = ImageDraw.Draw(im)
        marks(d, t0, t1, 22, 22 + hs + hl + hg, plan, sheet, M)
        axis(im, 22 + hs + hl + hg, t0, t1, d)
        rows.append(im)
    out = Image.new("RGB", (W, sum(r_.size[1] for r_ in rows) + 8 * len(rows)), (70, 70, 70))
    y = 0
    for r_ in rows:
        out.paste(r_, (0, y))
        y += r_.size[1] + 8
    return out


def main():
    sheet = json.load(open(sys.argv[2]))
    plan = apply_corrections(json.load(open(sys.argv[1])), sheet)
    out_dir, name = sys.argv[3], sys.argv[4]
    Z = dict(np.load(os.path.join(out_dir, name + ".npz")))
    M = json.load(open(os.path.join(out_dir, name + ".build.json")))
    overview(plan, sheet, Z, M).save(os.path.join(out_dir, name + "-overview.png"))
    hits_sheet(plan, sheet, Z, M).save(os.path.join(out_dir, name + "-hits.png"))
    sheets = [seam_sheet(plan, sheet, Z, M, s) for s in plan["seams"]]
    h = sum(s_.size[1] for s_ in sheets) + 10 * (len(sheets) - 1)
    out = Image.new("RGB", (W, h), (70, 70, 70))
    y = 0
    for s_ in sheets:
        out.paste(s_, (0, y))
        y += s_.size[1] + 10
    out.save(os.path.join(out_dir, name + "-seams.png"))
    for s_, s in zip(sheets, plan["seams"]):
        s_.save(os.path.join(out_dir, f"{name}-seam-{s['id']}.png"))
    print("ok", name)


if __name__ == "__main__":
    main()
