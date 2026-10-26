"""score2 lane: measure ONE track for the film's multi-cue score (OVERRIDES §51). No audio is written: the MP3 is decoded
in memory, and only numbers (JSON) and analysis curves (NPZ) leave this script.

Usage (from the landing repo root, one track per heavy job):
  scripts/heavy.sh score2-map-NAME /usr/sbin/taskpolicy -c utility \
    .work/tools-eval/tools-tests/audio-venv/bin/python -I tools/audio/score2/measure_track.py \
    .work/music-audition/NAME.mp3 .work/score2/maps/NAME.map.json .work/score2/curves/NAME.npz

What it measures
  Loudness, at the file's own rate on both channels (ITU-R BS.1770 K-weighting from pyloudnorm's own filters):
    momentary (400 ms) and short-term (3 s) curves every 100 ms (centred windows), gated integrated loudness of any span,
    LRA (EBU Tech 3342), sample peak and 4x-oversampled true peak, stereo width (side/mid energy, L/R correlation).
  On a 22.05 kHz mono copy (the machine rule: a full-rate librosa map peaked at about 2 GB):
    - onset envelopes on an 11.6 ms hop: all bands (librosa's median flux), low band (< 200 Hz) and backbeat band
      (1.5-6 kHz);
    - librosa's dynamic-programming beat tracker, each beat snapped to the nearest onset peak within +-35 ms, a
      constant-tempo least-squares fit on the longest steady run, local tempo per 10 s (beats and tempogram), beat
      salience per 10 s;
    - downbeats by a 4-state Viterbi over beat positions (low-band onsets + harmonic change + local timbre change -
      backbeat), which can re-phase only on strong evidence, and reports every re-phase;
    - spectral shape on a 23.2 ms hop (centroid, low < 120 Hz, sub < 60 Hz, air > 5 kHz, flatness), a median-filter HPSS
      (17 x 17) for the percussive energy share and percussive onsets, CQT chroma of the harmonic part, MFCC;
    - per bar: loudness, short-term range, percussive share, onsets per beat, low/sub/air shares, centroid, width,
      chroma and MFCC (the bar table is compatible with tools-tests t5_cut.py);
    - sections from multi-scale checkerboard novelty (2, 4 and 8 bars) on the bar features plus loudness steps, on
      downbeats, with rule labels (reviewed by a person looking at the strips afterwards);
    - key and mode against three key profiles (Krumhansl-Kessler, Temperley, Albrecht-Shanahan), the Camelot code,
      tuning, and a key per section;
    - the ending: last strong onset, decay rate, fade or real ending.
"""
import hashlib
import json
import os
import resource
import sys
import time
import warnings

import librosa
import numpy as np
import pyloudnorm as pyln
import scipy.ndimage as ndi
import scipy.signal as ss
import soundfile as sf
import soxr

warnings.filterwarnings("ignore", category=RuntimeWarning)
path, out_json, out_npz = sys.argv[1], sys.argv[2], sys.argv[3]
T0 = time.perf_counter()
NAME = os.path.splitext(os.path.basename(path))[0]
with open(path, "rb") as fh:
    SHA = hashlib.sha256(fh.read()).hexdigest()


def r(v, d=2):
    return None if v is None or not np.isfinite(v) else round(float(v), d)


# ---------------------------------------------------------------------------------------------------- loudness, stereo
y, sr = sf.read(path, dtype="float32", always_2d=True)  # (n, ch)
n, nch = y.shape
DUR = n / sr
LH = 0.1
hopL = int(round(sr * LH))
nsub = n // hopL
meter = pyln.Meter(sr)
ms_sub = np.zeros(nsub)
for c in range(nch):
    x = y[:, c].astype(np.float64)
    for f in meter._filters.values():  # high shelf, then high pass (BS.1770 K-weighting at this rate)
        x = f.apply_filter(x)
    ms_sub += (x[: nsub * hopL] ** 2).reshape(nsub, hopL).mean(1)
    del x


def lufs_of(ms):
    return -0.691 + 10 * np.log10(np.maximum(ms, 1e-20))


MOM = lufs_of(ndi.uniform_filter1d(ms_sub, 4, mode="nearest"))  # centred at t = 0.1 k
ST = lufs_of(ndi.uniform_filter1d(ms_sub, 30, mode="nearest"))
LT = np.arange(nsub) * LH
BLK = np.convolve(ms_sub, np.ones(4) / 4, mode="valid")  # 400 ms gating blocks every 100 ms; block j starts at 0.1 j
STB = np.convolve(ms_sub, np.ones(30) / 30, mode="valid")  # 3 s blocks every 100 ms


def integrated(a, b):
    """Gated integrated loudness (BS.1770-4) of [a, b) seconds."""
    j0 = max(0, int(np.ceil(a / LH - 1e-9)))
    j1 = int(np.floor(b / LH + 1e-9)) - 4 + 1
    if j1 <= j0:
        return None
    z = BLK[j0:j1]
    lj = lufs_of(z)
    g1 = lj >= -70
    if not g1.any():
        return -70.0
    gr = lufs_of(z[g1].mean()) - 10
    g2 = g1 & (lj > gr)
    return float(lufs_of(z[g2].mean())) if g2.any() else float(lufs_of(z[g1].mean()))


def lra(a=0.0, b=None):
    b = DUR if b is None else b
    j0 = max(0, int(np.ceil(a / LH))); j1 = int(np.floor(b / LH)) - 30 + 1
    if j1 - j0 < 10:
        return None
    z = STB[j0:j1]; lj = lufs_of(z)
    g = lj >= -70
    if g.sum() < 10:
        return None
    rel = lufs_of(z[g].mean()) - 20
    v = lj[g & (lj >= rel)]
    return float(np.percentile(v, 95) - np.percentile(v, 10))


def true_peak(x):
    best, CH, pad = 0.0, 1 << 18, 64
    for i in range(0, len(x), CH):
        a0, b0 = max(0, i - pad), min(len(x), i + CH + pad)
        u = ss.resample_poly(x[a0:b0].astype(np.float64), 4, 1)
        lo = (i - a0) * 4
        hi = lo + (min(i + CH, len(x)) - i) * 4
        best = max(best, float(np.max(np.abs(u[lo:hi]))))
    return best


sample_peak = float(np.max(np.abs(y)))
tp = max(true_peak(y[:, c]) for c in range(nch))
if nch >= 2:
    Lc = y[: nsub * hopL, 0].reshape(nsub, hopL)
    Rc = y[: nsub * hopL, 1].reshape(nsub, hopL)
    sLL = (Lc.astype(np.float64) ** 2).sum(1); sRR = (Rc.astype(np.float64) ** 2).sum(1)
    sLR = (Lc.astype(np.float64) * Rc.astype(np.float64)).sum(1)
    del Lc, Rc
else:
    sLL = sRR = sLR = np.ones(nsub)
mono44 = y.mean(1)
del y
SR = 22050
mono = soxr.resample(mono44, sr, SR, quality="HQ").astype(np.float32)
del mono44


def width_db(a, b):
    k0, k1 = int(a / LH), max(int(a / LH) + 1, int(b / LH))
    ll, rr, lr = sLL[k0:k1].sum(), sRR[k0:k1].sum(), sLR[k0:k1].sum()
    mid, side = (ll + rr + 2 * lr) / 4, (ll + rr - 2 * lr) / 4
    corr = lr / np.sqrt(ll * rr + 1e-20)
    return 10 * np.log10((side + 1e-20) / (mid + 1e-20)), corr


