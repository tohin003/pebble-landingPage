"""score2 lane: pictures for the Return revision (no audio is read or written). Pillow, in the qa venv:

  python -I tools/audio/score2/revise_strips.py probe PROBE_PREFIX OUT.png
      every candidate splice (M2, M3) and J2 out-point: the edit's spectrogram and loudness around the seam, captioned
  python -I tools/audio/score2/revise_strips.py ab PREFIX_A PLAN_A PREFIX_B PLAN_B OUT.png
      G1's music A/B: the Return from the kept card to the end card's first page, side A above side B, with the
      R-frames, the bar lines and each bar's density
  python -I tools/audio/score2/revise_strips.py title TITLE.json OUT.png [TITLE_B.json]
      the classifier's foghorn reading for every 3 s window around the swell and the title, one line per variant
  python -I tools/audio/score2/revise_strips.py x40mask PREFIX OUT.png
      XJ2 in the 40-s cut, the music alone above the music with the mask
"""
import json
import sys
import os

import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from strips import FONT, FONT_B, LM, W, fmt_t  # noqa: E402
from cue_strips import COLS, axis, loud_panel, spec_panel, tx  # noqa: E402


def caption(lines, h=None, col=(255, 255, 160)):
    h = h or 6 + 17 * len(lines)
    im = Image.new("RGB", (W, h), (30, 30, 30))
    d = ImageDraw.Draw(im)
    for i, ln in enumerate(lines):
        d.text((8, 4 + 17 * i), ln, font=FONT, fill=col)
    return im


def stack(rows, gap=0, bg=(60, 60, 60)):
    h = sum(r.size[1] for r in rows) + gap * (len(rows) - 1)
    out = Image.new("RGB", (W, h), bg)
    y = 0
    for r_ in rows:
        out.paste(r_, (0, y))
        y += r_.size[1] + gap
    return out


def edit_panel(Z, tag, title, marks, t0=-4.5, t1=4.5, vmax=None):
    mel, mt = Z[f"{tag}_mel"], Z[f"{tag}_mel_t"]
    vmax = vmax if vmax is not None else float(np.percentile(mel, 99.9))
    hs, hl = 110, 90
    im = Image.new("RGB", (W, 22 + hs + hl + 22), (0, 0, 0))
    d = ImageDraw.Draw(im)
    d.text((6, 3), title, font=FONT_B, fill=(255, 255, 255))
    im.paste(spec_panel(mel, mt, t0, t1, hs, vmax), (0, 22))
    im.paste(loud_panel(Z[f"{tag}_lt"], Z[f"{tag}_mom"], Z[f"{tag}_st"], t0, t1, hl,
                        label="LUFS of the edit (source gains as planned): momentary blue, short-term white"), (0, 22 + hs))
    d = ImageDraw.Draw(im)
    for t, lab, col in marks:
        x = tx(t, t0, t1)
        d.line([(x, 22), (x, 22 + hs + hl)], fill=col, width=2)
        d.text((x + 3, 24), lab, font=FONT, fill=col)
    axis(im, 22 + hs + hl, t0, t1, d)
    return im


def probe_sheet(prefix, out):
    P = json.load(open(prefix + ".json"))
    Z = dict(np.load(prefix + ".npz"))
    rows = [caption([f"Splice probe (as built, in memory): {P['what']}",
                     "Each panel: the edit, seam at 0.0 s (magenta), the 60-ms pre-roll ending on the incoming downbeat. "
                     "Own downbeat LSD: " + "; ".join(f"{k} p50 {v['p50']} p95 {v['p95']} dB" for k, v in P["own_downbeat_lsd"].items())],
                    col=(255, 255, 255))]
    for key in ("M2", "M3", "J2"):
        for m in P[key]:
            tag = f"{key}_{m['out_bar']}_{m['in_bar']}_edit" if key != "J2" else f"J2_{m['end_bar']}_edit"
            he = m.get("harmony_edit", {})
            hi = m.get("harmony_incoming_own", {})
            rows.append(edit_panel(Z, tag, f"{key}: {m['label']}", [(0.0, "seam", (255, 60, 255))]))
            rows.append(caption([
                f"step 3 s {m['step_3s_lu']} LU (incoming own {m['incoming_own_step_3s_lu']}, outgoing own {m['outgoing_own_step_3s_lu']}); "
                f"400 ms {m['step_400ms_lu']} LU; LSD {m['lsd_db']} dB, extra {m['extra_lsd_db']}, percentile "
                f"{m['lsd_percentile_of_incoming_own_downbeats']} of the track's own downbeats; HF extra {m['extra_hf_db']} dB; "
                f"d2 {m['d2_ratio_at_seam']}",
                f"chroma: beat {he.get('beat_cos')} (own {hi.get('beat_cos')}), bar {he.get('bar_cos')} (own {hi.get('bar_cos')}); "
                f"key {he.get('key_before', {}).get('key')} -> {he.get('key_after', {}).get('key')} "
                f"({he.get('camelot_steps')} Camelot steps); onsets {m['onsets_around_seam']}; "
                + (f"map cost {m['map_cost']}" if key != "J2" else f"breath {m.get('breath_db')} dB, 8-16 kHz attacks "
                   f"{m.get('hf_attack_db_last_8_beats')}")]))
    stack(rows, gap=4).save(out)
    print("ok", out)


