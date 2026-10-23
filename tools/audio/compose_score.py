"""Pebble launch-film score (MASTER_PLAN §6.2 fallback B2): composed to the film plan and rendered with numpy + scipy +
pedalboard only. No samples, no plugins and no third-party code or recordings: every sound is synthesised here, so the
music is entirely our own work (released with the film; see CREDITS.md).

Form (100 BPM, 4/4, D major, 32 bars = 76.8 s = 2,304 frames at 30 fps; a beat is 18 frames, a bar 72):
  bars  1-2   hook        marimba states the motif (D-A-G#-A, a Lydian twinkle) over a soft pad
  bars  3-5   tension     three "questions" (the motif's rising fifth, unanswered) over Bm7, Gmaj7, Em7; kalimba pulse
  bars  6-7   build       marimba ostinato and vibes crescendo to A7sus4; the last beat of bar 7 is empty (the breath)
  bar   8     reveal      the full band on D: motif in marimba + vibes (+ glockenspiel), bass, felt kick, shaker
  bars  9-22  proof       pulse-minimalism groove, I-V6-vi-IV, a B section from bar 17, a turnaround in 21-22
  bars 23-25  payoff      the fullest groove: motif in octaves, extra pad octave
  bars 26-28  breakdown   no drums, no bass: pad, soft vibes, motif fragments ("trust" lines)
  bars 29-30  end card    the motif as the sonic logo, a plagal approach
  bars 31-32  final chord D(add9) on the bar-31 downbeat, left to ring for 4.8 s (back-timed end)
Timing is exact (no rubato); notes get +-3 ms of humanisation, downbeats +-1 ms, so the beat grid is frame-accurate.

Arrangements (--form): the bars above, in the order a cut plays them. "film" is the 32-bar cue. A short form plays
whole bars of this same score on a new grid of bars: each bar keeps its own chord, section, energy and fader ride, and
the joints fall on bar lines, so a cut of the film that keeps the film's bar phase stays on the beat. See FORMS.

Usage: python -I compose_score.py OUT.wav [--seed 7] [--form film|x30|x30-product|<bar,bar,...>] [--stems DIR]
       [--events EVENTS.json]
Writes OUT.wav (48 kHz, 24-bit, un-mastered bed at about -18 LUFS) and OUT.score.json (form, cue times, levels).
--events also writes every note event (bus, instrument, pitch, nominal and humanised velocity and time, durations, pan)
plus the fader ride, for tools/audio/render_sampled.py. Recording the events only reads values the score already
computes: it draws nothing from the random generator, so OUT.wav stays bit-identical with or without it. In a short
form an event's `bar` is the score's bar it comes from (so the sampler's per-bar touches still find bars 1, 2 and 31),
`out_bar` the arrangement's bar it plays in, and `t_grid` / `t` are times on the arrangement's own timeline.
"""
import argparse
import json

import numpy as np
import pyloudnorm as pyln
import soundfile as sf
from pedalboard import (Chorus, Compressor, HighpassFilter, HighShelfFilter, LowpassFilter, LowShelfFilter,
                        Pedalboard, PeakFilter)
from scipy.signal import butter, fftconvolve, lfilter, sosfilt

ap = argparse.ArgumentParser()
ap.add_argument("out")
ap.add_argument("--seed", type=int, default=7)
ap.add_argument("--stems")
ap.add_argument("--events")
ap.add_argument("--form", default="film", help="a name from FORMS, or the score's bars in playing order, e.g. 1,6,7,8")
a = ap.parse_args()

SR = 48000
BPM = 100.0
BEAT = 60.0 / BPM          # 0.6 s
BAR = 4 * BEAT             # 2.4 s
N_BARS = 32                # the score's bars (PROG, ENERGY, RIDE and the sections are keyed by them)
# Arrangements: the score's bars in the order they play (.work/film/x30/PLAN.md for the two 30 s cuts for X)
FORMS = {
    "film": list(range(1, N_BARS + 1)),
    # the 30 s cut, reveal first (recommended): the hook (1), the build into the reveal (6-7, the breath, the riser's
    # bars), the reveal (8), the groove under the held lockup (9), the AgentGuard proof as in the film (14-17), then the
    # end card's own plagal cadence (30 Gmaj9 -> 31 D(add9)) and its ring (32). Joints: I -> IV, I -> V6, ii7 -> IV.
    "x30": [1, 6, 7, 8, 9, 14, 15, 16, 17, 30, 31, 32],
    # the fallback cut, product first: the hook (1), the groove (13) and the proof (14-17), the build (6-7), and the
    # end card from its landing (29-32). Joints: I -> I, ii7 -> IV, V -> I.
    "x30-product": [1, 13, 14, 15, 16, 17, 6, 7, 29, 30, 31, 32],
}
try:
    FORM = FORMS[a.form] if a.form in FORMS else [int(b) for b in a.form.split(",")]
except ValueError:
    ap.error(f"--form {a.form!r}: a name ({', '.join(FORMS)}) or a comma list of bars")