# ------------------------------------------------------------------------------------------- onset envelopes (11.6 ms)
HB = 256
D = librosa.stft(mono, n_fft=2048, hop_length=HB)
S256 = np.abs(D); del D
S256 **= 2
mel_all = librosa.feature.melspectrogram(S=S256, sr=SR, n_mels=128, fmax=11025)
mel_low = librosa.feature.melspectrogram(S=S256, sr=SR, n_mels=32, fmax=200)
mel_bb = librosa.feature.melspectrogram(S=S256, sr=SR, n_mels=32, fmin=1500, fmax=6000)
del S256
OENV = librosa.onset.onset_strength(S=librosa.power_to_db(mel_all), sr=SR, hop_length=HB, aggregate=np.median)
OLOW = librosa.onset.onset_strength(S=librosa.power_to_db(mel_low), sr=SR, hop_length=HB)
OBB = librosa.onset.onset_strength(S=librosa.power_to_db(mel_bb), sr=SR, hop_length=HB)
del mel_all, mel_low, mel_bb
OT = librosa.times_like(OENV, sr=SR, hop_length=HB)

# --------------------------------------------------------------------------------------- the tracker (diagnostic only)
# librosa's tracker on the all-band envelope locks onto off-beat hats in places (seen on Techno Fest Vibes at 61 s and
# 77 s: two intervals of 0.615 + 0.592 s, half a beat). It only seeds the period here; the grid below is fitted.
tempo0, bf = librosa.beat.beat_track(onset_envelope=OENV, sr=SR, hop_length=HB, trim=False)
tempo0 = float(np.atleast_1d(tempo0)[0])
tb = librosa.frames_to_time(bf, sr=SR, hop_length=HB)
tioi = np.diff(tb)
med_ioi = float(np.median(tioi))
ok5 = np.abs(tioi / med_ioi - 1) < 0.05
best_run, cur = (0, 0), 0
for i, v in enumerate(ok5):
    cur = cur + 1 if v else 0
    if cur > best_run[1] - best_run[0]:
        best_run = (i - cur + 1, i + 1)
ti0, ti1 = best_run[0], best_run[1] + 1
P0 = float(np.polyfit(np.arange(ti0, ti1), tb[ti0:ti1], 1)[0]) if ti1 - ti0 >= 8 else med_ioi
TRACKER = {"librosa_bpm": r(tempo0, 2), "bpm_median_ioi": r(60 / med_ioi, 2), "bpm_longest_steady_run": r(60 / P0, 3),
           "steady_run_s": [r(tb[ti0], 2), r(tb[min(ti1, len(tb)) - 1], 2)],
           "share_ioi_5pct": r(np.mean(ok5), 3), "share_ioi_2pct": r(np.mean(np.abs(tioi / med_ioi - 1) < 0.02), 3),
           "half_beat_slips_s": [r(tb[i], 2) for i in range(len(tioi) - 1)
                                 if abs((tioi[i] + tioi[i + 1]) / P0 - 2.5) < 0.12 or abs((tioi[i] + tioi[i + 1]) / P0 - 1.5) < 0.12]}

# ------------------------------------------------------------------------------------ the beat grid (comb fit, 11.6 ms)
pk = librosa.util.peak_pick(OENV, pre_max=3, post_max=3, pre_avg=10, post_avg=10, delta=0.05, wait=3)
PT = librosa.frames_to_time(pk, sr=SR, hop_length=HB)
_alive = np.where(MOM > -60)[0]
_tls = float(LT[_alive[-1]]) if len(_alive) else DUR
_strong = PT[(OENV[pk] >= np.percentile(OENV, 97) * 0.35)]
_strong = _strong[_strong <= _tls]
t_last_hit_pre = float(_strong[-1]) if len(_strong) else None
ES = (ndi.gaussian_filter1d(OLOW / (np.percentile(OLOW, 99) + 1e-9), 1.5)
      + 0.5 * ndi.gaussian_filter1d(OENV / (np.percentile(OENV, 99) + 1e-9), 1.5))  # kick-weighted pulse envelope


def comb(P, phis, ta, tb_):
    phis = np.atleast_1d(phis)
    ks = np.arange(np.floor((ta - phis.max()) / P) - 1, np.ceil((tb_ - phis.min()) / P) + 2)
    T = phis[:, None] + ks[None, :] * P
    v = (T >= ta) & (T <= tb_)
    return (np.interp(T, OT, ES) * v).sum(1) / np.maximum(v.sum(1), 1)


lvl = np.percentile(ST[ST > -50], 75) if (ST > -50).any() else -20.0
snd = np.where(ST > lvl - 20)[0]
T_ON, T_OFF = float(LT[snd[0]]), float(LT[snd[-1]])
best = (-np.inf, P0, 0.0)
for P in P0 * (1 + np.linspace(-0.006, 0.006, 241)):
    phis = np.arange(0, P, 0.002)
    sc_ = comb(P, phis, T_ON, T_OFF)
    j = int(np.argmax(sc_))
    if sc_[j] > best[0]:
        best = (float(sc_[j]), float(P), float(phis[j]))
for _ in range(2):  # refine period and phase
    Pc, fc = best[1], best[2]
    for P in Pc * (1 + np.linspace(-0.0003, 0.0003, 61)):
        phis = fc + np.arange(-0.006, 0.0061, 0.00025)
        sc_ = comb(P, phis, T_ON, T_OFF)
        j = int(np.argmax(sc_))
        if sc_[j] > best[0]:
            best = (float(sc_[j]), float(P), float(phis[j]))
SUBDIV = (0.25, 1 / 3, 0.5, 2 / 3, 0.75)


def local_check(PG, PHG):
    """Best phase offset of a constant grid in 16-beat windows (hop 8 beats), with its clarity."""
    out = []
    ds = np.arange(-PG / 2, PG / 2, 0.002)
    for w0 in np.arange(max(0.0, T_ON - PG), T_OFF - 4 * PG, 8 * PG):
        w1 = min(T_OFF, w0 + 16 * PG)
        sc_ = comb(PG, PHG + ds, w0, w1)
        j = int(np.argmax(sc_))
        half = comb(PG, PHG + ds[j] + PG / 2, w0, w1)[0]
        out.append({"t0": round(float(w0), 2), "delta_ms": round(float(ds[j] * 1000), 1),
                    "clarity": round(float((sc_[j] - sc_.mean()) / (sc_.std() + 1e-9)), 2),
                    "onbeat_vs_offbeat": round(float(sc_[j] / (half + 1e-9)), 2)})
    return out


def subdiv_of(dms, P_=None):
    """The simple beat fraction (+-1/4, 1/3, 1/2, 2/3, 3/4) that an offset sits on within 25 ms, else None."""
    P_ = P_ or PG
    for f_ in SUBDIV:
        for sg in (1, -1):
            if abs(dms / 1000 - sg * f_ * P_) <= 0.025:
                return round(sg * f_, 3)
    return None


def fit_level(Pc):
    bst = (-np.inf, Pc, 0.0)
    for P in Pc * (1 + np.linspace(-0.004, 0.004, 41)):
        phis = np.arange(0, P, 0.002)
        sc_ = comb(P, phis, T_ON, T_OFF)
        j = int(np.argmax(sc_))
        if sc_[j] > bst[0]:
            bst = (float(sc_[j]), float(P), float(phis[j]))
    for _ in range(2):
        Pc2, fc = bst[1], bst[2]
        for P in Pc2 * (1 + np.linspace(-0.0003, 0.0003, 61)):
            phis = fc + np.arange(-0.006, 0.0061, 0.00025)
            sc_ = comb(P, phis, T_ON, T_OFF)
            j = int(np.argmax(sc_))
            if sc_[j] > bst[0]:
                bst = (float(sc_[j]), float(P), float(phis[j]))
    return bst


