"""Measured inputs for the music rubric (MASTER_PLAN §6.1 step 3, critic H9), for one decoded 48 kHz track.

Writes a JSON with:
  loudness   EBU R128 integrated loudness, loudness range (LRA) and true peak from FFmpeg's ebur128 filter; PLR.
  speaker    share of signal power above 150 Hz (small-speaker translation) and the loudness lost through a 150 Hz
             high-pass (roughly what a phone speaker drops).
  mono       loudness lost when the stereo mix folds down to mono, (L+R)/2 on both channels (gate: <= 3 dB).
  grid       a refined, fixed-tempo beat grid: the tempo and phase that best explain the onsets over the whole track,
             the attack-to-grid offsets (median, share within one frame at 30 fps), the drift of the offsets over
             time (a wrong or drifting tempo shows up here) and the nearest tempo with a whole number of frames per
             beat at 30 fps (with the time-stretch it needs).
  structure  loudness per bar on that grid, the biggest bar-to-bar lift (a candidate "drop" for the reveal), the
             low-band drop found the fit_music.py way, the last loud bar and the natural ring-out after it.
Usage: python -I rubric_metrics.py TRACK.wav OUT.json [--ffmpeg /opt/homebrew/bin/ffmpeg] [--fps 30]
"""
import argparse
import json
import re
import subprocess

import librosa
import numpy as np
import pyloudnorm as pyln
import soundfile as sf
from scipy.signal import butter, sosfiltfilt, welch

ap = argparse.ArgumentParser()
ap.add_argument("wav")
ap.add_argument("out")
ap.add_argument("--ffmpeg", default="/opt/homebrew/bin/ffmpeg")
ap.add_argument("--fps", type=int, default=30)
a = ap.parse_args()
FPS = a.fps

y, sr = sf.read(a.wav, always_2d=True, dtype="float64")
mono = y.mean(axis=1)
dur = len(mono) / sr
res = {"file": a.wav, "duration_s": round(dur, 3), "sample_rate": sr}

# ---- loudness: FFmpeg ebur128 (EBU R128 / ITU-R BS.1770, true peak at 4x) ----
p = subprocess.run([a.ffmpeg, "-hide_banner", "-nostats", "-i", a.wav, "-af", "ebur128=peak=true", "-f", "null", "-"],
                   capture_output=True, text=True)
summ = p.stderr[p.stderr.rfind("Summary:"):]
def grab(label):
    m = re.search(label + r":\s+(-?[\d.]+|-inf)", summ)
    return None if not m or m.group(1) == "-inf" else float(m.group(1))
I, LRA, TP = grab(r"I"), grab(r"LRA"), grab(r"Peak")
rms_db = 20 * np.log10(np.sqrt(np.mean(y ** 2)) + 1e-12)
peak_db = 20 * np.log10(np.max(np.abs(y)) + 1e-12)
res["loudness"] = {"integrated_lufs": I, "lra_lu": LRA, "true_peak_dbtp": TP,
                   "plr_db": None if I is None or TP is None else round(TP - I, 2),
                   "crest_db": round(peak_db - rms_db, 2)}

# ---- small-speaker translation ----
f, pxx = welch(mono, fs=sr, nperseg=8192)
band = (f >= 20) & (f <= 20000)
share = float(pxx[band & (f >= 150)].sum() / pxx[band].sum())
meter = pyln.Meter(sr)
full = meter.integrated_loudness(y)
hp = sosfiltfilt(butter(4, 150, btype="highpass", fs=sr, output="sos"), y, axis=0)
res["speaker"] = {"power_share_above_150hz": round(share, 3),
                  "lufs_lost_through_150hz_highpass_db": round(full - meter.integrated_loudness(hp), 2)}

# ---- mono fold-down ----
m2 = np.stack([y.mean(axis=1)] * 2, axis=1)
corr = float(np.corrcoef(y[:, 0], y[:, 1])[0, 1]) if y.shape[1] == 2 else 1.0
res["mono"] = {"lufs_lost_db": round(full - meter.integrated_loudness(m2), 2), "lr_correlation": round(corr, 3)}

