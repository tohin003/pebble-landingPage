"""Trailer and launch-film effects: noise and pitch risers, a Shepard riser, downlifters, impacts (a sub drop plus
noise), reverse swells, whooshes and a synthesised low braam.

Each returns (audio, anchor): stereo (2, n) and the sample that lands on the event's time. A riser or a reverse swell
is anchored at its end (it arrives on the hit), a whoosh at its peak, an impact, a downlifter and a braam at their
start. The mixer honours the anchor, so `Event(t=<the downbeat>)` is all a riser needs.

Classifier notes: a lone gliding tone reads as a siren to Apple's classifier (tools/audio/sfx_synth.py), so the pitch
riser glides a dense, detuned supersaw cluster over noise, never a bare tone, and the noise riser has no pitch at
all. A long, steady low tone with a slow fade reads as a foghorn (tools/audio/drive.py, OVERRIDES §36), so the braam
is a detuned, noisy, moving cluster that opens and closes its filter, drifts in pitch and decays within seconds.
"""
from __future__ import annotations

import numpy as np

from . import core, env, filters, fx, osc


def _r(rng, key):
    return rng if rng is not None else core.rng(0, key)


def _u(n):
    return np.arange(n) / max(1, n - 1)


def _norm(y, level):
    return y / (np.abs(y).max() + 1e-12) * level


def noise_riser(note=None, vel=1.0, dur=4.8, rng=None, sr=core.SR, f0=280.0, f1=9000.0, q=1.6, sweep=1.6,
                curve=2.6, width=(0.3, 1.0), air=0.3, chop=None, chop_depth=0.0, color="white", end_ms=4.0,
                level=0.9):
    """A noise riser `dur` seconds long: a band of noise sweeping from f0 to f1 (sweep > 1 lingers low, then rushes),
    swelling on u^curve, widening from width[0] to width[1], with high air joining late. chop=(rate0, rate1) adds a
    tremolo that accelerates from rate0 to rate1 Hz (chop_depth 0..1), the classic trailer stutter. Anchored at its
    end: its last sample (after an end_ms fade) lands on the hit."""
    r = _r(rng, "riser")
    n = core.samples(dur, sr)
    u = _u(n)
    m, s = osc.noise(n, r, color), osc.noise(n, r, color)
    w = width[0] + (width[1] - width[0]) * u
    fc = f0 * (f1 / f0) ** (u ** sweep)
    y = filters.filt(np.stack([m + w * s, m - w * s]) / np.sqrt(1.0 + w * w), "bp", fc, q, 2, sr=sr)
    y = y + air * filters.highpass(np.stack([s, m]), 6000.0, sr=sr) * u ** 2
    y = y * u ** curve
    if chop and chop_depth:
        rate = chop[0] + (chop[1] - chop[0]) * u ** 1.5
        ph = np.cumsum(rate) / sr
        y = y * (1.0 - chop_depth * (0.5 + 0.5 * np.cos(2.0 * np.pi * ph)))
    y = core.fade(_norm(y, level), 0.002, end_ms / 1000.0, sr)
    return y * vel, n


def pitch_riser(note="D3", vel=1.0, dur=4.8, rng=None, sr=core.SR, semitones=24.0, curve=1.6, detune=35.0,
                voices=7, octave=0.5, noise=0.45, f_lo=500.0, f_hi=10000.0, q=0.9, amp_curve=2.2, end_ms=4.0,
                level=0.9):
    """A pitch riser: a wide supersaw cluster (and an octave above it at `octave`) gliding up `semitones` from the note
    (curve > 1: slow, then fast), a low pass opening from f_lo to f_hi, and a noise riser under it. Anchored at its
    end."""
    r = _r(rng, "pitch_riser")
    n = core.samples(dur, sr)
    u = _u(n)
    f = core.hz(note) * 2.0 ** (semitones / 12.0 * u ** curve)
    y = osc.supersaw(f, n, detune, 1.0, voices, 0.85, r, sr)
    if octave:
        y = y + octave * osc.supersaw(2.0 * f, n, detune * 1.2, 1.0, voices, 0.85, r, sr)
    y = filters.filt(y, "lp", f_lo * (f_hi / f_lo) ** (u ** 1.3), q, 2, sr=sr)
    y = _norm(y, 1.0) * u ** amp_curve
    if noise:
        nz, _ = noise_riser(None, 1.0, dur, r, sr, f0=400.0, f1=11000.0, curve=amp_curve, level=1.0)
        y = y + noise * nz
    return core.fade(_norm(y, level), 0.002, end_ms / 1000.0, sr) * vel, n


