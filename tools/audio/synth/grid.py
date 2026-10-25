"""The musical grid: tempo, bars, beats, 16ths, film frames and samples; swing; seeded humanising; and a small pattern
language for placing hits and notes.

Positions (the `at=` of every pattern function, and Grid.t / Grid.s) are any of:
  - a number: beats from bar 1, beat 1 (0-based; negative is a pickup);
  - a tuple (bar, beat) or (bar, beat, sixteenth), 1-based like a score: (9, 3) is bar 9, beat 3; beat may be fractional;
  - a string: '9' (bar 9), '9.3' (bar 9, beat 3), '9.3.2' (its second 16th), 'f504' (film frame 504), '16.8s' (seconds).
Event times are seconds on the stem's timeline (sample = round(t * sr)).

Pattern language (see hits() and seq() for the full lists):
  hits("X... x... x.x. x..x", g, at="9")      one character per step: X accent, x hit, o soft, g ghost, 1-9 levels,
                                              . rest, _ tie, r roll, f flam; spaces ignored, | checks bar lengths
  seq("D2 _ . D2 | A1~ _ F#1 .", g, at="9")  one token per step: notes, [Bm7] chords, D3+F#3 stacks, . rest, _ tie,
                                              suffixes ! accent, ? soft, @0.7 velocity, *3 length, ~ glide
"""
from __future__ import annotations

import dataclasses
import json
import math
import os
import re
from dataclasses import dataclass, field

import numpy as np

from . import core

BEATMAP = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "beatmap.json")


@dataclass(frozen=True)
class Event:
    """One note or hit. t and dur are seconds; note is a MIDI number, a tuple of them (a chord) or None (unpitched);
    params are extra keyword arguments for the instrument (e.g. {'glide': True})."""
    t: float
    dur: float = 0.0
    vel: float = 1.0
    note: object = None
    params: dict = field(default_factory=dict)

    def but(self, **kw):
        """A copy with some fields changed."""
        return dataclasses.replace(self, **kw)


