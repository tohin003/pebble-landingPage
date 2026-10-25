"""Drum and percussion voices: punchy and 808 kicks with pitch glides, snare, clap, closed and open hats, shaker,
toms, rim, crash and ride (both from filtered noise: no bell partials, no metallic ringing), and the big trailer hit.

Every voice has the instrument signature (note, vel, dur, rng, sr, **params) and returns stereo (2, n), starting on an
exact zero and ending on one. Noise comes from rng, so the mixer's per-event generators make every hit repeatable.
Classifier lessons from tools/audio/drive.py are built in: the clap's bursts fall at irregular gaps (bursts exactly
7 ms apart buzz at 143 Hz, which Apple's classifier heard as 'mosquito_buzz'), and nothing here rings like a bell.
"""
from __future__ import annotations

import numpy as np

from . import core, env, filters, fx, osc


def _r(rng):
    return rng if rng is not None else core.rng(0, "drum")


def _t(n, sr):
    return np.arange(n) / sr


def _sine_from(f, sr):
    """A sine following the per-sample frequency curve f, starting at phase 0 (an exact zero)."""
    ph = np.concatenate([[0.0], np.cumsum(f[:-1])]) / sr
    return np.sin(2.0 * np.pi * ph)


def _bandnoise(r, n, lo, hi, poles=2, sr=core.SR):
    return filters.band(r.standard_normal(n), lo, hi, poles, sr)


def _ms(mid, side, width=1.0):
    return np.stack([mid + width * side, mid - width * side])


def kick(note=None, vel=1.0, dur=None, rng=None, sr=core.SR, tune=52.0, start=240.0, pitch_tau=0.028, snap=480.0,
         snap_tau=0.0025, hold=0.015, tau=0.16, length=0.6, click=0.28, drive=1.8, level=0.75):
    """A punchy kick: a sine falling from `start` Hz to `tune` (or the note's pitch) with time constant pitch_tau,
    a faster 'snap' chirp on top for the knock, a short noise click, and tanh drive so phone speakers hear its
    harmonics."""
    r = _r(rng)
    n = core.samples(length, sr)
    t = _t(n, sr)
    f_end = core.hz(note) if note is not None else tune
    f = f_end + (start - f_end) * np.exp(-t / pitch_tau) + snap * np.exp(-t / snap_tau)
    y = _sine_from(f, sr) * env.perc(length, 0.0004, tau, hold, 0.04, sr)
    k = core.samples(0.004, sr)
    c = _bandnoise(r, k, 2500.0, 9000.0, 2, sr) * env.perc(0.004, 0.0001, 0.0009, 0.0, 0.001, sr)
    y[:k] += click * (0.5 + 0.5 * vel) * c / (np.abs(c).max() + 1e-12)
    y = fx.saturate(y, drive)
    return core.stereo(core.end_clean(y * vel * level, 0.01, sr))


def kick_808(note="D1", vel=1.0, dur=None, rng=None, sr=core.SR, glide=12.0, glide_tau=0.035, tau=0.55, hold=0.03,
             length=1.8, drive=1.4, click=0.1, release=0.06, choke=False, level=0.78):
    """An 808-style kick: a long sine on the note, gliding down `glide` semitones in its first ~glide_tau x 3 seconds,
    with a long decay (tau), a light click and drive. With choke=True the event's dur cuts it (with a release), as the
    next 808 would; otherwise it rings for `length`."""
    r = _r(rng)
    dur = dur if choke else None
    n = core.samples(length if not dur else min(length, dur + release), sr)
    t = _t(n, sr)
    f = core.hz(note) * 2.0 ** (glide / 12.0 * np.exp(-t / glide_tau))
    y = _sine_from(f, sr) * env.perc(n / sr, 0.0005, tau, hold, release, sr)
    k = core.samples(0.003, sr)
    c = _bandnoise(r, k, 1500.0, 7000.0, 2, sr) * env.perc(0.003, 0.0001, 0.0008, 0.0, 0.001, sr)
    y[:k] += click * c / (np.abs(c).max() + 1e-12)
    if dur:
        y *= env.gate(n, dur, release, sr)
    y = fx.saturate(y, drive)
    return core.stereo(core.end_clean(y * vel * level, 0.01, sr))