def ab_sheet(pa, plan_a, pb, plan_b, out):
    rows = []
    for prefix, plan_path, side in ((pa, plan_a, "A (default, design revision 2)"), (pb, plan_b, "B (revision 1's cue)")):
        Z = dict(np.load(prefix + ".npz"))
        M = json.load(open(prefix + ".metrics.json"))
        plan = json.load(open(plan_path))
        R0 = plan["return"]["R0_film_s"]
        title = plan["return"]["R720_film_s"]
        t0, t1 = R0 - 9.0, title + 4.5
        vmax = float(np.percentile(Z["mel"], 99.9))
        hs, hl, hb = 150, 120, 46
        im = Image.new("RGB", (W, 22 + hs + hl + hb + 22), (0, 0, 0))
        d = ImageDraw.Draw(im)
        tr = M["extras"]["title_arrival"]
        rv = M["extras"]["return_vs_climax"]
        d.text((6, 3), f"SIDE {side}: {plan['title']} | climax st max {rv['climax_st_max']}, Return st max "
                       f"{rv['return_st_max']}, merge vs rush {rv['merge_vs_rush_lu']} LU, title step 1 s {tr['step_1s_lu']} LU",
               font=FONT_B, fill=(255, 255, 255))
        im.paste(spec_panel(Z["mel"], Z["mel_t"], t0, t1, hs, vmax), (0, 22))
        im.paste(loud_panel(Z["lt"], Z["mom"], Z["st"], t0, t1, hl, lo=-35.0, hi=-5.0), (0, 22 + hs))
        d = ImageDraw.Draw(im)
        for k in range(-1, 7):
            t = R0 + 2.0 * k if k < 6 else title
            lab = f"R{120 * k}" if k < 6 else "R720 TITLE"
            x = tx(t, t0, t1)
            d.line([(x, 22), (x, 22 + hs + hl)], fill=(250, 220, 40), width=1)
            d.text((x + 3, 22 + hs - 14), lab, font=FONT, fill=(250, 220, 40))
        for s in plan["seams"]:
            if t0 <= s["t"] <= t1:
                x = tx(s["t"], t0, t1)
                d.line([(x, 22), (x, 22 + hs + hl)], fill=(255, 60, 255), width=3)
                d.text((x + 3, 26), s["id"], font=FONT_B, fill=(255, 120, 255))
        yb = 22 + hs + hl
        for b in M["extras"].get("return_bars", []):
            if not (t0 <= b["film_s"] <= t1):
                continue
            x = tx(b["film_s"], t0, t1)
            col = COLS.get(b["track"], (200, 200, 200))
            d.line([(x, yb), (x, yb + hb)], fill=col, width=1)
            d.text((x + 3, yb + 2), f"{b['cue']} b{b['bar']}", font=FONT, fill=col)
            d.text((x + 3, yb + 16), f"{b['map_onsets_per_beat']}/beat", font=FONT, fill=(220, 220, 220))
            d.text((x + 3, yb + 30), f"{b['bed_lufs']} air {b['bed_air_share']}", font=FONT, fill=(160, 200, 255))
        axis(im, yb + hb, t0, t1, d)
        rows.append(im)
    stack(rows, gap=10).save(out)
    print("ok", out)