if not FORM or any(not 1 <= b <= N_BARS for b in FORM):
    ap.error(f"--form {a.form!r}: every bar must be 1-{N_BARS}")
OUT_BARS = len(FORM)       # 32 for the film
LEN_S = OUT_BARS * BAR     # 76.8 s for the film
N = int(round(LEN_S * SR))
rng = np.random.default_rng(a.seed)


def t_of(bar, beat=1.0):
    """Seconds at a bar (1-based) and beat (1-based, fractional allowed)."""
    return ((bar - 1) * 4 + (beat - 1)) * BEAT


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


NOTE = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def nm(s):
    """'F#4' -> MIDI number."""
    p = NOTE[s[0]] + (1 if "#" in s else -1 if s[1] == "b" else 0)
    return 12 * (int(s[-1]) + 1) + p


# ----------------------------------------------------------------------------------------------------------------
# event recording (for --events): bookkeeping only, it never touches the random generator or the audio
# ----------------------------------------------------------------------------------------------------------------
_hv_last = [None]     # (nominal, humanised) velocity of the last hv() call
_inst_last = {}       # parameters of the last instrument call; put() files them with the note's time and pan


def _rec(inst, f, vel, **params):
    nominal = vel
    if _hv_last[0] is not None and _hv_last[0][1] == vel:   # this velocity came from hv(): keep its nominal value
        nominal = _hv_last[0][0]
    _hv_last[0] = None
    _inst_last.clear()
    _inst_last.update(inst=inst, f=f, vel=vel, vel_nominal=nominal, **params)


# ----------------------------------------------------------------------------------------------------------------
# instruments (mono numpy arrays at SR); each returns a signal that starts at its attack
# ----------------------------------------------------------------------------------------------------------------
def _fade_in(y, sec):
    k = max(1, int(sec * SR))
    k = min(k, len(y))
    y[:k] *= 0.5 - 0.5 * np.cos(np.pi * np.arange(k) / k)
    return y


def _modal(f, modes, dur, att):
    n = int(dur * SR)
    t = np.arange(n) / SR
    y = np.zeros(n)
    for ratio, amp, tau in modes:
        fr = f * ratio
        if fr > 0.42 * SR or amp <= 0:
            continue
        y += amp * np.sin(2 * np.pi * fr * t + rng.uniform(0, 2 * np.pi)) * np.exp(-t / tau)
    return _fade_in(y, att)


def _noise_burst(dur, lo, hi, tau, n_order=2):
    n = int(dur * SR)
    t = np.arange(n) / SR
    sos = butter(n_order, [lo, hi], btype="band", fs=SR, output="sos")
    return sosfilt(sos, rng.standard_normal(n)) * np.exp(-t / tau)


def marimba(f, vel, length=None):
    """Tuned bar (partials 1 : 3.99 : 9.95) over a resonator; soft yarn mallet. Decay shortens with pitch."""
    _rec("marimba", f, vel, length=length)
    tau = 0.5 * (440 / f) ** 0.55 + 0.15
    dur = min(6 * tau, 4.0) if length is None else length
    modes = [(1.0, 1.0, tau), (1.0035, 0.18, tau * 1.6),                  # bar + resonator (slow beating)
             (3.99, 0.10 + 0.22 * vel, tau / 4.5), (9.95, 0.02 + 0.06 * vel, tau / 11)]
    y = _modal(f, modes, dur, 0.0025 + 0.003 * (1 - vel))
    k = int(0.03 * SR)
    y[:k] += 0.05 * vel * _noise_burst(0.03, 600, 2600, 0.006)              # the mallet's "thock"
    return y * vel ** 1.25


def vibes(f, vel, hold, trem=0.07):
    """Vibraphone bar (1 : 4 : 10), soft mallets, pedal down for `hold` seconds then damped; gentle motor shimmer."""
    _rec("vibes", f, vel, hold=hold, trem=trem)
    tau = 2.4 * (440 / f) ** 0.35
    dur = hold + 0.35
    y = _modal(f, [(1.0, 1.0, tau), (4.0, 0.12 * vel, tau / 3.5), (10.0, 0.03 * vel, tau / 9)], dur, 0.004)
    t = np.arange(len(y)) / SR
    y *= 1 + trem * np.sin(2 * np.pi * 3.2 * t + rng.uniform(0, 6.28))     # slow motor tremolo
    r = int(0.3 * SR)
    y[-r:] *= np.linspace(1, 0, r) ** 2                                     # pedal up
    return y * vel ** 1.3


def kalimba(f, vel):
    """Thumb-piano tine: fundamental plus the cantilever's inharmonic 2nd mode (x6.27) that dies in ~60 ms."""
    _rec("kalimba", f, vel)
    tau = 1.1 * (440 / f) ** 0.4
    y = _modal(f, [(1.0, 1.0, tau), (2.0, 0.08, tau / 3), (6.27, 0.25 * vel, 0.06)], min(5 * tau, 3.0), 0.0015)
    k = int(0.004 * SR)
    y[:k] += 0.06 * vel * _noise_burst(0.004, 2000, 9000, 0.0015)
    return y * vel ** 1.3