def snare(note=None, vel=1.0, dur=None, rng=None, sr=core.SR, tone_hz=190.0, tone=0.55, noise=0.9, tone_tau=0.055,
          noise_tau=0.07, snap=0.45, hp=900.0, presence=4500.0, length=0.42, drive=1.4, width=0.15, level=0.7):
    """A snare: two drum modes (tone_hz and 1.58 x) with a small pitch drop, a high-passed noise body with presence,
    a stick crack, and a little stereo noise for width."""
    r = _r(rng)
    n = core.samples(length, sr)
    t = _t(n, sr)
    f = tone_hz * (1.0 + 0.18 * np.exp(-t / 0.012))
    body = (_sine_from(f, sr) + 0.5 * _sine_from(1.58 * f, sr)) * env.perc(length, 0.0005, tone_tau, 0.0, 0.02, sr)
    nz = filters.peak(filters.highpass(r.standard_normal(n), hp, sr=sr), presence, 4.0, 0.8, sr)
    e_n = env.perc(length, 0.0008, noise_tau, 0.004, 0.03, sr)
    k = core.samples(0.012, sr)
    crack = np.zeros(n)
    crack[:k] = _bandnoise(r, k, 2000.0, 9000.0, 2, sr) * env.perc(0.012, 0.0002, 0.004, 0.0, 0.002, sr)
    mid = tone * body / 1.5 + noise * (nz / 2.5) * e_n + snap * crack / 2.0
    side = width * filters.highpass(r.standard_normal(n), 2500.0, sr=sr) / 2.5 * e_n
    y = fx.saturate(_ms(mid, side), drive)
    return core.end_clean(y * vel * level, 0.01, sr)


def clap(note=None, vel=1.0, dur=None, rng=None, sr=core.SR, bursts=4, gap_ms=(6.0, 11.5), fc=1500.0, q=1.1,
         burst_tau=0.0028, tail_tau=0.055, tail=0.7, length=0.45, width=0.3, level=0.8):
    """A clap: `bursts` band-passed noise bursts at irregular gaps (drawn from gap_ms, per hit, so it never buzzes),
    then a diffuse tail, wider than the bursts."""
    r = _r(rng)
    n = core.samples(length, sr)
    gaps = r.uniform(gap_ms[0], gap_ms[1], max(0, bursts - 1)) / 1000.0
    onsets = np.concatenate([[0.0], np.cumsum(gaps)])
    exc = np.zeros(n)
    shape_b = env.perc(0.03, 0.0003, burst_tau, 0.0, 0.004, sr)
    for i, o in enumerate(onsets):
        lvl = 0.6 + 0.4 * i / max(1, bursts - 1)
        core.place(exc, lvl * shape_b, core.samples(o, sr))
    nz = filters.bandpass(r.standard_normal(n), fc, q, 2, sr)
    i_last = core.samples(onsets[-1], sr)
    tail_env = np.zeros(n)
    core.place(tail_env, env.perc(length - onsets[-1], 0.001, tail_tau, 0.0, 0.03, sr), i_last)
    tl = filters.bandpass(r.standard_normal((2, n)), 0.9 * fc, 0.8, 2, sr) * tail_env
    mid = nz * exc
    tl = np.stack([0.5 * (tl[0] + tl[1]) + width * 0.5 * (tl[0] - tl[1]),
                   0.5 * (tl[0] + tl[1]) - width * 0.5 * (tl[0] - tl[1])])
    y = np.stack([mid, mid]) + tail * tl
    y = y / (np.abs(y).max() + 1e-12) * level
    return core.end_clean(y * vel, 0.01, sr)


def hat(note=None, vel=1.0, dur=None, rng=None, sr=core.SR, open=False, tau=None, hp=7000.0, tone=9500.0, q=0.9,
        attack=None, length=None, width=0.12, release=0.02, level=None):
    """A hi-hat from noise: high-passed (24 dB/oct) plus a band around `tone`. Closed by default (tau 32 ms); open=True
    rings (tau 240 ms), and its dur (when given) chokes it, as the next closed hat would."""
    r = _r(rng)
    tau = tau if tau is not None else (0.24 if open else 0.032)
    length = length if length is not None else 5.0 * tau + 0.01
    if open and dur:
        length = min(length, dur + release)
    n = core.samples(length, sr)
    a = attack if attack is not None else (0.002 if open else 0.0004)
    nz = r.standard_normal((2, n))
    body = 0.7 * filters.highpass(nz, hp, poles=4, sr=sr) + 0.6 * filters.bandpass(nz, tone, q, 2, sr)
    mid, side = 0.5 * (body[0] + body[1]), 0.5 * (body[0] - body[1])
    e = env.perc(length, a, tau, 0.0, min(0.02, length / 4), sr)
    if open and dur:
        e = e * env.gate(n, dur, release, sr)
    y = _ms(mid, side, width) * e / 1.2 * (level if level is not None else (0.65 if open else 0.62))
    return core.end_clean(y * vel, 0.005, sr)


