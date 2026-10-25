"""Processing: pedalboard's Reverb, Delay, Chorus, Compressor, Distortion, Limiter and EQ behind small functions, plus
saturation, stereo width, a mono low end, pan and gain, and sidechain ducking from a list of trigger times.

Every function takes a mono (n,) or stereo (2, n) float signal and returns float64 stereo (2, n), the same length
unless tail_s pads it first (to keep a reverb or delay tail on a one-shot). pedalboard runs in float32 and compensates
its own latency (a limiter's lookahead never shifts the audio: checked in the tests). chain(...) composes these into
one callable for a bus.
"""
from __future__ import annotations

import functools

import numpy as np
import soxr
from pedalboard import (BrickwallLimiter, Chorus, Compressor, Delay, Distortion, HighpassFilter, HighShelfFilter,
                        Limiter, LowpassFilter, LowShelfFilter, Pedalboard, PeakFilter, Reverb)

from . import core, filters


def _st(x):
    return core.stereo(np.asarray(x, dtype=float))


def _pad(x, tail_s, sr):
    k = int(round(tail_s * sr))
    return np.pad(x, ((0, 0), (0, k))) if k > 0 else x


def run(x, plugins, sr=core.SR, tail_s=0.0):
    """Any pedalboard plugins over x (made stereo), with tail_s seconds of silence added first."""
    x = _pad(_st(x), tail_s, sr)
    return np.asarray(Pedalboard(list(plugins))(x.astype(np.float32), sr), dtype=float)


def chain(*fns):
    """Compose processing functions (each x -> x) into one, applied left to right."""
    return lambda x: functools.reduce(lambda acc, f: f(acc), fns, x)


def gain(x, db_):
    return np.asarray(x, dtype=float) * core.amp(db_)


def pan(x, p):
    """Mono -> stereo at pan p (-1 left .. 1 right); stereo gets the same law as a balance."""
    return core.stereo(np.asarray(x, dtype=float), p)


def widen(x, width=1.0):
    """Mid/side width: 0 mono, 1 unchanged, above 1 wider (the side doubled at 2)."""
    x = _st(x)
    m, s = 0.5 * (x[0] + x[1]), 0.5 * (x[0] - x[1]) * width
    return np.stack([m + s, m - s])


def mono_below(x, hz=120.0, sr=core.SR):
    """Fold everything under `hz` to mono (a Linkwitz-Riley split), so the low end survives a mono phone speaker."""
    lo, hi = filters.crossover(_st(x), hz, sr)
    m = 0.5 * (lo[0] + lo[1])
    return hi + np.stack([m, m])


def eq(x, *bands, sr=core.SR):
    """EQ through pedalboard's filters. Bands, applied in order:
      ('hp', hz)  ('lp', hz)  ('low', hz, db[, q])  ('high', hz, db[, q])  ('peak', hz, db[, q])"""
    plugins = []
    for b in bands:
        kind = b[0]
        if kind == "hp":
            plugins.append(HighpassFilter(cutoff_frequency_hz=float(b[1])))
        elif kind == "lp":
            plugins.append(LowpassFilter(cutoff_frequency_hz=float(b[1])))
        elif kind == "low":
            plugins.append(LowShelfFilter(cutoff_frequency_hz=float(b[1]), gain_db=float(b[2]),
                                          q=float(b[3]) if len(b) > 3 else 0.7071))
        elif kind == "high":
            plugins.append(HighShelfFilter(cutoff_frequency_hz=float(b[1]), gain_db=float(b[2]),
                                           q=float(b[3]) if len(b) > 3 else 0.7071))
        elif kind == "peak":
            plugins.append(PeakFilter(cutoff_frequency_hz=float(b[1]), gain_db=float(b[2]),
                                      q=float(b[3]) if len(b) > 3 else 1.0))
        else:
            raise ValueError(f"eq band {b!r}: hp, lp, low, high or peak")
    return run(x, plugins, sr) if plugins else _st(x)