@dataclass(frozen=True)
class Grid:
    """Tempo and metre, anchored to the film. Default: 100 BPM, 4/4, 30 fps, bar 1 at 0 s (tools/audio/beatmap.json).

    swing is where the second unit of each pair lands, as a share of the pair: 0.5 is straight, 0.5833 a light shuffle,
    0.6667 a triplet feel. swing_unit is the swung unit in beats: 0.25 swings 16ths, 0.5 swings 8ths.
    """
    bpm: float = 100.0
    beats_per_bar: int = 4
    sr: int = core.SR
    fps: float = 30.0
    start_s: float = 0.0
    swing: float = 0.5
    swing_unit: float = 0.25

    def __post_init__(self):
        if not 0.0 < self.swing < 1.0:
            raise ValueError("swing is a share of the pair, between 0 and 1 (0.5 is straight)")
        if self.bpm <= 0 or self.beats_per_bar <= 0:
            raise ValueError("bpm and beats_per_bar must be positive")

    @classmethod
    def from_beatmap(cls, path=None, **overrides):
        """The grid of a beat map (tools/audio/beatmap.json by default); keyword arguments override its values."""
        with open(path or BEATMAP, encoding="utf-8") as f:
            bm = json.load(f)
        kw = dict(bpm=float(bm["bpm"]), beats_per_bar=int(bm["beats_per_bar"]), fps=float(bm["fps"]),
                  start_s=float(bm.get("first_downbeat_frame", 0)) / float(bm["fps"]))
        kw.update(overrides)
        return cls(**kw)

    def but(self, **kw):
        """A copy with some fields changed: g.but(swing=0.58)."""
        return dataclasses.replace(self, **kw)

    # ---- durations (seconds) ----
    @property
    def beat(self):
        return 60.0 / self.bpm

    @property
    def bar(self):
        return self.beat * self.beats_per_bar

    @property
    def sixteenth(self):
        return self.beat / 4.0

    @property
    def eighth(self):
        return self.beat / 2.0

    def beats(self, n):
        """The length of n beats, in seconds."""
        return n * self.beat

    def bars(self, n):
        """The length of n bars, in seconds."""
        return n * self.bar

    # ---- positions ----
    def pos(self, p):
        """A position (see the module docstring) -> beats from bar 1, beat 1, before swing."""
        if isinstance(p, (int, float, np.integer, np.floating)):
            return float(p)
        if isinstance(p, tuple):
            bar, beat, six = (tuple(p) + (1, 1))[:3]
            return (bar - 1) * self.beats_per_bar + (beat - 1) + (six - 1) * 0.25
        if isinstance(p, str):
            s = p.strip()
            m = re.fullmatch(r"f(-?\d+(?:\.\d+)?)", s)
            if m:
                return (float(m.group(1)) / self.fps - self.start_s) / self.beat
            m = re.fullmatch(r"(-?\d+(?:\.\d+)?)s", s)
            if m:
                return (float(m.group(1)) - self.start_s) / self.beat
            m = re.fullmatch(r"(-?\d+)(?:\.(\d+))?(?:\.(\d+))?", s)
            if m:
                return self.pos((int(m.group(1)), int(m.group(2) or 1), int(m.group(3) or 1)))
        raise ValueError(f"not a position: {p!r} (beats, (bar, beat[, 16th]), 'bar.beat.16th', 'f504' or '16.8s')")

    def swung(self, beats):
        """Beats -> beats after swing (on-beat units never move). Works on arrays."""
        b = np.asarray(beats, dtype=float)
        if self.swing == 0.5:
            return b if b.ndim else float(b)
        pair = 2.0 * self.swing_unit
        k = np.floor(b / pair + 1e-9)
        ph = np.clip(b / pair - k, 0.0, 1.0)
        w = np.where(ph < 0.5, ph * 2.0 * self.swing, self.swing + (ph - 0.5) * 2.0 * (1.0 - self.swing))
        out = (k + w) * pair
        return out if out.ndim else float(out)

    def t(self, p, swing=True):
        """A position -> seconds on the stem's timeline."""
        b = self.pos(p)
        return self.start_s + (self.swung(b) if swing else b) * self.beat

    def s(self, p, swing=True):
        """A position -> the nearest sample."""
        return core.samples(self.t(p, swing), self.sr)

    def frame(self, p):
        """A position -> the film frame (fractional) it falls on."""
        return self.t(p) * self.fps

    def frame_t(self, f):
        """A film frame -> seconds."""
        return f / self.fps

    def frame_s(self, f):
        """A film frame -> its first sample (frame * sr / fps, rounded)."""
        return core.samples(f / self.fps, self.sr)

    def where(self, t):
        """Seconds -> (bar, beat), 1-based with a fractional beat, ignoring swing."""
        b = (t - self.start_s) / self.beat
        bar = math.floor(b / self.beats_per_bar + 1e-9)
        return bar + 1, b - bar * self.beats_per_bar + 1.0

    def length(self, bars=None, frames=None, seconds=None):
        """An exact stem length in samples, from bars (from bar 1), film frames or seconds."""
        if bars is not None:
            return core.samples(self.start_s + self.bars(bars), self.sr)
        if frames is not None:
            return core.samples(frames / self.fps, self.sr)
        if seconds is not None:
            return core.samples(seconds, self.sr)
        raise ValueError("give bars, frames or seconds")

    def is_downbeat(self, t, tol=1e-4):
        """True when t (seconds) is on a bar line."""
        b = (t - self.start_s) / self.beat / self.beats_per_bar
        return abs(b - round(b)) * self.bar < tol


# ---- event helpers ----
def shift(events, seconds):
    """Every event moved by `seconds`."""
    return [e.but(t=e.t + seconds) for e in events]


def merge(*lists):
    """Several event lists as one, in time order."""
    return sorted((e for lst in lists for e in lst), key=lambda e: e.t)