# the metrical level: the tracker's level and its simple relatives between 60 and 150 BPM; the level whose grid most
# windows sit on (with at most 10 % unexplained) wins; with none clean, the best comb. Measured on 26 Oct: Convergence's
# 120 BPM was three sixteenths of 90, Aphelion's 120 a hemiola of an 80 BPM dotted pulse.
LEVELS = []
for f_ in (1.0, 4 / 3, 3 / 4, 3 / 2, 2 / 3, 2.0, 0.5):
    Pc = best[1] * f_
    if not (60 <= 60 / Pc <= 150):
        continue
    b_ = best if f_ == 1.0 else fit_level(Pc)
    PGc, PHc = b_[1], b_[2] % b_[1]
    loc_ = local_check(PGc, PHc)
    cl_ = [w for w in loc_ if w["clarity"] >= 1.8]
    on_ = sum(1 for w in cl_ if abs(w["delta_ms"]) <= 25)
    un_ = sum(1 for w in cl_ if abs(w["delta_ms"]) > 25 and subdiv_of(w["delta_ms"], PGc) is None)
    LEVELS.append({"factor": round(f_, 3), "bpm": round(60 / PGc, 3), "comb": round(b_[0], 3), "clear": len(cl_),
                   "on_grid": on_, "unexplained": un_, "P": PGc, "phase": PHc})
clean = [l_ for l_ in LEVELS if l_["clear"] and l_["unexplained"] <= 0.1 * l_["clear"]]
if clean:
    top_share = max(l_["on_grid"] / l_["clear"] for l_ in clean)
    # near-equal clean levels: the one nearest 120 BPM (the usual tempo prior), so a half-time feel stays a feel
    pick = min([l_ for l_ in clean if l_["on_grid"] / l_["clear"] >= top_share - 0.05], key=lambda l_: abs(np.log2(l_["bpm"] / 120)))
else:
    pick = max(LEVELS, key=lambda l_: l_["comb"])
PG, PHG = pick["P"], pick["phase"]
LOCAL = local_check(PG, PHG)
clear = [w for w in LOCAL if w["clarity"] >= 1.8]


on0 = [w for w in clear if abs(w["delta_ms"]) <= 25]
offs = [w for w in clear if abs(w["delta_ms"]) > 25]
span = T_OFF - T_ON
spread = bool(on0) and min(w["t0"] for w in on0) <= T_ON + span / 3 and max(w["t0"] for w in on0) >= T_OFF - span / 3 - 16 * PG
# constant: most clear windows sit on the grid, across the whole track, and every other one sits exactly on a simple
# subdivision (a syncopated or triplet low end in that section), never on a drifting offset
unexplained = [w for w in offs if subdiv_of(w["delta_ms"]) is None]
CONST = bool(clear) and len(on0) / len(clear) >= 0.4 and spread and len(unexplained) <= 0.1 * len(clear)
SYNC = [{"t0": w["t0"], "offset_beats": subdiv_of(w["delta_ms"]), "clarity": w["clarity"]} for w in offs]
if CONST:
    k0 = int(np.ceil((0 - PHG) / PG)); k1 = int(np.floor((DUR - PHG) / PG))
    beats = PHG + np.arange(k0, k1 + 1) * PG
    GRID_MODE = "constant"
else:
    # variable tempo: a tight dynamic-programming track on the kick-weighted envelope, seeded at the fitted period
    _, bf2 = librosa.beat.beat_track(onset_envelope=ES, sr=SR, hop_length=HB, bpm=60 / PG, tightness=400, trim=False)
    beats = librosa.frames_to_time(bf2, sr=SR, hop_length=HB)
    GRID_MODE = "variable (tight DP track on the kick-weighted envelope)"
beats = beats[(beats >= 0) & (beats < DUR)]
ioi = np.diff(beats)
# how far the grid sits from the nearest onset peak (clear-pulse regions only)
off = []
for b in beats:
    j = np.searchsorted(PT, b)
    c_ = [PT[k] - b for k in (j - 1, j) if 0 <= k < len(PT) and abs(PT[k] - b) <= 0.04]
    if c_:
        off.append(min(c_, key=abs))
off = np.array(off) if off else np.zeros(1)
tg_bpm = librosa.feature.tempo(onset_envelope=OENV, sr=SR, hop_length=HB, aggregate=None, ac_size=8.0,
                               start_bpm=60 / PG, std_bpm=0.5)
loc = []
for w0 in np.arange(0, DUR, 10.0):
    w1 = min(DUR, w0 + 10.0)
    m = (beats[:-1] >= w0) & (beats[:-1] < w1)
    mt = (OT >= w0) & (OT < w1)
    ib = ioi[m]
    bfr = np.clip(librosa.time_to_frames(beats[(beats >= w0) & (beats < w1)], sr=SR, hop_length=HB), 0, len(OENV) - 1)
    sal = float(np.mean(ES[bfr]) / (np.mean(ES[mt]) + 1e-9)) if len(bfr) >= 4 and mt.any() else None
    loc.append({"t0": r(w0, 1), "bpm_grid": r(60 / np.median(ib), 2) if len(ib) >= 4 else None,
                "bpm_tempogram": r(np.median(tg_bpm[mt]), 1) if mt.any() else None,
                "beat_salience": r(sal, 2), "st_lufs": r(np.median(ST[(LT >= w0) & (LT < w1)]), 1)})
tgm = librosa.feature.tempogram(onset_envelope=OENV, sr=SR, hop_length=HB, win_length=512).mean(1)
tg_freqs = librosa.tempo_frequencies(len(tgm), sr=SR, hop_length=HB)
okf = (tg_freqs >= 50) & (tg_freqs <= 220)
order = np.argsort(tgm[okf])[::-1]
cand = []
for k in order:
    f_ = float(tg_freqs[okf][k])
    if all(abs(f_ / c - 1) > 0.04 for c, _ in cand):
        cand.append((f_, float(tgm[okf][k])))
    if len(cand) == 4:
        break

# -------------------------------------------------------------------------- spectral shape, HPSS, chroma, MFCC (23 ms)
HS = 512
D = librosa.stft(mono, n_fft=2048, hop_length=HS)
S = np.abs(D)
FREQ = librosa.fft_frequencies(sr=SR, n_fft=2048)
P2 = S ** 2
tot = P2.sum(0) + 1e-12
LOWS = P2[FREQ < 120].sum(0) / tot
SUBS = P2[FREQ < 60].sum(0) / tot
AIRS = P2[FREQ >= 5000].sum(0) / tot
CENT = (FREQ[:, None] * S).sum(0) / (S.sum(0) + 1e-9)
FLAT = librosa.feature.spectral_flatness(S=S)[0]
H = ndi.median_filter(S, size=(1, 17), mode="nearest")
Pp = ndi.median_filter(S, size=(17, 1), mode="nearest")
Mh = H ** 2 / (H ** 2 + Pp ** 2 + 1e-12)
del H
PERC = ((1 - Mh) * P2).sum(0) / tot  # percussive energy share per frame
# percussive onsets (density of percussion)
pm = librosa.feature.melspectrogram(S=(Pp ** 2), sr=SR, n_mels=64, fmax=11025)
del Pp
PFLUX = np.r_[0, np.maximum(0, np.diff(librosa.power_to_db(pm), axis=1)).mean(0)]
del pm
ST_ = librosa.times_like(CENT, sr=SR, hop_length=HS)
pp = librosa.util.peak_pick(PFLUX, pre_max=2, post_max=2, pre_avg=8, post_avg=8,
                            delta=float(np.percentile(PFLUX, 75) * 0.5 + 1e-6), wait=3)
