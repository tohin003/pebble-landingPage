"""reel music lane: draw a rendered score (WAV) with its beat map: the waveform's peak envelope (both channels, dB
scaled), the beats (grey), downbeats (red, numbered by bar), hits (yellow, named), and the silence (blue band).
  .work/qa-venv/bin/python -I tools/audio/reel/wave_strip.py SCORE.wav BEATMAP.json FROM_S TO_S OUT.png [px_per_s]
(the qa venv has numpy and Pillow; the WAV is read with the standard library's wave module: 24-bit PCM)"""
import json
import sys
import wave

import numpy as np
from PIL import Image, ImageDraw

wav, bmp, a, b, out = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4]), sys.argv[5]
pps = float(sys.argv[6]) if len(sys.argv) > 6 else 100.0
with wave.open(wav) as w:
    sr, ch, sw = w.getframerate(), w.getnchannels(), w.getsampwidth()
    w.setpos(int(a * sr))
    raw = w.readframes(int((b - a) * sr))
assert sw == 3, "24-bit PCM expected"
x = np.frombuffer(raw, dtype=np.uint8).reshape(-1, 3)
v = (x[:, 0].astype(np.int32) | (x[:, 1].astype(np.int32) << 8) | (x[:, 2].astype(np.int32) << 16))
v = np.where(v >= 1 << 23, v - (1 << 24), v).astype(np.float64) / (1 << 23)
v = np.abs(v.reshape(-1, ch)).max(1)
bm = json.load(open(bmp))
W, H = int((b - a) * pps), 300
img = Image.new("RGB", (W, H + 40), (0, 0, 0))
dr = ImageDraw.Draw(img)
spp = sr / pps
for px in range(W):
    seg = v[int(px * spp):int((px + 1) * spp)]
    if not len(seg):
        continue
    db = 20 * np.log10(max(seg.max(), 1e-6))
    hgt = max(0.0, (db + 60) / 60) * (H / 2)
    dr.line([(px, H / 2 - hgt), (px, H / 2 + hgt)], fill=(120, 170, 230))
s = bm.get("silence")
if s and s["to_s"] > a and s["from_s"] < b:
    dr.rectangle([((s["from_s"] - a) * pps, 0), ((s["to_s"] - a) * pps, 8)], fill=(60, 90, 255))
for bt in bm["beats"]:
    if a <= bt["t"] <= b:
        X = (bt["t"] - a) * pps
        if bt["downbeat"]:
            dr.line([(X, 0), (X, H)], fill=(220, 40, 40))
            dr.text((X + 2, H + 2), str(bt["bar"]), fill=(255, 120, 120))
        else:
            dr.line([(X, H - 30), (X, H)], fill=(140, 140, 140))
for h in bm["hits"]:
    if a <= h["t"] <= b:
        X = (h["t"] - a) * pps
        dr.line([(X, 10), (X, H)], fill=(250, 210, 40))
        dr.text((X + 2, 12), h["name"], fill=(250, 210, 40))
for t in range(int(a) + 1, int(b) + 1):
    dr.text(((t - a) * pps, H + 22), f"{t}", fill=(200, 200, 200))
img.save(out)
print(out, img.size)
