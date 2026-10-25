"""Shared helpers: the sample rate, levels, pitch names and chord symbols, pan, placement, fades and seeded generators.

Every signal in the package is a float64 numpy array: mono is shape (n,), stereo is (2, n). Times are seconds,
positions on a stem are whole samples, and every random draw comes from rng(...), so a render is the same bit for bit
on every run.
"""
from __future__ import annotations

import math
import re
import zlib

import numpy as np

SR = 48000  # the film's rate; every stem is 48 kHz


# ---- levels ----
def amp(db):
    """dB -> linear gain."""
    return 10.0 ** (np.asarray(db, dtype=float) / 20.0) if np.ndim(db) else 10.0 ** (float(db) / 20.0)


def db(x, floor=-240.0):
    """Linear gain (or a peak) -> dB, floored so silence does not give -inf."""
    x = np.maximum(np.abs(np.asarray(x, dtype=float)), 10.0 ** (floor / 20.0))
    return 20.0 * np.log10(x) if x.ndim else float(20.0 * math.log10(float(x)))


def peak_db(x):
    """The sample peak of a signal, in dBFS."""
    return db(float(np.max(np.abs(x))) if np.size(x) else 0.0)


# ---- pitch ----
_PC = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
_NOTE_RE = re.compile(r"^([A-Ga-g])([#b]{0,2})(-?\d+)$")


def mtof(m):
    """MIDI note number -> Hz (A4 = 69 = 440 Hz). Works on arrays."""
    return 440.0 * 2.0 ** ((np.asarray(m, dtype=float) - 69.0) / 12.0) if np.ndim(m) else \
        440.0 * 2.0 ** ((float(m) - 69.0) / 12.0)


def ftom(f):
    """Hz -> MIDI note number (fractional)."""
    return 69.0 + 12.0 * np.log2(np.asarray(f, dtype=float) / 440.0) if np.ndim(f) else \
        69.0 + 12.0 * math.log2(float(f) / 440.0)


def note(n):
    """A note as a MIDI number: 'C4' = 60, 'A4' = 69, 'F#2', 'Bb1', 'Eb-1'; a number passes through (fractional is
    fine). Octaves follow scientific pitch, so 'D2' is 73.4 Hz."""
    if isinstance(n, (int, float, np.integer, np.floating)):
        return float(n)
    s = str(n).strip()
    if re.fullmatch(r"-?\d+(\.\d+)?", s):
        return float(s)
    m = _NOTE_RE.match(s)
    if not m:
        raise ValueError(f"not a note name: {n!r} (want e.g. 'D2', 'F#3', 'Bb1')")
    pc = _PC[m.group(1).upper()] + m.group(2).count("#") - m.group(2).count("b")
    return float(12 * (int(m.group(3)) + 1) + pc)


def hz(n):
    """A note name or MIDI number -> Hz."""
    return mtof(note(n))


def notes(ns):
    """A note, a list of notes, or None -> a tuple of MIDI numbers (empty for None)."""
    if ns is None:
        return ()
    if isinstance(ns, (list, tuple, np.ndarray)):
        return tuple(note(x) for x in ns)
    return (note(ns),)


# Chord qualities as semitones over the root. Aliases map to these.
CHORDS = {
    "": (0, 4, 7), "m": (0, 3, 7), "5": (0, 7), "dim": (0, 3, 6), "aug": (0, 4, 8),
    "sus2": (0, 2, 7), "sus4": (0, 5, 7), "6": (0, 4, 7, 9), "m6": (0, 3, 7, 9),
    "7": (0, 4, 7, 10), "maj7": (0, 4, 7, 11), "m7": (0, 3, 7, 10), "mmaj7": (0, 3, 7, 11), "m7b5": (0, 3, 6, 10),
    "dim7": (0, 3, 6, 9), "7sus4": (0, 5, 7, 10), "add9": (0, 4, 7, 14), "madd9": (0, 3, 7, 14),
    "9": (0, 4, 7, 10, 14), "maj9": (0, 4, 7, 11, 14), "m9": (0, 3, 7, 10, 14), "6/9": (0, 4, 7, 9, 14),
    "11": (0, 4, 7, 10, 14, 17), "m11": (0, 3, 7, 10, 14, 17), "maj7#11": (0, 4, 7, 11, 18),
}
_ALIAS = {"maj": "", "M": "", "min": "m", "-": "m", "M7": "maj7", "Maj7": "maj7", "min7": "m7", "-7": "m7",
          "M9": "maj9", "Maj9": "maj9", "min9": "m9", "sus": "sus4", "7sus": "7sus4", "+": "aug", "o": "dim",
          "o7": "dim7", "ø": "m7b5", "69": "6/9", "minmaj7": "mmaj7"}
_CHORD_RE = re.compile(r"^([A-G])([#b]?)(.*?)(?:/([A-G][#b]?))?$")