PONS = ST_[pp]
mono_h = librosa.istft(D * Mh, hop_length=HS, length=len(mono)).astype(np.float32)
del D, Mh
MEL = librosa.feature.melspectrogram(S=P2, sr=SR, n_mels=128, fmax=11025)
del P2
tuning = float(librosa.estimate_tuning(S=S, sr=SR, n_fft=2048))  # fraction of a semitone
del S
MELDB = librosa.power_to_db(MEL, ref=np.max, top_db=90)
MFCC = librosa.feature.mfcc(S=librosa.power_to_db(MEL), n_mfcc=13)
del MEL
CHROMA = librosa.feature.chroma_cqt(y=mono_h, sr=SR, hop_length=HS, bins_per_octave=36, tuning=tuning * 3)  # bins of 1/3 st
del mono_h
nfr = min(CHROMA.shape[1], len(CENT))
CHROMA = CHROMA[:, :nfr]

# ------------------------------------------------------------------------------------- downbeats (Viterbi, 4/4)
def at_beats(env, tt, bt, w=2):
    fr = np.searchsorted(tt, bt)
    return np.array([env[max(0, f - w):f + w + 1].max() if f < len(env) else 0 for f in fr])


z = lambda v: (v - np.mean(v)) / (np.std(v) + 1e-9)  # noqa: E731
bidx = np.clip(np.searchsorted(ST_[:nfr], beats), 0, nfr - 1)
cb = librosa.util.sync(CHROMA, bidx, aggregate=np.median, pad=False)
cb = cb / (np.linalg.norm(cb, axis=0, keepdims=True) + 1e-9)
mb = librosa.util.sync(MFCC[:, :nfr], bidx, aggregate=np.mean, pad=False)
nb_ = min(cb.shape[1], len(beats))
cb, mb = cb[:, :nb_], mb[:, :nb_]
hchg = np.r_[0, 1 - np.sum(cb[:, 1:] * cb[:, :-1], axis=0)]
mbz = (mb - mb.mean(1, keepdims=True)) / (mb.std(1, keepdims=True) + 1e-9)
feat_b = np.vstack([mbz * 0.6, cb * 2.0])
nov2 = np.zeros(nb_); nov8 = np.zeros(nb_)
for i in range(1, nb_ - 1):
    a_, b_ = feat_b[:, max(0, i - 2):i].mean(1), feat_b[:, i:i + 2].mean(1)
    nov2[i] = np.linalg.norm(a_ - b_)
    a_, b_ = feat_b[:, max(0, i - 8):i].mean(1), feat_b[:, i:i + 8].mean(1)
    nov8[i] = np.linalg.norm(a_ - b_)
bmom = np.interp(beats[:nb_], LT, MOM)
lstep = np.zeros(nb_)
for i in range(2, nb_ - 2):
    lstep[i] = np.mean(bmom[i:i + 2]) - np.mean(bmom[i - 2:i])
lowb = at_beats(OLOW, OT, beats[:nb_])
bbb = at_beats(OBB, OT, beats[:nb_])
# beat-level texture change: mean log-mel of the next two beats against the last two (sharpest at section changes)
melb = librosa.util.sync(MELDB[:, :nfr], bidx, aggregate=np.mean, pad=False)[:, :nb_]
BNOV = np.zeros(nb_)
for i in range(2, nb_ - 1):
    BNOV[i] = np.linalg.norm(melb[:, i:i + 2].mean(1) - melb[:, i - 2:i].mean(1)) / np.sqrt(melb.shape[0])
BNOV[:3] = np.minimum(BNOV[:3], np.median(BNOV))  # the music's start from silence is not a phrase change
BPK = np.zeros(nb_)  # texture change only at its local peaks (+-1 beat), scaled to its 99th percentile, capped
for i in range(1, nb_ - 1):
    if BNOV[i] >= BNOV[i - 1] and BNOV[i] >= BNOV[i + 1]:
        BPK[i] = min(1.5, BNOV[i] / (np.percentile(BNOV, 99) + 1e-9))
FEAT = (z(hchg) + 0.5 * z(nov8) + 0.3 * z(nov2) + 0.4 * z(np.maximum(lstep, 0)) + 0.4 * z(lowb) - 0.3 * z(bbb)
        + 3.0 * BPK)
# semi-Markov DP over downbeats: bar lengths 4 (free), 2 or 6 (cost 10), 3 or 5 (cost 14); never 1 or 7+ beats.
# Only the span where the music plays is analysed; bars before and after are extrapolated at 4 beats.
# drop-class arrivals (a +5 LU or larger 2-beat step with a strong texture change, away from the music's start and
# end) land on bar 1 in this music: they are anchored as downbeats, and the DP places any odd bar where evidence is weakest
p99b = float(np.percentile(BNOV, 99)) + 1e-9
ANCH = []
for i in range(3, nb_ - 2):
    if lstep[i] >= 5.0 and BNOV[i] / p99b >= 0.9 and T_ON + 2 < beats[i] < (t_last_hit_pre or DUR) - 2:
        sc_i = BNOV[i] / p99b + lstep[i] / 6
        if not ANCH or i - ANCH[-1][0] > 2:
            ANCH.append((i, sc_i))
        elif sc_i > ANCH[-1][1]:
            ANCH[-1] = (i, sc_i)
for i, _ in ANCH:
    FEAT[i] += 15.0
    for k in range(1, 9):  # the arrival starts a phrase: its bar lines carry on for 8 bars unless evidence says otherwise
        if i + 4 * k < nb_:
            FEAT[i + 4 * k] += 3.0
BAR_PEN = {4: 0.0, 2: 10.0, 6: 10.0, 3: 14.0, 5: 14.0}
bm = np.interp(beats[:nb_], LT, MOM)
live = np.where(bm > (lvl - 30))[0]
ia, ib_ = (int(live[0]), int(live[-1])) if len(live) else (0, nb_ - 1)
if t_last_hit_pre is not None:
    ib_ = min(ib_, int(np.searchsorted(beats[:nb_], t_last_hit_pre + 0.05)))
Dp = np.full(nb_, -1e18); back = np.full(nb_, -1, dtype=int)
for i in range(ia, ib_ + 1):
    if i < ia + 4:
        Dp[i] = FEAT[i]
    for L, pl in BAR_PEN.items():
        j = i - L
        if j >= ia and Dp[j] > -1e17 and Dp[j] - pl + FEAT[i] > Dp[i]:
            Dp[i] = Dp[j] - pl + FEAT[i]; back[i] = j
i = int(np.argmax(Dp[max(ia, ib_ - 3):ib_ + 1])) + max(ia, ib_ - 3)
dlist = [i]
while back[i] >= 0:
    i = back[i]; dlist.append(i)
dlist = dlist[::-1]
while dlist[0] - 4 >= 0:  # extrapolate before the music's span
    dlist.insert(0, dlist[0] - 4)
while dlist[-1] + 4 < nb_:  # and after it
    dlist.append(dlist[-1] + 4)
DIDX = np.array(dlist)
PATH = np.full(nb_, -1)
for k in range(len(DIDX)):
    e = DIDX[k + 1] if k + 1 < len(DIDX) else nb_
    PATH[DIDX[k]:e] = np.arange(e - DIDX[k])
PATH[:DIDX[0]] = (np.arange(DIDX[0]) - DIDX[0]) % 4
ODD = [{"bar_start_s": r(beats[DIDX[k]], 3), "beats": int(DIDX[k + 1] - DIDX[k])} for k in range(len(DIDX) - 1)
       if DIDX[k + 1] - DIDX[k] != 4]