def glock(f, vel):
    """Glockenspiel (free bar, 1 : 2.756 : 5.404): only a few notes, very soft."""
    _rec("glock", f, vel)
    y = _modal(f, [(1.0, 1.0, 1.6), (2.756, 0.28, 0.45), (5.404, 0.08, 0.18)], 3.0, 0.002)
    return y * vel ** 1.4


def pluck_bass(f, vel, dur):
    """Karplus-Strong plucked upright-style bass with a little sine weight; damped by the hand at note-off."""
    _rec("bass", f, vel, dur=dur)
    P = SR / f - 0.5
    Np = int(np.floor(P))
    n = int((dur + 0.15) * SR)
    t60 = 2.8
    g = 0.001 ** (1 / (f * t60))
    exc = rng.standard_normal(Np)
    exc = np.convolve(exc, np.ones(6) / 6, "same")                          # soft finger, not a pick
    exc -= exc.mean()
    x = np.zeros(n)
    x[:Np] = exc
    den = np.zeros(Np + 2)
    den[0] = 1.0
    den[Np] -= g * 0.5
    den[Np + 1] -= g * 0.5
    y = lfilter([1.0], den, x)
    y = y / (np.abs(y[: 2 * Np]).max() + 1e-9)
    tt = np.arange(n) / SR
    y += 0.55 * np.sin(2 * np.pi * f * tt) * np.exp(-tt / 0.9) * np.minimum(1, tt / 0.004)
    y = sosfilt(butter(2, 1800, fs=SR, output="sos"), y)
    off = int(dur * SR)
    y[off:] *= np.linspace(1, 0, n - off) ** 2
    return y * vel ** 1.2 * 0.5


def _saw(f, n):
    t = np.arange(n) / SR
    ph = np.mod(f * t + rng.random(), 1.0)
    dt = f / SR
    y = 2 * ph - 1
    m = ph < dt
    x = ph[m] / dt
    y[m] -= x + x - x * x - 1
    m = ph > 1 - dt
    x = (ph[m] - 1) / dt
    y[m] -= x * x + x + x + 1
    return y


def pad_note(f, vel, dur, att=0.9, rel=1.8):
    """Soft string-like pad voice: three detuned saws, slow bow-like attack, late gentle vibrato."""
    _rec("pad", f, vel, dur=dur, att=att, rel=rel)
    n = int((dur + rel) * SR)
    t = np.arange(n) / SR
    vib = 1 + 0.0018 * np.sin(2 * np.pi * 4.6 * t) * np.clip((t - 0.6) / 0.8, 0, 1)
    y = sum(_saw(f * 2 ** (c / 1200), n) for c in (-7, 0, 6)) / 3
    y = y * vib  # tiny amplitude wobble stands in for vibrato on a static saw
    e = np.minimum(1, t / att) ** 1.5
    off = int(dur * SR)
    e[off:] *= np.exp(-(t[off:] - dur) / (rel / 4))
    return y * e * vel


def shaker(vel):
    _rec("shaker", None, vel)
    y = _noise_burst(0.07, 4500, 11000, 0.022)
    k = int(0.012 * SR)
    y[k:] += 0.45 * _noise_burst(0.07, 4500, 11000, 0.018)[: len(y) - k]   # the beads' second rattle
    return _fade_in(y, 0.004) * vel


def felt_kick(vel):
    _rec("kick", None, vel)
    n = int(0.45 * SR)
    t = np.arange(n) / SR
    f = 48 + 42 * np.exp(-t / 0.03)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.13)
    y[: int(0.003 * SR)] += 0.08 * rng.standard_normal(int(0.003 * SR))
    return _fade_in(y, 0.0015) * vel


