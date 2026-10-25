"""Melodic and textural voices: supersaw chords, pads, plucks, arps, a lead, an FM electric piano, pulse stabs and
ticking textures. note may be one note or a chord (a tuple of notes, as grid.seq / grid.progression make them); dur
is the held length; the result is stereo (2, n), dur + release long, from exact zero to exact zero.

Classifier notes (OVERRIDES §37, tools/audio/drive.py): bell, mallet and marimba timbres over a steady beat read as a
ringtone, so nothing here rings with inharmonic partials; the electric piano's 14:1 'tine' is a 20 ms bark, low by
default; ticks are noise, never a sine blip (a short sine reads as 'beep'); the lead's vibrato is shallow and late
(a deep, early vibrato on a bright tone can read as a voice).
"""
from __future__ import annotations

import numpy as np

from . import core, env, filters, fx, osc


def _r(rng, key):
    return rng if rng is not None else core.rng(0, key)


def _chord(note, default):
    ns = core.notes(note)
    return ns if ns else (core.note(default),)


def supersaw(note=("D3", "F#3", "A3"), vel=0.8, dur=None, rng=None, sr=core.SR, detune=28.0, voices=7, width=0.9,
             side=0.8, cutoff=4200.0, env_oct=1.2, keytrack=0.3, vel_oct=0.7, q=0.9, poles=2, attack=0.01,
             decay=0.5, sustain=0.75, release=0.4, fattack=0.005, fdecay=0.35, fsustain=0.3, drift=0.0, level=0.3):
    """Supersaw chords: every note a 7-voice supersaw (JP-8000 spacing, random phases, neighbours panned apart), one
    low pass over the chord with its own envelope (env_oct octaves at its peak), key-tracked and opened by velocity,
    then the amplitude ADSR. The chord is scaled by 1 / sqrt(notes)."""
    r = _r(rng, "supersaw")
    ns = _chord(note, "D3")
    gate = dur if dur and dur > 0 else 1.0
    n = core.samples(gate + release, sr)
    y = np.zeros((2, n))
    for m in ns:
        y += osc.supersaw(core.mtof(m), n, detune, width, voices, side, r, sr, drift=drift)
    y /= np.sqrt(len(ns))
    fenv = env.adsr(gate, fattack, fdecay, fsustain, release, sr, length=n)
    fc = filters.cutoff(cutoff, n, note=ns, keytrack=keytrack, env=fenv, env_oct=env_oct, vel=vel, vel_oct=vel_oct,
                        sr=sr)
    y = filters.filt(y, "lp", fc, q, poles, sr=sr)
    y = y * env.adsr(gate, attack, decay, sustain, release, sr, length=n)
    return core.end_clean(y * vel * level, 0.004, sr)


def pad(note=("D3", "A3", "E4", "F#4"), vel=0.7, dur=None, rng=None, sr=core.SR, shape="saw", detune=18.0, voices=7,
        width=1.0, cutoff=1500.0, env_oct=1.0, keytrack=0.3, q=0.8, attack=0.9, decay=1.0, sustain=0.85, release=1.6,
        fattack=1.4, fsustain=0.7, sub=0.25, chorus=0.3, drift=4.0, hp=None, level=0.45):
    """A pad: detuned voices (shape 'saw': supersaws; or 'triangle', 'pulse', 'square' unison) with a slow attack and
    a slow filter swell, a soft triangle an octave down for warmth (sub), a little pitch drift, chorus, and an optional
    high pass (hp, Hz). Classifier note: a saw pad in the trombone register (about B2-A3) under a braam or a low hit
    reads as a brass section ('brass_instrument', 'foghorn'); voice it from octave 4 up, or use the triangle shape,
    there (README.md has the measurements)."""
    r = _r(rng, "pad")
    ns = _chord(note, "D3")
    gate = dur if dur and dur > 0 else 2.4
    n = core.samples(gate + release, sr)
    if shape == "saw":
        y = supersaw(ns, 1.0, gate, r, sr, detune=detune, voices=voices, width=width, side=0.8, cutoff=cutoff,
                     env_oct=env_oct, keytrack=keytrack, vel_oct=0.0, q=q, poles=2, attack=attack, decay=decay,
                     sustain=sustain, release=release, fattack=fattack, fdecay=1.0, fsustain=fsustain, drift=drift,
                     level=1.0)
    else:
        y = np.zeros((2, n))
        for m in ns:
            y += osc.unison(core.mtof(m), n, voices, detune, width, 0.8, shape, r, sr, drift=drift)
        y /= np.sqrt(len(ns))
        fenv = env.adsr(gate, fattack, 1.0, fsustain, release, sr, length=n)
        fc = filters.cutoff(cutoff, n, note=ns, keytrack=keytrack, env=fenv, env_oct=env_oct, sr=sr)
        y = filters.filt(y, "lp", fc, q, 2, sr=sr) * env.adsr(gate, attack, decay, sustain, release, sr, length=n)
    if sub > 0:
        lo = min(ns) - 12
        tri = osc.triangle(core.mtof(lo), n, sr, phase0=float(r.random()))
        y = y + sub * core.stereo(tri * env.adsr(gate, attack, decay, sustain, release, sr, length=n))
    if hp:
        y = filters.highpass(y, hp, sr=sr)
    if chorus > 0:
        y = fx.chorus(y, rate_hz=0.35, depth=0.3, centre_delay_ms=9.0, mix=chorus, sr=sr)
    return core.end_clean(core.fit(y, n) * vel * level, 0.01, sr)


