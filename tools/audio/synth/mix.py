"""Arranging and mixing: events through instruments onto exact-length stereo buffers, monophonic lines with glides,
tracks and buses with processing and sidechain ducking, and Session, which keeps a whole arrangement together and
writes its stems.

    s = Session(bars=4, seed=7)                                  # the film grid (tools/audio/beatmap.json)
    s.track("kick", "kick", grid.hits("X... x... X... x...", s.grid), bus="drive")
    s.track("bass", "bass_808", grid.seq("D1*4 _ _ _ . . A0~ _", s.grid, step=0.5), bus="drive", mono=True,
            duck=dict(by="kick", depth_db=4))
    s.bus("drive", fx=[lambda x: fx.compressor(x, -14, 2.5)])
    s.write(".work/audio/render/score-a")                        # drive.wav and the other buses, exact length

Every event's noise comes from its own generator, keyed by (session seed, track name, its sample, its order among
events on that sample), so changing one track or one bar never changes the sound of another.
"""
from __future__ import annotations

import os

import numpy as np

from . import core, fx, presets, stems
from .env import smooth
from .grid import Grid


def _inst(instrument):
    """A preset name, an Instrument or a bare voice function -> an Instrument (so note=None and a one-shot dur of 0
    keep the voice's own defaults on every path)."""
    if isinstance(instrument, str):
        return presets.get(instrument)
    if isinstance(instrument, presets.Instrument):
        return instrument
    return presets.Instrument(instrument)


def _call(instrument, e, r, sr, **extra):
    kw = dict(e.params)
    kw.pop("glide", None)
    kw.update(extra)
    out = instrument(note=e.note, vel=e.vel, dur=e.dur, rng=r, sr=sr, **kw)
    anchor = 0
    if isinstance(out, tuple):
        out, anchor = out
    return core.stereo(out), int(anchor)


def render(events, instrument, n, sr=core.SR, seed=0, key="track", gain_db=0.0, pan=0.0):
    """Every event through the instrument, added at its sample (minus the voice's anchor), into a stereo buffer of
    exactly n samples. Sounds that start before 0 or run past n are cut there."""
    instrument = _inst(instrument)
    buf = np.zeros((2, n))
    seen = {}
    for e in sorted(events, key=lambda e: e.t):
        at = core.samples(e.t, sr)
        k = seen.get(at, 0)
        seen[at] = k + 1
        y, anchor = _call(instrument, e, core.rng(seed, key, at, k), sr)
        core.place(buf, y, at - anchor)
    if pan:
        buf = core.stereo(buf, pan)
    return core.check(buf * core.amp(gain_db), key)


def phrases(events, legato_gap=0.0):
    """Pitched events grouped into phrases: a note that starts before the previous one ends (+ legato_gap), or that
    carries glide=True, continues the phrase."""
    evs = sorted((e for e in events if e.note is not None), key=lambda e: e.t)
    out, cur, end = [], [], -np.inf
    for e in evs:
        if cur and (e.t <= end + legato_gap + 1e-6 or e.params.get("glide")):
            cur.append(e)
            end = max(end, e.t + e.dur)
        else:
            if cur:
                out.append(cur)
            cur, end = [e], e.t + e.dur
    if cur:
        out.append(cur)
    return out


def render_mono(events, instrument, n, sr=core.SR, seed=0, key="mono", glide_s=0.06, legato_gap=0.0, gain_db=0.0,
                pan=0.0):
    """A monophonic line: each phrase (see phrases) is one note whose pitch glides over glide_s into every next note
    (a smoothstep in log-frequency) and whose level follows the notes' velocities (5 ms steps), so legato and 808
    slides never retrigger or click. The voice must take freq= (sub, bass_808, pluck_bass, reese, saw_bass, lead)."""
    instrument = _inst(instrument)
    buf = np.zeros((2, n))
    kg = max(1, core.samples(glide_s, sr))
    u = np.arange(kg) / kg
    u = u * u * (3.0 - 2.0 * u)
    for ph in phrases(events, legato_gap):
        t0 = ph[0].t
        t1 = max(e.t + e.dur for e in ph)
        m = core.samples(t1 - t0, sr) + core.samples(2.0, sr)       # room for any release
        f = np.full(m, core.hz(ph[0].note))
        v = np.full(m, 1.0)
        ref = max(ph[0].vel, 1e-3)                                       # the voice plays at the first note's vel
        for e in ph[1:]:
            i = core.samples(e.t - t0, sr)
            f0, f1 = f[min(i, m - 1)], core.hz(e.note)
            j = min(m, i + kg)
            f[i:j] = f0 * (f1 / f0) ** u[:j - i]
            f[j:] = f1
            v[i:] = e.vel / ref
        first = ph[0].but(dur=t1 - t0)
        try:
            y, anchor = _call(instrument, first, core.rng(seed, key, core.samples(t0, sr), 0), sr, freq=f)
        except TypeError as err:
            raise TypeError(f"render_mono: {getattr(instrument, 'name', instrument)} takes no freq= ({err})") from None
        vv = core.fit(np.concatenate([v, np.full(max(0, y.shape[-1] - m), v[-1])]), y.shape[-1])
        core.place(buf, y * smooth(vv, 5.0, sr), core.samples(t0, sr) - anchor)
    if pan:
        buf = core.stereo(buf, pan)
    return core.check(buf * core.amp(gain_db), key)


def _apply(x, proc):
    if proc is None:
        return x
    for p in (proc if isinstance(proc, (list, tuple)) else [proc]):
        x = core.fit(core.stereo(p(x)), x.shape[-1])
    return x