SLIPS = [int(DIDX[k + 1]) for k in range(len(DIDX) - 1) if DIDX[k + 1] - DIDX[k] != 4]
DOWN = beats[DIDX]
gscores = [float(np.mean(FEAT[p::4])) for p in range(4)]
go = np.argsort(gscores)[::-1]

# change points: local peaks of the beat-level texture change (>= its 95th percentile) or 2-beat loudness steps of
# 3 LU or more, with their position in the measured bar; they are the music's own phrase starts, hits and stops
dpos = np.full(nb_, -1)
for k in range(len(DIDX)):
    e = DIDX[k + 1] if k + 1 < len(DIDX) else nb_
    dpos[DIDX[k]:e] = np.arange(e - DIDX[k])
p95 = float(np.percentile(BNOV, 95)); p99 = float(np.percentile(BNOV, 99)) + 1e-9
CHANGES = []
for i in range(3, nb_ - 2):
    pkn = BNOV[i] >= BNOV[i - 1] and BNOV[i] >= BNOV[i + 1] and BNOV[i] >= p95
    st_ = lstep[i]
    pks = abs(st_) >= 3.0 and abs(st_) >= np.abs(lstep[max(0, i - 1):i + 2]).max()
    if pkn or pks:
        CHANGES.append({"t": r(beats[i], 3), "beat": int(i), "pos_in_bar": int(dpos[i]), "texture": r(BNOV[i] / p99, 2),
                        "loud_step_lu": r(st_, 1), "strength": r(BNOV[i] / p99 + abs(st_) / 6, 2)})
CHANGES.sort(key=lambda c_: -c_["strength"])
CHANGES = sorted(CHANGES[:40], key=lambda c_: c_["t"])
big = [c_ for c_ in CHANGES if c_["strength"] >= 1.0 and T_ON + 2 < c_["t"] < (t_last_hit_pre or DUR) - 1]
PHASE_AGREE = {"big_changes": len(big), "on_downbeat": sum(1 for c_ in big if c_["pos_in_bar"] == 0),
               "on_half_bar": sum(1 for c_ in big if c_["pos_in_bar"] == 2),
               "on_odd_beats": sum(1 for c_ in big if c_["pos_in_bar"] in (1, 3))}

# ------------------------------------------------------------------------------------------------------------ bars
def fr_mask(a, b, tt):
    return (tt >= a) & (tt < b)


def wavg(v, w, m):
    return float(np.sum(v[m] * w[m]) / (np.sum(w[m]) + 1e-12)) if m.any() else float("nan")


ENER = 10 ** (MELDB.max(0) / 10)  # frame weight for averages (louder frames count more)
TOT = tot[:nfr] if len(tot) >= nfr else tot
bars = []
for k in range(len(DOWN) - 1):
    a, b = float(DOWN[k]), float(DOWN[k + 1])
    m = fr_mask(a, b, ST_[:nfr])
    lm = fr_mask(a, b, LT)
    c = CHROMA[:, m].mean(1) if m.any() else np.zeros(12)
    f_ = MFCC[:, :nfr][:, m].mean(1) if m.any() else np.zeros(13)
    wdb, corr = width_db(a, b)
    nbeats = int(np.sum((beats >= a - 1e-6) & (beats < b - 1e-6)))
    npo = int(np.sum((PONS >= a) & (PONS < b)))
    lu = integrated(a, b)
    bars.append({
        "start": round(a, 4), "end": round(b, 4), "lufs": r(lu), "st_max": r(ST[lm].max() if lm.any() else None),
        "mom_min": r(MOM[lm].min() if lm.any() else None), "mom_max": r(MOM[lm].max() if lm.any() else None),
        "rms_db": r(10 * np.log10(np.mean(10 ** (MOM[lm] / 10)) + 1e-12) if lm.any() else None),
        "perc": r(wavg(PERC[:nfr], TOT, m), 3), "low": r(wavg(LOWS[:nfr], TOT, m), 3),
        "sub": r(wavg(SUBS[:nfr], TOT, m), 3), "air": r(wavg(AIRS[:nfr], TOT, m), 4),
        "centroid": r(wavg(CENT[:nfr], TOT, m), 0), "flat": r(np.median(FLAT[:nfr][m]) if m.any() else None, 4),
        "width_db": r(wdb, 1), "corr": r(corr, 3), "beats": nbeats, "perc_onsets_per_beat": r(npo / max(nbeats, 1), 2),
        "chroma": [round(float(v), 4) for v in c / (np.linalg.norm(c) + 1e-9)],
        "mfcc": [round(float(v), 3) for v in f_]})
NBAR = len(bars)
BL = np.array([b["lufs"] if b["lufs"] is not None else -70.0 for b in bars])

# --------------------------------------------------------------------------------------------- novelty and sections
def zcol(M):
    return (M - M.mean(0)) / (M.std(0) + 1e-9)


Xc = np.array([b["chroma"] for b in bars])
Xm = zcol(np.array([b["mfcc"] for b in bars]))
Xs = zcol(np.array([[b["lufs"] or -70, b["perc"] or 0, b["low"] or 0, b["centroid"] or 0, b["perc_onsets_per_beat"] or 0]
                    for b in bars]))
X = np.hstack([Xc * 1.0, Xm * 0.6, Xs * 0.9])
Xn = X / (np.linalg.norm(X, axis=1, keepdims=True) + 1e-9)
SSM = Xn @ Xn.T


def foote(K):
    nov = np.zeros(NBAR + 1)
    g = np.exp(-0.5 * ((np.arange(-K, K) + 0.5) / (0.6 * K)) ** 2)
    sgn = np.sign(np.arange(-K, K) + 0.5)
    C = np.outer(g, g) * np.outer(sgn, sgn)
    for bnd in range(1, NBAR):
        lo, hi = bnd - K, bnd + K
        if lo < 0 or hi > NBAR:
            kk = min(bnd, NBAR - bnd)
            if kk < 2:
                continue
            gg = np.exp(-0.5 * ((np.arange(-kk, kk) + 0.5) / (0.6 * kk)) ** 2)
            ssg = np.sign(np.arange(-kk, kk) + 0.5)
            CC = np.outer(gg, gg) * np.outer(ssg, ssg)
            nov[bnd] = np.sum(CC * SSM[bnd - kk:bnd + kk, bnd - kk:bnd + kk]) / np.sum(np.abs(CC))
        else:
            nov[bnd] = np.sum(C * SSM[lo:hi, lo:hi]) / np.sum(np.abs(C))
    return nov


NOVS = {K: foote(K) for K in (2, 4, 8)}
NOV = np.mean([v / (v.max() + 1e-9) for v in NOVS.values()], axis=0)
STEP = np.zeros(NBAR + 1)
for bnd in range(1, NBAR):
    lo = BL[max(0, bnd - 2):bnd]; hi = BL[bnd:bnd + 2]
    STEP[bnd] = np.mean(hi) - np.mean(lo)
cand_b = set()
thr = float(np.median(NOV[1:NBAR]) + 0.75 * np.std(NOV[1:NBAR]))
for bnd in range(1, NBAR):
    w = NOV[max(1, bnd - 3):min(NBAR, bnd + 4)]
    if NOV[bnd] >= thr and NOV[bnd] == w.max():
        cand_b.add(bnd)
    ws = np.abs(STEP[max(1, bnd - 2):min(NBAR, bnd + 3)])
    if abs(STEP[bnd]) >= 3.0 and abs(STEP[bnd]) == ws.max():
        cand_b.add(bnd)