def pluck(note="D4", vel=0.8, dur=None, rng=None, sr=core.SR, shape="saw", voices=3, detune=9.0, width=0.6,
          cutoff=700.0, env_oct=3.4, keytrack=0.5, q=1.1, poles=2, ftau=0.12, tau=0.32, release=0.08, length=None,
          level=0.5):
    """A pluck: a few detuned saws through a low pass that snaps open env_oct octaves and closes with time constant
    ftau, an exponential decay (tau) and a release at the end of dur. Chords work too."""
    r = _r(rng, "pluck")
    ns = _chord(note, "D4")
    gate = dur if dur and dur > 0 else (length or 4.0 * tau)
    n = core.samples(gate + release, sr)
    t = np.arange(n) / sr
    y = np.zeros((2, n))
    for m in ns:
        y += osc.unison(core.mtof(m), n, voices, detune, width, 0.8, shape, r, sr)
    y /= np.sqrt(len(ns))
    fc = filters.cutoff(cutoff, n, note=ns, keytrack=keytrack, env=np.exp(-t / ftau), env_oct=env_oct, vel=vel,
                        vel_oct=1.0, sr=sr)
    y = filters.filt(y, "lp", fc, q, poles, sr=sr)
    y = y * env.perc(n / sr, 0.0015, tau, 0.0, 0.004, sr) * env.gate(n, gate, release, sr)
    return core.end_clean(y * vel * level, 0.004, sr)


def arp_synth(note="D5", vel=0.8, dur=None, rng=None, sr=core.SR, **kw):
    """The arp voice: a brighter, shorter pluck (pair it with grid.arp)."""
    p = dict(voices=2, detune=6.0, cutoff=1100.0, env_oct=3.0, ftau=0.07, tau=0.16, release=0.05, width=0.5, level=0.33)
    p.update(kw)
    return pluck(note, vel, dur, rng, sr, **p)


def lead(note="D5", vel=0.8, dur=None, rng=None, sr=core.SR, freq=None, glide_from=None, glide_s=0.06, detune=7.0,
         sub=0.3, cutoff=3200.0, env_oct=0.8, keytrack=0.4, q=1.0, poles=4, attack=0.008, decay=0.25, sustain=0.8,
         release=0.15, fdecay=0.3, vibrato_cents=8.0, vibrato_rate=5.2, vibrato_delay=0.35, width=0.5, level=0.4):
    """A lead: two detuned saws and a square an octave down, a 24 dB low pass with a short envelope, a shallow vibrato
    that waits vibrato_delay before fading in. Mono lines with glides: mix.render_mono passes freq."""
    r = _r(rng, "lead")
    gate = dur if dur and dur > 0 else 0.5
    n = core.samples(gate + release, sr)
    f = osc.freq_curve(note, n, freq, glide_from, glide_s, sr)
    if vibrato_cents:
        f = f * osc.vibrato(n, vibrato_rate, vibrato_cents, vibrato_delay, 0.3, sr)
    y = osc.unison(f, n, 2, detune, width, 1.0, "saw", r, sr)
    if sub:
        y = y + sub * core.stereo(osc.square(f / 2.0, n, sr, phase0=float(r.random())))
    fenv = env.adsr(gate, 0.004, fdecay, 0.4, release, sr, length=n)
    fc = filters.cutoff(cutoff, n, note=float(core.ftom(np.median(f))), keytrack=keytrack, env=fenv, env_oct=env_oct,
                        vel=vel, vel_oct=0.6, sr=sr)
    y = filters.filt(y, "lp", fc, q, poles, sr=sr)
    y = y * env.adsr(gate, attack, decay, sustain, release, sr, length=n)
    return core.end_clean(y * vel * level / (1.0 + sub), 0.004, sr)


