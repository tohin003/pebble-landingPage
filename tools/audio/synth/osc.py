"""Oscillators: band-limited saw, square, pulse and triangle (polyBLEP and polyBLAMP), sine, coloured noise, unison and
supersaw with stereo spread, FM (phase modulation), and pitch curves.

Every oscillator takes freq as Hz, either a number or one value per sample (an array of n), so glides, vibrato and
pitch envelopes are just arrays. Frequencies are clamped below 0.45 x the sample rate. oversample=k renders at k x the
rate and comes back down through soxr (VHQ); the default (None) picks 1, 2 or 4 from the highest pitch, so every alias
below 16 kHz stays about 56 dB or more under the fundamental (auto_oversample has the measurements; the tests check).
"""
from __future__ import annotations

import math

import numpy as np
import soxr
from scipy.signal import lfilter, sosfilt, butter

from . import core

MAX_F = 0.45  # the highest frequency an oscillator plays, as a share of the sample rate


def _as_freq(freq, n):
    f = np.asarray(freq, dtype=float)
    if f.ndim == 0:
        return float(f)
    if f.shape != (n,):
        raise ValueError(f"freq must be a number or an array of {n} samples, got shape {f.shape}")
    return f


def phase(freq, n, sr=core.SR, phase0=0.0):
    """(phase, dt): the oscillator phase in [0, 1) for n samples of freq, and the per-sample increment freq / sr (a
    number for a fixed pitch, else an array). The first sample is at phase0."""
    f = _as_freq(freq, n)
    if np.ndim(f) == 0:
        dt = min(abs(f) / sr, MAX_F)
        return (phase0 + dt * np.arange(n)) % 1.0, dt
    dt = np.minimum(np.abs(f) / sr, MAX_F)
    ph = np.empty(n)
    if n:
        ph[0] = 0.0
        np.cumsum(dt[:-1], out=ph[1:])
    ph += phase0
    ph -= np.floor(ph)
    return ph, dt


def _blep(t, dt):
    """polyBLEP residual for a step at phase 0: -(1 - x)^2 just after it, (1 + x)^2 just before (x in samples)."""
    r = np.zeros_like(t)
    d = np.broadcast_to(dt, t.shape)
    m = t < d
    if m.any():
        x = t[m] / d[m]
        r[m] = x + x - x * x - 1.0
    m = t > 1.0 - d
    if m.any():
        x = (t[m] - 1.0) / d[m]
        r[m] = x * x + x + x + 1.0
    return r


def _blamp(t, dt):
    """polyBLAMP residual (the integrated polyBLEP) for a corner at phase 0: (1 - x)^3 / 3 after, (1 + x)^3 / 3 before."""
    r = np.zeros_like(t)
    d = np.broadcast_to(dt, t.shape)
    m = t < d
    if m.any():
        x = t[m] / d[m] - 1.0
        r[m] = -x * x * x / 3.0
    m = t > 1.0 - d
    if m.any():
        x = (t[m] - 1.0) / d[m] + 1.0
        r[m] = x * x * x / 3.0
    return r


def auto_oversample(freq, sr=core.SR, smooth=False):
    """The oversampling a polyBLEP oscillator needs to keep its worst alias below 16 kHz at least about 56 dB under the
    fundamental. Measured on exact-period spectra: a 1x saw's worst alias is -71 dB at 55 Hz, -59 at 220 Hz, -53 at
    441 Hz, -45 at 1319 Hz and -40 at 3517 Hz; 2x gives -74 at 441, -65 at 1319 and -63 at 1799; 4x -81 at 1801 and
    -79 at 3517. So: 1x to 300 Hz, 2x to 1800 Hz, 4x above. smooth=True is for the triangle, whose aliases start about
    35 dB lower (-90 dB at 441 Hz at 1x)."""
    f = float(np.max(freq)) * 48000.0 / sr
    lo, hi = (3000.0, 6000.0) if smooth else (300.0, 1800.0)
    return 1 if f <= lo else 2 if f <= hi else 4