# the phrase grid: the bar offset (mod 4) on which most detected boundaries sit exactly
ev = NOV[:NBAR] / (NOV.max() + 1e-9) + np.abs(STEP[:NBAR]) / 6.0
cb_sorted = sorted(cand_b)
on_cnt = [sum(1 for bb in cb_sorted if (bb - o) % 4 == 0) for o in range(4)]
PH_OFF = int(np.argmax(on_cnt))
PH_ON = on_cnt[PH_OFF] / max(1, len(cb_sorted))
PH_NEAR = sum(1 for bb in cb_sorted if (bb - PH_OFF) % 4 in (1, 3)) / max(1, len(cb_sorted))
ph_sc = [float(np.mean(ev[np.arange(o if o else 4, NBAR, 4)])) for o in range(4)]
PH_STRENGTH = PH_ON
strength = {bb: NOV[bb] / (NOV.max() + 1e-9) + abs(STEP[bb]) / 6.0 for bb in cb_sorted}
SNAPPED = {}
anch_t = [float(beats[i]) for i, _ in ANCH]
strong_t = [c_["t"] for c_ in CHANGES if c_["strength"] >= 1.0]


def pinned(bb):
    t_ = float(DOWN[bb]) if bb < len(DOWN) else DUR
    return any(abs(t_ - a_) < 0.06 for a_ in anch_t + strong_t)


if PH_ON >= 0.5 and len(cb_sorted) >= 3:  # a clear 4-bar phrase grid: boundaries one bar off it move onto it
    snapped = []
    for bb in cb_sorted:
        rem = (bb - PH_OFF) % 4
        if rem in (1, 3) and not pinned(bb):
            p_ = bb - 1 if rem == 1 else bb + 1
            if 1 <= p_ < NBAR and ev[p_] >= 0.35 * ev[bb]:
                SNAPPED[p_] = bb
                strength[p_] = max(strength.get(p_, 0), strength[bb])
                bb = p_
        snapped.append(bb)
    cb_sorted = sorted(set(snapped))
merged = []
for bb in cb_sorted:
    if merged and bb - merged[-1] < 3:
        if strength[bb] > strength[merged[-1]]:
            merged[-1] = bb
    else:
        merged.append(bb)
BOUNDS = [0] + [bb for bb in merged if 2 <= bb <= NBAR - 2] + [NBAR]

# drive and peak levels (bars above -40 LUFS)
lv = BL[BL > -40]
DRIVE = float(np.percentile(lv, 75)) if len(lv) else -20.0
PEAK = float(np.percentile(lv, 95)) if len(lv) else -15.0
MEDPERC = float(np.median([b["perc"] for b in bars]))


def bar_t(k):
    return float(DOWN[k]) if k < len(DOWN) else DUR


# the final hit: the last strong onset before the music's last sound; a boundary is forced on its downbeat
alive = np.where(MOM > max(-60.0, DRIVE - 45))[0]
t_last_sound = float(LT[alive[-1]]) if len(alive) else DUR
thr_on = np.percentile(OENV, 97) * 0.35
strong = PT[(OENV[pk] >= thr_on)]
strong = strong[strong <= t_last_sound]
t_last_hit = float(strong[-1]) if len(strong) else None
FINAL_BAR = None
if t_last_hit is not None and len(DOWN):
    kfin = int(np.argmin(np.abs(DOWN - t_last_hit)))
    if abs(DOWN[kfin] - t_last_hit) <= 0.08 and 2 <= kfin <= NBAR - 1 and t_last_sound - t_last_hit >= 1.0:
        FINAL_BAR = kfin
        BOUNDS = sorted(set([bb for bb in BOUNDS if bb < kfin - 1 or bb == 0] + [kfin, NBAR]))

sections = []
for si in range(len(BOUNDS) - 1):
    k0, k1 = BOUNDS[si], BOUNDS[si + 1]
    a = 0.0 if si == 0 else bar_t(k0)
    b = DUR if si == len(BOUNDS) - 2 else bar_t(k1)
    bl = BL[k0:k1]
    slope = float(np.polyfit(np.arange(len(bl)), bl, 1)[0]) if len(bl) >= 3 else 0.0
    pre = BL[max(0, k0 - 2):k0]
    step_in = float(np.mean(BL[k0:k0 + 2]) - np.mean(pre)) if len(pre) else None
    sb = bars[k0:k1]
    lm = fr_mask(a, b, LT)
    sections.append({
        "bar_start": k0, "bar_end": k1, "bars": k1 - k0, "start_s": round(a, 3), "end_s": round(b, 3),
        "lufs": r(integrated(a, b)), "st_min": r(ST[lm].min()), "st_max": r(ST[lm].max()),
        "slope_lu_per_bar": r(slope, 2), "step_in_lu": r(step_in, 1),
        "perc": r(np.mean([x["perc"] for x in sb]), 3), "perc_onsets_per_beat": r(np.mean([x["perc_onsets_per_beat"] for x in sb]), 2),
        "low": r(np.mean([x["low"] for x in sb]), 3), "sub": r(np.mean([x["sub"] for x in sb]), 3),
        "air": r(np.mean([x["air"] for x in sb]), 4), "centroid": r(np.mean([x["centroid"] for x in sb]), 0),
        "width_db": r(np.mean([x["width_db"] for x in sb]), 1), "novelty_in": r(NOV[k0], 3)})

for i, s in enumerate(sections):
    L_ = s["lufs"] if s["lufs"] is not None else -70
    lab = "groove"
    if FINAL_BAR is not None and s["bar_start"] == FINAL_BAR:
        lab = "ending"
    elif i == len(sections) - 1 and (L_ <= DRIVE - 6 or (s["slope_lu_per_bar"] or 0) < -0.8):
        lab = "ending"
    elif i == 0 and L_ <= DRIVE - 3:
        lab = "intro"
    elif L_ >= PEAK - 1.0 and s["bars"] >= 4:
        lab = "peak"
    elif s["step_in_lu"] is not None and s["step_in_lu"] >= 3.0:
        lab = "drop" if (s["perc"] - sections[i - 1]["perc"] >= 0.04 or s["low"] - sections[i - 1]["low"] >= 0.04) else "lift"
    elif L_ <= DRIVE - 5:
        lab = "breakdown" if s["perc"] < MEDPERC else "quiet"
    elif (s["slope_lu_per_bar"] or 0) >= 0.35 and s["bars"] >= 4 and (s["st_max"] - s["st_min"]) >= 3:
        lab = "build"
    elif s["perc"] < MEDPERC * 0.8:
        lab = "theme"
    s["label_rule"] = lab

# ------------------------------------------------------------------------------------------------------------- key
PROF = {
    "krumhansl": ([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88],
                  [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]),
    "temperley": ([0.748, 0.060, 0.488, 0.082, 0.670, 0.460, 0.096, 0.715, 0.104, 0.366, 0.057, 0.400],
                  [0.712, 0.084, 0.474, 0.618, 0.049, 0.460, 0.105, 0.747, 0.404, 0.067, 0.133, 0.330]),
    "albrecht": ([0.238, 0.006, 0.111, 0.006, 0.137, 0.094, 0.016, 0.214, 0.009, 0.080, 0.008, 0.081],
                 [0.220, 0.006, 0.104, 0.123, 0.019, 0.103, 0.012, 0.214, 0.062, 0.022, 0.061, 0.052]),
}
PCN = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"]
CAM_MAJ = {0: "8B", 7: "9B", 2: "10B", 9: "11B", 4: "12B", 11: "1B", 6: "2B", 1: "3B", 8: "4B", 3: "5B", 10: "6B", 5: "7B"}
CAM_MIN = {9: "8A", 4: "9A", 11: "10A", 6: "11A", 1: "12A", 8: "1A", 3: "2A", 10: "3A", 5: "4A", 0: "5A", 7: "6A", 2: "7A"}


