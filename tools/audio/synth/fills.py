"""Fills and rhythmic textures as event lists (play them on any voice): snare rolls that step or accelerate, tom
fills, hat rolls, the classic build (kicks and snares doubling into a drop), and ticking textures.

Every generator takes the grid and a position `at` (see grid.py) and returns grid.Event lists, so they humanise,
shift and merge like any pattern.
"""
from __future__ import annotations

import numpy as np

from . import core
from .grid import Event, merge


def _ramp(k, count, v0, v1, curve=1.0):
    return v0 + (v1 - v0) * (k / max(1, count - 1)) ** curve


def snare_roll(grid, at=0, beats=4.0, rates=(0.5, 0.25, 0.125), vel=(0.3, 1.0), curve=1.4, note=None, **params):
    """A stepped roll: the span split evenly between `rates` (beats per hit: 8ths, then 16ths, then 32nds by default),
    the velocity rising vel[0] -> vel[1] across it on u^curve."""
    base = grid.pos(at)
    seg = beats / len(rates)
    pos = []
    for i, rate in enumerate(rates):
        k = int(round(seg / rate))
        pos += [base + i * seg + j * rate for j in range(k)]
    out = []
    for k, b in enumerate(pos):
        t = grid.t(b)
        out.append(Event(t, 0.05, _ramp(k, len(pos), vel[0], vel[1], curve), note, dict(params)))
    return out


def accel_roll(grid, at=0, beats=4.0, start_rate=0.5, end_rate=0.0625, vel=(0.3, 1.0), curve=1.4, note=None,
               **params):
    """An accelerating roll: the gap between hits shrinks smoothly (geometrically, along the span) from start_rate to
    end_rate beats, the velocity rising on u^curve. Hit k sits where the roll's running hit count reaches k:
    p_k = B ln(1 + k s L / B) / L, with B = beats, s = start_rate, L = ln(start_rate / end_rate)."""
    base = grid.pos(at)
    if abs(start_rate - end_rate) < 1e-12:
        pos = list(np.arange(0.0, beats - 1e-9, start_rate))
    else:
        L = np.log(start_rate / end_rate)
        total = beats / (start_rate * L) * (start_rate / end_rate - 1.0)       # hits in the span
        pos = [beats * np.log(1.0 + k * start_rate * L / beats) / L for k in range(int(np.floor(total + 1e-9)))]
        pos = [p for p in pos if p < beats - 1e-9]
    out = []
    for k, p in enumerate(pos):
        out.append(Event(grid.t(base + p, swing=False), 0.05, _ramp(k, len(pos), vel[0], vel[1], curve), note,
                         dict(params)))
    return out


def tom_fill(grid, at=0, beats=1.0, step=0.25, notes=("A2", "F2", "D2"), vel=(0.7, 1.0), repeat=None, **params):
    """A tom fill down `notes` (high to low), one hit per step; each tom plays `repeat` times (default: the steps
    shared out evenly)."""
    base = grid.pos(at)
    count = int(round(beats / step))
    ns = [core.note(x) for x in notes]
    rep = repeat or max(1, count // len(ns))
    out = []
    for k in range(count):
        m = ns[min(len(ns) - 1, k // rep)]
        t = grid.t(base + k * step)
        out.append(Event(t, step * grid.beat, _ramp(k, count, vel[0], vel[1]), m, dict(params)))
    return out


def hat_roll(grid, at=0, beats=1.0, rate=0.125, vel=(0.45, 0.9), accent_every=None, **params):
    """A hat roll at `rate` beats (0.125 = 32nds, 1/6 = 16th triplets), velocity rising; accent_every=k lifts every
    k-th hit."""
    base = grid.pos(at)
    count = int(round(beats / rate))
    out = []
    for k in range(count):
        v = _ramp(k, count, vel[0], vel[1])
        if accent_every and k % accent_every == 0:
            v = min(1.0, v * 1.25)
        out.append(Event(grid.t(base + k * rate), rate * grid.beat, v, None, dict(params)))
    return out


def build(grid, at=0, bars=2, kick_vel=(0.6, 1.0), snare_vel=(0.25, 1.0), gap_beats=0.25):
    """The classic build into a drop, `bars` long: kicks and snares on quarters for the first half, 8ths for the next
    quarter, 16ths to the end, rising; the last gap_beats left empty (the breath before the hit). Returns
    {'kick': [...], 'snare': [...]}."""
    base = grid.pos(at)
    total = bars * grid.beats_per_bar
    plan = [(0.0, total / 2.0, 1.0), (total / 2.0, 3.0 * total / 4.0, 0.5), (3.0 * total / 4.0, total, 0.25)]
    pos = []
    for b0, b1, rate in plan:
        pos += list(np.arange(b0, b1 - 1e-9, rate))
    pos = [p for p in pos if p < total - gap_beats - 1e-9]
    kicks, snares = [], []
    for k, p in enumerate(pos):
        t = grid.t(base + p)
        kicks.append(Event(t, 0.05, _ramp(k, len(pos), *kick_vel)))
        snares.append(Event(t, 0.05, _ramp(k, len(pos), *snare_vel, 1.5)))
    return {"kick": kicks, "snare": snares}


def ticking(grid, at=0, beats=4.0, step=0.25, vel=0.6, accent=1.0, accent_every=4, tock_every=1, ramp=None,
            **params):
    """A ticking texture: a tick every `step` beats, the accent_every-th ones at `accent` (the rest at 0.7), turning
    to a tock (params tock=True: a lower tick) for tock_every ticks after every tock_every ticks (1: tick, tock, tick,
    tock); ramp=(v0, v1) swells it. Play it on synths.tick."""
    base = grid.pos(at)
    count = int(round(beats / step))
    out = []
    for k in range(count):
        v = vel * (accent if accent_every and k % accent_every == 0 else 0.7)
        if ramp:
            v *= _ramp(k, count, ramp[0], ramp[1])
        p = dict(params)
        if tock_every and (k // tock_every) % 2 == 1:
            p["tock"] = True
        out.append(Event(grid.t(base + k * step), step * grid.beat, v, None, p))
    return out


def stutter(events, grid, rate=0.125, times=4, decay=0.8):
    """Each event repeated `times` times at `rate` beats, each repeat `decay` x softer (a stutter edit)."""
    out = []
    for e in events:
        for k in range(times):
            out.append(e.but(t=e.t + k * rate * grid.beat, vel=e.vel * decay ** k))
    return merge(out)