def scale_vel(events, k):
    """Velocities times k (or, with a (v0, v1) tuple, a ramp from v0 to v1 across the list in time order)."""
    evs = sorted(events, key=lambda e: e.t)
    if isinstance(k, tuple):
        n = max(1, len(evs) - 1)
        return [e.but(vel=e.vel * (k[0] + (k[1] - k[0]) * i / n)) for i, e in enumerate(evs)]
    return [e.but(vel=e.vel * k) for e in evs]


def transpose(events, semitones):
    """Pitched events moved by `semitones` (chords too); unpitched ones unchanged."""
    def tr(n):
        if n is None:
            return None
        return tuple(x + semitones for x in n) if isinstance(n, tuple) else n + semitones
    return [e.but(note=tr(e.note)) for e in events]


def repeat(events, times, every, grid=None):
    """The list played `times` times, each `every` later: seconds, or beats when a grid is given."""
    step = grid.beats(every) if grid is not None else every
    return merge(*[shift(events, i * step) for i in range(times)])


def humanise(events, ms=4.0, vel=0.06, seed=0, key="", grid=None, downbeat_ms=None):
    """Seeded timing and velocity variation. Each event's offset comes from its own generator, keyed by (seed, key, its
    sample, its note), so adding or removing other events never changes it. ms is the largest timing offset (a clipped
    normal with sigma ms/2); vel the largest relative velocity change. With a grid, events on a bar line move at most
    downbeat_ms (default: no more than ms)."""
    out = []
    for e in events:
        nk = (sum(e.note) if isinstance(e.note, tuple) else (e.note or 0.0))
        r = core.rng(seed, key, "humanise", core.samples(e.t), float(nk))
        lim = ms
        if grid is not None and downbeat_ms is not None and grid.is_downbeat(e.t):
            lim = downbeat_ms
        dt = float(np.clip(r.normal(0.0, 0.5), -1.0, 1.0)) * lim / 1000.0
        dv = float(np.clip(r.normal(0.0, 0.5), -1.0, 1.0)) * vel
        out.append(e.but(t=e.t + dt, vel=max(0.0, e.vel * (1.0 + dv))))
    return out


# ---- the pattern language ----
HIT_LEVELS = {"X": 1.0, "x": 0.8, "o": 0.5, "g": 0.3, **{str(d): d / 10.0 for d in range(1, 10)}}


def _steps_per_bar(grid, step):
    spb = grid.beats_per_bar / step
    return int(round(spb)) if abs(spb - round(spb)) < 1e-9 else None


def _check_bars(text, grid, step, sizes):
    spb = _steps_per_bar(grid, step)
    if spb is None:
        return
    for i, k in enumerate(sizes):
        if k != spb:
            raise ValueError(f"pattern bar {i + 1} has {k} steps, a bar has {spb}: {text!r}")


def _note_param(note):
    if note is None:
        return None
    return tuple(core.notes(note)) if isinstance(note, (list, tuple)) else core.note(note)


