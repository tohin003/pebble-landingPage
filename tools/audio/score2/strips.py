"""score2 lane: spectrogram, loudness and onset strips for looking at the music map (no audio is read or written).

Reads .work/score2/maps/NAME.map.json and .work/score2/curves/NAME.npz (from measure_track.py), and optionally
.work/score2/MUSIC_MAP.json for cue windows and transition points. Draws with Pillow (the qa venv), so it runs apart from
the audio venv:

  .work/qa-venv/bin/python -I tools/audio/score2/strips.py window NAME T0 T1 OUT.png [TITLE]
  .work/qa-venv/bin/python -I tools/audio/score2/strips.py overview NAME OUT.png
  .work/qa-venv/bin/python -I tools/audio/score2/strips.py sheet SPEC.json OUT.png   # [{"name","t0","t1","title","marks":[[t,label],...]}]

Panels, top to bottom: log-mel spectrogram (to 11 kHz, 90 dB range, per-track max); loudness (momentary thin, short-term
thick, LUFS grid every 5 LU); onset strength (all bands grey, low band < 200 Hz orange, backbeat band 1.5-6 kHz cyan,
each scaled to its 99th percentile in the window) with beat ticks; percussive share (green) and low-end share (orange).
Red lines are downbeats with bar numbers; yellow lines are section boundaries; magenta lines are marks.
"""
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = os.environ.get("SCORE2_WORK", os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", ".work", "score2"))
W = 1600
LM = 64  # left margin for labels
FONT = ImageFont.truetype("/System/Library/Fonts/SFNSMono.ttf", 13)
FONT_B = ImageFont.truetype("/System/Library/Fonts/SFNSMono.ttf", 15)
# a magma-like colour map
ANCH = np.array([[0, 0, 4], [28, 16, 68], [79, 18, 123], [129, 37, 129], [181, 54, 122], [229, 80, 100],
                 [251, 135, 97], [254, 194, 135], [252, 253, 191]], dtype=float)
LUT = np.stack([np.interp(np.linspace(0, len(ANCH) - 1, 256), np.arange(len(ANCH)), ANCH[:, c]) for c in range(3)], 1).astype(np.uint8)


def load(name):
    m = json.load(open(f"{ROOT}/maps/{name}.map.json"))
    c = np.load(f"{ROOT}/curves/{name}.npz")
    return m, {k: c[k] for k in c.files}


def fmt_t(t):
    s = "-" if t < 0 else ""  # a time before a seam reads -0:04.5, not -1:55.5
    t = abs(t)
    return f"{s}{int(t // 60)}:{t % 60:04.1f}"


def tx(t, t0, t1):
    return LM + (t - t0) / (t1 - t0) * (W - LM - 8)


def panel_spec(c, t0, t1, h):
    mel = c["mel"]; tt = c["stt"]
    m = (tt >= t0) & (tt <= t1)
    if not m.any():
        return Image.new("RGB", (W, h))
    sub = mel[:, m][::-1]  # low frequencies at the bottom
    cols = W - LM - 8
    xi = np.clip(np.round(np.linspace(0, sub.shape[1] - 1, cols)).astype(int), 0, sub.shape[1] - 1)
    if sub.shape[1] > cols:  # max-pool so short events survive the squeeze
        edges = np.linspace(0, sub.shape[1], cols + 1).astype(int)
        img = np.stack([sub[:, edges[i]:max(edges[i] + 1, edges[i + 1])].max(1) for i in range(cols)], 1)
    else:
        img = sub[:, xi]
    yi = np.clip(np.round(np.linspace(0, img.shape[0] - 1, h)).astype(int), 0, img.shape[0] - 1)
    rgb = LUT[img[yi]]
    out = Image.new("RGB", (W, h), (0, 0, 0))
    out.paste(Image.fromarray(rgb), (LM, 0))
    d = ImageDraw.Draw(out)
    for f_, lab in ((100, "100"), (1000, "1k"), (5000, "5k")):
        # mel position of f (Slaney, 128 bands to 11025 Hz)
        def hz2mel(f):
            return f / (200 / 3) if f < 1000 else 15 + np.log(f / 1000) / (np.log(6.4) / 27)
        frac = hz2mel(f_) / hz2mel(11025)
        yy = h - frac * h
        d.line([(LM - 6, yy), (LM, yy)], fill=(200, 200, 200))
        d.text((4, yy - 7), lab, font=FONT, fill=(200, 200, 200))
    return out


def panel_loud(c, t0, t1, h, lo=None, hi=None):
    lt, mom, st = c["lt"], c["mom"], c["st"]
    m = (lt >= t0) & (lt <= t1)
    out = Image.new("RGB", (W, h), (16, 18, 22)); d = ImageDraw.Draw(out)
    if not m.any():
        return out
    hi = hi if hi is not None else float(np.ceil((np.max(st) + 1) / 5) * 5)
    lo = lo if lo is not None else hi - 40
    yv = lambda v: h - 4 - (np.clip(v, lo, hi) - lo) / (hi - lo) * (h - 8)  # noqa: E731
    for g in np.arange(lo, hi + 0.1, 5):
        d.line([(LM, yv(g)), (W - 8, yv(g))], fill=(50, 54, 60))
        d.text((4, yv(g) - 7), f"{g:.0f}", font=FONT, fill=(150, 150, 150))
    xs = tx(lt[m], t0, t1)
    d.line(list(zip(xs, yv(mom[m]))), fill=(110, 150, 200), width=1)
    d.line(list(zip(xs, yv(st[m]))), fill=(255, 255, 255), width=3)
    d.text((LM + 4, 2), "LUFS: momentary (blue), short-term 3 s (white)", font=FONT, fill=(180, 180, 180))
    return out


def panel_onset(c, t0, t1, h, beats, down, grid=None):
    ot = c["ot"]; m = (ot >= t0) & (ot <= t1)
    out = Image.new("RGB", (W, h), (10, 10, 12)); d = ImageDraw.Draw(out)
    if grid is not None:  # the global constant grid, as short green ticks at the top
        P, ph = grid
        for k in range(int(np.ceil((t0 - ph) / P)), int(np.floor((t1 - ph) / P)) + 1):
            x = tx(ph + k * P, t0, t1)
            d.line([(x, 0), (x, 14)], fill=(60, 230, 90), width=2)
    for b in beats:
        if t0 <= b <= t1:
            d.line([(tx(b, t0, t1), 0), (tx(b, t0, t1), h)], fill=(120, 120, 150))
    if m.any():
        xs = tx(ot[m], t0, t1)
        for key, col, off in (("oenv", (210, 210, 210), 0), ("olow", (255, 150, 40), 0), ("obb", (60, 200, 230), 0)):
            v = c[key][m]
            s = np.percentile(v, 99) + 1e-9
            yy = h - 2 - np.clip(v / s, 0, 1.15) * (h - 10) * 0.85
            d.line(list(zip(xs, yy)), fill=col, width=1)
    d.text((LM + 4, 16), "onsets: all (grey), low <200 Hz (orange), backbeat 1.5-6 kHz (cyan); ticks = beats; green = constant grid", font=FONT,
           fill=(180, 180, 180))
    return out


def panel_shares(c, t0, t1, h):
    tt = c["stt"]; m = (tt >= t0) & (tt <= t1)
    out = Image.new("RGB", (W, h), (14, 16, 14)); d = ImageDraw.Draw(out)
    if m.any():
        xs = tx(tt[m], t0, t1)
        k = max(1, int(m.sum() / (W - LM)))
        for key, col in (("perc", (90, 220, 120)), ("lows", (255, 150, 40))):
            v = c[key][m].astype(float)
            if k > 1:
                v = np.convolve(v, np.ones(k) / k, mode="same")
            d.line(list(zip(xs, h - 2 - v * (h - 4))), fill=col, width=1)
    d.text((LM + 4, 2), "percussive share (green), low <120 Hz share (orange), 0..1", font=FONT, fill=(170, 170, 170))
    return out


def window(name, t0, t1, title=None, marks=(), secs=True, spans=()):
    mp, c = load(name)
    t0 = max(0.0, t0); t1 = min(mp["duration_s"], t1)
    down = np.array(mp["downbeats_s"]); beats = np.array(mp["beats_s"])
    hs, hl, ho, hp, hax = 150, 120, 110, 50, 22
    rows_ = sorted(set(sp[3] for sp in spans if len(sp) > 3))
    hsp = (len(rows_) * 9 + 6) if rows_ else 0
    img = Image.new("RGB", (W, 24 + hs + hl + ho + hp + hax + hsp), (0, 0, 0))
    d = ImageDraw.Draw(img)
    d.text((6, 4), title or f"{name}  {fmt_t(t0)}-{fmt_t(t1)}", font=FONT_B, fill=(255, 255, 255))
    y = 24
    for p in (panel_spec(c, t0, t1, hs), panel_loud(c, t0, t1, hl), panel_onset(c, t0, t1, ho, beats, down, (mp["tempo"]["grid_period_s"], mp["tempo"]["grid_phase_s"])),
              panel_shares(c, t0, t1, hp)):
        img.paste(p, (0, y)); y += p.size[1]
    d = ImageDraw.Draw(img)
    for sp in spans:
        a, b, col = sp[0], sp[1], tuple(sp[2])
        ri = rows_.index(sp[3]) if len(sp) > 3 else 0
        yy = y + hax + 3 + ri * 9
        xa, xb = tx(max(a, t0), t0, t1), tx(min(b, t1), t0, t1)
        if xb > xa:
            d.rectangle([xa, yy, xb, yy + 6], fill=col)
            if len(sp) > 4 and sp[4]:
                d.text((4, yy - 4), sp[4][:9], font=FONT, fill=col)
    span = t1 - t0
    for k, t in enumerate(down):
        if t0 <= t <= t1:
            x = tx(t, t0, t1)
            d.line([(x, 24), (x, y)], fill=(230, 40, 40), width=1 if span > 40 else 2)
            if span <= 40 or k % 4 == 0:
                d.text((x + 2, 24 + hs + 2), str(k), font=FONT, fill=(255, 90, 90))
    for s in mp["sections"]:
        t = s["start_s"]
        if t0 <= t <= t1:
            x = tx(t, t0, t1)
            for yy in range(24, y, 8):
                d.line([(x, yy), (x, yy + 4)], fill=(250, 220, 40), width=2)
            d.text((x + 3, 26), s.get("label", s.get("label_rule", "")), font=FONT_B, fill=(250, 220, 40))
    for t, lab in marks:
        if t0 <= t <= t1:
            x = tx(t, t0, t1)
            d.line([(x, 24), (x, y)], fill=(255, 60, 255), width=2)
            d.text((x + 3, 24 + hs - 18), lab, font=FONT, fill=(255, 120, 255))
    # time axis
    step = next(s_ for s_ in (0.5, 1, 2, 5, 10, 15, 30, 60) if span / s_ <= 16)
    for t in np.arange(np.ceil(t0 / step) * step, t1 + 1e-6, step):
        x = tx(t, t0, t1)
        d.line([(x, y), (x, y + 5)], fill=(200, 200, 200))
        d.text((x - 18, y + 6), fmt_t(t), font=FONT, fill=(200, 200, 200))
    return img


def overview(name, marks=(), spans=()):
    mp, _ = load(name)
    t = mp["tempo"]; k = mp["key"]; L = mp["loudness"]
    title = (f"{name}  {fmt_t(mp['duration_s'])}  {t['bpm']} BPM ({t['grid_mode'].split(' ')[0]} grid)  {k['key']} {k['camelot']} r={k['r']}  "
             f"{L['integrated_lufs']} LUFS  LRA {L['lra_lu']}")
    return window(name, 0, mp["duration_s"], title, marks=marks, spans=spans)


def stack(imgs):
    h = sum(i.size[1] for i in imgs) + 6 * (len(imgs) - 1)
    out = Image.new("RGB", (W, h), (40, 40, 40)); y = 0
    for i in imgs:
        out.paste(i, (0, y)); y += i.size[1] + 6
    return out


if __name__ == "__main__":
    cmd = sys.argv[1]
    if cmd == "window":
        nm, a, b, out = sys.argv[2], float(sys.argv[3]), float(sys.argv[4]), sys.argv[5]
        window(nm, a, b, sys.argv[6] if len(sys.argv) > 6 else None).save(out)
    elif cmd == "overview":
        overview(sys.argv[2]).save(sys.argv[3])
    elif cmd == "sheet":
        spec = json.load(open(sys.argv[2]))
        ims = []
        for s in spec:
            if s.get("overview"):
                ims.append(overview(s["name"], marks=s.get("marks", []), spans=[tuple(x) for x in s.get("spans", [])]))
            else:
                ims.append(window(s["name"], s["t0"], s["t1"], s.get("title"), marks=s.get("marks", []),
                                  spans=[tuple(x) for x in s.get("spans", [])]))
        stack(ims).save(sys.argv[3])
    print("ok", sys.argv[-1])