# ----------------------------------------------------------------------------------------------------------------
# the score
# ----------------------------------------------------------------------------------------------------------------
# Chords: (name, bass MIDI, pad voicing, arpeggio set for the ostinato). Voicings share A3 and D4 where they can.
CH = {  # arpeggio sets stay at or below E5, so the ostinato never crowds the melody's octave (D5-B5)
    "D":     ("D(add9)", nm("D2"), ["A3", "D4", "E4", "F#4"], ["A3", "D4", "F#4", "A4", "E5"]),
    "G/D":   ("Gmaj7/D", nm("D2"), ["B3", "D4", "F#4", "G4"], ["B3", "D4", "G4", "B4", "D5"]),
    "Bm7":   ("Bm7", nm("B1"), ["A3", "B3", "D4", "F#4"], ["B3", "D4", "F#4", "A4", "D5"]),
    "Gmaj7": ("Gmaj7", nm("G1"), ["B3", "D4", "F#4", "G4"], ["B3", "D4", "F#4", "G4", "B4"]),
    "Em7":   ("Em7", nm("E2"), ["G3", "B3", "D4", "E4"], ["B3", "D4", "E4", "G4", "B4"]),
    "Gmaj9": ("Gmaj9", nm("G1"), ["A3", "B3", "D4", "F#4"], ["B3", "D4", "F#4", "A4", "B4"]),
    "A7sus": ("A7sus4", nm("A1"), ["G3", "A3", "D4", "E4"], ["A3", "D4", "E4", "G4", "A4"]),
    "A/C#":  ("A/C#", nm("C#2"), ["A3", "C#4", "E4", "F#4"], ["A3", "C#4", "E4", "A4", "C#5"]),
    "F#m7":  ("F#m7", nm("F#2"), ["A3", "C#4", "E4", "F#4"], ["A3", "C#4", "E4", "F#4", "A4"]),
}
PROG = {1: "D", 2: "G/D", 3: "Bm7", 4: "Gmaj7", 5: "Em7", 6: "Gmaj9", 7: "A7sus", 8: "D",
        9: "D", 10: "A/C#", 11: "Bm7", 12: "Gmaj9", 13: "D", 14: "A/C#", 15: "Bm7", 16: "Gmaj9",
        17: "Em7", 18: "A7sus", 19: "F#m7", 20: "Bm7", 21: "Gmaj9", 22: "A7sus",
        23: "D", 24: "A/C#", 25: "Gmaj9", 26: "Bm7", 27: "Gmaj9", 28: "A7sus",
        29: "D", 30: "Gmaj9", 31: "D", 32: "D"}
SECTION = [("hook", 1, 2), ("tension", 3, 5), ("build", 6, 7), ("reveal", 8, 8), ("proof", 9, 22),
           ("payoff", 23, 25), ("breakdown", 26, 28), ("endcard", 29, 30), ("final", 31, 32)]
# energy per bar (0..1) drives dynamics; the bus gains below turn it into the film's contour
ENERGY = {1: .42, 2: .42, 3: .34, 4: .36, 5: .38, 6: .48, 7: .62, 8: .86, 9: .64, 10: .64, 11: .66, 12: .68,
          13: .70, 14: .70, 15: .72, 16: .74, 17: .74, 18: .76, 19: .78, 20: .80, 21: .84, 22: .88,
          23: 1.0, 24: 1.0, 25: .98, 26: .44, 27: .42, 28: .46, 29: .66, 30: .60, 31: .62, 32: .62}
# the motif (beat offsets within the bar, note, length in beats): D5 A5 G#5 A5 -> "peb-ble ."
MOTIF = [(1.0, "D5", .5), (1.5, "A5", .5), (2.0, "G#5", .25), (2.25, "A5", 1.25)]
ANSWER = [(1.0, "E5", .5), (1.5, "B5", .5), (2.0, "A5", .25), (2.25, "B5", 1.25)]
QUESTIONS = {3: [(1.0, "D5", .5), (1.5, "A5", .5), (2.0, "B5", 1.5)],      # over Bm7: lands on the root, minor
             4: [(1.0, "D5", .5), (1.5, "A5", .5), (2.0, "F#5", 1.5)],     # over Gmaj7: the 7th, unresolved
             5: [(1.0, "D5", .5), (1.5, "G5", .5), (2.0, "E5", 1.5)]}      # over Em7: the root, still open
# B-section melody for vibes (bars 17-20), the motif's rhythm on new pitches, and the payoff line
B_LINE = {17: [(1.0, "B4", .5), (1.5, "E5", .5), (2.0, "D5", .25), (2.25, "E5", 1.25), (4.0, "G5", 1.0)],
          18: [(1.0, "A5", 1.5), (2.5, "G5", .5), (3.0, "E5", 1.0), (4.0, "D5", 1.0)],
          19: [(1.0, "C#5", .5), (1.5, "F#5", .5), (2.0, "E5", .25), (2.25, "F#5", 1.25), (4.0, "A5", 1.0)],
          20: [(1.0, "B5", 2.0), (3.0, "A5", .5), (3.5, "F#5", .5), (4.0, "D5", 1.0)]}

notes = []    # (bus, start_s, signal, pan, kind)
events = []   # one dict per note, in the same order (written by --events)
cur = {"out": 1}   # the arrangement's bar being written (in the film form it is the score's bar itself)


def at(beat):
    """Seconds at a beat of the arrangement's bar being written."""
    return t_of(cur["out"], beat)


def jitter(beat):
    on_downbeat = abs(beat - 1.0) < 1e-9
    return rng.normal(0, 0.0007 if on_downbeat else 0.0018)


def put(bus, bar, beat, sig, pan=0.0, exact=False):
    t = at(beat) + (0.0 if exact else jitter(beat))
    notes.append((bus, max(0.0, t), sig, pan))
    events.append(dict(_inst_last, bus=bus, bar=bar, out_bar=cur["out"], beat=beat, t_grid=at(beat), t=max(0.0, t), pan=pan,
                       exact=exact))


def hv(v, spread=0.05):
    out = float(np.clip(v * (1 + rng.normal(0, spread)), 0.05, 1.0))
    _hv_last[0] = (v, out)
    return out