def reverb(x, size=0.6, damping=0.5, wet=0.25, dry=1.0, width=1.0, predelay_ms=0.0, hp_hz=200.0, lp_hz=9000.0,
           tail_s=0.0, sr=core.SR):
    """pedalboard's Reverb as a send: the wet path is high-passed (no muddy low end in the room) and low-passed,
    delayed by predelay_ms, then added at `wet` to the dry signal at `dry`."""
    x = _pad(_st(x), tail_s, sr)
    send = eq(x, ("hp", hp_hz), ("lp", lp_hz), sr=sr) if (hp_hz or lp_hz) else x
    w = run(send, [Reverb(room_size=size, damping=damping, wet_level=1.0, dry_level=0.0, width=width)], sr)
    k = int(round(predelay_ms / 1000.0 * sr))
    if k > 0:
        w = np.concatenate([np.zeros((2, k)), w[:, :-k]], axis=1)
    return dry * x + wet * w


def delay(x, time_s, feedback=0.3, mix=0.25, pingpong=False, hp_hz=250.0, lp_hz=7000.0, tail_s=0.0, sr=core.SR):
    """pedalboard's Delay as a send (time_s: use grid.beats(0.75) for a dotted 8th). The echoes are band-limited
    (hp_hz, lp_hz) so they sit behind the dry sound. pingpong=True alternates the echoes left and right."""
    x = _pad(_st(x), tail_s, sr)
    if not pingpong:
        w = run(x, [Delay(delay_seconds=time_s, feedback=feedback, mix=1.0)], sr)
    else:
        m = 0.5 * (x[0] + x[1])
        k = int(round(time_s * sr))
        first = np.concatenate([np.zeros(k), m[:-k]]) if 0 < k < len(m) else np.zeros_like(m)
        # pedalboard's Delay repeats at unity first, then x feedback: the left line is t, 3t, 5t at 1, fb^2, fb^4
        fb2 = feedback * feedback
        left = first + fb2 * run(first, [Delay(delay_seconds=2 * time_s, feedback=fb2, mix=1.0)], sr)[0]
        right = np.concatenate([np.zeros(k), left[:-k]]) * feedback if 0 < k < len(m) else np.zeros_like(m)
        w = np.stack([left, right])
    if hp_hz or lp_hz:
        w = eq(w, *([("hp", hp_hz)] if hp_hz else []), *([("lp", lp_hz)] if lp_hz else []), sr=sr)
    return x + mix * w


def chorus(x, rate_hz=0.6, depth=0.25, centre_delay_ms=7.0, feedback=0.0, mix=0.35, sr=core.SR):
    return run(x, [Chorus(rate_hz=rate_hz, depth=depth, centre_delay_ms=centre_delay_ms, feedback=feedback, mix=mix)], sr)


def compressor(x, threshold_db=-18.0, ratio=3.0, attack_ms=10.0, release_ms=120.0, makeup_db=0.0, sr=core.SR):
    return run(x, [Compressor(threshold_db=threshold_db, ratio=ratio, attack_ms=attack_ms, release_ms=release_ms)],
               sr) * core.amp(makeup_db)


def _oversample(fn, x, k, sr):
    if k <= 1:
        return fn(x, sr)
    up = soxr.resample(x.T, sr, sr * k, quality="VHQ").T
    return core.fit(soxr.resample(fn(up, sr * k).T, sr * k, sr, quality="VHQ").T, x.shape[-1])


def distortion(x, drive_db=12.0, mix=1.0, out_db=0.0, oversample=2, sr=core.SR):
    """pedalboard's Distortion (a tanh drive), run at oversample x the rate so its new harmonics don't fold back."""
    x = _st(x)
    y = _oversample(lambda s, r: run(s, [Distortion(drive_db=drive_db)], r), x, oversample, sr)
    return ((1.0 - mix) * x + mix * y) * core.amp(out_db)