def fm_epiano(note="D4", vel=0.8, dur=None, rng=None, sr=core.SR, ratio=1.0, index=1.2, index_vel=1.6,
              index_tau=0.5, tine=0.1, tine_ratio=14.0, tine_tau=0.02, tau=1.6, release=0.25, detune=1.5,
              trem_rate=4.2, trem_depth=0.15, warmth=1.2, level=0.68):
    """An FM electric piano (a Rhodes-style two-operator patch): a 1:1 modulator whose index rises with velocity and
    settles to a quarter of its attack value (index_tau), a 14:1 'tine' bark that is gone in ~3 x tine_tau, a second
    carrier detuned by `detune` cents for width, a piano-like decay (tau), a gentle autopan tremolo and a little
    warmth (tanh). Chords work too."""
    r = _r(rng, "epiano")
    ns = _chord(note, "D4")
    gate = dur if dur and dur > 0 else 1.5
    n = core.samples(gate + release, sr)
    t = np.arange(n) / sr
    idx = (index + index_vel * vel) * (0.25 + 0.75 * np.exp(-t / index_tau))
    tidx = tine * (0.5 + vel) * np.exp(-t / tine_tau)
    L, R = np.zeros(n), np.zeros(n)
    for m in ns:
        f0 = core.mtof(m)
        a = osc.fm(f0, n, mods=((ratio, idx), (tine_ratio, tidx)), sr=sr, phase0=float(r.random()))
        b = osc.fm(f0 * 2.0 ** (detune / 1200.0), n, mods=((ratio, 0.9 * idx),), sr=sr, phase0=float(r.random()))
        L += 0.62 * a + 0.38 * b
        R += 0.38 * a + 0.62 * b
    y = np.stack([L, R]) / np.sqrt(len(ns))
    amp = env.perc(n / sr, 0.002, tau, 0.0, 0.004, sr) * env.gate(n, gate, release, sr)
    y = y * amp
    if trem_depth:
        lfo = np.sin(2 * np.pi * trem_rate * t)
        y = y * np.stack([1.0 + trem_depth * lfo, 1.0 - trem_depth * lfo]) / (1.0 + trem_depth)
    if warmth:
        y = fx.saturate(y, warmth)
    return core.end_clean(y * vel * level, 0.004, sr)


def pulse(note=("D3", "A3"), vel=0.8, dur=None, rng=None, sr=core.SR, shape="saw", voices=3, detune=10.0,
          width=0.5, cutoff=1500.0, env_oct=1.4, ftau=0.05, keytrack=0.3, q=1.0, tau=0.09, release=0.02, level=0.38):
    """A pulse stab: a short, gated chord for trailer ostinatos and pumping 8ths or 16ths (pattern it with grid.hits
    and a note, and duck it with fx.sidechain). dur gates it; tau is its decay inside the gate."""
    r = _r(rng, "pulse")
    ns = _chord(note, "D3")
    gate = dur if dur and dur > 0 else 0.12
    n = core.samples(gate + release, sr)
    t = np.arange(n) / sr
    y = np.zeros((2, n))
    for m in ns:
        y += osc.unison(core.mtof(m), n, voices, detune, width, 0.8, shape, r, sr)
    y /= np.sqrt(len(ns))
    fc = filters.cutoff(cutoff, n, note=ns, keytrack=keytrack, env=np.exp(-t / ftau), env_oct=env_oct, vel=vel,
                        vel_oct=0.8, sr=sr)
    y = filters.filt(y, "lp", fc, q, 2, sr=sr)
    y = y * env.perc(n / sr, 0.001, tau, 0.01, 0.004, sr) * env.gate(n, gate, release, sr)
    return core.end_clean(y * vel * level, 0.003, sr)


def tick(note=None, vel=0.7, dur=None, rng=None, sr=core.SR, fc=3200.0, q=2.5, tau=0.004, click=0.6, air=0.25,
         length=0.04, tock=False, pan=0.0, level=0.8):
    """A clock tick from noise: a broadband click, a short resonant band of noise around fc (0.75 x fc when tock), and
    a little air. Pattern it with fills.ticking for a ticking texture."""
    r = _r(rng, "tick")
    n = core.samples(length, sr)
    f = fc * (0.75 if tock else 1.0)
    c = filters.highpass(r.standard_normal(n), 2000.0, sr=sr) * env.perc(length, 0.0001, 0.0007, 0.0, 0.003, sr)
    b = filters.bandpass(r.standard_normal(n), f, q, 2, sr) * env.perc(length, 0.0002, tau, 0.0, 0.003, sr)
    a = filters.highpass(r.standard_normal(n), 8000.0, sr=sr) * env.perc(length, 0.0003, 2 * tau, 0.0, 0.003, sr)
    y = click * c + 2.0 * b + air * a
    y = y / (np.abs(y).max() + 1e-12) * level
    return core.end_clean(core.stereo(y * vel, pan), 0.003, sr)