def play_line(bus, bar, line, inst, vel, pan=0.0, octave=0):
    for beat, name, length in line:
        f = mtof(nm(name) + 12 * octave)
        if inst == "marimba":
            sig = marimba(f, hv(vel))
        elif inst == "vibes":
            sig = vibes(f, hv(vel), max(0.4, length * BEAT + 0.4))
        elif inst == "glock":
            sig = glock(f, hv(vel))
        else:
            sig = kalimba(f, hv(vel))
        put(bus, bar, beat, sig, pan)


OSTINATO = [0, 2, 4, 2, 1, 3, 4, 3]              # eighth-note pattern over the bar's arpeggio set
OST_ACC = [1.0, .72, .86, .7, .94, .72, .84, .74]
KAL_332 = [1.0, 2.5, 4.0]                        # 3+3+2 kalimba accents (in beats)

for out_bar, bar in enumerate(FORM, 1):     # `bar` is the score's bar: its material; `out_bar` places it
    cur["out"] = out_bar
    key = PROG[bar]
    _, bass_m, voicing, arp = CH[key]
    e = ENERGY[bar]
    sec = next(s for s, a0, a1 in SECTION if a0 <= bar <= a1)
    pad_vel = 0.16 + 0.22 * e

    # ---- pad: one chord per bar (tied over repeated chords), held a little into the next bar ----
    if sec != "final" or bar == 31:
        hold, rel = BAR + 0.15, 1.6
        if bar == 7:
            hold, rel = 1.75, 0.5          # the pad lets go before beat 4: the breath before the reveal
        if bar == 31:
            hold, rel = 1.4, 2.4           # the final chord swells, then rings away over bar 32
        att = 0.9 if sec in ("hook", "tension", "breakdown") else 0.45
        for i, n in enumerate(voicing):
            put("pad", bar, 1.0, pad_note(mtof(nm(n)), hv(pad_vel, 0.02), hold, att=att, rel=rel),
                -0.45 + 0.3 * i, exact=True)
        if sec in ("payoff",) or bar == 8:
            for i, n in enumerate(voicing[1:]):                             # an airy octave-up layer
                put("pad", bar, 1.0, pad_note(mtof(nm(n) + 12), hv(pad_vel * 0.55, 0.02), hold, att=0.5), 0.6 - 0.4 * i, exact=True)

    # ---- hook: the motif, then its answer ----
    if sec == "hook":
        play_line("mallet", bar, MOTIF if bar == 1 else ANSWER, "marimba", 0.62, pan=0.1)
        if bar == 2:
            play_line("mallet", bar, [(4.0, "F#5", .5), (4.5, "E5", .5)], "marimba", 0.45, pan=0.1)
        put("bass", bar, 1.0, pluck_bass(mtof(bass_m), 0.45, BAR * 0.9), 0.0)

    # ---- tension: unanswered questions over a soft kalimba pulse ----
    if sec == "tension":
        play_line("mallet", bar, QUESTIONS[bar], "marimba", 0.5, pan=0.1)
        for k in range(8):
            if k % 2 == 1 or k == 0:
                n = arp[[0, 2, 1, 3, 2, 4, 3, 1][k]]
                put("kal", bar, 1.0 + 0.5 * k, kalimba(mtof(nm(n)), hv(0.32 + 0.06 * (k == 0))), 0.35)
        put("bass", bar, 1.0, pluck_bass(mtof(bass_m), 0.38, BAR * 0.8), 0.0)

    # ---- build: ostinato and vibes crescendo, then the breath (beat 4 of bar 7 is empty) ----
    if sec == "build":
        steps = 8 if bar == 6 else 6                                        # bar 7 stops after beat 3.5
        for k in range(steps):
            prog = (bar - 6) * 8 + k
            v = 0.36 + 0.42 * prog / 14
            put("mallet", bar, 1.0 + 0.5 * k, marimba(mtof(nm(arp[OSTINATO[k]])), hv(v * OST_ACC[k])), -0.15)
        for i, n in enumerate(voicing):
            put("vibes", bar, 1.0, vibes(mtof(nm(n)), hv(0.30 + 0.16 * (bar - 6)), BAR if bar == 6 else 1.45), 0.25 - 0.15 * i)
        for b in (1.0, 3.0):
            length = BEAT * 1.8 if bar == 6 or b == 1.0 else 0.5             # bar 7: damped before beat 4
            put("bass", bar, b, pluck_bass(mtof(bass_m), 0.5 + 0.1 * (bar - 6), length), 0.0, exact=(b == 1.0))
        if bar == 7:
            for k in range(12):                                             # shaker swell, beats 1 to 3.75
                put("perc", bar, 1.0 + 0.25 * k, shaker(0.10 + 0.25 * k / 11), 0.3)

    # ---- reveal + payoff + end card: the motif in full ----
    if sec in ("reveal", "payoff") or bar == 29:
        line = MOTIF if key == "D" else ANSWER if key in ("A/C#",) else [(1.0, "D5", .5), (1.5, "A5", .5), (2.0, "B5", 1.5)]
        if sec == "payoff":                       # the marimba keeps the ostinato; vibes sing the motif above it
            play_line("vibes", bar, line, "vibes", 0.6, pan=-0.05)
        else:
            play_line("mallet", bar, line, "marimba", 0.78 if sec != "endcard" else 0.66, pan=0.05)
            play_line("vibes", bar, line, "vibes", 0.42, pan=-0.2, octave=-1)
        if bar in (8, 23, 29):
            play_line("glock", bar, line[:2], "glock", 0.14, pan=0.3, octave=1)

    # ---- the proof groove (and the payoff): ostinato, vibes chords, kalimba 3+3+2, bass, kick, shaker ----
    if sec in ("reveal", "proof", "payoff"):
        if sec != "reveal":
            for k in range(8):
                v = (0.42 + 0.3 * e) * OST_ACC[k]
                put("mallet", bar, 1.0 + 0.5 * k, marimba(mtof(nm(arp[OSTINATO[k]])), hv(v)), -0.2)
        if bar >= 13 or sec == "payoff":
            for b in KAL_332:
                n = arp[4] if b == 1.0 else arp[3]
                put("kal", bar, b, kalimba(mtof(nm(n) + 12), hv(0.26 + 0.1 * e)), 0.45)
        if bar not in B_LINE and sec != "payoff" and bar != 8:
            for i, n in enumerate(voicing):
                put("vibes", bar, 1.0, vibes(mtof(nm(n)), hv(0.22 + 0.12 * e), BAR * 0.95), 0.2 - 0.12 * i)
        if bar in B_LINE:
            play_line("vibes", bar, B_LINE[bar], "vibes", 0.5, pan=-0.1)
        # bass: root on 1, fifth or root on 3 (a walk into the next chord in bars 12, 16 and 22)
        put("bass", bar, 1.0, pluck_bass(mtof(bass_m), 0.62 + 0.2 * e, BEAT * 1.9), 0.0, exact=True)
        third = bass_m + 7 if bar % 4 in (1, 2) else bass_m + 12
        put("bass", bar, 3.0, pluck_bass(mtof(third if third < 50 else bass_m), 0.48 + 0.15 * e, BEAT * 1.4), 0.0)
        if bar in (12, 16, 22):
            put("bass", bar, 4.5, pluck_bass(mtof(bass_m + 2), 0.42, BEAT * 0.45), 0.0)
        # felt kick on 1 and 3 (and an 8th pickup in the payoff), shaker 16ths with accents on the 8ths
        for b in (1.0, 3.0) + ((2.5,) if sec == "payoff" else ()):
            put("kick", bar, b, felt_kick(0.55 + 0.35 * e if b != 2.5 else 0.4), 0.0, exact=(b == 1.0))
        for k in range(16):
            acc = 1.0 if k % 4 == 0 else 0.75 if k % 2 == 0 else 0.5
            put("perc", bar, 1.0 + 0.25 * k, shaker((0.16 + 0.16 * e) * acc), 0.3)

    # ---- breakdown: no drums or bass; soft vibes chords and the motif's head on kalimba ----
    if sec == "breakdown":
        for i, n in enumerate(voicing):
            put("vibes", bar, 1.0, vibes(mtof(nm(n)), hv(0.24), BAR * 0.95), 0.2 - 0.12 * i)
        frag = [(1.0, "D5", .5), (1.5, "A5", 1.5)] if bar != 27 else [(1.0, "D5", .5), (1.5, "A5", .5), (2.0, "F#5", 1.5)]
        play_line("kal", bar, frag, "kalimba", 0.42, pan=0.3)
        if bar == 26:
            put("bass", bar, 1.0, pluck_bass(mtof(bass_m), 0.35, BAR), 0.0)

    # ---- end card: the logo (bar 29) and a plagal approach (bar 30) ----
    if sec == "endcard":
        put("bass", bar, 1.0, pluck_bass(mtof(bass_m), 0.55, BAR * 0.9), 0.0, exact=True)
        put("kick", bar, 1.0, felt_kick(0.55), 0.0, exact=True)
        if bar == 30:
            for i, n in enumerate(voicing):
                put("vibes", bar, 1.0, vibes(mtof(nm(n)), hv(0.3), BAR * 0.95), 0.2 - 0.12 * i)
            play_line("mallet", bar, [(1.0, "B4", .5), (1.5, "F#5", .5), (2.0, "E5", .25), (2.25, "F#5", .75), (3.0, "A5", 1.5), (4.5, "E5", .5)], "marimba", 0.55, pan=0.05)

    # ---- final chord on the bar-31 downbeat: vibes (pedal down), a soft marimba roll, bass, glock on top ----
    if bar == 31:
        for i, n in enumerate(["D4", "F#4", "A4", "E5", "F#5"]):
            put("vibes", bar, 1.0, vibes(mtof(nm(n)), hv(0.42, 0.02), 4.4, trem=0.02), 0.25 - 0.12 * i, exact=True)
        put("bass", bar, 1.0, pluck_bass(mtof(nm("D2")), 0.62, 4.5), 0.0, exact=True)
        put("kick", bar, 1.0, felt_kick(0.5), 0.0, exact=True)
        put("mallet", bar, 1.0, marimba(mtof(nm("F#5")), 0.7), 0.05, exact=True)
        r_t, k = 0.0, 0
        while r_t < 2.2:                                                    # a roll on D4/A4 dying away
            v = 0.34 * (1 - r_t / 2.4) ** 1.5
            notes.append(("mallet", at(1.0) + r_t + 0.06, marimba(mtof(nm("D4" if k % 2 else "A4")), hv(max(v, 0.05), 0.08)), -0.1 + 0.2 * (k % 2)))
            events.append(dict(_inst_last, bus="mallet", bar=31, out_bar=cur["out"], beat=1.0 + (r_t + 0.06) / BEAT,
                               t_grid=at(1.0) + r_t + 0.06, t=at(1.0) + r_t + 0.06, pan=-0.1 + 0.2 * (k % 2), exact=True,
                               roll=True))
            r_t += 0.085 + 0.01 * rng.random()
            k += 1

