"""score2 lane: sound-design takes made from code for the score (no samples, no Mixkit), and CC0 composites.

They replace the script-fetched Mixkit effects the 28 Oct masters used (the score review's R-01; OVERRIDES §55 CR-13
and §60: no scripted Mixkit file in a deliverable). Each recipe is deterministic (a seed), returns stereo float32 at
48 kHz peaking at -1 dBFS, and is rebuilt by score_build.py at build time, as the kit's sub glides are:

  whoosh(p)  a noise whoosh for the Space slide and the four ring-led arrivals (TREATMENT §4.6 'Whooshes'): pink-ish
             noise through a band-pass whose centre rises to a peak and falls after it (an approach and a pass), an
             accelerating rise and an exponential fall, a flutter at the peak, a pan across the pass, and an optional
             low body and an air band. No pitched partial, so nothing reads as a tone, a bell or a ringtone.
  plunk(p)   a stand-in for the person's recording of a pebble dropped into a glass of water (P9; TREATMENT §4.6, the
             plunk at the Drop): a splash of band-passed noise, then the bubble's own sound (a sine whose pitch rises as
             it decays, the Minnaert bubble), a few small bubbles after it, and a small room.
  composite(parts, loader)  CC0 layers summed at their offsets and gains (a punchier hit from two Kenney takes).

Everything here is CC0-free-of-samples ('designed') or built only from CC0 Kenney files; pedalboard's Reverb
(GPL-3.0) is run as a tool here and never shipped.
"""
import math

import numpy as np
import scipy.signal as ss

SR = 48000


def _norm(y, peak_db=-1.0):
    m = float(np.abs(y).max())
    return (y / m * 10 ** (peak_db / 20)).astype(np.float32) if m > 0 else y.astype(np.float32)


def _raised(n):
    return (0.5 - 0.5 * np.cos(np.linspace(0, np.pi, n))).astype(np.float32)


def _noise(n, rng, corr):
    """Stereo white noise whose channels correlate by about corr (width that still folds to mono)."""
    common = rng.standard_normal(n)
    out = np.stack([math.sqrt(corr) * common + math.sqrt(1 - corr) * rng.standard_normal(n) for _ in range(2)], 1)
    return out.astype(np.float64)


