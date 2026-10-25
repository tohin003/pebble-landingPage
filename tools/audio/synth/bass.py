"""Bass voices: sub, 808, pluck, reese and saw bass. Each takes a note (or freq: a number or a per-sample curve, which
the mixer's mono lines use for glides), a velocity and a held length dur, and returns stereo (2, n) = dur + release.
Everything under about 140 Hz stays mono, so a phone speaker's mono fold-down keeps the low end.
"""
from __future__ import annotations

import numpy as np

from . import core, env, filters, fx, osc


def _r(rng):
    return rng if rng is not None else core.rng(0, "bass")


def _sine(f, sr):
    ph = np.concatenate([[0.0], np.cumsum(f[:-1])]) / sr
    return np.sin(2.0 * np.pi * ph)


def _len(dur, release, default=0.5):
    return (dur if dur and dur > 0 else default) + release


def sub(note="D2", vel=0.9, dur=None, rng=None, sr=core.SR, freq=None, glide_from=None, glide_s=0.03, attack=0.004,
        decay=0.15, sustain=0.9, release=0.06, harmonics=0.2, hpf=28.0, level=0.7):
    """A sub bass: a sine, with a biased tanh that adds a quiet 2nd and 3rd harmonic (harmonics=0.2 puts them about
    20 dB down) so small speakers hear its pitch; high-passed at hpf."""
    gate = dur if dur and dur > 0 else 0.5
    n = core.samples(gate + release, sr)
    f = osc.freq_curve(note, n, freq, glide_from, glide_s, sr)
    s = _sine(f, sr)
    if harmonics > 0:
        b = harmonics
        s = (np.tanh(1.2 * (s + b)) - np.tanh(1.2 * b)) / np.tanh(1.2)
        s = filters.dc_block(s, 6.0, sr)
    y = s * env.adsr(gate, attack, decay, sustain, release, sr, length=n)
    y = filters.highpass(y, hpf, sr=sr) if hpf else y
    return core.stereo(core.end_clean(y * vel * level, 0.004, sr))


def bass_808(note="D1", vel=0.9, dur=None, rng=None, sr=core.SR, freq=None, glide_from=None, glide_s=0.06,
             punch=7.0, punch_tau=0.03, tau=0.9, hold=0.05, drive=2.5, tone=1800.0, click=0.08, release=0.06,
             length=None, level=0.78):
    """An 808 bass: a sine on the note that starts `punch` semitones higher and falls in ~punch_tau x 3, decays with
    time constant tau, and is driven (tanh) then low-passed at `tone`, so it reads on a laptop. dur chokes it; glides
    come from glide_from or a mono line's freq curve."""
    r = _r(rng)
    gate = dur if dur and dur > 0 else (length or 1.2)
    n = core.samples(gate + release, sr)
    t = np.arange(n) / sr
    f = osc.freq_curve(note, n, freq, glide_from, glide_s, sr) * 2.0 ** (punch / 12.0 * np.exp(-t / punch_tau))
    y = _sine(f, sr) * env.perc(n / sr, 0.0006, tau, hold, 0.004, sr) * env.gate(n, gate, release, sr)
    k = core.samples(0.003, sr)
    y[:k] += click * filters.band(r.standard_normal(k), 1500.0, 6000.0, sr=sr) * \
        env.perc(0.003, 0.0001, 0.0008, 0.0, 0.001, sr)
    y = filters.lowpass(fx.saturate(y, drive), tone, sr=sr)
    return core.stereo(core.end_clean(y * vel * level, 0.004, sr))