def hat_open(note=None, vel=1.0, dur=None, rng=None, sr=core.SR, **kw):
    """An open hat (hat with open=True)."""
    return hat(note, vel, dur, rng, sr, open=True, **kw)


def shaker(note=None, vel=1.0, dur=None, rng=None, sr=core.SR, fc=6800.0, q=1.4, attack=0.010, tau=0.028,
           length=0.12, grain=0.5, width=0.2, level=0.75):
    """A shaker: band-passed noise with a soft, slow-starting attack and a grainy amplitude (seeded)."""
    r = _r(rng)
    n = core.samples(length, sr)
    nz = r.standard_normal((2, n))
    body = filters.bandpass(nz, fc, q, 2, sr) + 0.4 * filters.highpass(nz, 9000.0, sr=sr)
    e = env.perc(length, attack, tau, 0.0, 0.02, sr, attack_curve=-2.0)
    gr = np.clip(1.0 + grain * osc.slow_random(n, r, 180.0, sr), 0.0, None)
    mid, side = 0.5 * (body[0] + body[1]), 0.5 * (body[0] - body[1])
    y = _ms(mid, side, width) * e * gr / 2.0 * level
    return core.end_clean(y * vel, 0.005, sr)


def tom(note="A2", vel=1.0, dur=None, rng=None, sr=core.SR, drop=0.3, drop_tau=0.04, tau=0.22, length=0.8,
        stick=0.25, overtone=0.3, skin=0.15, drive=1.3, level=0.72):
    """A tom on the note's pitch, starting `drop` higher and settling in ~drop_tau x 3; an inharmonic overtone, a stick
    click and a little skin noise."""
    r = _r(rng)
    n = core.samples(length, sr)
    t = _t(n, sr)
    f = core.hz(note) * (1.0 + drop * np.exp(-t / drop_tau))
    body = _sine_from(f, sr) * env.perc(length, 0.0005, tau, 0.0, 0.05, sr)
    body += overtone * _sine_from(1.5 * f, sr) * env.perc(length, 0.0005, tau / 3.0, 0.0, 0.05, sr)
    k = core.samples(0.006, sr)
    body[:k] += stick * _bandnoise(r, k, 1500.0, 6000.0, 2, sr) * env.perc(0.006, 0.0001, 0.0015, 0.0, 0.001, sr)
    body += skin * _bandnoise(r, n, 100.0, 600.0, 2, sr) * env.perc(length, 0.001, 0.05, 0.0, 0.05, sr)
    y = fx.saturate(body, drive)
    return core.stereo(core.end_clean(y * vel * level, 0.01, sr))


def rim(note=None, vel=1.0, dur=None, rng=None, sr=core.SR, fc=2400.0, q=2.0, tau=0.006, body_hz=820.0, body=0.35,
        length=0.06, level=0.8):
    """A rim click: a short band of noise around fc and a woody noise body around body_hz (no pitched ring)."""
    r = _r(rng)
    n = core.samples(length, sr)
    c = filters.bandpass(r.standard_normal(n), fc, q, 2, sr) * env.perc(length, 0.0002, tau, 0.0, 0.005, sr)
    b = filters.bandpass(r.standard_normal(n), body_hz, 6.0, 2, sr) * env.perc(length, 0.0004, 0.01, 0.0, 0.005, sr)
    y = c + body * b * 2.0
    y = y / (np.abs(y).max() + 1e-12) * level
    return core.stereo(core.end_clean(y * vel, 0.004, sr))


