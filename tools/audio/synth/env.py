"""Envelopes: ADSR with curved segments, one-shot percussive shapes, breakpoint automation, step gates, LFOs and
smoothing. Every envelope is a float64 array of samples; the note envelopes start and end on exact zeros, so a note
never clicks on or off.

Curves: shape(u, c) goes 0 -> 1 over u in [0, 1]. c = 0 is a straight line; c > 0 moves fast first and settles slowly
(an analogue RC curve: about 4 for decays and releases, 1-2 for a soft attack); c < 0 starts slowly and finishes fast
(a swell: -3 to -5 for risers).
"""
from __future__ import annotations

import numpy as np
from scipy.signal import lfilter

from . import core


def shape(u, c=0.0):
    """0 -> 1 over u in [0, 1] on curve c (see the module docstring)."""
    u = np.asarray(u, dtype=float)
    if abs(c) < 1e-6:
        return u
    return (1.0 - np.exp(-c * u)) / (1.0 - np.exp(-c))


def segment(n, v0, v1, c=0.0, include_end=False):
    """n samples going from v0 toward v1 on curve c. The first sample is exactly v0; the last is v1 when include_end,
    else v1 falls on the sample after the segment (so segments chain without repeating a value)."""
    if n <= 0:
        return np.zeros(0)
    u = np.arange(n) / ((n - 1) if include_end and n > 1 else n)
    return v0 + (v1 - v0) * shape(u, c)


def adsr(gate, attack=0.005, decay=0.15, sustain=0.7, release=0.12, sr=core.SR, curves=(1.0, 4.0, 4.0), peak=1.0,
         length=None):
    """An ADSR for a note held `gate` seconds: attack to `peak`, decay to sustain x peak, held, then released over
    `release` from wherever it is when the gate ends (mid-attack too). curves are the (attack, decay, release) shape
    constants. Starts on exact 0, ends on exact 0, and is gate + release long (or exactly `length` samples). A gate of
    0 plays through the attack and the decay first (a one-shot)."""
    na = max(1, int(round(attack * sr)))
    nd = max(1, int(round(decay * sr)))
    nr = max(2, int(round(release * sr)))
    ng = int(round(gate * sr)) if gate and gate > 0 else na + nd
    ads = np.concatenate([segment(na, 0.0, peak, curves[0]), segment(nd, peak, peak * sustain, curves[1])])
    if len(ads) < ng + 1:
        ads = np.concatenate([ads, np.full(ng + 1 - len(ads), peak * sustain)])
    level = ads[ng]                                     # where the release starts
    env = np.concatenate([ads[:ng], segment(nr, level, 0.0, curves[2], include_end=True)])
    return env if length is None else core.fit(env, length)


def perc(dur, attack=0.0005, tau=0.2, hold=0.0, end=0.01, sr=core.SR, attack_curve=0.0):
    """A one-shot `dur` seconds long: a curved attack from exact 0, an optional hold at 1, an exponential decay with
    time constant tau, and a raised-cosine fade to exact 0 over the last `end` seconds."""
    n = max(2, int(round(dur * sr)))
    t = np.arange(n) / sr
    a = shape(np.clip(t / attack, 0.0, 1.0), attack_curve) if attack > 0 else np.ones(n)
    env = a * np.where(t < attack + hold, 1.0, np.exp(-(t - attack - hold) / max(tau, 1e-6)))
    env[0] = 0.0
    return core.fade(env, 0.0, min(end, dur), sr)


def decay(n, tau, sr=core.SR):
    """exp(-t / tau) over n samples."""
    return np.exp(-np.arange(n) / sr / max(tau, 1e-6))