def whoosh(p):
    """A whoosh, dur_s long, loudest at peak_s.

    The band's centre: fc_peak_hz at the peak, rise_oct octaves lower at the start (rising as it approaches) and
    fall_oct lower at the end (falling as it passes); width sigma_oct (a log-Gaussian band, sigma in octaves).
    Level: (t / peak_s) ** rise_pow before the peak, then an exponential fall reaching -20 dB after decay20_s, and a
    raised-cosine fade over the last fade_s. body_db adds low-passed noise (body_hz) under the band for weight; air_db
    adds noise above 6 kHz for the edge. flutter (depth, Hz) modulates the level around the peak, as air cut by a fast
    object. pan: from pan[0] to pan[1] (-1 left, +1 right) across the peak, equal power."""
    rng = np.random.default_rng(int(p.get("seed", 1)))
    dur, pk = float(p["dur_s"]), float(p["peak_s"])
    n = int(round(dur * SR))
    nper, hop = 2048, 256
    x = _noise(n + nper, rng, float(p.get("corr", 0.55)))
    f, t, Z = ss.stft(x.T, fs=SR, window="hann", nperseg=nper, noverlap=nper - hop, boundary="zeros", padded=True)
    fc_pk = float(p["fc_peak_hz"])
    rise, fall = float(p.get("rise_oct", 1.2)), float(p.get("fall_oct", 0.8))
    tt = np.clip(t, 0, dur)
    fc = np.where(tt <= pk, fc_pk * 2.0 ** (-rise * (1 - tt / max(pk, 1e-3))),
                  fc_pk * 2.0 ** (-fall * (tt - pk) / max(dur - pk, 1e-3)))
    sig = float(p.get("sigma_oct", 0.9))
    ff = np.maximum(f, 20.0)[:, None]
    band = np.exp(-0.5 * (np.log2(ff / fc[None, :]) / sig) ** 2)
    tilt = (ff / 1000.0) ** -0.5  # pink: -3 dB an octave
    G = band * tilt
    if p.get("body_db") is not None:
        bh = float(p.get("body_hz", 160.0))
        G = G + 10 ** (float(p["body_db"]) / 20) * (1 / np.sqrt(1 + (ff / bh) ** 4)) * (ff / 40.0) ** 2 / (1 + (ff / 40.0) ** 2) * tilt
    if p.get("air_db") is not None:
        G = G + 10 ** (float(p["air_db"]) / 20) * (1 / np.sqrt(1 + (6000.0 / ff) ** 4)) * tilt
    G = G * (ff > 25.0)  # nothing below 25 Hz
    _, y = ss.istft(Z * G[None, :, :], fs=SR, window="hann", nperseg=nper, noverlap=nper - hop, boundary=True)
    y = y.T[:n]
    ts = np.arange(n) / SR
    k = math.log(10.0) / float(p.get("decay20_s", 0.3))
    env = np.where(ts <= pk, (ts / max(pk, 1e-3)) ** float(p.get("rise_pow", 2.0)), np.exp(-k * (ts - pk)))
    fl = p.get("flutter")
    if fl:
        depth, hz = float(fl[0]), float(fl[1])
        w = np.exp(-0.5 * ((ts - pk) / (0.18 * dur)) ** 2)
        env = env * (1 + depth * w * np.sin(2 * math.pi * hz * ts))
    fo = int(float(p.get("fade_s", 0.03)) * SR)
    env[-fo:] *= _raised(fo)[::-1]
    pan = p.get("pan", [-0.35, 0.35])
    pp = pan[0] + (pan[1] - pan[0]) * (0.5 + 0.5 * np.tanh((ts - pk) / (0.22 * dur)))
    th = (pp + 1) * math.pi / 4
    y = y * env[:, None]
    y[:, 0] *= np.cos(th) * math.sqrt(2)
    y[:, 1] *= np.sin(th) * math.sqrt(2)
    return _norm(y, float(p.get("peak_db", -1.0)))


def _bubble(ts, t0, f0, f1, glide_s, tau_s, att_s=0.0015):
    """One bubble: a sine from f0 rising exponentially to f1 over glide_s (then held), decaying with tau_s."""
    u = np.clip(ts - t0, 0, None)
    f = f0 * (f1 / f0) ** (np.minimum(u, glide_s) / glide_s)
    ph = 2 * math.pi * np.cumsum(f) / SR
    env = (1 - np.exp(-u / att_s)) * np.exp(-u / tau_s) * (ts >= t0)
    i0 = min(int(t0 * SR), len(ph) - 1)
    return np.sin(ph - ph[i0]) * env