def crash(note=None, vel=1.0, dur=None, rng=None, sr=core.SR, decay=1.8, hp=3800.0, bright=12000.0, dark=6500.0,
          attack=0.004, splash=0.45, width=0.9, length=None, level=0.75):
    """A crash from noise: a fast splash into a long wash (time constant decay / 3), high-passed at hp, and a low pass
    that darkens from `bright` to `dark` as it decays. Decorrelated left and right."""
    r = _r(rng)
    length = length if length is not None else decay * 1.6
    n = core.samples(length, sr)
    t = _t(n, sr)
    nz = r.standard_normal((2, n))
    e = env.perc(length, attack, decay / 3.0, 0.0, min(0.3, length / 4), sr)
    e = e * ((1.0 - splash) + splash * np.exp(-t / 0.06))
    fc = dark + (bright - dark) * np.exp(-t / (decay / 2.5))
    y = filters.filt(filters.highpass(nz, hp, poles=4, sr=sr), "lp", fc, 0.7071, 2, sr=sr)
    mid, side = 0.5 * (y[0] + y[1]), 0.5 * (y[0] - y[1])
    y = _ms(mid, side, width) * e / 2.0 * level
    return core.end_clean(y * vel, 0.02, sr)


def ride(note=None, vel=1.0, dur=None, rng=None, sr=core.SR, decay=1.1, ping=0.6, wash=0.5, tick=0.4,
         bands=(3150.0, 5200.0, 7400.0), q=3.0, width=0.5, length=None, level=1.0):
    """A ride from noise: a few narrow noise bands for the ping (noise, not partials: no bell), a high wash and a
    stick tick."""
    r = _r(rng)
    length = length if length is not None else decay * 1.4
    n = core.samples(length, sr)
    nz = r.standard_normal((2, n))
    p = sum(filters.bandpass(nz, fc, q, 2, sr) * env.perc(length, 0.0008, decay / (4.0 + i), 0.0, 0.05, sr)
            for i, fc in enumerate(bands)) / len(bands)
    w = filters.highpass(nz, 6000.0, poles=2, sr=sr) * env.perc(length, 0.002, decay / 3.0, 0.0, 0.1, sr)
    k = core.samples(0.005, sr)
    tk = np.zeros((2, n))
    tk[:, :k] = filters.highpass(r.standard_normal(k), 3000.0, sr=sr) * env.perc(0.005, 0.0001, 0.0012, 0.0, 0.001, sr)
    y = ping * p * 1.6 + wash * w / 2.0 + tick * tk / 2.0
    mid, side = 0.5 * (y[0] + y[1]), 0.5 * (y[0] - y[1])
    return core.end_clean(_ms(mid, side, width) * vel * level, 0.03, sr)


def trailer_hit(note="D1", vel=1.0, dur=None, rng=None, sr=core.SR, length=4.0, sub=1.0, boom=0.7, body=0.55,
                crack=0.35, drive=2.2, verb=0.12, size=0.9, verb_hp=250.0, width=1.0, level=0.9):
    """The big trailer hit: a sub drop onto the note (from 2.6 x its pitch), a low noise boom, a mid body, a crack,
    tanh drive, and a large room (size) above verb_hp. Peak = level x vel; the peak is the onset. Classifier note: the
    room stays small in the mix (verb 0.12): at 0.32 its low-mid tail under a sustained chord in octave 3 read as a
    horn (foghorn 0.39, air_horn 0.37; 0.09 at 0.12). For a longer tail, send the hit to a reverb that is high-passed
    at 600 Hz or more."""
    r = _r(rng)
    n = core.samples(length, sr)
    t = _t(n, sr)
    f0 = core.hz(note)
    f = f0 + 1.6 * f0 * np.exp(-t / 0.07)
    y = sub * _sine_from(f, sr) * env.perc(length, 0.0006, 0.9, 0.05, 0.3, sr)
    y += boom * filters.lowpass(osc.noise(n, r, "brown"), 220.0, poles=4, sr=sr) * env.perc(length, 0.001, 0.35, 0.0,
                                                                                          0.3, sr)
    y += body * _bandnoise(r, n, 180.0, 1600.0, 2, sr) * env.perc(length, 0.0008, 0.09, 0.0, 0.3, sr) / 1.5
    k = core.samples(0.12, sr)
    y[:k] += crack * _bandnoise(r, k, 2000.0, 9000.0, 2, sr) * env.perc(0.12, 0.0002, 0.018, 0.0, 0.01, sr) / 1.5
    y = fx.saturate(y, drive)
    st = fx.reverb(core.stereo(y), size=size, damping=0.6, wet=verb, dry=1.0, width=width, hp_hz=verb_hp,
                   lp_hz=7000.0)
    st = fx.mono_below(st, 140.0, sr)
    st = core.fit(st, n)
    st = st / (np.abs(st).max() + 1e-12) * level
    return core.end_clean(st * vel, 0.3, sr)