def shepard(note="D3", vel=1.0, dur=4.8, rng=None, sr=core.SR, octaves_per_s=0.25, layers=6, cutoff=3500.0,
            detune=12.0, noise=0.2, swell=1.0, level=0.8):
    """A Shepard riser: `layers` saw voices an octave apart, all gliding up octaves_per_s, each fading in at the bottom
    of a raised-cosine spectral envelope and out at the top (silent where it wraps), so the rise seems endless. Detuned pairs and a noise bed
    keep it from reading as a tone. swell > 0 also grows it in level (u^swell). Anchored at its end."""
    r = _r(rng, "shepard")
    n = core.samples(dur, sr)
    t = np.arange(n) / sr
    base = core.hz(note) / 2.0
    y = np.zeros((2, n))
    for k in range(layers):
        p = (k + octaves_per_s * t) % layers
        a = 0.5 - 0.5 * np.cos(2.0 * np.pi * p / layers)       # exactly 0 where a layer wraps from top to bottom
        f = base * 2.0 ** p
        pair = osc.unison(f, n, 2, detune, 0.8, 1.0, "saw", r, sr)
        y += pair * a
    y = filters.lowpass(y, cutoff, sr=sr)
    if noise:
        y = y + noise * filters.band(r.standard_normal((2, n)), 300.0, 8000.0, sr=sr) * np.std(y)
    if swell:
        y = y * _u(n) ** swell
    return core.fade(_norm(y, level), 0.05, 0.004, sr) * vel, n


def downlifter(note=None, vel=1.0, dur=1.6, rng=None, sr=core.SR, f0=7000.0, f1=160.0, q=1.2, curve=1.4, sub=0.5,
               sub_hz=(110.0, 38.0), attack_ms=6.0, width=0.8, level=0.85):
    """A downlifter: a band of noise falling from f0 to f1 and fading on (1 - u)^curve, with a sine sub falling
    sub_hz[0] -> sub_hz[1] under it. Anchored at its start (the cut it leaves)."""
    r = _r(rng, "downlifter")
    n = core.samples(dur, sr)
    u = _u(n)
    m, s = r.standard_normal(n), r.standard_normal(n)
    y = filters.filt(np.stack([m + width * s, m - width * s]), "bp", f0 * (f1 / f0) ** (u ** 0.7), q, 2, sr=sr)
    y = _norm(y, 1.0) * (1.0 - u) ** curve
    if sub:
        f = sub_hz[1] + (sub_hz[0] - sub_hz[1]) * np.exp(-np.arange(n) / sr / (dur / 4.0))
        ph = np.concatenate([[0.0], np.cumsum(f[:-1])]) / sr
        y = y + sub * core.stereo(np.sin(2 * np.pi * ph) * (1.0 - u) ** 2)
    y = core.fade(_norm(y, level), attack_ms / 1000.0, 0.01, sr)
    return y * vel, 0


