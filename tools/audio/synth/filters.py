"""Filters: RBJ-cookbook biquads (low pass, high pass, band pass, notch, all pass, peak and shelves), fixed or
time-varying, with 12-48 dB/octave cascades and helpers for envelope and key tracking.

A fixed filter (fc and q are numbers) is one scipy sosfilt pass. A time-varying filter (fc or q is an array of one
value per sample: an envelope, key tracking, an LFO) is updated every `block` samples (32 = 0.67 ms at 48 kHz) and
runs as scipy lfilter inside each block. Between blocks it carries the signal history (the last two inputs and outputs
of every section) rather than the internal state, so a coefficient change acts like a direct-form-I filter's: no
transient and no zipper noise on sweeps. With a constant array it gives the fixed filter's output (the tests check it).
"""
from __future__ import annotations

import math

import numpy as np
from scipy.signal import lfilter, sosfilt

from . import core

KINDS = ("lp", "hp", "bp", "notch", "ap", "peak", "lowshelf", "highshelf")


def coeffs(kind, fc, q=0.7071, gain_db=0.0, sr=core.SR):
    """RBJ biquad coefficients (b0, b1, b2, a1, a2), normalised so a0 = 1. fc and q may be arrays (then so are the
    coefficients). 'bp' has 0 dB at its centre; gain_db is for peak and the shelves."""
    fc = np.clip(np.asarray(fc, dtype=float), 1.0, 0.49 * sr)
    q = np.maximum(np.asarray(q, dtype=float), 0.05)
    w0 = 2.0 * np.pi * fc / sr
    cw, sw = np.cos(w0), np.sin(w0)
    al = sw / (2.0 * q)
    one = np.ones_like(cw)
    if kind == "lp":
        b0, b1, b2 = (1 - cw) / 2, 1 - cw, (1 - cw) / 2
        a0, a1, a2 = 1 + al, -2 * cw, 1 - al
    elif kind == "hp":
        b0, b1, b2 = (1 + cw) / 2, -(1 + cw), (1 + cw) / 2
        a0, a1, a2 = 1 + al, -2 * cw, 1 - al
    elif kind == "bp":
        b0, b1, b2 = al, 0 * cw, -al
        a0, a1, a2 = 1 + al, -2 * cw, 1 - al
    elif kind == "notch":
        b0, b1, b2 = one, -2 * cw, one
        a0, a1, a2 = 1 + al, -2 * cw, 1 - al
    elif kind == "ap":
        b0, b1, b2 = 1 - al, -2 * cw, 1 + al
        a0, a1, a2 = 1 + al, -2 * cw, 1 - al
    elif kind in ("peak", "lowshelf", "highshelf"):
        A = 10.0 ** (np.asarray(gain_db, dtype=float) / 40.0)
        if kind == "peak":
            b0, b1, b2 = 1 + al * A, -2 * cw, 1 - al * A
            a0, a1, a2 = 1 + al / A, -2 * cw, 1 - al / A
        else:
            sa = 2.0 * np.sqrt(A) * al
            if kind == "lowshelf":
                b0 = A * ((A + 1) - (A - 1) * cw + sa)
                b1 = 2 * A * ((A - 1) - (A + 1) * cw)
                b2 = A * ((A + 1) - (A - 1) * cw - sa)
                a0 = (A + 1) + (A - 1) * cw + sa
                a1 = -2 * ((A - 1) + (A + 1) * cw)
                a2 = (A + 1) + (A - 1) * cw - sa
            else:
                b0 = A * ((A + 1) + (A - 1) * cw + sa)
                b1 = -2 * A * ((A - 1) + (A + 1) * cw)
                b2 = A * ((A + 1) + (A - 1) * cw - sa)
                a0 = (A + 1) - (A - 1) * cw + sa
                a1 = 2 * ((A - 1) - (A + 1) * cw)
                a2 = (A + 1) - (A - 1) * cw - sa
    else:
        raise ValueError(f"filter kind {kind!r}: one of {KINDS}")
    return b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0


def butterworth_qs(poles):
    """The section Qs of an even-order Butterworth: 2 -> [0.707]; 4 -> [0.541, 1.307]; 6, 8 likewise."""
    if poles % 2 or poles < 2:
        raise ValueError("poles must be 2, 4, 6 or 8")
    k = poles // 2
    return [1.0 / (2.0 * math.cos((2 * i - 1) * math.pi / (2 * poles))) for i in range(1, k + 1)]


def _section_qs(kind, q, poles):
    """Per-section Q: lp and hp cascade a Butterworth whose sharpest section takes the resonance (q / 0.7071); the other
    kinds repeat the same section."""
    k = poles // 2
    if kind in ("lp", "hp"):
        qs = butterworth_qs(poles)
        scale = np.asarray(q, dtype=float) / math.sqrt(0.5)
        return [qs[i] * (scale if i == k - 1 else 1.0) for i in range(k)]
    return [q] * k