# ----------------------------------------------------------------------------------------------------------------
# render the buses
# ----------------------------------------------------------------------------------------------------------------
BUSES = ["mallet", "kal", "vibes", "glock", "pad", "bass", "kick", "perc"]
bus = {b: np.zeros((2, N)) for b in BUSES}
for b, start, sig, pan in notes:
    i = int(round(start * SR))
    if i >= N:
        continue
    j = min(N, i + len(sig))
    ang = (np.clip(pan, -1, 1) + 1) * np.pi / 4
    bus[b][0, i:j] += sig[: j - i] * np.cos(ang) * np.sqrt(2)
    bus[b][1, i:j] += sig[: j - i] * np.sin(ang) * np.sqrt(2)


def synth_ir(sec=2.6, damp=0.4):
    n = int(sec * SR)
    t = np.arange(n) / SR
    ir = np.zeros((2, n))
    for c in range(2):
        nz = rng.standard_normal(n) * np.exp(-t * 6.9 / sec)
        lp = sosfilt(butter(1, 2500, fs=SR, output="sos"), nz)
        mixw = np.clip(t / sec, 0, 1) ** damp
        ir[c] = (1 - mixw) * nz + mixw * lp
    pre = int(0.018 * SR)
    ir = np.concatenate([np.zeros((2, pre)), ir], axis=1)
    ir[:, pre:pre + int(0.01 * SR)] *= np.linspace(0, 1, int(0.01 * SR))
    return ir / np.sqrt((ir ** 2).sum(axis=1, keepdims=True))