def hits(text, grid, at=0, step=0.25, note=None, vel=1.0, dur=None, **params):
    """Step pattern -> events. One character per step of `step` beats (0.25 = 16ths, 0.5 = 8ths, 1/3 = 8th triplets):
      X 1.0   x 0.8   o 0.5   g 0.3 (ghost)   1-9 0.1-0.9     . rest
      _ tie: the previous hit lasts one more step (sets its dur; for gated stabs and pulses)
      r a roll: two hits in the step (0.75, then 0.6 half a step later)
      f a flam: a 0.4 grace 25 ms early, then the hit at 0.85
    Spaces are ignored. '|' separates bars, and then each bar must hold exactly one bar of steps. vel scales every
    level; note (a MIDI number, name or tuple) and params go on every event; dur defaults to the hit's steps."""
    base = grid.pos(at)
    body = "".join(text.split())
    if "|" in body:
        _check_bars(text, grid, step, [len(b) for b in body.strip("|").split("|")])
    body = body.replace("|", "")
    nt = _note_param(note)
    out, last = [], None          # last: [event index, its step, its steps] (what a tie extends)
    for i, ch in enumerate(body):
        b0 = base + i * step
        if ch == ".":
            last = None
        elif ch == "_":
            if last is not None:
                last[2] += 1
                j, s0, k = last
                if dur is None:
                    out[j] = out[j].but(dur=grid.t(base + (s0 + k) * step) - out[j].t)
        elif ch in HIT_LEVELS or ch == "f":
            t = grid.t(b0)
            d = grid.t(b0 + step) - t if dur is None else dur
            level = HIT_LEVELS.get(ch, 0.85)
            if ch == "f":
                out.append(Event(t - 0.025, min(d, 0.025), 0.4 * vel, nt, dict(params)))
            out.append(Event(t, d, level * vel, nt, dict(params)))
            last = [len(out) - 1, i, 1]
        elif ch == "r":
            t, th = grid.t(b0), grid.t(b0 + step / 2)
            d = (th - t) if dur is None else dur
            out.append(Event(t, d, 0.75 * vel, nt, dict(params)))
            out.append(Event(th, d, 0.6 * vel, nt, dict(params)))
            last = None
        else:
            raise ValueError(f"pattern character {ch!r} at step {i}: use X x o g 1-9 . _ r f | in {text!r}")
    return out


_TOKEN_RE = re.compile(
    r"^(?P<body>\[[^\]]+\]|[A-Ga-g][#b]{0,2}-?\d+(?:\+[A-Ga-g][#b]{0,2}-?\d+)*|\d+(?:\.\d+)?)"
    r"(?P<mods>(?:[!?~]|@\d*\.?\d+|\*\d+)*)$")


def _parse_body(body, octave):
    if body.startswith("["):
        sym = body[1:-1]
        octv = octave
        if ":" in sym:
            sym, o = sym.rsplit(":", 1)
            octv = int(o)
        return tuple(core.chord(sym, octave=octv))
    if "+" in body:
        return tuple(core.note(x) for x in body.split("+"))
    return core.note(body)


def seq(text, grid, at=0, step=0.25, vel=0.8, legato=1.0, octave=3, **params):
    """Note pattern -> events. Whitespace-separated tokens, one step each:
      D2  F#3  Bb1  38          a note (name or MIDI number)
      D3+F#3+A3                 a stack of notes (one event, note is a tuple)
      [Bm7]  [Gmaj7/D:2]        a chord symbol (core.chord), in `octave` or after ':'
      .                         a rest
      _  or  -                  a tie: the previous note lasts one more step
      |                         a bar line (then each bar must hold exactly one bar of steps)
    Suffixes on a note or chord, in any order: ! accent (1.0), ? soft (0.45), @0.6 a velocity, *3 lasts 3 steps,
    ~ glide into it (params['glide'] = True, for mono lines). dur = its steps times legato."""
    base = grid.pos(at)
    toks = text.split()
    if "|" in toks:
        sizes, k = [], 0
        for tk in toks + ["|"]:
            if tk == "|":
                sizes.append(k)
                k = 0
                continue
            m = _TOKEN_RE.match(tk)
            ms = re.search(r"\*(\d+)", m.group("mods")) if m else None
            k += int(ms.group(1)) if ms else 1
        while sizes and sizes[0] == 0:
            sizes.pop(0)
        while sizes and sizes[-1] == 0:
            sizes.pop()
        _check_bars(text, grid, step, sizes)
    out, starts, i, open_note = [], [], 0, False
    for tk in toks:
        if tk == "|":
            continue
        if tk == ".":
            i += 1
            open_note = False
            continue
        if tk in ("_", "-"):
            if out and open_note:
                j = len(out) - 1
                starts[j][1] += 1
                s0, ns = starts[j]
                t0 = out[j].t
                out[j] = out[j].but(dur=(grid.t(base + (s0 + ns) * step) - t0) * legato)
            i += 1
            continue
        m = _TOKEN_RE.match(tk)
        if not m:
            raise ValueError(f"not a note token: {tk!r} in {text!r}")
        mods = m.group("mods")
        v = vel
        if "!" in mods:
            v = 1.0
        if "?" in mods:
            v = 0.45
        mv = re.search(r"@(\d*\.?\d+)", mods)
        if mv:
            v = float(mv.group(1))
        ms = re.search(r"\*(\d+)", mods)
        ns = int(ms.group(1)) if ms else 1
        p = dict(params)
        if "~" in mods:
            p["glide"] = True
        t0 = grid.t(base + i * step)
        out.append(Event(t0, (grid.t(base + (i + ns) * step) - t0) * legato, v, _parse_body(m.group("body"), octave), p))
        starts.append([i, ns])
        i += ns
        open_note = True
    return out