def key_scores(ch):
    out = {}
    for pn, (maj, mnr) in PROF.items():
        rr = np.zeros(24)
        for t in range(12):
            rr[t] = np.corrcoef(ch, np.roll(maj, t))[0, 1]
            rr[12 + t] = np.corrcoef(ch, np.roll(mnr, t))[0, 1]
        out[pn] = rr
    return out


def key_name(i):
    return f"{PCN[i % 12]} {'major' if i < 12 else 'minor'}"


def camelot(i):
    return CAM_MAJ[i % 12] if i < 12 else CAM_MIN[i % 12]


def estimate_key(ch):
    ks = key_scores(ch)
    ens = np.mean([v for v in ks.values()], axis=0)
    o = np.argsort(ens)[::-1]
    per = {pn: key_name(int(np.argmax(v))) for pn, v in ks.items()}
    agree = sum(1 for v in per.values() if v == key_name(int(o[0])))
    return {"key": key_name(int(o[0])), "camelot": camelot(int(o[0])), "r": r(ens[o[0]], 3),
            "second": key_name(int(o[1])), "second_camelot": camelot(int(o[1])), "margin": r(ens[o[0]] - ens[o[1]], 3),
            "profiles_agree": f"{agree}/3", "per_profile": per,
            "top5": [[key_name(int(k)), camelot(int(k)), r(ens[k], 3)] for k in o[:5]]}


wk = (1 - PERC[:nfr]) * ENER[:nfr]
gchroma = (CHROMA * wk).sum(1) / (wk.sum() + 1e-12)
KEY = estimate_key(gchroma)
for s in sections:
    m = fr_mask(s["start_s"], s["end_s"], ST_[:nfr])
    if m.sum() > 20:
        ch = (CHROMA[:, m] * wk[m]).sum(1) / (wk[m].sum() + 1e-12)
        e = estimate_key(ch)
        s["key"] = e["key"]; s["camelot"] = e["camelot"]; s["key_r"] = e["r"]; s["key_margin"] = e["margin"]
win_keys = []
for w0 in np.arange(0, DUR - 15, 30.0):
    m = fr_mask(w0, w0 + 30, ST_[:nfr])
    if m.sum() > 50 and np.median(ST[fr_mask(w0, w0 + 30, LT)]) > -45:
        e = estimate_key((CHROMA[:, m] * wk[m]).sum(1) / (wk[m].sum() + 1e-12))
        win_keys.append({"t0": r(w0, 0), "key": e["key"], "camelot": e["camelot"], "r": e["r"]})
KEY["windows_30s"] = win_keys
KEY["share_windows_agree"] = r(np.mean([w["key"] == KEY["key"] for w in win_keys]), 2) if win_keys else None
KEY["tuning_cents"] = r(tuning * 100, 1)
KEY["chroma_profile"] = [r(v, 3) for v in gchroma / (gchroma.max() + 1e-9)]

# ---------------------------------------------------------------------------------------------------------- ending
# the final decline: from the last bar at drive level to the last sound
lvl_ok = np.where(ST > DRIVE - 6)[0]
t_decline = float(LT[lvl_ok[-1]]) if len(lvl_ok) else None
ending = {"t_last_sound": r(t_last_sound, 2), "t_last_strong_onset": r(t_last_hit, 2),
          "t_last_st_within_6lu_of_drive": r(t_decline, 2), "duration_s": r(DUR, 2)}
if t_last_hit is not None:
    m = (LT >= t_last_hit) & (LT <= t_last_sound)
    if m.sum() >= 5:
        tt, vv = LT[m], MOM[m]
        k = np.polyfit(tt - tt[0], vv, 1)
        ending["decay_after_last_onset_lu_per_s"] = r(k[0], 2)
        ending["decay_span_s"] = r(tt[-1] - tt[0], 2)
        pk_ = vv.max(); below = np.where(vv < pk_ - 20)[0]
        ending["t20_s"] = r(tt[below[0]] - tt[0], 2) if len(below) else None
    # onsets in the last 10 s before the last sound: does the beat continue while the level falls?
    w0 = max(0, t_last_sound - 10)
    mo = (PT >= w0) & (PT <= t_last_sound)
    ending["onsets_last_10s"] = int(mo.sum())
    ml = (LT >= w0) & (LT <= t_last_sound)
    if ml.sum() > 10:
        kk = np.polyfit(LT[ml], ST[ml], 1)
        ending["st_slope_last_10s_lu_per_s"] = r(kk[0], 2)
    # a hard stop: momentary falls > 20 LU within 0.5 s somewhere after the decline started
    mm = MOM[(LT >= (t_decline or 0) - 1)]
    drops = [float(mm[i] - mm[i + 5]) for i in range(len(mm) - 5)]
    ending["max_drop_in_0p5s_lu"] = r(max(drops) if drops else 0, 1)
    tail = t_last_sound - t_last_hit
    pre_ = (LT >= t_last_hit - 4) & (LT < t_last_hit - 0.2)
    lvl_pre = float(np.median(ST[pre_])) if pre_.any() else None
    ending["level_4s_before_final_hit_lufs"] = r(lvl_pre, 1)
    ending["final_hit_on_downbeat_bar"] = FINAL_BAR
    tail_m = (LT > t_last_hit + 0.5) & (LT <= t_last_sound)
    tail_lvl = float(np.median(ST[tail_m])) if tail_m.any() else None
    ending["tail_median_st_lufs"] = r(tail_lvl, 1)
    hm = (LT >= t_last_hit - 0.1) & (LT <= t_last_hit + 0.3)
    stand = float(MOM[hm].max() - lvl_pre) if hm.any() and lvl_pre is not None else 0.0
    bm_ = (LT >= t_last_hit - 12) & (LT <= t_last_hit)
    slope_b = float(np.polyfit(LT[bm_], ST[bm_], 1)[0]) if bm_.sum() > 20 else 0.0
    am_ = (LT >= t_last_hit + 1.5) & (LT <= t_last_hit + 2.5)
    after2 = float(np.mean(MOM[am_])) - lvl_pre if am_.any() and lvl_pre is not None else None
    ending.update({"final_onset_stands_out_lu": r(stand, 1), "st_slope_12s_before_lu_per_s": r(slope_b, 2),
                   "level_2s_after_vs_before_lu": r(after2, 1)})
    if tail >= 10 and tail_lvl is not None and tail_lvl >= DRIVE - 14:
        ending["type"] = (f"outro wind-down: after the last strong onset the music plays on softly for {tail:.0f} s "
                          f"(median {tail_lvl:.1f} LUFS short-term) and dies away; no final hit")
    elif slope_b <= -0.4 and lvl_pre is not None and lvl_pre <= DRIVE - 5:
        ending["type"] = (f"diminuendo: the music was already falling {slope_b:.2f} LU/s for 12 s and ends on a soft last note "
                          f"({lvl_pre:.1f} LUFS, {DRIVE - lvl_pre:.1f} LU under the drive) that decays; no final hit")
    elif lvl_pre is not None and lvl_pre >= DRIVE - 6 and after2 is not None and after2 <= -10:
        ending["type"] = (f"stop: the music stops on a downbeat at full level ({lvl_pre:.1f} LUFS) and falls {-after2:.0f} LU "
                          f"within 2 s; the tail rings out for {tail:.1f} s")
    elif stand >= 2 and lvl_pre is not None and lvl_pre >= DRIVE - 10:
        ending["type"] = f"final hit: a last accent {stand:+.1f} LU over the bars before it, then {tail:.1f} s of decay"
    elif tail >= 1.5:
        ending["type"] = f"soft ending: a last note {DRIVE - (lvl_pre or DRIVE):.1f} LU under the drive, then {tail:.1f} s of decay"
    elif (ending.get("st_slope_last_10s_lu_per_s") or 0) < -0.5:
        ending["type"] = "fade-out: onsets continue while the level falls"
    else:
        ending["type"] = "hard stop at the end of the file"