IR = synth_ir()


def P(x, chain):
    return chain(x.astype(np.float32), SR).astype(np.float64)


# per-bus tone, level and reverb send
CHAIN = {
    "mallet": (Pedalboard([HighpassFilter(110), PeakFilter(2800, -2.0, 0.8)]), -1.0, 0.24),
    "kal":    (Pedalboard([HighpassFilter(160), LowpassFilter(7000)]), -6.0, 0.26),
    "vibes":  (Pedalboard([HighpassFilter(140), Chorus(rate_hz=0.3, depth=0.12, mix=0.2)]), -5.0, 0.30),
    "glock":  (Pedalboard([HighpassFilter(900), LowpassFilter(9000)]), -14.0, 0.40),
    "pad":    (Pedalboard([HighpassFilter(110), LowpassFilter(2300), Chorus(rate_hz=0.22, depth=0.25, mix=0.35)]), -11.0, 0.30),
    "bass":   (Pedalboard([HighpassFilter(38), LowShelfFilter(90, -1.5), Compressor(-14, 2.0, 10, 160)]), 8.5, 0.04),
    "kick":   (Pedalboard([HighpassFilter(35), LowpassFilter(2500)]), -2.0, 0.03),
    "perc":   (Pedalboard([HighpassFilter(3000), HighShelfFilter(9000, -3.0)]), -15.0, 0.12),
}
dry = np.zeros((2, N))
send = np.zeros((2, N))
stems = {}
for b, (chain, gain_db, snd) in CHAIN.items():
    x = P(bus[b], chain) * 10 ** (gain_db / 20)
    stems[b] = x
    dry += x
    send += x * snd
wet = np.stack([fftconvolve(send[c], IR[c])[:N] for c in range(2)])
mix = dry + 0.55 * wet
# the fader ride (dB per bar): layering alone does not read as louder, so the mix is pushed into the reveal and the
# payoff and pulled back for the breakdown; each change ramps over 60 ms ending 10 ms before the downbeat
RIDE = {7: -1.0, 8: 3.0, 22: 1.5, 23: 3.0, 24: 3.0, 25: 3.0, 26: 1.5, 27: 1.5, 28: 1.5, 29: 0.5, 30: 0.5, 31: 1.0, 32: 1.0}
RIDE.update({b: 0.5 + 0.1 * (b - 9) for b in range(9, 22)})
ride_db = np.zeros(N)
for out_bar, bar in enumerate(FORM, 1):                                       # each bar keeps its own ride
    s = int(round(t_of(out_bar) * SR))
    ride_db[s:] = RIDE.get(bar, 0.0)