def _oversampled(fn, freq, n, sr, k, **kw):
    """Render fn at k x the rate (freq arrays interpolated, per-sample keyword arrays too), then resample to sr."""
    if k is None:
        k = auto_oversample(freq, sr, smooth=fn is _triangle)
    if k <= 1:
        return fn(freq, n, sr, **kw)
    nk = n * k
    up = lambda a: np.interp(np.arange(nk) / k, np.arange(n), a)  # noqa: E731
    f = freq if np.ndim(freq) == 0 else up(np.asarray(freq, dtype=float))
    kw = {key: (up(np.asarray(v, dtype=float)) if np.ndim(v) == 1 and len(v) == n else v) for key, v in kw.items()}
    y = fn(f, nk, sr * k, **kw)
    return core.fit(soxr.resample(y, sr * k, sr, quality="VHQ"), n)


def _saw(freq, n, sr, phase0=0.0):
    t, dt = phase(freq, n, sr, phase0)
    return 2.0 * t - 1.0 - _blep(t, dt)


def _pulse(freq, n, sr, phase0=0.0, width=0.5):
    t, dt = phase(freq, n, sr, phase0)
    w = np.clip(np.asarray(width, dtype=float), 0.02, 0.98)
    y = np.where(t < w, 1.0, -1.0)
    y += _blep(t, dt) - _blep((t - w) % 1.0, dt)
    return y - (2.0 * w - 1.0)                       # no DC at any width


def _triangle(freq, n, sr, phase0=0.0):
    t, dt = phase(freq, n, sr, phase0)
    y = np.where(t < 0.5, 4.0 * t - 1.0, 3.0 - 4.0 * t)  # -1 at phase 0, +1 at 0.5
    # each corner changes the slope by 8 dt per sample; the residual is for a height-2 step, hence 4 dt (measured:
    # A4's worst alias goes from -74.5 dB naive to -90 dB)
    return y + 4.0 * np.asarray(dt) * (_blamp(t, dt) - _blamp((t + 0.5) % 1.0, dt))


def _sine(freq, n, sr, phase0=0.0):
    t, _ = phase(freq, n, sr, phase0)
    return np.sin(2.0 * np.pi * t)


def saw(freq, n, sr=core.SR, phase0=0.0, oversample=None):
    """Band-limited sawtooth (polyBLEP), -1..1, rising."""
    return _oversampled(_saw, freq, n, sr, oversample, phase0=phase0)


def pulse(freq, n, width=0.5, sr=core.SR, phase0=0.0, oversample=None):
    """Band-limited pulse (polyBLEP) with duty cycle `width` (a number or a per-sample array: PWM), DC removed."""
    return _oversampled(_pulse, freq, n, sr, oversample, phase0=phase0, width=width)


def square(freq, n, sr=core.SR, phase0=0.0, oversample=None):
    """Band-limited square: a pulse at 50 %."""
    return pulse(freq, n, 0.5, sr, phase0, oversample)


def triangle(freq, n, sr=core.SR, phase0=0.0, oversample=None):
    """Band-limited triangle (polyBLAMP at both corners), -1..1."""
    return _oversampled(_triangle, freq, n, sr, oversample, phase0=phase0)


def sine(freq, n, sr=core.SR, phase0=0.0):
    """A sine (phase0 = 0 starts at zero, going up)."""
    return _sine(freq, n, sr, phase0)


SHAPES = {"saw": saw, "square": square, "triangle": triangle, "sine": sine,
          "pulse": lambda f, n, sr=core.SR, phase0=0.0, oversample=None: pulse(f, n, 0.3, sr, phase0, oversample)}


def osc(shape, freq, n, sr=core.SR, phase0=0.0, oversample=None):
    """Any oscillator by name: saw, square, pulse (30 %), triangle or sine. oversample=None picks it by pitch
    (auto_oversample)."""
    if shape not in SHAPES:
        raise ValueError(f"oscillator shape {shape!r}: one of {sorted(SHAPES)}")
    if shape == "sine":
        return sine(freq, n, sr, phase0)
    return SHAPES[shape](freq, n, sr=sr, phase0=phase0, oversample=oversample)


# ---- noise ----
_PINK_B = [0.049922035, -0.095993537, 0.050612699, -0.004408786]   # J. O. Smith's -3 dB/octave fit
_PINK_A = [1.0, -2.494956002, 2.017265875, -0.522189400]
_WARM = 4800                                                       # 100 ms of warm-up, dropped (the filters settle)