def saturate(x, drive=2.0, bias=0.0, mix=1.0, oversample=1, sr=core.SR):
    """A tanh waveshaper normalised so full scale stays full scale; bias > 0 adds even harmonics (the DC it makes is
    removed). drive 1.5-3 warms a bass or a kick for phone speakers; use oversample=2 on bright material."""
    x = np.asarray(x, dtype=float)

    def shape(s, r):
        y = (np.tanh(drive * (s + bias)) - np.tanh(drive * bias)) / np.tanh(drive)
        return filters.dc_block(y, 8.0, r) if bias else y
    y = shape(x, sr) if oversample <= 1 else _oversample(shape, _st(x) if x.ndim == 2 else x[None, :], oversample, sr)
    if x.ndim == 1 and y.ndim == 2:
        y = y[0]
    return (1.0 - mix) * x + mix * y


def limiter(x, threshold_db=-1.0, release_ms=100.0, sr=core.SR):
    """pedalboard's Limiter (JUCE's: a compressor into a hard clipper at threshold_db)."""
    return run(x, [Limiter(threshold_db=threshold_db, release_ms=release_ms)], sr)


def brickwall(x, ceiling_db=-1.0, true_peak=True, lookahead_ms=5.0, release_ms=100.0, sr=core.SR):
    """pedalboard's BrickwallLimiter: the master limiter tools/audio/mix_master.py uses (true peak, 5 ms lookahead)."""
    return run(x, [BrickwallLimiter(ceiling_db=ceiling_db, true_peak=true_peak, lookahead_ms=lookahead_ms,
                                    release_ms=release_ms)], sr)


# ---- sidechain ----
def trigger_times(triggers):
    """Seconds from a list of numbers or of events (anything with .t)."""
    return sorted(float(getattr(t, "t", t)) for t in triggers)


def duck_env(n, triggers, depth_db=6.0, attack_ms=2.0, hold_ms=30.0, release_ms=150.0, sr=core.SR, curve="cos",
             lead_ms=0.0):
    """A sidechain gain curve over n samples: at each trigger the gain falls depth_db in attack_ms (starting lead_ms
    before it, so the dip is complete on the hit), holds hold_ms and recovers in release_ms on `curve` (cos, sine, lin
    or exp). Overlapping ducks take the deeper gain. Velocity-scaled ducks: pass (t, depth_scale) pairs."""
    g = np.ones(n)
    na = max(1, int(round(attack_ms / 1000.0 * sr)))
    nh = max(0, int(round(hold_ms / 1000.0 * sr)))
    nr = max(1, int(round(release_ms / 1000.0 * sr)))
    lead = int(round(lead_ms / 1000.0 * sr))
    for trig in triggers:
        t, k = (trig if isinstance(trig, tuple) else (float(getattr(trig, "t", trig)), 1.0))
        d = core.amp(-abs(depth_db) * k)
        down = 1.0 - (1.0 - d) * core.ramp_shape(np.arange(1, na + 1) / na, "cos")
        up = d + (1.0 - d) * core.ramp_shape(np.arange(1, nr + 1) / nr, curve)
        shape = np.concatenate([down, np.full(nh, d), up])
        i0 = core.samples(t, sr) - na - lead
        a, b = max(0, i0), min(n, i0 + len(shape))
        if b > a:
            g[a:b] = np.minimum(g[a:b], shape[a - i0:b - i0])
    return g


def sidechain(x, triggers, depth_db=6.0, attack_ms=2.0, hold_ms=30.0, release_ms=150.0, sr=core.SR, curve="cos",
              lead_ms=0.0):
    """x ducked at every trigger (seconds or events: the kick's events, the impacts' cue times)."""
    x = np.asarray(x, dtype=float)
    return x * duck_env(x.shape[-1], triggers, depth_db, attack_ms, hold_ms, release_ms, sr, curve, lead_ms)