k = int(0.06 * SR)
ride = 10 ** (np.convolve(np.pad(ride_db, (k, 0), mode="edge"), np.ones(k) / k, "valid")[: N] / 20)
lead = k + int(0.01 * SR)                                                     # the causal ramp ends 10 ms before the downbeat
ride = np.concatenate([ride[lead:], np.full(lead, ride[-1])])
mix *= ride
mix = P(mix, Pedalboard([HighpassFilter(30), LowShelfFilter(110, -1.0), HighShelfFilter(8000, 1.0),
                         Compressor(threshold_db=-24, ratio=1.8, attack_ms=30, release_ms=300)]))
# the final 0.6 s fade lands the ringing chord in silence on the last frame
f = int(0.6 * SR)
mix[:, -f:] *= np.linspace(1, 0, f) ** 2
mix[:, : int(0.002 * SR)] *= np.linspace(0, 1, int(0.002 * SR))
meter = pyln.Meter(SR)
lufs0 = meter.integrated_loudness(mix.T)
target = -18.0
mix *= 10 ** ((target - lufs0) / 20)
peak = float(np.abs(mix).max())
if peak > 0.89:                                                             # keep >= 1 dB of sample-peak headroom
    mix *= 0.89 / peak
sf.write(a.out, mix.T, SR, subtype="PCM_24")
if a.stems:
    import os
    os.makedirs(a.stems, exist_ok=True)
    for b, x in stems.items():
        sf.write(f"{a.stems}/{b}.wav", (x * 10 ** ((target - lufs0) / 20)).T, SR, subtype="PCM_24")

bar_rms = []
for bar in range(1, OUT_BARS + 1):
    s, z = int(t_of(bar) * SR), int(t_of(bar + 1) * SR)
    bar_rms.append(round(float(10 * np.log10(np.mean(mix[:, s:z] ** 2) + 1e-12)), 1))
# the sections as they fall on the arrangement's bars (runs of one section; the film form gives SECTION itself)
runs = []
for out_bar, bar in enumerate(FORM, 1):
    name = next(s for s, a0, a1 in SECTION if a0 <= bar <= a1)
    if runs and runs[-1]["name"] == name and runs[-1]["last_bar"] == out_bar - 1:
        runs[-1]["last_bar"] = out_bar
    else:
        runs.append({"name": name, "first_bar": out_bar, "last_bar": out_bar, "start_s": round(t_of(out_bar), 3)})
info = {"title": "Pebble launch cue", "bpm": BPM, "meter": "4/4", "key": "D major", "bars": OUT_BARS,
        "duration_s": LEN_S, "seed": a.seed, "integrated_lufs": round(float(meter.integrated_loudness(mix.T)), 2),
        "sample_peak_dbfs": round(20 * np.log10(np.abs(mix).max()), 2), "notes": len(notes),
        "sections": runs,
        "chords": {str(i): CH[PROG[b]][0] for i, b in enumerate(FORM, 1)},
        "motif": "D5 A5 G#5 A5 (eighth, eighth, sixteenth, dotted eighth tied)",
        "bar_rms_db": bar_rms}
if a.form != "film":
    info["form"] = {"name": a.form, "score_bars": FORM}
json.dump(info, open(a.out.rsplit(".", 1)[0] + ".score.json", "w"), indent=1)
if a.events:
    for ev in events:
        ev["midi"] = None if ev["f"] is None else round(69 + 12 * float(np.log2(ev["f"] / 440.0)), 4)
    json.dump({"title": "Pebble launch cue: note events", "seed": a.seed, "bpm": BPM, "beat_s": BEAT, "bar_s": BAR,
               "bars": OUT_BARS, "duration_s": LEN_S, "sample_rate": SR, "form": {"name": a.form, "score_bars": FORM},
               "about": ("Every note of compose_score.py in render order. t_grid = the written time (bar, beat), t = the "
                         "time the synthesised score plays it (with its humanisation); vel_nominal = the written velocity, "
                         "vel = the humanised one; f in Hz (None for unpitched kick and shaker); exact = placed on the grid "
                         "without timing jitter; roll = the final marimba roll, timed off the grid on purpose. bar = the "
                         "score's bar the note comes from; out_bar = the bar of this arrangement it plays in (form); "
                         "t_grid and t are on the arrangement's timeline; ride_db_by_bar is keyed by out_bar."),
               "ride_db_by_bar": {str(i): RIDE.get(b, 0.0) for i, b in enumerate(FORM, 1)},
               "bus_chain": {b: {"gain_db": g, "reverb_send": s} for b, (_, g, s) in CHAIN.items()},
               "sections": info["sections"], "chords": info["chords"], "events": events},
              open(a.events, "w"), indent=0)
print(json.dumps({k: v for k, v in info.items() if k not in ("chords", "bar_rms_db", "sections")}))
print("bar RMS dB:", " ".join(f"{i + 1}:{v}" for i, v in enumerate(bar_rms)))