def noise(n, rng, color="white"):
    """Unit-RMS noise from a seeded generator: white, pink (-3 dB/oct), brown (-6 dB/oct, DC-free) or blue (+3)."""
    if color == "white":
        return rng.standard_normal(n)
    w = rng.standard_normal(n + _WARM)
    if color == "pink":
        y = lfilter(_PINK_B, _PINK_A, w)
    elif color == "brown":
        y = lfilter([1.0], [1.0, -0.997], w)
        y = sosfilt(butter(1, 12.0, btype="highpass", fs=core.SR, output="sos"), y)
    elif color == "blue":
        y = np.diff(w, prepend=0.0)
    else:
        raise ValueError(f"noise color {color!r}: white, pink, brown or blue")
    y = y[_WARM:]
    return y / (np.std(y) + 1e-12)


def slow_random(n, rng, rate_hz=1.0, sr=core.SR):
    """A smooth random curve around 0 (unit RMS), changing about rate_hz times a second: for drift and wobble."""
    k = max(2, int(math.ceil(n / sr * rate_hz)) + 3)
    pts = rng.standard_normal(k)
    x = np.arange(n) / sr * rate_hz
    i = np.minimum(np.floor(x).astype(int), k - 2)
    u = x - i
    u = u * u * (3.0 - 2.0 * u)                                      # smoothstep between the points
    y = pts[i] * (1.0 - u) + pts[i + 1] * u
    return y / (np.std(y) + 1e-12) if n > 1 else y


# ---- unison and supersaw ----
SUPERSAW_DETUNE = np.array([-1.0, -0.5716, -0.1774, 0.0, 0.1810, 0.5650, 0.9766])  # the JP-8000's spacing, normalised


def _spread(voices):
    if voices == 7:
        d = SUPERSAW_DETUNE
    elif voices == 1:
        d = np.array([0.0])
    else:
        d = np.linspace(-1.0, 1.0, voices) * (1.0 - 0.03 * (np.arange(voices) % 2))   # a little uneven: no lockstep
    pans = d * np.where(np.arange(len(d)) % 2 == 1, -1.0, 1.0)                     # neighbours on opposite sides
    return d, pans


def unison(freq, n, voices=7, detune=25.0, width=0.8, side=0.8, shape="saw", rng=None, sr=core.SR, drift=0.0,
           oversample=None):
    """(2, n): `voices` copies of an oscillator, detuned up to +-detune cents (the JP-8000's uneven spacing at 7),
    each from a random phase, neighbours panned to opposite sides across `width` (0 mono .. 1 full). side is the
    level of the detuned voices against the centre one; drift adds a slow random pitch wander (cents) per voice.
    The sum is scaled to about one oscillator's RMS."""
    r = rng if rng is not None else core.rng(0, "unison")
    d, pans = _spread(int(voices))
    out = np.zeros((2, n))
    total = 0.0
    for i, di in enumerate(d):
        f = np.asarray(freq, dtype=float) * 2.0 ** (di * detune / 1200.0)
        if drift:
            f = f * 2.0 ** (drift * slow_random(n, r, 0.7, sr) / 1200.0)
        y = osc(shape, f if np.ndim(f) else float(f), n, sr, phase0=float(r.random()), oversample=oversample)
        g = 1.0 if di == 0.0 else side
        gl, gr = core.pan_gains(pans[i] * width)
        out[0] += g * gl * y
        out[1] += g * gr * y
        total += g * g
    return out / math.sqrt(total)


def supersaw(freq, n, detune=30.0, width=0.9, voices=7, side=0.8, rng=None, sr=core.SR, hpf=True, drift=0.0,
             oversample=None):
    """The supersaw: 7 detuned saws (unison), plus the JP-8000's high-pass at the fundamental, which keeps the low end
    of a stack of detuned saws from going muddy."""
    y = unison(freq, n, voices, detune, width, side, "saw", rng, sr, drift, oversample)
    if hpf:
        f0 = float(np.min(freq)) if np.ndim(freq) else float(freq)
        y = sosfilt(butter(1, max(10.0, 0.9 * f0), btype="highpass", fs=sr, output="sos"), y, axis=-1)
    return y