def impact(note=None, vel=1.0, dur=None, rng=None, sr=core.SR, sub_hz=(78.0, 32.0), drop_tau=0.07, sub_tau=0.55,
           sub=1.0, noise=0.6, noise_lp=1100.0, noise_tau=0.11, crack=0.3, length=2.6, drive=1.6, verb=0.14,
           size=0.75, level=0.9):
    """An impact: a sine sub dropping sub_hz[0] -> sub_hz[1] (time constant drop_tau) and decaying (sub_tau), a
    low-passed noise burst, a short crack, drive and a little room above 250 Hz. Nothing tonal above 200 Hz.
    Anchored at its start, which is its peak."""
    r = _r(rng, "impact")
    n = core.samples(length, sr)
    t = np.arange(n) / sr
    f = sub_hz[1] + (sub_hz[0] - sub_hz[1]) * np.exp(-t / drop_tau)
    ph = np.concatenate([[0.0], np.cumsum(f[:-1])]) / sr
    y = sub * np.sin(2 * np.pi * ph) * env.perc(length, 0.0008, sub_tau, 0.03, 0.2, sr)
    y += noise * filters.lowpass(r.standard_normal(n), noise_lp, poles=2, sr=sr) * \
        env.perc(length, 0.0006, noise_tau, 0.0, 0.2, sr) / 1.5
    k = core.samples(0.06, sr)
    y[:k] += crack * filters.band(r.standard_normal(k), 1200.0, 6000.0, sr=sr) * \
        env.perc(0.06, 0.0002, 0.008, 0.0, 0.005, sr) / 1.5
    y = fx.saturate(y, drive)
    st = fx.reverb(core.stereo(y), size=size, damping=0.65, wet=verb, dry=1.0, hp_hz=250.0, lp_hz=6000.0, sr=sr)
    st = fx.mono_below(core.fit(st, n), 140.0, sr)
    return core.end_clean(_norm(st, level), 0.2, sr) * vel, 0


def reverse_swell(note=("D3", "A3", "D4", "F#4"), vel=1.0, dur=1.2, rng=None, sr=core.SR, source="noise",
                  size=0.9, verb_s=3.0, bright=6000.0, curve=1.0, end_ms=3.0, level=0.85):
    """A reverse swell: a short source (source='noise', a crash-like burst; or 'chord', a supersaw stab of the notes)
    through a long reverb, reversed, so it swells into the hit. The last `dur` seconds of the reversed tail, faded in
    on u^curve; anchored at its end."""
    r = _r(rng, "reverse_swell")
    k = core.samples(0.3, sr)
    if source == "chord":
        from .synths import supersaw
        src = supersaw(note, 1.0, 0.18, r, sr, cutoff=bright, release=0.1, attack=0.002)
    else:
        src = filters.band(r.standard_normal((2, k)), 2500.0, min(bright * 2.0, 0.45 * sr), sr=sr) * \
            env.perc(0.3, 0.001, 0.06, 0.0, 0.05, sr)
    wet = fx.reverb(src, size=size, damping=0.4, wet=1.0, dry=0.25, hp_hz=200.0, lp_hz=bright, tail_s=verb_s, sr=sr)
    rev = wet[:, ::-1]
    n = core.samples(dur, sr)
    y = core.fit(rev[:, -n:] if rev.shape[1] >= n else np.pad(rev, ((0, 0), (n - rev.shape[1], 0))), n)
    y = y * _u(n) ** curve
    y = core.fade(_norm(y, level), 0.002, end_ms / 1000.0, sr)
    return y * vel, n


def whoosh(note=None, vel=1.0, dur=0.6, rng=None, sr=core.SR, peak=0.6, f_lo=320.0, f_hi=4200.0, q=1.3,
           pan=(-0.7, 0.7), air=0.35, level=0.8):
    """A whoosh: a band of noise whose centre rises to f_hi at `peak` (a share of dur) and falls back, swelling to the
    peak and dying after it, moving from pan[0] to pan[1]. Anchored at the peak (put the event on the cut)."""
    r = _r(rng, "whoosh")
    n = core.samples(dur, sr)
    u = _u(n)
    pk = int(round(peak * (n - 1)))
    a = np.where(u < peak, (u / peak) ** 2, np.exp(-((u - peak) / max(1e-6, 1.0 - peak)) * 3.5))
    hump = np.where(u < peak, np.sin(0.5 * np.pi * u / peak), np.cos(0.5 * np.pi * (u - peak) / max(1e-6, 1 - peak)))
    fc = f_lo + (f_hi - f_lo) * np.clip(hump, 0.0, 1.0)
    m = filters.filt(r.standard_normal(n), "bp", fc, q, 2, sr=sr)
    m = m + air * filters.filt(r.standard_normal(n), "hp", np.maximum(2000.0, 2.0 * fc), 0.7071, 2, sr=sr)
    m = m * a
    p = pan[0] + (pan[1] - pan[0]) * u
    ang = (np.clip(p, -1, 1) + 1.0) * np.pi / 4.0
    y = np.stack([m * np.cos(ang), m * np.sin(ang)]) * np.sqrt(2.0)
    y = core.fade(_norm(y, level), 0.003, 0.01, sr)
    return y * vel, pk