def _tv_section(x, c, block):
    """One time-varying biquad over x (C, n); c = (b0, b1, b2, a1, a2) arrays, one value per block."""
    C, n = x.shape
    y = np.empty_like(x)
    x1, x2, y1, y2 = np.zeros(C), np.zeros(C), np.zeros(C), np.zeros(C)
    zi = np.empty((C, 2))
    B0, B1, B2, A1, A2 = (np.asarray(v, dtype=float).tolist() for v in c)
    for i in range(len(B0)):
        s0, s1 = i * block, min(n, (i + 1) * block)
        b1, b2, a1, a2 = B1[i], B2[i], A1[i], A2[i]
        zi[:, 0] = b1 * x1 - a1 * y1 + b2 * x2 - a2 * y2       # the DF2T state that this history implies
        zi[:, 1] = b2 * x1 - a2 * y1
        xb = x[:, s0:s1]
        yb, _ = lfilter((B0[i], b1, b2), (1.0, a1, a2), xb, axis=-1, zi=zi)
        y[:, s0:s1] = yb
        if s1 - s0 >= 2:
            x1, x2, y1, y2 = xb[:, -1].copy(), xb[:, -2].copy(), yb[:, -1].copy(), yb[:, -2].copy()
        else:
            x2, x1, y2, y1 = x1, xb[:, -1].copy(), y1, yb[:, -1].copy()
    return y


def filt(x, kind="lp", fc=1000.0, q=0.7071, poles=2, gain_db=0.0, sr=core.SR, block=32):
    """Filter a mono (n,) or stereo (2, n) signal. fc and q are numbers (a fixed filter) or arrays of n (a sweep).
    poles: 2, 4, 6 or 8 (12-48 dB/oct for lp and hp; repeated sections for the other kinds)."""
    x = np.asarray(x, dtype=float)
    was_mono = x.ndim == 1
    X = x[None, :] if was_mono else x
    n = X.shape[-1]
    if n == 0:
        return x.copy()
    qs = _section_qs(kind, q, poles)
    if np.ndim(fc) == 0 and np.ndim(q) == 0 and np.ndim(gain_db) == 0:
        sos = []
        for qk in qs:
            b0, b1, b2, a1, a2 = (float(v) for v in coeffs(kind, fc, qk, gain_db, sr))
            sos.append([b0, b1, b2, 1.0, a1, a2])
        Y = sosfilt(np.array(sos), X, axis=-1)
    else:
        nb = (n + block - 1) // block
        mid = np.minimum(n - 1, np.arange(nb) * block + block // 2)
        pick = lambda v: np.asarray(v, dtype=float)[mid] if np.ndim(v) else v  # noqa: E731
        Y = X
        for qk in qs:
            Y = _tv_section(Y, coeffs(kind, pick(fc) * np.ones(nb), pick(qk) * np.ones(nb), pick(gain_db), sr), block)
    return Y[0] if was_mono else Y


def lowpass(x, fc, q=0.7071, poles=2, sr=core.SR):
    return filt(x, "lp", fc, q, poles, sr=sr)


def highpass(x, fc, q=0.7071, poles=2, sr=core.SR):
    return filt(x, "hp", fc, q, poles, sr=sr)


def bandpass(x, fc, q=1.0, poles=2, sr=core.SR):
    return filt(x, "bp", fc, q, poles, sr=sr)


def peak(x, fc, gain_db, q=1.0, sr=core.SR):
    return filt(x, "peak", fc, q, 2, gain_db, sr)


def shelf(x, fc, gain_db, high=True, q=0.7071, sr=core.SR):
    return filt(x, "highshelf" if high else "lowshelf", fc, q, 2, gain_db, sr)


def band(x, lo, hi, poles=2, sr=core.SR):
    """A band from lo to hi Hz: a high pass at lo, then a low pass at hi."""
    return lowpass(highpass(x, lo, poles=poles, sr=sr), min(hi, 0.45 * sr), poles=poles, sr=sr)


def dc_block(x, hz=10.0, sr=core.SR):
    """A one-pole DC blocker (for asymmetric saturation)."""
    r = math.exp(-2.0 * math.pi * hz / sr)
    return lfilter([1.0, -1.0], [1.0, -r], np.asarray(x, dtype=float), axis=-1)


def cutoff(base_hz, n, note=None, keytrack=0.0, ref=60.0, env=None, env_oct=0.0, mod=None, mod_oct=0.0, vel=None,
           vel_oct=0.0, lo=20.0, hi=None, sr=core.SR):
    """A cut-off curve in Hz, one value per sample: base_hz moved by key tracking (keytrack=1 follows the note one
    octave per octave from `ref`; a chord uses its mean), by an envelope (env_oct octaves where env = 1), by an LFO or
    any modulator (mod_oct octaves where mod = 1) and by velocity (vel_oct octaves per unit below vel = 1)."""
    oc = 0.0
    if note is not None and keytrack:
        oc += keytrack * (float(np.mean(core.notes(note))) - ref) / 12.0
    if vel is not None and vel_oct:
        oc += vel_oct * (float(vel) - 1.0)
    curve = np.full(n, oc)
    if env is not None:
        curve += env_oct * core.fit(np.asarray(env, dtype=float), n)
    if mod is not None:
        curve += mod_oct * core.fit(np.asarray(mod, dtype=float), n)
    return np.clip(base_hz * 2.0 ** curve, lo, hi if hi is not None else 0.45 * sr)


def crossover(x, hz, sr=core.SR):
    """A Linkwitz-Riley 24 dB/oct split: (low, high), which sum back to an all-pass copy of x."""
    lo = filt(filt(x, "lp", hz, math.sqrt(0.5), 2, sr=sr), "lp", hz, math.sqrt(0.5), 2, sr=sr)
    hi = filt(filt(x, "hp", hz, math.sqrt(0.5), 2, sr=sr), "hp", hz, math.sqrt(0.5), 2, sr=sr)
    return lo, hi
