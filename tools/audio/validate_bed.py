"""Check a music bed against its beat map (MASTER_PLAN §6.1 step 5): every downbeat in the map should have an attack
within a few milliseconds of its frame, the reveal attack must land on the planned frame +-1, and the bed must last
exactly total_frames / fps.

Attack time, at 1-sample resolution with no analysis-window bias: the bed is band-limited (40 Hz-8 kHz, zero-phase),
a centred 2 ms RMS envelope is taken, and within +-35 ms of each downbeat the steepest rise of the envelope is the
attack (for a percussive onset that is 1-2 ms after the first sample of the hit). Downbeats with no clear attack (a held
chord, a rest, the breath) are listed but left out of the median.
Gates: median |offset| <= 5 ms over the downbeats that have an attack; reveal within +-1 frame; exact duration.
Usage: python -I validate_bed.py BED.wav BEATMAP.json [OUT.json]
"""
import json
import sys

import numpy as np
import soundfile as sf
from scipy.ndimage import uniform_filter1d
from scipy.signal import butter, sosfiltfilt

wav, bm_path = sys.argv[1], sys.argv[2]
bm = json.load(open(bm_path))
fps = bm["fps"]
y, sr = sf.read(wav, always_2d=True)
mono = y.mean(axis=1)
dur = len(mono) / sr

ms = sr // 1000
PAD = 60 * ms                                        # the film starts from silence: pad so bar 1 has a "before"


def envelope(lo, hi):
    x = sosfiltfilt(butter(2, [lo, hi], btype="band", fs=sr, output="sos"), np.concatenate([np.zeros(PAD), mono]))
    env = np.sqrt(uniform_filter1d(x ** 2, 2 * ms) + 1e-12)
    return env, np.gradient(uniform_filter1d(env, 2 * ms))


ENVS = [envelope(40, 200), envelope(40, 8000)]     # kick and bass carry the downbeats; broadband as the fallback


def attack(tc, win=0.035):
    """Half-rise time of the strongest onset within +-win of tc, and its rise ratio (post-peak / pre-onset level)."""
    best_ratio = 0.0
    for env, d in ENVS:
        c = int(round(tc * sr)) + PAD
        i0, i1 = max(c - int(win * sr), 50 * ms), min(c + int(win * sr), len(env) - 40 * ms)
        if i1 <= i0:
            continue
        k = i0 + int(np.argmax(d[i0:i1]))
        pre = float(env[k - 30 * ms:k + 1].min())                     # the valley just before the rise
        post = float(env[k:k + 25 * ms].max())
        ratio = post / (pre + 1e-12)
        if ratio < 2.0:                                              # less than a 6 dB rise: not a clear attack
            best_ratio = max(best_ratio, ratio)
            continue
        half = pre + 0.5 * (post - pre)
        v = k - 30 * ms + int(np.argmin(env[k - 30 * ms:k + 1]))
        j = v + int(np.argmax(env[v:k + 25 * ms] >= half))
        return (j - PAD) / sr, ratio
    return None, best_ratio


rows = []
for i, fr in enumerate(bm["downbeat_frames"]):
    tc = fr / fps
    at, strength = attack(tc)
    rows.append({"bar": i + 1, "frame": fr, "t": round(tc, 4), "attack": None if at is None else round(at, 5),
                 "offset_ms": None if at is None else round((at - tc) * 1000, 2), "strength": round(strength, 1)})
offs = np.array([r["offset_ms"] for r in rows if r["offset_ms"] is not None])
res = {
    "bed": wav, "beatmap": bm_path, "duration_s": round(dur, 6),
    "expected_duration_s": round(bm["total_frames"] / fps, 6),
    "downbeats_measured": int(len(offs)), "downbeats_total": len(rows),
    "median_offset_ms": None if not len(offs) else round(float(np.median(offs)), 2),
    "median_abs_offset_ms": None if not len(offs) else round(float(np.median(np.abs(offs))), 2),
    "max_abs_offset_ms": None if not len(offs) else round(float(np.max(np.abs(offs))), 2),
    "within_1_frame_pct": None if not len(offs) else round(float(np.mean(np.abs(offs) < 1000 / fps)) * 100, 1),
}
rv = bm["reveal"]["frame"]
at, strength = attack(rv / fps)
res["reveal"] = {"planned_frame": rv, "attack_s": None if at is None else round(at, 5),
                 "attack_frame": None if at is None else int(round(at * fps)),
                 "offset_ms": None if at is None else round((at - rv / fps) * 1000, 2), "strength": round(strength, 1)}
res["gates"] = {
    "median_abs_offset_le_5ms": res["median_abs_offset_ms"] is not None and res["median_abs_offset_ms"] <= 5.0,
    "reveal_within_1_frame": at is not None and abs(int(round(at * fps)) - rv) <= 1,
    "duration_exact": abs(dur - bm["total_frames"] / fps) <= 1.0 / sr,
}
res["pass"] = all(res["gates"].values())
res["downbeats"] = rows
if len(sys.argv) > 3:
    json.dump(res, open(sys.argv[3], "w"), indent=1)
print(json.dumps({k: v for k, v in res.items() if k != "downbeats"}, indent=1))
missing = [r["bar"] for r in rows if r["offset_ms"] is None]
print("downbeats without a clear attack (bars):", missing if missing else "none")
