"""synth: a deterministic, vectorised synthesis engine for Pebble's film scores (numpy, scipy, soxr, pedalboard).

    import sys; sys.path.insert(0, "tools/audio")      # python -I does not add the script's folder
    import synth as S
    g = S.Grid.from_beatmap()                          # 100 BPM, 4/4, 30 fps: tools/audio/beatmap.json
    s = S.Session(g, bars=4, seed=7)
    s.track("kick", "kick", S.hits("X... x... X... x...", g), bus="drive")
    s.write("out/")                                    # drive.wav: 48 kHz float32 stereo, exactly 460,800 samples

Modules: core (levels, notes, chords, pan, seeded rng), grid (tempo, positions, swing, humanise, the pattern
language), osc (polyBLEP oscillators, noise, unison and supersaw, FM), env (ADSR and friends), filters (biquads,
fixed and time-varying), fx (pedalboard processing, sidechain), drums, bass, synths, sfx (risers, impacts, braam ...),
fills (rolls, builds, ticking), presets (the instrument registry), mix (render, mono lines, Session), stems (exact-length
WAVs, loudness, preview master), tagcheck (Apple SoundAnalysis gates). README.md documents it all.
"""
from . import bass, core, drums, env, fills, filters, fx, grid, mix, osc, presets, sfx, stems, synths  # noqa: F401
from .core import SR, amp, chord, db, fade, fit, hz, mtof, note, place, rng, stereo  # noqa: F401
from .grid import (Event, Grid, arp, hits, humanise, merge, progression, repeat, scale_vel, seq, shift,  # noqa: F401
                   transpose)
from .mix import Session, render, render_mono  # noqa: F401
from .presets import PRESETS, Instrument, get  # noqa: F401
from .stems import loudness, master, read_stem, true_peak_db, write_stem  # noqa: F401

__version__ = "1.0.0"
