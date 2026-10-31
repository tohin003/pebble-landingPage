"""reel music lane: draw a stretch of a measured track so a music editor can see it: the mel spectrogram (from the
curves NPZ of score2/measure_track.py), the momentary loudness (white) and short-term loudness (yellow), downbeats
(red, numbered by bar) and beats (grey). Reads the map JSON and curves NPZ only; no audio.
  .work/qa-venv/bin/python -I tools/audio/reel/strip.py MAP.json CURVES.npz FROM_S TO_S OUT.png [px_per_s]"""
import json
import sys

import numpy as np
from PIL import Image, ImageDraw

mp, npz, a, b, out = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4]), sys.argv[5]
pps = float(sys.argv[6]) if len(sys.argv) > 6 else 60.0
d = json.load(open(mp))
z = np.load(npz)
HOP = 512 / 22050
W, H_SPEC, H_LOUD = int((b - a) * pps), 256, 160
img = Image.new("RGB", (W, H_SPEC + H_LOUD + 20), (0, 0, 0))
mel = z["mel"]
cols = np.clip(((np.arange(W) / pps + a) / HOP).astype(int), 0, mel.shape[1] - 1)
spec = mel[::-1, cols].astype(np.float32)  # 128 x W, low freq at the bottom
spec = np.repeat(spec, 2, axis=0)
rgb = np.stack([spec, spec * 0.6, 255 - spec * 0.5], -1)
rgb[spec < 40] = 0
img.paste(Image.fromarray(rgb.clip(0, 255).astype(np.uint8)), (0, 0))
dr = ImageDraw.Draw(img)
y0 = H_SPEC
def ly(v):  # -60..0 LUFS onto the loudness panel
    return y0 + H_LOUD - (np.clip(v, -60, 0) + 60) / 60 * H_LOUD
for lv in (-10, -20, -30, -40, -50):
    dr.line([(0, ly(lv)), (W, ly(lv))], fill=(40, 40, 40))
    dr.text((2, ly(lv) - 10), str(lv), fill=(90, 90, 90))
for key, col in (("mom", (230, 230, 230)), ("st", (240, 200, 40))):
    v = z[key]
    t = np.arange(len(v)) * 0.1
    m = (t >= a) & (t <= b)
    pts = [((tt - a) * pps, ly(vv)) for tt, vv in zip(t[m], v[m])]
    if len(pts) > 1:
        dr.line(pts, fill=col, width=1)
for t in d["beats_s"]:
    if a <= t <= b:
        x = (t - a) * pps
        dr.line([(x, H_SPEC - 12), (x, H_SPEC)], fill=(150, 150, 150))
for i, t in enumerate(d["downbeats_s"]):
    if a <= t <= b:
        x = (t - a) * pps
        dr.line([(x, 0), (x, H_SPEC + H_LOUD)], fill=(220, 40, 40))
        dr.text((x + 2, H_SPEC + H_LOUD + 4), f"{i}", fill=(255, 120, 120))
for s in range(int(a) + 1, int(b) + 1):
    if s % 5 == 0:
        dr.text(((s - a) * pps, 2), f"{s}s", fill=(255, 255, 255))
img.save(out)
print(out, img.size)