def chord(symbol, octave=3, inversion=0, open_voicing=False):
    """A chord symbol -> a sorted list of MIDI notes, rooted in `octave`.

    'Bm7', 'D(add9)', 'Gmaj7/D' (the slash bass goes under the chord), 'A7sus4', 'F#m7', 'C5'. inversion=k moves the
    k lowest chord tones up an octave; open_voicing lifts every second tone an octave (a wider pad voicing).
    """
    m = _CHORD_RE.match(symbol.replace(" ", "").replace("(", "").replace(")", ""))
    if not m:
        raise ValueError(f"not a chord symbol: {symbol!r}")
    root = 12 * (octave + 1) + _PC[m.group(1)] + (1 if m.group(2) == "#" else -1 if m.group(2) == "b" else 0)
    q = _ALIAS.get(m.group(3), m.group(3))
    if q not in CHORDS:
        raise ValueError(f"unknown chord quality {m.group(3)!r} in {symbol!r}; known: {sorted(CHORDS)}")
    tones = [root + i for i in CHORDS[q]]
    for k in range(inversion % len(tones)):
        tones[k] += 12
    tones.sort()
    if open_voicing:
        tones = sorted(t + 12 if i % 2 == 1 else t for i, t in enumerate(tones))
    if m.group(4):
        bass = note(m.group(4) + str(octave))
        while bass >= tones[0]:
            bass -= 12
        tones = [bass] + tones
    return [float(t) for t in tones]


# ---- channels, pan, placement ----
def pan_gains(p):
    """Equal-power pan law, as tools/audio/mix_master.py places effects: centre is unity on both channels."""
    a = (float(np.clip(p, -1.0, 1.0)) + 1.0) * math.pi / 4.0
    return math.cos(a) * math.sqrt(2.0), math.sin(a) * math.sqrt(2.0)


def stereo(x, pan=0.0):
    """Mono (n,) -> stereo (2, n) panned; stereo passes through with the same law applied as a balance."""
    x = np.asarray(x, dtype=float)
    gl, gr = pan_gains(pan)
    if x.ndim == 1:
        return np.stack([x * gl, x * gr])
    if x.ndim == 2 and x.shape[0] == 2:
        return x if pan == 0 else np.stack([x[0] * gl, x[1] * gr])
    raise ValueError(f"want (n,) or (2, n), got {x.shape}")


def mono(x):
    """(2, n) -> (n,) as (L + R) / 2; mono passes through."""
    x = np.asarray(x, dtype=float)
    return x if x.ndim == 1 else 0.5 * (x[0] + x[1])


def fit(x, n):
    """Pad with zeros or cut the last axis to exactly n samples."""
    k = x.shape[-1]
    if k == n:
        return x
    if k > n:
        return x[..., :n]
    pad = [(0, 0)] * (x.ndim - 1) + [(0, n - k)]
    return np.pad(x, pad)


def place(dst, src, at):
    """Add src into dst starting at sample `at` (which may be negative or past the end); both mono or both stereo."""
    n, k = dst.shape[-1], src.shape[-1]
    i0, i1 = max(0, at), min(n, at + k)
    if i1 > i0:
        dst[..., i0:i1] += src[..., i0 - at:i1 - at]
    return dst


def ramp_shape(u, shape="cos"):
    """0 -> 1 over u in [0, 1]: 'cos' (raised cosine), 'sine' (quarter sine: equal power), 'lin', or 'exp' (slow, then
    fast: u^2)."""
    u = np.clip(u, 0.0, 1.0)
    if shape == "cos":
        return 0.5 - 0.5 * np.cos(np.pi * u)
    if shape == "sine":
        return np.sin(0.5 * np.pi * u)
    if shape == "lin":
        return u
    if shape == "exp":
        return u * u
    raise ValueError(f"unknown fade shape {shape!r}")


def fade(x, fade_in=0.0, fade_out=0.0, sr=SR, shape="cos"):
    """A copy with a fade-in from exact zero on its first sample and a fade-out to exact zero on its last."""
    y = np.array(x, dtype=float, copy=True)
    n = y.shape[-1]
    k = min(n, int(round(fade_in * sr)))
    if k > 0:
        y[..., :k] *= ramp_shape(np.arange(k) / k, shape)
    k = min(n, int(round(fade_out * sr)))
    if k > 0:
        y[..., n - k:] *= ramp_shape(np.arange(k - 1, -1, -1) / max(1, k - 1), shape)
    return y


def end_clean(x, sec=0.005, sr=SR):
    """Fade the last `sec` to exact zero (a one-shot's tail never stops on a step)."""
    return fade(x, 0.0, sec, sr)


# ---- seeded randomness ----
def _seed_word(k):
    if isinstance(k, str):
        return zlib.crc32(k.encode("utf-8"))
    if isinstance(k, (bool, np.bool_)):
        return int(k)
    if isinstance(k, (int, np.integer)):
        return int(k) % (1 << 32)
    if isinstance(k, (float, np.floating)):
        return int(round(float(k) * 1_000_000)) % (1 << 32)
    raise TypeError(f"rng keys are str, int or float, not {type(k).__name__}")


def rng(*keys):
    """A numpy Generator seeded by any mix of strings and numbers: rng(7, 'hats', 806400). Strings go through CRC-32
    (Python's own hash() changes per process), so the same keys give the same draws on every run."""
    return np.random.default_rng([_seed_word(k) for k in keys] or [0])


# ---- checks ----
def check(x, name="signal"):
    """Raise when a signal holds NaN or infinity; return it otherwise."""
    if not np.all(np.isfinite(x)):
        bad = int(np.size(x) - np.count_nonzero(np.isfinite(x)))
        raise FloatingPointError(f"{name}: {bad} samples are NaN or infinite")
    return x


def samples(seconds, sr=SR):
    """Seconds -> the nearest whole sample."""
    return int(round(float(seconds) * sr))