# ---- refined fixed-tempo grid over the whole track ----
y22 = librosa.resample(mono, orig_sr=sr, target_sr=22050)
HOP = 128
on = librosa.onset.onset_strength(y=y22, sr=22050, hop_length=HOP, aggregate=np.median)
on = on / (np.percentile(on, 99) + 1e-9)
ot = librosa.times_like(on, sr=22050, hop_length=HOP)
tempo0, beats0 = librosa.beat.beat_track(onset_envelope=on, sr=22050, hop_length=HOP, units="time", trim=False)
tempo0 = float(np.atleast_1d(tempo0)[0])
from scipy.ndimage import maximum_filter1d
step = ot[1] - ot[0]
on25 = maximum_filter1d(on, 2 * int(round(0.025 / step)) + 1)   # coarse pass: onset strength within +-25 ms
onmax = maximum_filter1d(on, 2 * int(round(0.012 / step)) + 1)  # fine pass and scores: within +-12 ms
t_lo, t_hi = 0.5, dur - 0.5

def align_all(period, phases, env):
    """Mean windowed onset strength on the grid phase + k*period, for every phase at once."""
    k = np.arange(int(t_hi / period) + 1)
    G = phases[:, None] + k[None, :] * period
    ok = (G >= t_lo) & (G <= t_hi)
    v = np.where(ok, env[np.clip(np.searchsorted(ot, G), 0, len(env) - 1)], 0.0)
    return v.sum(1) / np.maximum(ok.sum(1), 1)

def align(period, phase, env=onmax):
    return float(align_all(period, np.array([phase]), env)[0])

# 1) coarse scan of every tempo from 55 to 190 BPM (no dependence on librosa's guess, which is often a multiple)
best = None
for bpm in np.arange(55.0, 190.0, 0.01):
    P = 60 / bpm
    phs = np.arange(0, P, 0.005)
    s = align_all(P, phs, on25)
    j = int(np.argmax(s))
    if best is None or s[j] > best[0]:
        best = (float(s[j]), bpm, float(phs[j]))
_, bpm_scan, ph_scan = best
# 2) fold to the tactus range 70-140 BPM (the level a film cuts on); when halving, keep the stronger half of the beats
bpm0, phase_cands = bpm_scan, [ph_scan]
while bpm0 > 140:
    bpm0 /= 2
    phase_cands = [p for q in phase_cands for p in (q, q + 60 / (2 * bpm0))]
while bpm0 < 70:
    bpm0 *= 2
    phase_cands = [q % (60 / bpm0) for q in phase_cands]
# 3) fine pass around the folded tempo and each phase candidate, with the tighter window
best = None
for ph0 in phase_cands:
    for bpm in np.arange(bpm0 - 0.03, bpm0 + 0.03, 0.0005):
        P = 60 / bpm
        phs = np.arange(ph0 - 0.012, ph0 + 0.012, 0.0005) % P
        s = align_all(P, phs, onmax)
        j = int(np.argmax(s))
        if best is None or s[j] > best[0]:
            best = (float(s[j]), bpm, float(phs[j]))
score, bpm, ph = best
P = 60 / bpm
# evidence for the metrical level: how well the double-time and half-time grids explain the onsets
dbl = align(P / 2, ph)
half = max(align(2 * P, ph), align(2 * P, ph + P))
grid = np.arange(ph, dur, P)

def attack(t, lo=0.05, hi=0.05):
    """Precise onset time near t: half-way crossing of the onset envelope peak within [t-lo, t+hi]."""
    i0, i1 = np.searchsorted(ot, t - lo), np.searchsorted(ot, t + hi)
    if i1 - i0 < 3:
        return None, 0.0
    k = i0 + int(np.argmax(on[i0:i1]))
    pk = on[k]
    j = k
    while j > i0 and on[j - 1] > 0.5 * pk:
        j -= 1
    return float(ot[j]), float(pk)

offs, strength, tt = [], [], []
for g in grid[(grid > 0.5) & (grid < dur - 0.5)]:
    t, s = attack(g)
    if t is not None and s > 0.25:  # only beats with a real onset (rests and held notes have none)
        offs.append(t - g); strength.append(s); tt.append(g)
offs, tt = np.array(offs), np.array(tt)
frame = 1 / FPS
drift = float(np.polyfit(tt, offs, 1)[0] * 60) if len(tt) > 8 else None  # seconds of drift per minute
resid = float(np.std(offs - np.polyval(np.polyfit(tt, offs, 1), tt))) if len(tt) > 8 else None
fpb_exact = FPS * 60 / bpm
cands = []
for n in range(max(8, int(fpb_exact) - 2), int(fpb_exact) + 3):
    b = FPS * 60 / n
    cands.append({"bpm": round(b, 4), "frames_per_beat": n, "stretch_pct": round((b / bpm - 1) * 100, 3)})