# ---- FM ----
def _fm(freq, n, sr, mods=((1.0, 1.0),), stack=False, phase0=0.0):
    # Each modulator starts at ratio x the carrier's phase. Then a sideband that lands on 0 Hz (ratio 1 or 1/m, as in
    # an electric piano) has zero phase and so no amplitude: sin(c + I sin(m)) carries J_k(I) sin(phase) there, a DC
    # offset that would follow the note's envelope as a thump.
    pc, _ = phase(freq, n, sr, phase0)
    m = np.zeros(n)
    if stack:
        for ratio, idx in reversed(mods):
            pm, _ = phase(np.asarray(freq) * ratio if np.ndim(freq) else freq * ratio, n, sr, (phase0 * ratio) % 1.0)
            m = np.asarray(idx) * np.sin(2.0 * np.pi * pm + m)
    else:
        for ratio, idx in mods:
            pm, _ = phase(np.asarray(freq) * ratio if np.ndim(freq) else freq * ratio, n, sr, (phase0 * ratio) % 1.0)
            m = m + np.asarray(idx) * np.sin(2.0 * np.pi * pm)
    return np.sin(2.0 * np.pi * pc + m)


def fm(freq, n, mods=((1.0, 1.0),), stack=False, sr=core.SR, phase0=0.0, oversample=None):
    """Phase-modulation FM: a sine carrier at freq, modulated by sines at freq x ratio with an index (a number or a
    per-sample array: the index envelope is what makes FM sound alive). mods are (ratio, index) pairs summed into the
    carrier, or with stack=True a chain (mods[0] modulates the carrier, mods[1] modulates mods[0] ...).
    oversample=None picks 1, 2 or 4 from Carson's rule, so the sidebands stay under 0.45 x the output rate."""
    if oversample is None:
        fmax = float(np.max(freq))
        top = fmax + sum(fmax * ratio * (float(np.max(idx)) + 1.0) for ratio, idx in mods)
        oversample = 1 if top < MAX_F * sr else 2 if top < 2 * MAX_F * sr else 4
    if oversample <= 1:
        return _fm(freq, n, sr, mods, stack, phase0)
    k = int(oversample)
    up = lambda a: np.interp(np.arange(n * k) / k, np.arange(n), a) if np.ndim(a) else a  # noqa: E731
    mk = tuple((ratio, up(np.asarray(idx, dtype=float)) if np.ndim(idx) else idx) for ratio, idx in mods)
    y = _fm(up(freq) if np.ndim(freq) else freq, n * k, sr * k, mk, stack, phase0)
    return core.fit(soxr.resample(y, sr * k, sr, quality="VHQ"), n)


# ---- pitch curves ----
def pitch_drop(f_start, f_end, n, tau, sr=core.SR):
    """Hz per sample: from f_start, settling on f_end with time constant tau (s): a drum's pitch envelope."""
    t = np.arange(n) / sr
    return f_end + (f_start - f_end) * np.exp(-t / max(tau, 1e-6))


def pitch_sweep(f_start, f_end, n, curve=1.0, sr=core.SR):
    """Hz per sample: from f_start to f_end, even in octaves; curve > 1 starts slow and finishes fast (a riser)."""
    u = (np.arange(n) / max(1, n - 1)) ** curve
    return f_start * (f_end / f_start) ** u


def vibrato(n, rate=5.0, cents=12.0, delay=0.25, fade=0.3, sr=core.SR):
    """A pitch factor per sample: a sine vibrato that waits `delay` s, then fades in over `fade` s."""
    t = np.arange(n) / sr
    ramp = np.clip((t - delay) / max(fade, 1e-6), 0.0, 1.0)
    return 2.0 ** (cents * ramp * np.sin(2.0 * np.pi * rate * t) / 1200.0)


def freq_curve(note, n, freq=None, glide_from=None, glide_s=0.05, sr=core.SR):
    """The Hz of a pitched voice, one value per sample. freq (a number or an array; an array shorter than n holds its
    last value) overrides note; otherwise note (a name or MIDI number) is the pitch, approached from glide_from (a note,
    or a number of semitones relative to it) over glide_s on a smoothstep in log-frequency."""
    if freq is not None:
        f = np.asarray(freq, dtype=float)
        if f.ndim == 0:
            return np.full(n, float(f))
        return f[:n] if len(f) >= n else np.concatenate([f, np.full(n - len(f), f[-1] if len(f) else 0.0)])
    m = core.note(note)
    f = np.full(n, core.mtof(m))
    if glide_from is not None:
        g0 = m + float(glide_from) if isinstance(glide_from, (int, float)) else core.note(glide_from)
        k = min(n, max(1, int(round(glide_s * sr))))
        u = np.arange(k) / k
        u = u * u * (3.0 - 2.0 * u)
        f[:k] = core.mtof(g0 + (m - g0) * u)
    return f
