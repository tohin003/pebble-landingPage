"""Instruments: a voice function with its default parameters, and the registry of presets.

    kick = presets.get("kick", drive=2.2)        # a preset, with an override
    big = kick.variant("kick_big", tau=0.22)     # a named variant
    y = kick(vel=0.9, rng=core.rng(7, "k"))      # one hit: stereo (2, n)

Every voice has the signature (note=None, vel=1.0, dur=None, rng=None, sr=48000, **params). Most return stereo
(2, n); the effects in sfx return (audio, anchor), the sample that lands on the event's time. mix.render handles both.
"""
from __future__ import annotations

import inspect

from . import bass, core, drums, sfx, synths


class Instrument:
    """A voice and its default parameters (the voice function's own defaults, overridden by these)."""

    def __init__(self, fn, name=None, **defaults):
        self.fn = fn
        self.name = name or fn.__name__
        sig = inspect.signature(fn)
        known = set(sig.parameters)
        bad = [k for k in defaults if k not in known]
        if bad and not any(p.kind is inspect.Parameter.VAR_KEYWORD for p in sig.parameters.values()):
            raise TypeError(f"{self.name}: unknown parameters {bad}; {fn.__name__} takes {sorted(known)}")
        self.defaults = dict(defaults)

    def __call__(self, note=None, vel=1.0, dur=None, rng=None, sr=core.SR, **kw):
        """One note or hit. note=None keeps the voice's own default pitch (or none, for drums). A positive dur is the
        held length; None or 0 (a one-shot event) is never passed, so the preset's or the voice's own dur applies: a
        riser plays at its set length."""
        p = dict(self.defaults)
        p.update(kw)
        if note is not None:
            p["note"] = note
        if dur is not None and dur > 0:
            p["dur"] = dur
        return self.fn(vel=vel, rng=rng if rng is not None else core.rng(0, self.name), sr=sr, **p)

    def variant(self, name=None, **overrides):
        """A copy with some defaults changed."""
        return Instrument(self.fn, name or self.name, **{**self.defaults, **overrides})

    def params(self):
        """Every parameter and its current default."""
        sig = inspect.signature(self.fn)
        out = {k: v.default for k, v in sig.parameters.items()
               if k not in ("note", "vel", "dur", "rng", "sr") and v.default is not inspect.Parameter.empty}
        out.update(self.defaults)
        return out

    def __repr__(self):
        return f"Instrument({self.name!r}, {self.fn.__module__}.{self.fn.__name__}, {self.defaults})"


PRESETS = {
    # drums
    "kick": Instrument(drums.kick, "kick"),
    "kick_808": Instrument(drums.kick_808, "kick_808"),
    "snare": Instrument(drums.snare, "snare"),
    "clap": Instrument(drums.clap, "clap"),
    "hat": Instrument(drums.hat, "hat"),
    "hat_open": Instrument(drums.hat_open, "hat_open"),
    "shaker": Instrument(drums.shaker, "shaker"),
    "tom": Instrument(drums.tom, "tom"),
    "rim": Instrument(drums.rim, "rim"),
    "crash": Instrument(drums.crash, "crash"),
    "ride": Instrument(drums.ride, "ride"),
    "trailer_hit": Instrument(drums.trailer_hit, "trailer_hit"),
    # bass
    "sub": Instrument(bass.sub, "sub"),
    "bass_808": Instrument(bass.bass_808, "bass_808"),
    "pluck_bass": Instrument(bass.pluck_bass, "pluck_bass"),
    "reese": Instrument(bass.reese, "reese"),
    "saw_bass": Instrument(bass.saw_bass, "saw_bass"),
    # chords, keys, leads, textures
    "supersaw": Instrument(synths.supersaw, "supersaw"),
    "stab": Instrument(synths.supersaw, "stab", attack=0.002, decay=0.22, sustain=0.0, release=0.12, fattack=0.001,
                       fdecay=0.12, fsustain=0.1, env_oct=2.0, cutoff=2600.0),
    "pad": Instrument(synths.pad, "pad"),
    "pluck": Instrument(synths.pluck, "pluck"),
    "arp": Instrument(synths.arp_synth, "arp"),
    "lead": Instrument(synths.lead, "lead"),
    "epiano": Instrument(synths.fm_epiano, "epiano"),
    "pulse": Instrument(synths.pulse, "pulse"),
    "tick": Instrument(synths.tick, "tick"),
    # effects (anchored: see sfx)
    "riser": Instrument(sfx.noise_riser, "riser"),
    "riser_pitch": Instrument(sfx.pitch_riser, "riser_pitch"),
    "shepard": Instrument(sfx.shepard, "shepard"),
    "downlifter": Instrument(sfx.downlifter, "downlifter"),
    "impact": Instrument(sfx.impact, "impact"),
    "reverse_swell": Instrument(sfx.reverse_swell, "reverse_swell"),
    "whoosh": Instrument(sfx.whoosh, "whoosh"),
    "braam": Instrument(sfx.braam, "braam"),
}


def get(name, **overrides):
    """A preset by name, optionally with changed defaults."""
    if name not in PRESETS:
        raise KeyError(f"no preset {name!r}; presets: {', '.join(sorted(PRESETS))}")
    inst = PRESETS[name]
    return inst.variant(**overrides) if overrides else inst


def names():
    return sorted(PRESETS)