class Session:
    """An arrangement: a grid, an exact length, a seed, tracks (instrument + events) and buses (sums with processing).
    Give the length as n (samples), bars (from bar 1), frames (film frames) or seconds."""

    def __init__(self, grid=None, n=None, bars=None, frames=None, seconds=None, seed=0):
        self.grid = grid or Grid.from_beatmap()
        self.sr = self.grid.sr
        if n is None:
            n = self.grid.length(bars=bars, frames=frames, seconds=seconds)
        self.n = int(n)
        self.seed = seed
        self.tracks = {}
        self.buses = {}
        self._cache = {}

    def track(self, name, instrument, events, bus="music", gain_db=0.0, pan=0.0, fx=None, duck=None, mono=False,
              glide_s=0.06):
        """Add a track. instrument: a preset name, an Instrument or a voice function. fx: a function x -> x (or a list).
        duck: {'by': a track name or a list of seconds/events, 'depth_db', 'attack_ms', 'hold_ms', 'release_ms',
        'curve', 'lead_ms'}. mono=True renders it as a mono line (glides, no retrigger)."""
        if name in self.tracks:
            raise ValueError(f"track {name!r} exists")
        inst = _inst(instrument)
        self.tracks[name] = dict(inst=inst, events=list(events), bus=bus, gain_db=gain_db, pan=pan, fx=fx, duck=duck,
                                 mono=mono, glide_s=glide_s)
        self.buses.setdefault(bus, dict(gain_db=0.0, fx=None, duck=None))
        self._cache.clear()
        return self

    def bus(self, name, gain_db=0.0, fx=None, duck=None):
        """Set a bus's gain, processing (x -> x, or a list) and sidechain duck (as in track)."""
        self.buses[name] = dict(gain_db=gain_db, fx=fx, duck=duck)
        self._cache.clear()
        return self

    def _triggers(self, by):
        if isinstance(by, str):
            if by not in self.tracks:
                raise KeyError(f"duck by {by!r}: no such track")
            return [e.t for e in self.tracks[by]["events"]]
        return fx.trigger_times(by)

    def _duck(self, x, spec):
        if not spec:
            return x
        s = dict(spec)
        trig = self._triggers(s.pop("by"))
        return fx.sidechain(x, trig, sr=self.sr, **s)

    def render_track(self, name, cache=False):
        """One track, processed, ducked, panned and at its gain. Buses keep their sums; a track is kept only with
        cache=True (a full-length stereo track is 59 MB: thirty of them would crowd an 8 GB machine)."""
        if ("t", name) in self._cache:
            return self._cache[("t", name)]
        t = self.tracks[name]
        if t["mono"]:
            y = render_mono(t["events"], t["inst"], self.n, self.sr, self.seed, name, t["glide_s"])
        else:
            y = render(t["events"], t["inst"], self.n, self.sr, self.seed, name)
        y = _apply(y, t["fx"])
        y = self._duck(y, t["duck"])
        if t["pan"]:
            y = core.stereo(y, t["pan"])
        y = core.check(y * core.amp(t["gain_db"]), name)
        if cache:
            self._cache[("t", name)] = y
        return y

    def render_bus(self, name):
        if ("b", name) in self._cache:
            return self._cache[("b", name)]
        b = self.buses[name]
        y = np.zeros((2, self.n))
        for tn, t in self.tracks.items():
            if t["bus"] == name:
                y += self.render_track(tn)
        y = _apply(y, b["fx"])
        y = self._duck(y, b["duck"])
        y = core.check(y * core.amp(b["gain_db"]), name)
        self._cache[("b", name)] = y
        return y

    def stems(self):
        """{bus: (2, n)} for every bus that has tracks, in the order they were made."""
        used = {t["bus"] for t in self.tracks.values()}
        return {b: self.render_bus(b) for b in self.buses if b in used}

    def mixdown(self, stems_=None):
        st = stems_ if stems_ is not None else self.stems()
        return sum(st.values()) if st else np.zeros((2, self.n))

    def write(self, out_dir, prefix="", mix=True, master=None, fade_in_ms=2.0, fade_out_ms=10.0, zeros_from=None,
              peak_limit_db=0.0):
        """Write every bus as <prefix><bus>.wav (48 kHz float32 stereo, exactly n samples), the sum as <prefix>mix.wav,
        and with master={'lufs': -16, 'ceiling_db': -1.7} a preview master <prefix>master.wav. A stem or the sum that
        peaks above peak_limit_db is refused (lower a bus). Returns the reports."""
        os.makedirs(out_dir, exist_ok=True)
        st = self.stems()
        rep = {"samples": self.n, "seconds": self.n / self.sr, "seed": self.seed, "bpm": self.grid.bpm, "stems": {}}
        for b, y in st.items():
            rep["stems"][b] = stems.write_stem(os.path.join(out_dir, f"{prefix}{b}.wav"), y, self.n, self.sr,
                                               fade_in_ms, fade_out_ms, zeros_from, peak_limit_db)
        if mix or master:
            m = self.mixdown(st)
            if mix:
                rep["mix"] = stems.write_stem(os.path.join(out_dir, f"{prefix}mix.wav"), m, self.n, self.sr, fade_in_ms,
                                              fade_out_ms, zeros_from, peak_limit_db)
            if master:
                y, mrep = stems.master(m, sr=self.sr, **master)
                rep["master"] = {**mrep, **stems.write_stem(os.path.join(out_dir, f"{prefix}master.wav"), y, self.n,
                                                            self.sr, fade_in_ms, fade_out_ms, zeros_from)}
        return rep
