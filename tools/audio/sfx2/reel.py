"""Render an audition reel of the kit from a reel spec: each take placed by its start, its peak or its end, over an
optional bed, then one gain to the reel's target loudness (no limiter: if the true-peak ceiling would be crossed the
reel is left quieter and says so).

Spec (JSON): {"length_s": 36, "target_lufs": -16, "ceiling_dbtp": -2,
              "bed": {"id": "<kit id>", "gain_db": -20, "fade_in_s": 0.5, "fade_out_s": 1.0, "loop": true},
              "events": [{"t": 1.0, "id": "<kit id>", "gain_db": -6, "align": "start|peak|end", "label": "..."}],
              "sections": [{"t": 0.0, "label": "..."}]}
"peak" aligns the take's loudest sample (its sync point) with t; "end" lands its last sample on t (a reverse swell
into a hit). Writes <out>.wav (48 kHz, 24-bit), <out>.cues.json and <out>.cues.txt (what plays when).

Run through scripts/heavy.sh:
  scripts/heavy.sh sfx2-reel /usr/sbin/taskpolicy -c utility .work/audio/.venv/bin/python -I \
      tools/audio/sfx2/reel.py --work .work/sfx2 --spec .work/sfx2/reel_spec.json --out .work/sfx2/audition/reel
"""
import argparse
import json
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import audiolib as al  # noqa: E402

here = os.path.dirname(os.path.abspath(__file__))
repo = os.path.abspath(os.path.join(here, "..", "..", ".."))
ap = argparse.ArgumentParser()
ap.add_argument("--work", default=os.path.join(repo, ".work", "sfx2"))
ap.add_argument("--spec", required=True)
ap.add_argument("--out", required=True, help="output path without extension")
a = ap.parse_args()

kit = {f["id"]: f for f in json.load(open(os.path.join(a.work, "KIT.json"), encoding="utf-8"))["files"]}
spec = json.load(open(a.spec, encoding="utf-8"))
L = int(float(spec["length_s"]) * al.SR)
mix = np.zeros((L, 2), dtype=np.float64)
cues = []


def take(kid):
    y, _ = al.load(os.path.join(a.work, kit[kid]["file"]))
    return al.as_stereo(y).astype(np.float64)


bed = spec.get("bed")
if bed:
    y = take(bed["id"])
    if bed.get("loop", True) and y.shape[0] < L:
        y = np.tile(y, (int(np.ceil(L / y.shape[0])), 1))
    y = y[:L] * 10 ** (float(bed.get("gain_db", 0)) / 20)
    y = al.apply_fades(y.astype(np.float32), float(bed.get("fade_in_s", 0.5)), float(bed.get("fade_out_s", 1.0)))
    mix[:y.shape[0]] += y
    cues.append({"t": 0.0, "id": bed["id"], "role": kit[bed["id"]]["role"], "gain_db": bed.get("gain_db", 0),
                 "label": bed.get("label", "bed"), "span_s": [0.0, round(y.shape[0] / al.SR, 3)]})
for ev in spec["events"]:
    y = take(ev["id"]) * 10 ** (float(ev.get("gain_db", 0)) / 20)
    if ev.get("dur_s"):  # play only the first dur_s (e.g. a bed auditioned on its own), with a 0.5 s fade-out
        y = al.apply_fades(y[:int(float(ev["dur_s"]) * al.SR)].astype(np.float32), 0.05, 0.5).astype(np.float64)
    align = ev.get("align", "start")
    if align == "peak":
        off = int(round(float(kit[ev["id"]]["measure"]["peak_time_s"]) * al.SR))
    elif align == "end":
        off = y.shape[0]
    else:
        off = 0
    i = int(round(float(ev["t"]) * al.SR)) - off
    j0, j1 = max(0, i), min(L, i + y.shape[0])
    if j1 > j0:
        mix[j0:j1] += y[j0 - i:j1 - i]
    cues.append({"t": ev["t"], "id": ev["id"], "role": kit[ev["id"]]["role"], "align": align,
                 "gain_db": ev.get("gain_db", 0), "label": ev.get("label", ""),
                 "span_s": [round(j0 / al.SR, 3), round(j1 / al.SR, 3)]})

lufs, _ = al.integrated(mix.astype(np.float32))
tp = al.db(al.true_peak(mix.astype(np.float32)))
g = float(spec.get("target_lufs", -16)) - lufs
limited_by_peak = False
if tp + g > float(spec.get("ceiling_dbtp", -2.0)):
    g = float(spec.get("ceiling_dbtp", -2.0)) - tp
    limited_by_peak = True
mix *= 10 ** (g / 20)
os.makedirs(os.path.dirname(a.out), exist_ok=True)
al.write(a.out + ".wav", mix.astype(np.float32))
meta = {"spec": os.path.relpath(a.spec, repo), "length_s": spec["length_s"], "gain_db": round(g, 2),
        "limited_by_true_peak": limited_by_peak, "pre_gain_lufs_i": lufs, "pre_gain_tp_dbtp": round(tp, 2),
        "sections": spec.get("sections", []), "cues": cues}
json.dump(meta, open(a.out + ".cues.json", "w", encoding="utf-8"), indent=1, ensure_ascii=False)
with open(a.out + ".cues.txt", "w", encoding="utf-8") as f:
    secs = sorted(spec.get("sections", []), key=lambda s: s["t"])
    for c in sorted(cues, key=lambda c: c["span_s"][0]):
        sec = [s["label"] for s in secs if s["t"] <= c["span_s"][0] + 1e-6]
        f.write(f"{c['span_s'][0]:6.2f}-{c['span_s'][1]:6.2f}  {c['id']:26} {c['gain_db']:+5.1f} dB  "
                f"[{sec[-1] if sec else ''}] {c['label']}\n")
print(f"reel {spec['length_s']} s, gain {g:+.2f} dB{' (true-peak limited)' if limited_by_peak else ''} -> {a.out}.wav")