def breakpoints(points, n, sr=core.SR):
    """Automation from points [(t, value), (t, value, curve), ...] (t in seconds, curve shaping the segment that ends
    on that point) as n samples; flat before the first point and after the last."""
    pts = sorted(points, key=lambda p: p[0])
    if not pts:
        raise ValueError("breakpoints needs at least one point")
    idx = [core.samples(p[0], sr) for p in pts]
    env = np.empty(n)
    env[:max(0, min(n, idx[0]))] = pts[0][1]
    for (p0, i0), (p1, i1) in zip(zip(pts, idx), zip(pts[1:], idx[1:])):
        a, b = max(0, i0), min(n, i1)
        if b > a:
            u = (np.arange(a, b) - i0) / max(1, i1 - i0)
            env[a:b] = p0[1] + (p1[1] - p0[1]) * shape(u, p1[2] if len(p1) > 2 else 0.0)
    env[max(0, min(n, idx[-1])):] = pts[-1][1]
    return env


def smooth(x, ms=5.0, sr=core.SR):
    """A one-pole low-pass on a control signal (time constant ms): softens steps in gains and cut-offs."""
    if ms <= 0:
        return np.asarray(x, dtype=float)
    a = float(np.exp(-1.0 / (ms / 1000.0 * sr)))
    x = np.asarray(x, dtype=float)
    y, _ = lfilter([1.0 - a], [1.0, -a], x, zi=[a * x[0]])  # starts settled on x[0]
    return y


def lfo(n, rate=1.0, shape_="sine", depth=1.0, phase=0.0, sr=core.SR, rng=None):
    """A low-frequency oscillator in [-depth, depth]: sine, triangle, square (edges softened over 2 ms), saw (rising)
    or random (a smooth random curve, seeded)."""
    t = np.arange(n) / sr
    ph = (rate * t + phase) % 1.0
    if shape_ == "sine":
        y = np.sin(2 * np.pi * ph)
    elif shape_ == "triangle":
        y = 1.0 - 4.0 * np.abs(ph - 0.5)
    elif shape_ == "square":
        y = smooth(np.where(ph < 0.5, 1.0, -1.0), 2.0, sr)
    elif shape_ == "saw":
        y = 2.0 * ph - 1.0
    elif shape_ == "random":
        from .osc import slow_random
        y = np.clip(slow_random(n, rng if rng is not None else core.rng(0, "lfo"), rate, sr) / 2.0, -1.0, 1.0)
    else:
        raise ValueError(f"lfo shape {shape_!r}: sine, triangle, square, saw or random")
    return depth * y


def step_gate(text, grid, n, at=0, step=0.25, floor=0.0, attack_ms=2.0, release_ms=12.0, length=0.8):
    """A rhythmic volume gate (a trance gate) from a step pattern: '.' leaves the gate at `floor`, any level character
    of grid.hits opens it to that level for `length` of the step. Each opening rises over attack_ms and falls over
    release_ms on raised cosines, so it never clicks. Multiply a pad or a chord bus by it."""
    from .grid import hits
    sr = grid.sr
    g = np.zeros(n)
    na = max(1, int(round(attack_ms / 1000.0 * sr)))
    nr = max(1, int(round(release_ms / 1000.0 * sr)))
    for e in hits(text, grid, at=at, step=step):
        i0 = core.samples(e.t, sr)
        k = max(na + 1, core.samples(e.dur * length, sr)) + nr
        w = np.ones(k)
        w[:na] = core.ramp_shape(np.arange(na) / na)
        w[k - nr:] = core.ramp_shape(np.arange(nr - 1, -1, -1) / max(1, nr - 1))
        a, b = max(0, i0), min(n, i0 + k)
        if b > a:
            g[a:b] = np.maximum(g[a:b], min(1.0, e.vel) * w[a - i0:b - i0])
    return floor + (1.0 - floor) * g


def gate(n, gate_s, release_s=0.02, sr=core.SR):
    """1 until gate_s, then a raised-cosine fall to exact 0 over release_s, then 0: cuts a decaying one-shot short
    (a choked open hat, a staccato stab) without a click."""
    g = np.zeros(n)
    i0 = min(n, max(0, int(round(gate_s * sr))))
    nr = max(2, int(round(release_s * sr)))
    g[:i0] = 1.0
    k = min(nr, n - i0)
    if k > 0:
        g[i0:i0 + k] = 1.0 - core.ramp_shape(np.arange(1, nr + 1) / nr)[:k]
    return g