cands.sort(key=lambda c: abs(c["stretch_pct"]))
res["grid"] = {"librosa_bpm": round(tempo0, 2), "scan_best_bpm": round(bpm_scan, 2), "bpm": round(bpm, 3),
               "phase_s": round(ph, 4),
               "grid_score": round(score, 3), "double_time_score": round(dbl, 3), "half_time_score": round(half, 3),
               "beats_with_onsets": int(len(offs)), "beats_total": int(len(grid)),
               "onset_coverage": round(len(offs) / max(1, len(grid)), 3),
               "median_abs_offset_ms": round(float(np.median(np.abs(offs))) * 1000, 2) if len(offs) else None,
               "median_offset_ms": round(float(np.median(offs)) * 1000, 2) if len(offs) else None,
               "within_1_frame_pct": round(float(np.mean(np.abs(offs) < frame)) * 100, 1) if len(offs) else None,
               "within_half_frame_pct": round(float(np.mean(np.abs(offs) < frame / 2)) * 100, 1) if len(offs) else None,
               "drift_s_per_min": None if drift is None else round(drift, 4),
               "timing_spread_ms": None if resid is None else round(resid * 1000, 2),
               "nearest_integer_fpb": cands[:3]}

# ---- structure: loudness per bar on the refined grid ----
# bar phase: the beat phase (0..3) whose beats carry the most low-band onset energy (kick/bass on the "one")
low = librosa.onset.onset_strength(y=y22, sr=22050, hop_length=HOP, fmax=200)
bstr = np.interp(grid, ot, low)
bph = int(np.argmax([bstr[k::4].mean() for k in range(4)])) if len(grid) > 16 else 0
down = grid[bph::4]
bar = 4 * P
rms = librosa.feature.rms(y=y22, hop_length=512)[0]
rt = librosa.times_like(rms, sr=22050, hop_length=512)
def bar_db(t):
    m = (rt >= t) & (rt < t + bar)
    return float(20 * np.log10(rms[m].mean() + 1e-9)) if m.any() else -120.0
bars = [{"i": i, "t": round(float(t), 3), "db": round(bar_db(t), 1)} for i, t in enumerate(down) if t + bar <= dur + 0.01]
bdb = np.array([b["db"] for b in bars])
lifts = np.diff(bdb)
k = int(np.argmax(lifts)) + 1 if len(lifts) else 0
# fit_music.py's drop finder: first >= 25 dB jump of the 35-120 Hz band over the previous 2 bars
Sx = np.abs(librosa.stft(y22, n_fft=1024, hop_length=128))
fx = librosa.fft_frequencies(sr=22050, n_fft=1024)
le = 20 * np.log10(Sx[(fx > 35) & (fx < 120)].sum(0) + 1e-9)
let = librosa.times_like(le, sr=22050, hop_length=128)
hs = let[1] - let[0]
lowdrop = None
for i in range(int(2 * bar / hs), len(le) - int(0.25 / hs)):
    pre = np.median(le[i - int(2 * bar / hs): i - int(0.05 / hs)])
    post = np.median(le[i: i + int(0.25 / hs)])
    if post - pre > 25:
        lowdrop = {"t": round(float(let[i]), 3), "jump_db": round(float(post - pre), 1)}
        break
loud_idx = np.where(bdb > bdb.max() - 12)[0]
last_loud = int(loud_idx.max()) if len(loud_idx) else len(bars) - 1
end_t = bars[last_loud]["t"] + bar if bars else dur
# natural decay after the last loud bar: seconds until the short-term level is 40 dB under the body level
body = float(np.median(bdb)) if len(bdb) else -60
after = (rt >= end_t)
quiet = np.where(after & (20 * np.log10(rms + 1e-9) < body - 40))[0]
ring = float(rt[quiet[0]] - end_t) if len(quiet) else float(dur - end_t)
res["structure"] = {"bar_s": round(bar, 4), "bar_phase": bph, "first_downbeat_s": round(float(down[0]), 3) if len(down) else None,
                    "n_bars": len(bars), "body_db": round(body, 1),
                    "biggest_lift": {"bar": k, "t": bars[k]["t"] if bars else None,
                                     "lift_db": round(float(lifts[k - 1]), 1) if len(lifts) else None},
                    "low_band_drop": lowdrop,
                    "last_loud_bar": last_loud, "last_loud_bar_end_s": round(float(end_t), 3),
                    "ringout_s": round(ring, 2), "tail_after_last_bar_s": round(float(dur - end_t), 2),
                    "bar_db": [b["db"] for b in bars]}
json.dump(res, open(a.out, "w"), indent=1)
show = {k: v for k, v in res.items() if k != "structure"}
show["structure"] = {k: v for k, v in res["structure"].items() if k != "bar_db"}
print(json.dumps(show, indent=1))