ARP_MODES = ("up", "down", "updown", "downup", "order", "random", "converge")


def arp(chord_notes, grid, at=0, beats=4.0, step=0.25, mode="up", octaves=1, gate=0.6, vel=0.8, accents=None, seed=0,
        **params):
    """An arpeggio over `beats` beats from `at`, one note per step. chord_notes: MIDI numbers, names or a chord symbol.
    mode: up, down, updown, downup, order (as given), random (seeded), converge (outside in). octaves > 1 repeats the
    set an octave up each time. gate is the share of the step each note sounds. accents: a list of velocity factors
    cycled over the steps (e.g. [1, .6, .8, .6])."""
    ns = core.chord(chord_notes) if isinstance(chord_notes, str) else list(core.notes(chord_notes))
    pool = [n + 12 * o for o in range(max(1, octaves)) for n in sorted(ns)] if mode != "order" else \
        [n + 12 * o for o in range(max(1, octaves)) for n in ns]
    if mode == "up" or mode == "order":
        cyc = pool
    elif mode == "down":
        cyc = pool[::-1]
    elif mode == "updown":
        cyc = pool + pool[-2:0:-1]
    elif mode == "downup":
        cyc = pool[::-1] + pool[1:-1]
    elif mode == "converge":
        lo, hi, cyc = 0, len(pool) - 1, []
        while lo <= hi:
            cyc.append(pool[lo])
            if hi != lo:
                cyc.append(pool[hi])
            lo, hi = lo + 1, hi - 1
    elif mode == "random":
        cyc = None
    else:
        raise ValueError(f"arp mode {mode!r}: one of {ARP_MODES}")
    base = grid.pos(at)
    count = int(round(beats / step))
    r = core.rng(seed, "arp", base)
    out = []
    for k in range(count):
        n = pool[int(r.integers(len(pool)))] if cyc is None else cyc[k % len(cyc)]
        t0 = grid.t(base + k * step)
        d = (grid.t(base + (k + 1) * step) - t0) * gate
        a = accents[k % len(accents)] if accents else 1.0
        out.append(Event(t0, d, vel * a, n, dict(params)))
    return out


def progression(symbols, grid, at=0, beats_each=4.0, octave=3, vel=0.8, legato=1.0, inversion=0, open_voicing=False,
                **params):
    """Held chords: one event per symbol (note = a tuple of MIDI numbers), each beats_each long (a number, or a list
    with one length per chord)."""
    base = grid.pos(at)
    lens = beats_each if isinstance(beats_each, (list, tuple)) else [beats_each] * len(symbols)
    out, b = [], base
    for sym, ln in zip(symbols, lens):
        t0 = grid.t(b)
        ns = tuple(core.chord(sym, octave=octave, inversion=inversion, open_voicing=open_voicing))
        out.append(Event(t0, (grid.t(b + ln) - t0) * legato, vel, ns, dict(params)))
        b += ln
    return out