def braam(note="D1", vel=1.0, dur=2.4, rng=None, sr=core.SR, octaves=(0, 1), detune=45.0, voices=7, drive=3.0,
          f_start=180.0, f_peak=1200.0, f_end=320.0, open_s=0.08, q=1.1, noise=0.6, sub=0.6, drift=-4.0,
          wobble_cents=8.0, attack=0.015, hold=0.12, tau=0.4, verb=0.12, verb_hp=600.0, width=0.8, level=0.9):
    """A low braam, built so a classifier hears an impact-like texture rather than a horn: a detuned supersaw cluster
    on the note and an octave above (octaves), falling `drift` semitones and wobbling (wobble_cents, seeded), a 24 dB
    low pass that snaps open from f_start to f_peak in open_s and closes towards f_end, driven hard (oversampled), a
    noise layer through the same filter, a sine sub thump at the onset, a decay (tau) that is gone within dur, and a
    small room above verb_hp. Anchored at its start.

    The defaults came out of Apple's classifier (tagcheck's passes, -16 LUFS, 2026-10-25). The first design (24 cents,
    filter peak 2.2 kHz, -0.35 st, tau 0.9) read brass_instrument 0.65, foghorn 0.59 and trombone 0.53 in a demo's
    opening; on D2 alone foghorn 0.82. These read, alone, foghorn <= 0.08 and french_horn <= 0.07 from A0 to F1,
    <= 0.10 / 0.14 on A1, up to 0.25 on D2 and 0.32 on E2 (2.4 s): keep the root at A1 or below, or test it. Under a
    trailer hit and a sustained saw chord, foghorn stays <= 0.19 with no brass label in a top 3; a close chord in
    octave 3 still lifts french_horn to 0.4 (voice pads from octave 4: see synths.pad)."""
    r = _r(rng, "braam")
    n = core.samples(dur, sr)
    t = np.arange(n) / sr
    u = _u(n)
    pitch = core.note(note) + drift * u + wobble_cents / 100.0 * osc.slow_random(n, r, 3.0, sr) / 2.0
    f = core.mtof(pitch)
    y = np.zeros((2, n))
    for o in octaves:
        y += osc.supersaw(f * 2.0 ** o, n, detune, width, voices, 0.85, r, sr) * (1.0 if o == 0 else 0.7)
    nz = osc.noise(n, r, "pink")
    y = y + noise * np.stack([nz, np.roll(nz, 997)]) * np.std(y)
    opening = np.clip(t / open_s, 0.0, 1.0)
    closing = np.exp(-np.maximum(0.0, t - open_s) / max(1e-6, tau * 0.8))
    fc = np.exp(np.log(f_start) + (np.log(f_peak) - np.log(f_start)) * env.shape(opening, 2.0))
    fc = np.exp(np.log(f_end) + (np.log(fc) - np.log(f_end)) * closing)
    y = filters.filt(y, "lp", fc, q, 4, sr=sr)
    y = fx.saturate(_norm(y, 1.0), drive, oversample=2, sr=sr)
    amp = env.perc(dur, attack, tau, hold, min(0.4, dur / 3.0), sr, attack_curve=1.0)
    y = y * amp
    if sub:
        fs = core.hz(note) * (1.0 + 0.8 * np.exp(-t / 0.05))
        ph = np.concatenate([[0.0], np.cumsum(fs[:-1])]) / sr
        y = y + sub * core.stereo(np.sin(2 * np.pi * ph) * env.perc(dur, 0.002, 0.35, 0.02, 0.2, sr))
    if verb:
        y = core.fit(fx.reverb(y, size=0.85, damping=0.6, wet=verb, dry=1.0, hp_hz=verb_hp, lp_hz=5000.0, sr=sr), n)
    y = fx.mono_below(y, 140.0, sr)
    return core.end_clean(_norm(y, level), min(0.3, dur / 4.0), sr) * vel, 0