RES = {
    "name": NAME, "file": os.path.relpath(path), "sha256": SHA, "sr": sr, "channels": nch, "duration_s": round(DUR, 3),
    "loudness": {"integrated_lufs": r(integrated(0, DUR)), "lra_lu": r(lra(), 1), "sample_peak_dbfs": r(20 * np.log10(sample_peak + 1e-12)),
                 "true_peak_dbtp": r(20 * np.log10(tp + 1e-12)), "drive_level_lufs": r(DRIVE, 1), "peak_level_lufs": r(PEAK, 1),
                 "width_db_track": r(width_db(0, DUR)[0], 1), "corr_track": r(width_db(0, DUR)[1], 3)},
    "tempo": {"bpm": r(60 / PG, 3), "grid_mode": GRID_MODE, "grid_period_s": r(PG, 5), "grid_phase_s": r(PHG, 4),
              "music_span_s": [r(T_ON, 1), r(T_OFF, 1)],
              "local_phase_check": LOCAL,
              "share_clear_windows_on_grid_25ms": r(len(on0) / len(clear), 3) if clear else None,
              "syncopated_windows": SYNC,
              "clear_windows": len(clear), "windows": len(LOCAL),
              "grid_to_onset_ms_median_abs": r(np.median(np.abs(off)) * 1000, 1), "grid_to_onset_ms_p90_abs": r(np.percentile(np.abs(off), 90) * 1000, 1),
              "grid_beats_with_onset_within_40ms": r(len(off) / max(1, len(beats)), 3),
              "beats": int(len(beats)), "tracker": TRACKER,
              "tempogram_candidates_bpm": [[r(c, 1), r(v, 3)] for c, v in cand], "local_10s": loc,
              "metrical_levels_tested": [{k_: v_ for k_, v_ in l_.items() if k_ not in ("P", "phase")} for l_ in LEVELS],
              "metrical_level_chosen_bpm": round(60 / PG, 3)},
    "downbeats": {"method": "semi-Markov DP over downbeats on the beat grid: evidence = beat-level mel texture change (peaks, x3) + harmonic change + 8- and 2-beat timbre novelty + loudness rise + low-band onset - backbeat band (z units); bar lengths 4 free, 2/6 cost 10, 3/5 cost 14", "odd_bars": ODD, "slips_at_beats": SLIPS,
                  "slips_at_s": [r(beats[i], 2) for i in SLIPS], "analysed_span_s": [r(beats[ia], 2), r(beats[ib_], 2)],
                  "anchored_arrivals_s": [r(beats[i], 3) for i, _ in ANCH], "global_phase_scores": [r(v, 3) for v in gscores],
                  "global_phase_margin": r(gscores[go[0]] - gscores[go[1]], 3), "first_downbeat_s": r(DOWN[0], 3),
                  "bars": NBAR, "bar_s_median": r(np.median(np.diff(DOWN)), 4)},
    "key": KEY, "sections": sections, "ending": ending, "change_points": CHANGES, "bar_phase_agreement": PHASE_AGREE,
    "phrase_grid": {"offset_mod4": PH_OFF, "share_boundaries_on_grid": r(PH_ON, 2), "share_one_bar_off": r(PH_NEAR, 2),
                    "detected_boundaries": [int(x) for x in sorted(cand_b)], "novelty_by_offset": [r(v, 3) for v in ph_sc],
                    "snapped_boundaries": {str(k): v for k, v in SNAPPED.items()}},
    "beats_s": [round(float(b), 4) for b in beats], "downbeats_s": [round(float(d), 4) for d in DOWN],
    "bar_table": bars, "novelty_by_bar": [r(v, 3) for v in NOV], "loudness_step_by_bar": [r(v, 2) for v in STEP],
    "bar_s_median": round(float(np.median(np.diff(DOWN))), 4),
    "secs": round(time.perf_counter() - T0, 1), "peak_rss_mb": round(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1e6, 1)}
# per-section downbeat confidence: mean FEAT at each bar position along the Viterbi path
for s in sections:
    m = (beats[:nb_] >= s["start_s"]) & (beats[:nb_] < s["end_s"])
    pos_means = [float(np.mean(FEAT[m & (PATH == p)])) if (m & (PATH == p)).any() else float("nan") for p in range(4)]
    s["downbeat_margin"] = r(pos_means[0] - np.nanmax(pos_means[1:]), 2)
    s["downbeat_margin_vs_beat3"] = r(pos_means[0] - pos_means[2], 2)
    sal = [w["beat_salience"] for w in loc if w["beat_salience"] is not None and s["start_s"] <= w["t0"] < s["end_s"]]
    s["beat_salience"] = r(np.mean(sal), 2) if sal else None
os.makedirs(os.path.dirname(out_json), exist_ok=True)
with open(out_json, "w") as fh:
    json.dump(RES, fh)
np.savez_compressed(
    out_npz, lt=LT.astype(np.float32), mom=MOM.astype(np.float32), st=ST.astype(np.float32),
    ot=OT.astype(np.float32), oenv=OENV.astype(np.float32), olow=OLOW.astype(np.float32), obb=OBB.astype(np.float32),
    stt=ST_[:nfr].astype(np.float32), perc=PERC[:nfr].astype(np.float16), lows=LOWS[:nfr].astype(np.float16),
    cent=CENT[:nfr].astype(np.float32), pflux=PFLUX[:nfr].astype(np.float32), pons=PONS.astype(np.float32),
    mel=np.clip((MELDB[:, :nfr] + 90) / 90 * 255, 0, 255).astype(np.uint8), chroma=(CHROMA * 255).astype(np.uint8),
    beats=beats.astype(np.float64), down=DOWN.astype(np.float64), es=ES.astype(np.float32), tbeats=tb.astype(np.float64), feat=FEAT.astype(np.float32), path=PATH.astype(np.int8), bnov=BNOV.astype(np.float32),
    width_sub=(10 * np.log10(((sLL + sRR - 2 * sLR) + 1e-20) / ((sLL + sRR + 2 * sLR) + 1e-20))).astype(np.float32))
print(json.dumps({k: RES[k] for k in ("name", "duration_s", "loudness", "secs", "peak_rss_mb")}))
print("tempo", {k: v for k, v in RES["tempo"].items() if k not in ("local_10s", "local_phase_check")})
print("local phase (ms@clarity):", " ".join(f"{w['t0']:.0f}:{w['delta_ms']:+.0f}@{w['clarity']:.1f}/{w['onbeat_vs_offbeat']:.2f}" for w in LOCAL))
print("downbeats", RES["downbeats"])
print("key", {k: v for k, v in KEY.items() if k not in ("windows_30s", "chroma_profile")})
for s in sections:
    print(f"  {s['start_s']:7.2f}-{s['end_s']:7.2f}  bars {s['bar_start']:3d}-{s['bar_end']:3d}  {s['label_rule']:9s} "
          f"{s['lufs']} LUFS  st {s['st_min']}..{s['st_max']}  step {s['step_in_lu']}  perc {s['perc']}  low {s['low']} "
          f"cent {s['centroid']}  key {s.get('camelot')}  dbm {s['downbeat_margin']}  sal {s['beat_salience']}")
print("ending", ending)