def plunk(p):
    """A pebble into a glass of water: splash (band-passed noise, 1-2 ms attack, tau splash_tau_s) at splash_db,
    the main bubble (f0_hz rising to f1_hz over glide_s, tau_s), small bubbles [(t_s, f0, f1, tau_s, db), ...], and a
    small room (pedalboard Reverb, room_size, wet). Peak at -1 dBFS."""
    rng = np.random.default_rng(int(p.get("seed", 3)))
    dur = float(p.get("dur_s", 0.6))
    n = int(round(dur * SR))
    ts = np.arange(n) / SR
    lo, hi = p.get("splash_band_hz", [1200.0, 7000.0])
    sos = ss.butter(2, [lo, hi], btype="band", fs=SR, output="sos")
    nz = ss.sosfilt(sos, rng.standard_normal(n))
    st = float(p.get("splash_tau_s", 0.012))
    splash = nz * (1 - np.exp(-ts / 0.001)) * np.exp(-ts / st)
    splash = splash / (np.abs(splash).max() + 1e-12) * 10 ** (float(p.get("splash_db", -6.0)) / 20)
    tb = float(p.get("bubble_at_s", 0.008))
    main = _bubble(ts, tb, float(p["f0_hz"]), float(p["f1_hz"]), float(p.get("glide_s", 0.06)), float(p.get("tau_s", 0.05)))
    y = splash + main
    for (t0, f0, f1, tau, gdb) in p.get("small", []):
        y = y + 10 ** (gdb / 20) * _bubble(ts, t0, f0, f1, 0.03, tau)
    sw = p.get("swarm")  # many tiny bubbles chirping upwards after the plop: what makes it read as liquid
    if sw:
        k = int(sw["n"])
        t0s = np.sort(rng.uniform(sw["t"][0], sw["t"][1], k))
        for i, t0 in enumerate(t0s):
            f0 = rng.uniform(*sw["f"])
            gdb = sw["db"][0] + (sw["db"][1] - sw["db"][0]) * (t0 - sw["t"][0]) / max(sw["t"][1] - sw["t"][0], 1e-3)
            y = y + 10 ** ((gdb + rng.uniform(-2, 2)) / 20) * _bubble(
                ts, t0, f0, f0 * rng.uniform(*sw["rise"]), float(sw.get("glide_s", 0.015)), rng.uniform(*sw["tau"]),
                att_s=0.0005)
    dr = p.get("droplets")  # the splash falling back: tiny clicks of band-passed noise
    if dr:
        sos2 = ss.butter(2, dr["band"], btype="band", fs=SR, output="sos")
        for t0 in rng.uniform(dr["t"][0], dr["t"][1], int(dr["n"])):
            i0, m_ = int(t0 * SR), int(0.002 * SR)
            if i0 + m_ >= n:
                continue
            burst = ss.sosfilt(sos2, rng.standard_normal(m_)) * np.hanning(m_)
            burst = burst / (np.abs(burst).max() + 1e-12) * 10 ** (rng.uniform(min(dr["db"]), max(dr["db"])) / 20)
            y[i0:i0 + m_] += burst
    y = np.stack([y, y], 1).astype(np.float32)
    wet = float(p.get("wet", 0.12))
    if wet > 0:
        import pedalboard  # GPL-3.0: run here, never shipped
        rv = pedalboard.Reverb(room_size=float(p.get("room_size", 0.22)), damping=0.6, wet_level=wet, dry_level=1.0,
                               width=0.8)
        y = pedalboard.Pedalboard([rv])(np.ascontiguousarray(y.T), SR).T
    fo = int(0.02 * SR)
    y[-fo:] *= _raised(fo)[::-1, None]
    return _norm(np.asarray(y, dtype=np.float32), float(p.get("peak_db", -1.0)))


def crack(p):
    """A hit's transient layer: a burst of band-passed noise (band_hz) with a fast attack and an exponential decay
    (tau_s), slightly wide. It gives a low hit an attack that small speakers hear. Peak at -1 dBFS."""
    rng = np.random.default_rng(int(p.get("seed", 19)))
    n = int(round(float(p.get("dur_s", 0.25)) * SR))
    ts = np.arange(n) / SR
    sos = ss.butter(2, p.get("band_hz", [1500.0, 6000.0]), btype="band", fs=SR, output="sos")
    x = _noise(n, rng, float(p.get("corr", 0.7)))
    y = ss.sosfilt(sos, x, axis=0)
    env = (1 - np.exp(-ts / 0.0005)) * np.exp(-ts / float(p.get("tau_s", 0.012)))
    fo = int(0.01 * SR)
    env[-fo:] *= _raised(fo)[::-1]
    return _norm(y * env[:, None], float(p.get("peak_db", -1.0)))


def composite(parts, loader):
    """Sum parts [{'src': <anything loader takes>, 'at_s': 0.0, 'gain_db': 0.0}, ...] (each stereo at 48 kHz), each
    starting at_s after the first, then peak at -1 dBFS."""
    ys = [(loader(q["src"]), float(q.get("at_s", 0.0)), float(q.get("gain_db", 0.0))) for q in parts]
    n = max(int(round(a * SR)) + len(y) for y, a, _ in ys)
    out = np.zeros((n, 2), dtype=np.float64)
    for y, a, g in ys:
        i = int(round(a * SR))
        out[i:i + len(y)] += y * 10 ** (g / 20)
    return _norm(out.astype(np.float32))


RECIPES = {"whoosh": whoosh, "plunk": plunk, "crack": crack}