def pluck_bass(note="D2", vel=0.9, dur=None, rng=None, sr=core.SR, freq=None, glide_from=None, glide_s=0.04,
               shape="saw", cutoff=380.0, env_oct=2.6, ftau=0.09, keytrack=0.5, q=1.3, poles=4, sub=0.5,
               attack=0.002, decay=0.3, sustain=0.35, release=0.06, level=1.0):
    """A plucked synth bass: a saw (or square) through a 24 dB low pass whose cut-off snaps open env_oct octaves and
    closes with time constant ftau, over a sine sub on the same note (sub sets its level)."""
    gate = dur if dur and dur > 0 else 0.3
    n = core.samples(gate + release, sr)
    t = np.arange(n) / sr
    f = osc.freq_curve(note, n, freq, glide_from, glide_s, sr)
    y = osc.osc(shape, f, n, sr, phase0=0.0)
    fc = filters.cutoff(cutoff, n, note=float(core.ftom(np.median(f))), keytrack=keytrack, env=np.exp(-t / ftau),
                        env_oct=env_oct, vel=vel, vel_oct=0.8, sr=sr)
    y = filters.filt(y, "lp", fc, q, poles, sr=sr)
    y = y + sub * _sine(f, sr)
    y = y * env.adsr(gate, attack, decay, sustain, release, sr, length=n)
    return core.stereo(core.end_clean(y * vel * level / (1.0 + sub), 0.004, sr))


def reese(note="D2", vel=0.85, dur=None, rng=None, sr=core.SR, freq=None, glide_from=None, glide_s=0.05,
          detune=14.0, wobble_hz=0.18, cutoff=900.0, keytrack=0.4, q=1.2, poles=4, drive=1.6, width=0.7,
          attack=0.012, decay=0.3, sustain=0.85, release=0.15, mono_hz=140.0, sub=0.4, level=0.6):
    """A reese: three saws whose detune drifts slowly (wobble_hz), so their phases sweep against each other; a 24 dB
    low pass, drive, a wide top and a mono sub."""
    r = _r(rng)
    gate = dur if dur and dur > 0 else 1.0
    n = core.samples(gate + release, sr)
    f = osc.freq_curve(note, n, freq, glide_from, glide_s, sr)
    w1 = 1.0 + 0.35 * osc.slow_random(n, r, wobble_hz * 4.0, sr) / 2.0
    w2 = 1.0 + 0.35 * osc.slow_random(n, r, wobble_hz * 4.0, sr) / 2.0
    c = osc.saw(f, n, sr, phase0=float(r.random()))
    a = osc.saw(f * 2.0 ** (detune * w1 / 1200.0), n, sr, phase0=float(r.random()))
    b = osc.saw(f * 2.0 ** (-detune * w2 / 1200.0), n, sr, phase0=float(r.random()))
    st = np.stack([0.6 * c + 0.8 * a + 0.3 * b, 0.6 * c + 0.3 * a + 0.8 * b]) / 1.4
    fc = filters.cutoff(cutoff, n, note=float(core.ftom(np.median(f))), keytrack=keytrack, sr=sr)
    st = filters.filt(st, "lp", fc, q, poles, sr=sr)
    st = fx.saturate(st, drive)
    st = fx.widen(st, width * 1.5)
    st = st + sub * core.stereo(_sine(f, sr))
    st = fx.mono_below(st, mono_hz, sr)
    st = st * env.adsr(gate, attack, decay, sustain, release, sr, length=n)
    return core.end_clean(st * vel * level / (1.0 + sub), 0.004, sr)


def saw_bass(note="D2", vel=0.9, dur=None, rng=None, sr=core.SR, freq=None, glide_from=None, glide_s=0.04,
             cutoff=650.0, env_oct=1.6, ftau=0.15, keytrack=0.5, q=1.0, poles=2, drive=1.5, sub=0.45, attack=0.003,
             decay=0.2, sustain=0.7, release=0.06, level=1.0):
    """A saw bass: one saw and a sine sub, a 12 dB low pass with a short envelope, and drive."""
    gate = dur if dur and dur > 0 else 0.4
    n = core.samples(gate + release, sr)
    t = np.arange(n) / sr
    f = osc.freq_curve(note, n, freq, glide_from, glide_s, sr)
    y = osc.saw(f, n, sr)
    fc = filters.cutoff(cutoff, n, note=float(core.ftom(np.median(f))), keytrack=keytrack, env=np.exp(-t / ftau),
                        env_oct=env_oct, vel=vel, vel_oct=0.6, sr=sr)
    y = fx.saturate(filters.filt(y, "lp", fc, q, poles, sr=sr), drive) + sub * _sine(f, sr)
    y = y * env.adsr(gate, attack, decay, sustain, release, sr, length=n)
    return core.stereo(core.end_clean(y * vel * level / (1.0 + sub), 0.004, sr))