def title_chart(paths, out):
    rows = []
    for path in paths:
        T = json.load(open(path))
        vs = T["variants"]
        h = 320
        im = Image.new("RGB", (W, h + 40 + 17 * len(vs)), (16, 18, 22))
        d = ImageDraw.Draw(im)
        t0 = T["j5_film_s"] - 0.2
        t1 = T["title_film_s"] + 5.7
        d.text((6, 3), f"{T['plan']}: Apple's classifier, 'foghorn' per 3 s window (x: window start), master gain "
                       f"{T['master_gain_db']} dB; J5 {fmt_t(T['j5_film_s'])}, title {fmt_t(T['title_film_s'])}",
               font=FONT_B, fill=(255, 255, 255))
        yv = lambda p: 30 + (1 - p / 0.7) * (h - 40)  # noqa: E731
        for g, col in ((0.25, (200, 160, 40)), (0.30, (230, 60, 60))):
            d.line([(LM, yv(g)), (W - 8, yv(g))], fill=col, width=1)
            d.text((4, yv(g) - 7), f"{g:.2f}", font=FONT, fill=col)
        for g in (0.0, 0.1, 0.2, 0.4, 0.5, 0.6):
            d.text((4, yv(g) - 7), f"{g:.1f}", font=FONT, fill=(120, 120, 120))
        for t, lab in ((T["j5_film_s"], "J5"), (T["title_film_s"], "title"), (T["title_film_s"] - 2.0, "swell")):
            x = tx(t, t0, t1)
            d.line([(x, 30), (x, h - 10)], fill=(255, 60, 255), width=1)
            d.text((x + 3, 32), lab, font=FONT, fill=(255, 120, 255))
        pal = [(255, 255, 255), (120, 200, 255), (130, 230, 160), (250, 220, 40), (255, 140, 60), (255, 90, 160),
               (180, 140, 255), (90, 230, 230), (230, 230, 120), (200, 120, 90), (150, 150, 150), (255, 200, 200)]
        for i, v in enumerate(vs):
            col = pal[i % len(pal)]
            pts = [(tx(rw["t"], t0, t1), yv(rw["labels"].get("foghorn", 0.0))) for rw in v["rows"]]
            if len(pts) > 1:
                d.line(pts, fill=col, width=2)
            d.text((8, h + 8 + 17 * i), f"{v['id']}: max {v['foghorn_max']} at {v['foghorn_max_at']}, windows >= 0.30: "
                                        f"{v['windows_ge_0.30']}, >= 0.25: {v['windows_ge_0.25']}; {v['verdict']}; "
                                        f"watched {v['watched_max']}", font=FONT, fill=col)
        axis(im, h - 8, t0, t1, d)
        rows.append(im)
    stack(rows, gap=10).save(out)
    print("ok", out)


def x40_sheet(prefix, out):
    X = json.load(open(prefix + ".json"))
    Z = dict(np.load(prefix + ".npz"))
    t = X["xj2_film_s"]
    a, b = X["mask"]["film_s"]
    rows = []
    vmax = float(np.percentile(Z["with_mask_mel"], 99.9))
    for nm in ("music_alone", "with_mask"):
        m = X[nm]
        rows.append(edit_panel(Z, nm, f"x40 XJ2 at {fmt_t(t)}: {nm.replace('_', ' ')}",
                               [(t, "XJ2", (255, 60, 255)), (a, "mask", (90, 230, 230))], t0=t - 4.5, t1=t + 4.5, vmax=vmax))
        rows.append(caption([f"step 3 s {m['step_3s_lu']} LU, 400 ms {m['step_400ms_lu']} LU; LSD {m['lsd_db']} dB; "
                             f"HF {m['hf_click_db']} dB; d2 at the seam {m['d2_ratio_at_seam']}, at the mask's start "
                             f"{m['d2_ratio_at_mask_start']}"]))
    rows.append(caption([f"mask: {json.dumps(X['mask'])}"]))
    stack(rows, gap=4).save(out)
    print("ok", out)


def main():
    cmd, a = sys.argv[1], sys.argv[2:]
    if cmd == "probe":
        probe_sheet(a[0], a[1])
    elif cmd == "ab":
        ab_sheet(a[0], a[1], a[2], a[3], a[4])
    elif cmd == "title":
        title_chart([a[0]] + a[2:], a[1])
    elif cmd == "x40mask":
        x40_sheet(a[0], a[1])
    else:
        raise SystemExit(__doc__)


if __name__ == "__main__":
    main()
