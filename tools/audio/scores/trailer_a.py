"""Pebble's trailer score, candidate A: hybrid trailer electronic.

The score for the launch film recut as a trailer (76.8 s, 32 bars at 100 BPM, 30 fps), written to the trailer
blueprint's music section and its frames (the research lane's TRAILER_RESEARCH §6-§7, report.music; OVERRIDES
§34-§39), on the synthesis engine in tools/audio/synth (its README.md): no samples, no downloads, no vocals.

The angle: cinematic and modern, a frontier-lab keynote sizzle. A pulsing eighth-note reese ostinato builds under the
tension, dark trailer hits land the three questions, a low braam turns the act, toms and an accelerating roll drive a
build that stays well under the drop, the four-note motif comes back at the drop on a saw lead over supersaw stabs,
and big drums and a driving groove carry the montage and the climax.

Form. Bar n starts on film frame 72(n-1); beat b of a bar falls 18(b-1) frames later.
  1      the look       an airy pad on detuned triangles (B4 F#5 C#6, an open fifth and ninth: the motif's D5 makes
                        it B minor), a two-thump sub heartbeat on 1 and 3, the motif D5 A5 G#5 A5 on a soft pluck over
                        beats 2-4; the breath f63-71
  2 4 6  the questions  a trailer hit on each downbeat (f72, f216, f360): a sub falling an octave onto B1, G1, A1 in
                        25 ms and gone in 0.45 s, an unpitched thwack and a small room (wet 0.10, above 600 Hz); then
                        near silence: noise ticks in quarters, 8ths, then 16ths, and the heartbeat. Q3 is the biggest
  3 5    the glimpses   the half-time skeleton (kick on 1, snare on 3, hats in 8ths, then 16ths) and the reese
                        ostinato in 8ths on B1, then G1, opening; it stops a beat before the next hit, and a reverse
                        noise swell sucks back into it (the hit then clears the 0.6 s before it by 10 dB or more)
  7      the hold       the skeleton to f444; on f445, Pebble's own hold, the drive stops dead and the Asus4 pad swells
                        on (the mix's hold automation darkens it)
  8      the turn       a braam on G1, the motif's first two notes left hanging on a pad, noise air, the heartbeat back
                        and in 8ths from f558; a noise riser and a supersaw cluster (D4 A4 E5, open, rising a minor
                        third) swell from f504 to f611
  9      the build      kicks on every beat, an accelerating roll (8ths to 32nds), a tom fill, the ostinato in 16ths;
                        then the dead stop f612-647: both stems are exact zeros
  10     the drop       crash, a big kick and a short sub on D1; the full groove (kick on 1 and 2.5, claps on 2 and 4,
                        accented 16th hats, an open hat on the and of 4, an 8th reese line), supersaw chords pumping
                        5 dB under the kicks, 3-3-2 supersaw stabs, and the motif at full level on the saw lead
  11     the star beat  the groove on A/C#, the motif's answer E5 B5 A5 B5
  12-13  the quick chat the groove sits back: hats and bass only, quiet; nothing on the click (f792) or the send (f828)
  14     the workspace  the groove back at full on A, a rising lead line, a tom fill over f990-1007
  15-20  the montage    groove C (kick on 1, 2.5 and 3; snare and clap on 2 and 4; 16th hats and a shaker; open hats
                        on the ands) over D A/C# Bm G; a kick-and-snap on every cut, crashes on the lifts (bars 15 and
                        18), the filter opens and a plucked arp enters at 18; bar 20 builds (a roll, a riser, no gap)
  21     the held run   a hit lands the wide shot; on f1453 the drive stops again and the Asus4 pad carries on; a soft
                        thump under the line on f1476
  22     run the tests  snaps on rising 16ths, rising hats, the ostinato back on A1, a riser; the mix's filter opens
  23     the run        a crash on the click (f1584), four on the floor, pumping 8th subs on A1, extra snaps, a rising
                        lead, a short riser; the breath f1647-1655
  24     Verified       the biggest hit (f1656): crash, kick and a short sub on D1; the motif harmonised (a sixth below,
                        an octave above) over the fullest groove, the arp and the stabs: the loudest 3 s of the film
  25     the celebration the full groove, D then A/C#, the answer; a downlifter over f1782-1799
  26-28  the breakdown  no drums: one short sub on B1 (f1800), the motif on a soft pluck (Bm9, Gmaj7, Asus4 to A), a
                        soft tom and rim on each fact (f1872, f1926), the hats swelling over f1944-2006
  29-30  the title      a short sub, the motif resolved (D5 A5 G#5 A5 F#5 E5 D5), a soft groove (kick on 1, snap on 4,
                        8th hats), D to Gmaj9; the breath f2151-2159
  31-32  the button     crash, kick and a short sub (0.55 s) under D(add9) in open voicing (f2160); the mix fades it
                        over f2214-2249 on an equal-power curve; exact zeros from f2250
Harmony: Bm(add9) | G | Asus4 for the questions, G -> Asus4 for the build, the drop on D, the loop D A/C# Bm G, the
holds on Asus4, Verified on D, D(add9) at the end. Every sustained chord is voiced from octave 4 up, open (a close saw
chord in octave 3 reads as brass and foghorn under low hits: synth/README.md).

Levels, measured on the preview masters over six rounds (numbers in the comments by each setting): the bed sits near
-18 LUFS, where tools/audio/sfx_kit.json's effect gains assume it, and the drive about 3.5 LU under it. Everything
before the drop but the hold's pad plays TENSION_TRIM_DB under its written velocity, so bars 1-9 stay 6 LU under
every master's integrated level (the x30's too). Both stems pass a 5 ms lookahead limiter (BED_PEAK_DB, DRIVE_PEAK_DB)
so the -14 LUFS masters lose less to their own limiter.

Stems (tools/audio/mix_master.py takes them as BED and --drive): bed.wav (pads, chords, stabs, leads, plucks, the arp,
and the score's own hits, braam and risers, which carry on through the holds) and drive.wav (drums and bass, which
stop in the holds: the stem is silent there by itself). Both are 48 kHz stereo float32, exactly 3,686,400 samples.
The x30 cut (report.music: score bars 1 6 7 8 9 10 22 23 24 29 31 32, in that order, joined on bar lines) is the same
arrangement placed on those bars: bed_x30.wav and drive_x30.wav, 1,382,400 samples. A sound runs over a bar line only
where the next bar follows in that order; elsewhere it is cut at the line (its release rings on).

Preview mixes. The picture lane exports the effects and the automation to tools/audio/cues.json after this score, so
the previews use the blueprint's automation (gaps f63, f639, f1647, f2151; holds f445-503 and f1453-1511, released to
the next bar lines f576 and f1584; the tail) plus three kinds of stand-ins for score sounds that the automation would
swallow if they lived in the stems: the suck-backs into f72 and f648 (inside gaps), the rim ticks in both holds (the
kit's rim_a and rim_b, -15 dB, on f450 f468 f486 f1458 f1476 f1494) and a soft noise tick inside the f1647 gap. They
are marked as stand-ins in preview_cues.json; the timeline's own effects replace them.

Usage, from the repo root (every step is a heavy job: scripts/heavy.sh, at utility priority):
  PY=.work/audio/.venv/bin/python
  scripts/heavy.sh score-a /usr/sbin/taskpolicy -c utility $PY -I tools/audio/scores/trailer_a.py all
  ... trailer_a.py render [--film-only | --x30-only | --bars 8,9,10] | mix | report | checks | pictures
                   | preview --m4a FILE | all [--checks] [--m4a FILE]
Writes into .work/audio/render/candidates/trailer-a/ (never into git): the stems, fx/ (the stand-ins),
preview_cues.json and preview_cues.x30.json, x30_cut.json, preview_web.wav (-16 LUFS), preview_social.wav and
preview_x30.wav (-14 LUFS), render.json, report.json (the blueprint's dynamics report) and checks/ (mix_checks.py's
gates, the extra after-silence passes and the drive alone in tagcheck's passes).
"""
from __future__ import annotations

import argparse
import json
import math
import os
import subprocess
import sys
import tempfile
import time

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
AUDIO = os.path.dirname(HERE)                                   # tools/audio
REPO = os.path.dirname(os.path.dirname(AUDIO))
sys.path.insert(0, AUDIO)

import pyloudnorm as pyln  # noqa: E402
import soundfile as sf  # noqa: E402
from scipy.signal import lfilter  # noqa: E402

import synth as S  # noqa: E402
from synth import core, env, filters, fills, fx, osc, stems, tagcheck  # noqa: E402
from synth.grid import Event  # noqa: E402
from synth.presets import Instrument  # noqa: E402

SR = core.SR
FPS = 30
SEED = 31
OUT = os.path.join(REPO, ".work", "audio", "render", "candidates", "trailer-a")
KIT = os.path.join(REPO, ".work", "audio", "sfx")
SOUND_TAGS = os.path.join(REPO, ".work", "audio", "sound_tags")
FFMPEG = os.environ.get("FF", "/opt/homebrew/bin/ffmpeg")
PY = sys.executable

FILM_BARS = list(range(1, 33))
X30_BARS = [1, 6, 7, 8, 9, 10, 22, 23, 24, 29, 31, 32]                # report.music: the x30's score bars
X30_RANGES = [[0, 72], [360, 720], [1512, 1728], [2016, 2088], [2160, 2304]]
STEM_TRIM_DB = 0.0                                                     # both stems, the same trim (their balance holds)
# Both stems' stacked peaks (the third question's hit, the harmonised motif on Verified, the hits' kicks and subs)
# are shaved by a 5 ms lookahead limiter, so the masters' own limiter has less to take. The x30 is dense in loud bars:
# with no stem limiting its -14 master came out at -14.68 LUFS (mix_checks.py wants -14 +-0.5). On the final
# arrangement, x30 masters measured -14.57 with these at -4.5/-10, -14.50 with a faster drum compressor, and -14.49
# at -5.5/-11 (ffmpeg -14.5 each): the loss is the master limiter working on dense bars, so the margin stays thin
BED_PEAK_DB = -5.5
DRIVE_PEAK_DB = -11.0
TENSION_TRIM_DB = -2.5                                                 # bars 1-9 but the hold's pad: see compose()

# The UI's click and key frames: the hats leave them empty so the clicks read (report.music).
SKIP_FRAMES = {198, 792, 828, 1170, 1260, 1512, 1584}

# Sustained voicings: octave 4 up, open (synth/README.md: close octave-3 saw chords read as brass under low hits).
CH = {
    "Bm9": ("F#4", "B4", "D5", "F#5", "C#6"),
    "Bm": ("F#4", "B4", "D5", "F#5", "B5"),
    "Gmaj7": ("G4", "B4", "D5", "F#5"),
    "G": ("G4", "B4", "D5", "G5", "B5"),
    "Gmaj9": ("G4", "B4", "D5", "F#5", "A5"),
    "Asus4": ("E4", "A4", "D5", "E5", "A5"),
    "A": ("E4", "A4", "C#5", "E5", "A5"),
    "A/C#": ("E4", "A4", "C#5", "E5", "A5"),
    "D": ("D4", "A4", "D5", "F#5", "A5"),
    "Dadd9": ("D4", "A4", "E5", "F#5", "A5"),
}
STAB = {k: v[1:] for k, v in CH.items()}                               # the stabs leave the lowest voice to the chords
ROOT = {"Bm9": "B1", "Bm": "B1", "Gmaj7": "G1", "G": "G1", "Gmaj9": "G1", "Asus4": "A1", "A": "A1", "A/C#": "C#2",
        "D": "D2", "Dadd9": "D2"}
ARP = {"G": ("D5", "G5", "B5", "D6"), "D": ("D5", "F#5", "A5", "D6"), "A/C#": ("C#5", "E5", "A5", "C#6"),
       "Bm": ("D5", "F#5", "B5", "D6"), "A": ("C#5", "E5", "A5", "C#6")}

# The motif (beat in the bar, note, length in beats): D5 A5 G#5 A5, "eighth, eighth, sixteenth, dotted eighth tied".
MOTIF = [(1.0, "D5", 0.5), (1.5, "A5", 0.5), (2.0, "G#5", 0.25), (2.25, "A5", 1.25)]
ANSWER = [(1.0, "E5", 0.5), (1.5, "B5", 0.5), (2.0, "A5", 0.25), (2.25, "B5", 1.25)]
SIXTH = [(1.0, "F#4", 0.5), (1.5, "C#5", 0.5), (2.0, "B4", 0.25), (2.25, "C#5", 1.25)]       # a sixth below the motif
RESOLVED = MOTIF[:3] + [(2.25, "A5", 0.75), (3.0, "F#5", 0.5), (3.5, "E5", 0.5), (4.0, "D5", 3.0)]

# The blueprint's automation (report.music, STEMS AND AUTOMATION), in cues.json's format; mix_master.py applies it and
# fills any parameter left out from tools/audio/sfx_kit.json.
GAP = {"db": -24, "attack_ms": 10, "release_ms": 4, "applies_to": ["bed", "drive"]}
HOLD = {"bed_db": -6, "bed_lowpass_hz": 1200, "crossfade_ms": 30, "drive": "mute", "drive_ms": 10,
        "release_curve": "ease-in", "applies_to": ["bed", "drive"]}
AUTOMATION = [
    dict(role="gap", frame=63, to_frame=72, event="the breath before the first question's hit", **GAP),
    dict(role="hold", frame=445, to_frame=504, release_frame=576,
         event="Pebble's hold in glimpse 3: the drive stops, the bed darkens; released over the turn", **HOLD),
    dict(role="gap", frame=639, to_frame=648, event="inside the dead stop, before the drop", **GAP),
    dict(role="hold", frame=1453, to_frame=1512, release_frame=1584,
         event="the held run; Run the tests releases it and the filter opens across bar 22", **HOLD),
    dict(role="gap", frame=1647, to_frame=1656, event="the breath before Verified", **GAP),
    dict(role="gap", frame=2151, to_frame=2160, event="the breath before the final hit", **GAP),
    dict(role="tail", frame=2214, to_frame=2250, curve="sine", fade_to_db=-60, then="zeros", after_limiter=True,
         event="the equal-power fade, then digital silence", applies_to=["master"]),
]


# ---------------------------------------------------------------------------------------------------------------------
# Voices the engine lacks (each: note, vel, dur, rng, sr, **params -> stereo (2, n), exact zero at both ends)

def _sine_from(f, sr):
    ph = np.concatenate([[0.0], np.cumsum(f[:-1])]) / sr
    return np.sin(2.0 * np.pi * ph)


def heartbeat(note="F#1", vel=0.8, dur=None, rng=None, sr=SR, dub=True, gap=0.17, dub_vel=0.62, length=0.22,
              start=2.0, drop_tau=0.016, tau=0.055, drive=1.8, knock=0.22, level=0.9):
    """A sub heartbeat: one thump, or two (lub, then dub `gap` s later). Each is a sine falling from start x the note
    onto it, gone within `length` (<= 0.25 s), driven for small speakers, with a soft low knock (noise, 90-420 Hz)."""
    r = rng if rng is not None else core.rng(0, "heart")
    n = core.samples(length, sr)
    t = np.arange(n) / sr
    f0 = core.hz(note)

    def thump(v):
        f = f0 * (1.0 + (start - 1.0) * np.exp(-t / drop_tau))
        y = fx.saturate(_sine_from(f, sr) * env.perc(length, 0.002, tau, 0.012, 0.04, sr), drive)
        k = filters.band(r.standard_normal(n), 90.0, 420.0, 2, sr) * env.perc(length, 0.001, 0.022, 0.0, 0.03, sr)
        return v * (y + knock * k / (np.abs(k).max() + 1e-12))

    y = thump(1.0)
    if dub:
        k = core.samples(gap, sr)
        y = np.concatenate([y, np.zeros(k)])
        y[k:k + n] += thump(dub_vel)
    y = y / (np.abs(y).max() + 1e-12) * level
    return core.stereo(core.end_clean(y * vel, 0.006, sr))


def trailer_hit(note="B1", vel=1.0, dur=None, rng=None, sr=SR, sub=1.0, sub_len=0.45, drop_s=0.025, sub_tau=0.15,
                thwack=0.85, thwack_tau=0.05, lo=170.0, hi=2600.0, crack=0.4, boom=0.45, boom_tau=0.18, drive=1.7,
                room=0.10, room_hp=600.0, size=0.8, length=1.6, level=0.95):
    """A dark trailer hit (report.music: the question cards). A sub that starts an octave above the note and falls
    onto it in drop_s (25 ms), gone in sub_len (<= 0.5 s); an unpitched noise thwack (lo-hi Hz); a crack; a low
    brown-noise boom; tanh drive; a small room (wet <= 0.12) above room_hp. Nothing tonal above the sub's harmonics."""
    r = rng if rng is not None else core.rng(0, "trailer_hit")
    n = core.samples(length, sr)
    t = np.arange(n) / sr
    u = np.clip(t / drop_s, 0.0, 1.0)
    u = u * u * (3.0 - 2.0 * u)
    f = core.hz(note) * 2.0 ** (1.0 - u)
    k = min(n, core.samples(sub_len, sr))
    s = np.zeros(n)
    s[:k] = _sine_from(f[:k], sr) * env.perc(k / sr, 0.0008, sub_tau, 0.02, 0.06, sr)[:k]
    y = sub * s
    y += thwack * filters.band(r.standard_normal(n), lo, hi, 2, sr) * \
        env.perc(length, 0.0006, thwack_tau, 0.004, 0.05, sr) / 1.6
    kc = core.samples(0.05, sr)
    y[:kc] += crack * filters.band(r.standard_normal(kc), 2200.0, 8000.0, 2, sr) * \
        env.perc(0.05, 0.0002, 0.007, 0.0, 0.004, sr) / 1.6
    y += boom * filters.lowpass(osc.noise(n, r, "brown"), 180.0, poles=4, sr=sr) * \
        env.perc(length, 0.001, boom_tau, 0.0, 0.1, sr)
    st = core.stereo(fx.saturate(y, drive))
    if room:
        st = core.fit(fx.reverb(st, size=size, damping=0.6, wet=room, dry=1.0, hp_hz=room_hp, lp_hz=6000.0, sr=sr), n)
    st = fx.mono_below(st, 140.0, sr)
    st = st / (np.abs(st).max() + 1e-12) * level
    return core.end_clean(st * vel, 0.08, sr)


def air(note=None, vel=0.5, dur=None, rng=None, sr=SR, lo=2800.0, hi=9500.0, attack=0.9, release=1.2, wobble=0.3,
        rate=0.6, width=1.0, level=0.6):
    """Noise air: a wide band of noise (lo-hi) that swells in and out with a slow, seeded wobble. No pitch."""
    r = rng if rng is not None else core.rng(0, "air")
    gate = dur if dur and dur > 0 else 2.4
    n = core.samples(gate + release, sr)
    y = filters.band(r.standard_normal((2, n)), lo, hi, 2, sr)
    mid, side = 0.5 * (y[0] + y[1]), 0.5 * (y[0] - y[1])
    y = np.stack([mid + width * side, mid - width * side])
    w = np.clip(1.0 + wobble * osc.slow_random(n, r, rate, sr), 0.0, None)
    y = y * env.adsr(gate, attack, 0.5, 1.0, release, sr, length=n) * w
    y = y / (np.abs(y).max() + 1e-12) * level
    return core.end_clean(y * vel, 0.01, sr)


V = {  # the instruments: presets with this score's settings, and the voices above
    "kick": S.get("kick"),
    "kick_hit": S.get("kick", tau=0.24, length=0.9, drive=2.4, tune=46.0, click=0.35, level=0.8),
    "snare": S.get("snare"),
    "clap": S.get("clap"),
    "snap": S.get("clap", bursts=3, tail=0.35, length=0.22, fc=1900.0, q=1.3, tail_tau=0.035),
    "roll": S.get("snare", tone=0.4, length=0.25),
    "hat": S.get("hat"),
    "hat_open": S.get("hat_open"),
    "tom": S.get("tom"),
    "shaker": S.get("shaker"),
    "rim": S.get("rim"),
    "tick": S.get("tick"),
    "crash": S.get("crash", decay=2.2),
    "heart": Instrument(heartbeat, "heartbeat"),
    # the reese basses' filters don't track the keyboard: from C4 down to B1 a 0.4 tracking would close them to a
    # third of their cut-off, and the ostinato would vanish on a phone
    "reese": S.get("reese", attack=0.004, decay=0.12, sustain=0.55, release=0.05, cutoff=520.0, keytrack=0.0,
                   drive=1.8),
    "bass": S.get("reese", attack=0.003, decay=0.16, sustain=0.7, release=0.06, cutoff=700.0, keytrack=0.0, drive=1.9),
    "sub": S.get("sub", harmonics=0.25, decay=0.22, sustain=0.6, release=0.12),
    # the tension pads on triangles: as a swelling saw chord, with the noise air, the film's first 0.75 s after silence
    # read 'train_horn' 0.62 and 'air_horn' 0.58 (on triangles 0.11 and 0.28; without the air 0.13 and 0.27)
    "pad": S.get("pad", shape="triangle", cutoff=1800.0, env_oct=0.4, attack=0.6, release=1.8, sub=0.0, chorus=0.3),
    "pad_hold": S.get("pad", cutoff=2200.0, env_oct=0.6, attack=1.0, decay=1.2, sustain=0.9, release=1.2, sub=0.08),
    "pad_soft": S.get("pad", cutoff=1400.0, env_oct=0.4, attack=0.5, release=1.6, sub=0.0, chorus=0.25),
    "frag": S.get("pad", cutoff=2400.0, env_oct=0.3, attack=0.12, decay=0.8, sustain=0.8, release=1.4, sub=0.0,
                  voices=5),
    "air": Instrument(air, "air"),
    "pluck": S.get("pluck", cutoff=900.0, env_oct=3.0, tau=0.35),
    "chords": S.get("supersaw", cutoff=3200.0, env_oct=0.8, attack=0.008, decay=0.6, sustain=0.8, release=0.35,
                    detune=26.0),
    "stabs": S.get("stab"),
    "lead": S.get("lead", cutoff=2800.0, env_oct=1.0, detune=9.0, sub=0.35, vibrato_cents=5.0, vibrato_delay=0.45,
                  release=0.2, fdecay=0.25),
    "lead2": S.get("lead", cutoff=2200.0, env_oct=0.6, detune=6.0, sub=0.0, vibrato_cents=0.0, release=0.2),
    "lead_hi": S.get("lead", cutoff=4200.0, env_oct=0.4, detune=12.0, sub=0.0, vibrato_cents=4.0, release=0.2),
    "arp": S.get("arp"),
    "final": S.get("supersaw", attack=0.004, decay=1.4, sustain=0.55, release=2.5, cutoff=2800.0, env_oct=1.2,
                   fdecay=0.6, fsustain=0.3),
    "qhit": Instrument(trailer_hit, "trailer_hit"),
    "hit": Instrument(trailer_hit, "trailer_hit_big", sub_len=0.5, thwack_tau=0.07, boom=0.6, boom_tau=0.25,
                      room=0.12),
    "braam": S.get("braam"),
    "riser": S.get("riser", chop=(3.0, 16.0), chop_depth=0.45, f0=300.0, f1=9000.0),
    # the cluster rises a minor third: gliding an octave, the build read 'civil_defense_siren' 0.29-0.30 in the
    # masters (0.33-0.63 in the bed alone); at +3 semitones (or static, or with no cluster) no siren label at all
    "cluster": S.get("riser_pitch", noise=0.0, octave=0.0, semitones=3.0, detune=40.0, f_lo=600.0, f_hi=7000.0),
    "swell": S.get("reverse_swell", source="noise"),
    "cswell": S.get("reverse_swell", source="chord"),
    "downlifter": S.get("downlifter"),
    "thump": Instrument(heartbeat, "thump", dub=False, tau=0.08, length=0.25, knock=0.3),
}


# ---------------------------------------------------------------------------------------------------------------------
# The arrangement: events written in film bars, placed on an output timeline (the film's 32 bars, or a cut's bars)

class Arrangement:
    def __init__(self, g, bars):
        self.g = g
        self.bars = list(bars)
        self.pos = {b: i for i, b in enumerate(self.bars)}           # film bar -> output bar (0-based)
        self.n = g.length(bars=len(self.bars))
        self.ev = {}

    def has(self, bar):
        return bar in self.pos

    def follows(self, bar):
        """True when film bar `bar` plays right after film bar bar - 1, so a sound may run across their line."""
        return bar in self.pos and (bar - 1) in self.pos and self.pos[bar] == self.pos[bar - 1] + 1

    def run(self, bar):
        """Film seconds [start, end) of the run of bars around `bar` that plays on without a joint."""
        a = b = bar
        while self.follows(a):
            a -= 1
        while self.follows(b + 1):
            b += 1
        return (a - 1) * self.g.bar, b * self.g.bar

    def put(self, track, bar, events, anchor="start"):
        """Events in film seconds, at home in film bar `bar`. anchor='end' is for effects that arrive on their time
        (risers, swells): they may reach back only as far as their run of bars goes, and are shortened to fit."""
        if bar not in self.pos:
            return
        d = (self.pos[bar] - (bar - 1)) * self.g.bar
        lo, hi = self.run(bar)
        out = self.ev.setdefault(track, [])
        for e in events:
            if anchor == "end":
                if e.t - e.dur < lo - 1e-9:
                    if e.t - lo <= 0.05:
                        continue
                    e = e.but(dur=e.t - lo)
            else:
                if e.t < lo - 1e-9 or e.t >= hi - 1e-9:
                    continue
                if e.dur and e.t + e.dur > hi + 1e-9:
                    e = e.but(dur=hi - e.t)
            out.append(e.but(t=e.t + d))

    def frame(self, f):
        """The output frame where film frame f plays, or None."""
        bar = f // 72 + 1
        return None if bar not in self.pos else self.pos[bar] * 72 + f % 72


def N(x):
    if x is None:
        return None
    if isinstance(x, (list, tuple)):
        return tuple(core.note(v) for v in x)
    return core.note(x)


def ev(g, pos, dur=0.0, vel=1.0, note=None, **params):
    t = g.t(pos) if not isinstance(pos, str) or not pos.startswith("f") else int(pos[1:]) / FPS
    return Event(t, dur, vel, N(note), params)


def phrase(g, bar, notes, vel=0.9, legato=0.97, shift=0.0):
    out = []
    for item in notes:
        b, nm, ln = item[:3]
        v = item[3] if len(item) > 3 else vel
        t0 = g.t((bar, b + shift))
        out.append(Event(t0, g.beats(ln) * legato, v, core.note(nm)))
    return out


def pulses(g, bar, note, b0, b1, step=0.5, gate=0.55, vel=(0.6, 0.8), accents=None, cutoff=None, pop=None):
    """Notes every `step` beats over beats [b0, b1) of a bar; vel is a level or a (v0, v1) ramp; cutoff a (c0, c1)
    ramp for voices that take one; pop: the indices played an octave up."""
    k = int(round((b1 - b0) / step))
    out = []
    for i in range(k):
        u = i / max(1, k - 1)
        v = vel[0] + (vel[1] - vel[0]) * u if isinstance(vel, tuple) else vel
        if accents:
            v *= accents[i % len(accents)]
        p = {}
        if cutoff:
            p["cutoff"] = cutoff[0] * (cutoff[1] / cutoff[0]) ** u
        m = core.note(note) + (12 if pop and i in pop else 0)
        out.append(Event(g.t((bar, b0 + i * step)), g.beats(step) * gate, v, m, p))
    return out


def hats(g, bar, text, vel=1.0, step=0.25, **params):
    evs = S.hits(text, g, at=(bar, 1), vel=vel, step=step, **params)
    return [e for e in evs if int(round(e.t * FPS)) not in SKIP_FRAMES]


def ticks(g, bar, b0, b1, step, vel):
    k = int(round((b1 - b0) / step))
    out = []
    for i in range(k):
        v = vel[0] + (vel[1] - vel[0]) * i / max(1, k - 1)
        out.append(Event(g.t((bar, b0 + i * step)), 0.0, v * (1.0 if i % 2 == 0 else 0.85), None, {"tock": i % 2 == 1}))
    return out


DROP_ACC = [1.0, 0.55, 0.7, 0.95, 0.6, 0.55, 0.7, 0.6]               # the bass locks to the kick on 1 and 2.5
GROOVE_C_ACC = [1.0, 0.5, 0.6, 0.95, 0.9, 0.5, 0.6, 0.55]             # and on 1, 2.5 and 3 in groove C
STABS_3_3_2 = "X..x..x.x..x..x."


def chords(A, bar, plan, vel=0.9, cutoff=None, track="chords", legato=0.98):
    """plan: [(chord, beats), ...] from beat 1; sustained supersaw chords."""
    g, b = A.g, 1.0
    out = []
    for ch, beats in plan:
        t0 = g.t((bar, b))
        p = {"cutoff": cutoff} if cutoff else {}
        out.append(Event(t0, g.beats(beats) * legato, vel, N(CH[ch]), p))
        b += beats
    A.put(track, bar, out)


def stabs(A, bar, plan, vel=0.8, until=5.0):
    g, b = A.g, 1.0
    for ch, beats in plan:
        text = STABS_3_3_2[int((b - 1) * 4):int((b - 1 + beats) * 4)]
        evs = S.hits(text, g, at=(bar, b), note=STAB[ch], vel=vel)
        A.put("stabs", bar, [e for e in evs if g.where(e.t)[1] < until - 1e-6])
        b += beats


def bassline(A, bar, plan, acc=DROP_ACC, vel=1.0, gate=0.62, skip_first=False, until=5.0, pop_last=True):
    """8th notes on each chord's root, accented to lock with the kick; the last 8th an octave up."""
    g, b = A.g, 1.0
    for ch, beats in plan:
        k0 = int((b - 1) * 2)
        evs = []
        for i in range(int(beats * 2)):
            j = k0 + i
            bb = 1.0 + j * 0.5
            if (skip_first and j == 0) or bb >= until - 1e-6:
                continue
            m = core.note(ROOT[ch]) + (12 if pop_last and j == 7 else 0)
            evs.append(Event(g.t((bar, bb)), g.beats(0.5) * gate, vel * acc[j % 8], m))
        A.put("bass", bar, evs)
        b += beats


def drop_groove(A, bar, plan, vel=1.0, kick_one=True, until=5.0, skip_first_bass=False):
    g = A.g
    k = "X.....x........." if kick_one else "......x........."
    cut = lambda evs: [e for e in evs if g.where(e.t)[1] < until - 1e-6]  # noqa: E731
    A.put("kick", bar, cut(S.hits(k, g, at=(bar, 1), vel=vel)))
    A.put("clap", bar, cut(S.hits("....X.......X...", g, at=(bar, 1), vel=0.9 * vel)))
    A.put("hat", bar, cut(hats(g, bar, "8474 8474 8474 8474", vel=0.9 * vel)))
    A.put("hat_open", bar, cut(S.hits("..............o.", g, at=(bar, 1), dur=0.18, vel=vel)))
    bassline(A, bar, plan, DROP_ACC, vel, skip_first=skip_first_bass, until=until)


def groove_c(A, bar, plan, vel=1.0, until=5.0):
    g = A.g
    cut = lambda evs: [e for e in evs if g.where(e.t)[1] < until - 1e-6]  # noqa: E731
    A.put("kick", bar, cut(S.hits("......x.x.......", g, at=(bar, 1), vel=vel)))       # beat 1: the cut's accent
    A.put("snare", bar, cut(S.hits("....x.......x...", g, at=(bar, 1), vel=0.75 * vel)))
    A.put("clap", bar, cut(S.hits("....X.......X...", g, at=(bar, 1), vel=0.85 * vel)))
    A.put("hat", bar, cut(hats(g, bar, "8474 8474 8474 8474", vel=0.95 * vel)))
    A.put("hat_open", bar, cut(S.hits("..o...o...o...o.", g, at=(bar, 1), dur=0.15, vel=0.8 * vel)))
    bassline(A, bar, plan, GROOVE_C_ACC, vel, until=until)


def accent(A, bar, crash=0.0, kick=0.85, snap=0.0, sub=None, sub_vel=1.0):
    """A bar's downbeat hit: a big kick, and optionally a crash, a snap and a short sub (an octave above onto the
    note in 25 ms, 0.55 s)."""
    g = A.g
    A.put("kick_hit", bar, [ev(g, (bar, 1), 0.0, kick)])
    if crash:
        A.put("crash", bar, [ev(g, (bar, 1), 0.0, crash)])
    if snap:
        A.put("snap", bar, [ev(g, (bar, 1), 0.0, snap)])
    if sub:
        A.put("sub", bar, [ev(g, (bar, 1), 0.55, sub_vel, sub, glide_from=12.0, glide_s=0.025)])


# ---------------------------------------------------------------------------------------------------------------------
# The score

def compose(A):
    g = A.g
    P = A.put

    # ---- bars 1-9: tension, sound design first ----
    # The opening after silence (Apple's classifier, the first 0.75 s and 1.5 s at each master's own level, on renders
    # that reproduce these events exactly): the Bm(add9) chord on triangles read 'ringtone' 0.31-0.36, with noise air
    # 'train_horn' 0.63, and on saws with air 0.72. As an open fifth and ninth (the third is the motif's own D5),
    # with no air, every horn, phone and beep label stays under 0.17. With no pad at all, the heartbeat and the
    # pluck read 'beep' 0.6
    P("pad", 1, [ev(g, (1, 1), g.bars(3) - 0.05, 0.26, ("B4", "F#5", "C#6"))])
    P("heart", 1, [ev(g, (1, 1), 0, 0.52, "F#1"), ev(g, (1, 3), 0, 0.48, "F#1")])
    P("pluck", 1, phrase(g, 1, MOTIF, vel=0.36, shift=1.0))

    P("qhit", 2, [ev(g, (2, 1), 0, 0.8, "B1")])                                   # Q1 "What did it change?"
    P("heart", 2, [ev(g, (2, 3), 0, 0.55, "F#1")])
    P("tick", 2, ticks(g, 2, 2.0, 5.0, 1.0, (0.45, 0.5)))

    P("kick", 3, [ev(g, (3, 1), 0, 0.68)])                                        # glimpse 1: the skeleton
    P("snare", 3, [ev(g, (3, 3), 0, 0.55)])
    P("hat", 3, hats(g, 3, "x.x.x.x.x.x.....", vel=0.42, step=0.25))
    P("reese", 3, pulses(g, 3, "B1", 1.0, 4.0, vel=(0.4, 0.56), cutoff=(480.0, 620.0)))   # stops a beat early
    P("swell", 4, [ev(g, (4, 1), 0.3, 0.5)], anchor="end")                       # the suck-back into Q2

    P("qhit", 4, [ev(g, (4, 1), 0, 0.95, "G1")])                                  # Q2 "Can I undo it?"
    P("pad", 4, [ev(g, (4, 1), g.bars(2) - 0.05, 0.38, CH["Gmaj7"])])
    P("heart", 4, [ev(g, (4, 3), 0, 0.56, "G1")])
    P("tick", 4, ticks(g, 4, 1.5, 5.0, 0.5, (0.45, 0.55)))

    P("kick", 5, [ev(g, (5, 1), 0, 0.76)])                                        # glimpse 2
    P("snare", 5, [ev(g, (5, 3), 0, 0.63)])
    P("hat", 5, S.scale_vel(hats(g, 5, "xxxx xxxx xxxx ....", vel=0.46), (0.6, 1.0)))
    P("reese", 5, pulses(g, 5, "G1", 1.0, 4.0, vel=(0.44, 0.62), cutoff=(600.0, 820.0)))
    P("swell", 6, [ev(g, (6, 1), 0.3, 0.6)], anchor="end")                       # the suck-back into Q3

    P("qhit", 6, [ev(g, (6, 1), 0, 0.9, "A1")])                                   # Q3 "Did it run the tests?"
    P("hit", 6, [ev(g, (6, 1), 0, 0.42, "A1")])                                   # the biggest of the three
    P("pad", 6, [ev(g, (6, 1), g.bars(2) - 0.05, 0.42, CH["Asus4"])])
    P("heart", 6, [ev(g, (6, 3), 0, 0.55, "A1")])
    P("tick", 6, ticks(g, 6, 1.25, 5.0, 0.25, (0.32, 0.5)))

    P("kick", 7, [ev(g, (7, 1), 0, 0.85)])                                        # glimpse 3, until the hold
    P("hat", 7, [ev(g, (7, 1), 0, 0.5), ev(g, (7, 1.25), 0, 0.35), ev(g, (7, 1.5), 0, 0.42)])
    P("reese", 7, [ev(g, (7, 1), 0.28, 0.7, "A1", cutoff=840.0)])
    # the hold: the pad swells on, voiced low enough (E4 up) to keep its level under the mix's 1.2 kHz low-pass
    P("pad_hold", 7, [Event(445 / FPS, g.t((8, 1)) - 445 / FPS, 0.76, N(("E4", "A4", "D5", "E5")))])

    P("braam", 8, [ev(g, (8, 1), 2.4, 0.8, "G1")])                               # the turn
    P("pad", 8, [ev(g, (8, 1), g.bar - 0.05, 0.38, CH["Gmaj7"])])
    P("frag", 8, [ev(g, (8, 1), g.beats(2), 0.5, "D5"), ev(g, (8, 3), g.beats(2), 0.5, "A5")])
    P("air", 8, [ev(g, (8, 1), g.bars(1.5) - 0.1, 0.4)])
    P("heart", 8, [ev(g, (8, 1), 0, 0.58, "G1"), ev(g, (8, 3), 0, 0.6, "G1"),
                   ev(g, (8, 4), 0, 0.62, "G1", dub=False), ev(g, (8, 4.5), 0, 0.66, "G1", dub=False)])
    stop = 612 / FPS
    P("riser", 9, [Event(stop, stop - 504 / FPS, 0.8)], anchor="end")
    P("cluster", 9, [Event(stop, stop - 504 / FPS, 0.6, N(m)) for m in ("D4", "A4", "E5")], anchor="end")

    # the build: a crescendo from well under the drop (the drop must sit 6 LU over this bar's first half). Measured
    # with each track muted, its kicks and toms carried most of that half (-2.4 and -1.2 dB without them)
    P("kick", 9, [ev(g, (9, 1), 0, 0.18), ev(g, (9, 2), 0, 0.22), ev(g, (9, 2.5), 0, 0.27)])
    P("roll", 9, fills.accel_roll(g, (9, 1), beats=2.0, start_rate=0.5, end_rate=0.125, vel=(0.08, 0.35)))
    P("tom", 9, fills.tom_fill(g, (9, 2), beats=1.0, step=0.25, notes=("E3", "D3", "A2", "E2"), vel=(0.14, 0.26)))
    P("reese", 9, pulses(g, 9, "A1", 1.0, 3.0, step=0.25, gate=0.6, vel=(0.18, 0.38), cutoff=(500.0, 1100.0)))
    P("pad", 9, [ev(g, (9, 1), g.beats(2) - 0.02, 0.3, CH["Asus4"])])
    # f612-647: the dead stop (both stems are cut to exact zeros after the render)

    # ---- bars 10-14: the reveal ----
    accent(A, 10, crash=1.0, kick=1.0, sub="D1")                                  # the drop
    drop_groove(A, 10, [("D", 4)], kick_one=False, skip_first_bass=True)
    chords(A, 10, [("D", 4)], vel=0.95)
    stabs(A, 10, [("D", 4)], vel=0.8)
    P("lead", 10, phrase(g, 10, MOTIF, vel=1.0))

    drop_groove(A, 11, [("A/C#", 4)])                                              # the star beat
    chords(A, 11, [("A/C#", 4)], vel=0.93)
    stabs(A, 11, [("A/C#", 4)], vel=0.74)
    P("lead", 11, phrase(g, 11, ANSWER, vel=0.92))

    for bar, ch in ((12, "Bm"), (13, "G")):                                        # the quick chat: sitting back
        P("hat", bar, hats(g, bar, "5353 5353 5353 5353", vel=1.0))
        P("bass", bar, [e for e in pulses(g, bar, ROOT[ch], 1.0, 5.0, step=0.5, gate=0.5, vel=0.7, accents=DROP_ACC)
                        if int(round(e.t * FPS)) not in SKIP_FRAMES])
        chords(A, bar, [(ch, 4)], vel=0.75, cutoff=2200.0)

    accent(A, 14, crash=0.7, kick=0.9)                                             # the whole workspace
    drop_groove(A, 14, [("A", 4)], kick_one=False, until=4.0)
    chords(A, 14, [("A", 4)], vel=0.82)
    stabs(A, 14, [("A", 4)], vel=0.66, until=4.0)
    P("lead", 14, phrase(g, 14, [(1.0, "A4", 0.5), (1.5, "C#5", 0.5), (2.0, "E5", 0.5), (2.5, "A5", 1.5)], vel=0.85))
    P("tom", 14, fills.tom_fill(g, (14, 4), beats=1.0, step=0.25, notes=("E3", "D3", "A2", "A2"), vel=(0.7, 1.0)))
    P("roll", 14, fills.snare_roll(g, (14, 4), beats=1.0, rates=(0.25,), vel=(0.45, 0.9)))

    # ---- bars 15-20: the montage, groove C ----
    plan = {15: [("D", 4)], 16: [("A/C#", 4)], 17: [("Bm", 4)], 18: [("G", 4)], 19: [("D", 2), ("A/C#", 2)],
            20: [("Bm", 2), ("G", 2)]}
    for bar in range(15, 21):
        lift = bar in (15, 18)
        accent(A, bar, crash=(1.0 if bar == 15 else 0.9) if lift else 0.0, kick=0.95 if lift else 0.8,
               snap=0.0 if lift else 0.8)
        groove_c(A, bar, plan[bar])
        chords(A, bar, plan[bar], vel=0.9, cutoff=2800.0 if bar < 18 else 4200.0)
        stabs(A, bar, plan[bar], vel=0.8 if bar < 18 else 0.88)
    for bar in (18, 19, 20):                                                       # the second lift: a plucked arp
        b = 1.0
        for ch, beats in plan[bar]:
            P("arp", bar, S.arp(N(ARP[ch]), g, (bar, b), beats=beats, step=0.25, mode="updown", gate=0.5, vel=0.75,
                                accents=[1.0, 0.6, 0.8, 0.6], seed=bar * 10 + int(b)))
            b += beats
    for bar in (10, 11, 14, 15, 16, 17, 18, 19, 20, 23, 24, 25):                  # a 16th shaker: noise on top
        stop_at = {14: 4.0, 23: 4.5, 25: 4.0}.get(bar, 5.0)
        P("shaker", bar, [e for e in S.hits("gogo gogo gogo gogo", g, at=(bar, 1)) if g.where(e.t)[1] < stop_at])
    P("roll", 20, fills.snare_roll(g, (20, 1), beats=4.0, rates=(0.5, 0.25), vel=(0.3, 0.95)))
    P("riser", 21, [ev(g, (21, 1), g.bar, 0.85)], anchor="end")

    # ---- bars 21-25: the climax ----
    accent(A, 21, crash=0.9, kick=1.0)                                             # a hit lands the wide shot
    P("bass", 21, [ev(g, (21, 1), 0.3, 0.9, "A1")])
    P("hit", 21, [ev(g, (21, 1), 0, 0.9, "A1")])
    P("pad_hold", 21, [ev(g, (21, 1), g.bars(2) - 0.05, 0.6, CH["Asus4"])])
    P("thump", 21, [ev(g, (21, 3), 0, 0.8, "A1")])                               # under "AgentGuard checks..."
    if not A.follows(22):                                                          # a cut that opens on bar 22
        P("pad_hold", 22, [ev(g, (22, 1), g.bar - 0.05, 0.6, CH["Asus4"])])

    P("snap", 22, S.scale_vel(S.hits("x" * 16, g, at=(22, 1)), (0.4, 0.9)))      # Run the tests: the release
    P("hat", 22, S.scale_vel(hats(g, 22, "x" * 16), (0.3, 0.8)))
    P("reese", 22, pulses(g, 22, "A1", 1.0, 5.0, vel=(0.4, 0.85), cutoff=(520.0, 1100.0)))
    P("riser", 23, [ev(g, (23, 1), g.bar, 0.8)], anchor="end")

    accent(A, 23, crash=0.9, kick=0.9)                                             # the run, at 1x
    cut23 = lambda evs: [e for e in evs if g.where(e.t)[1] < 4.5 - 1e-6]  # noqa: E731
    P("kick", 23, S.hits("....x...x...x...", g, at=(23, 1)))
    P("clap", 23, S.hits("....X.......X...", g, at=(23, 1), vel=0.85))
    P("snap", 23, S.hits("..x...x...x.....", g, at=(23, 1), vel=0.45))
    P("hat", 23, cut23(hats(g, 23, "8474 8474 8474 8474", vel=0.9)))
    P("sub8", 23, cut23(pulses(g, 23, "A1", 1.0, 5.0, gate=0.7, vel=0.75)))
    P("bass", 23, cut23(pulses(g, 23, "A1", 1.0, 5.0, gate=0.6, vel=0.7, accents=[1.0, 0.7])))
    chords(A, 23, [("A", 3.5)], vel=0.84)
    stabs(A, 23, [("A", 4)], vel=0.66, until=4.5)
    P("lead", 23, phrase(g, 23, [(1.0, "E5", 1.0), (2.0, "F#5", 0.5), (2.5, "G#5", 0.5), (3.0, "A5", 1.5)], vel=0.9))
    P("riser", 23, [Event(1647 / FPS, 0.9, 0.7)], anchor="end")

    accent(A, 24, crash=1.0, kick=1.0, sub="D1")                                   # VERIFIED
    P("kick", 24, S.hits("....X.x.X...X...", g, at=(24, 1)))
    P("snare", 24, S.hits("....x.......x...", g, at=(24, 1), vel=0.8))
    P("clap", 24, S.hits("....X.......X...", g, at=(24, 1)))
    P("hat", 24, hats(g, 24, "8474 8474 8474 8474"))
    P("hat_open", 24, S.hits("..o...o...o...o.", g, at=(24, 1), dur=0.15, vel=0.85))
    bassline(A, 24, [("D", 4)], DROP_ACC, 1.0, skip_first=True)
    chords(A, 24, [("D", 4)], vel=1.0, cutoff=4600.0)
    stabs(A, 24, [("D", 4)], vel=1.0)
    P("lead", 24, phrase(g, 24, MOTIF, vel=1.0))
    P("lead2", 24, phrase(g, 24, SIXTH, vel=0.85))
    P("lead_hi", 24, phrase(g, 24, [(b, core.note(m) + 12, ln) for b, m, ln in MOTIF], vel=0.8))
    P("arp", 24, S.arp(N(ARP["D"]), g, (24, 1), beats=4, step=0.25, mode="updown", gate=0.5, vel=0.8,
                       accents=[1.0, 0.6, 0.8, 0.6], seed=240))

    groove = [("D", 2), ("A/C#", 2)]                                               # the one celebration
    P("kick", 25, S.hits("X...X.x.X.......", g, at=(25, 1), vel=0.9))
    P("snare", 25, S.hits("....x...........", g, at=(25, 1), vel=0.7))
    P("clap", 25, S.hits("....X.......X...", g, at=(25, 1), vel=0.85))
    P("hat", 25, hats(g, 25, "8474 8474 8474 8474", vel=0.9))
    P("hat_open", 25, S.hits("..o...o...o.....", g, at=(25, 1), dur=0.15, vel=0.75))
    bassline(A, 25, groove, DROP_ACC, 0.9, until=4.0)
    chords(A, 25, groove, vel=0.94)
    stabs(A, 25, groove, vel=0.72, until=4.0)
    P("lead", 25, phrase(g, 25, ANSWER, vel=0.8))
    P("arp", 25, S.arp(N(ARP["D"]), g, (25, 1), beats=2, step=0.25, mode="updown", gate=0.5, vel=0.7, seed=250) +
      S.arp(N(ARP["A/C#"]), g, (25, 3), beats=1, step=0.25, mode="updown", gate=0.5, vel=0.65, seed=251))
    P("downlifter", 25, [ev(g, (25, 4), 0.6, 0.8)])

    # ---- bars 26-28: the breakdown, no drums ----
    P("sub", 26, [ev(g, (26, 1), 0.55, 0.8, "B1", glide_from=12.0, glide_s=0.025)])
    P("pad_soft", 26, [ev(g, (26, 1), g.bar - 0.05, 0.45, CH["Bm9"])])
    P("pad_soft", 27, [ev(g, (27, 1), g.bar - 0.05, 0.45, CH["Gmaj7"])])
    P("pad_soft", 28, [ev(g, (28, 1), g.beats(2) - 0.05, 0.45, CH["Asus4"]),
                       ev(g, (28, 3), g.beats(2) - 0.05, 0.47, CH["A"])])
    P("pluck", 26, phrase(g, 26, MOTIF, vel=0.45, shift=1.0))
    P("pluck", 27, phrase(g, 27, [(2.0, "B4", 0.5), (2.5, "F#5", 0.5), (3.0, "E5", 0.25), (3.25, "F#5", 1.25)],
                          vel=0.43))
    P("pluck", 28, phrase(g, 28, [(2.0, "C#5", 0.5), (2.5, "E5", 0.5), (3.0, "A5", 1.5)], vel=0.45))
    P("tom", 27, [ev(g, (27, 1), 0, 0.5, "D3"), ev(g, (27, 4), 0, 0.5, "B2")])
    P("rim", 27, [ev(g, (27, 1), 0, 0.55), ev(g, (27, 4), 0, 0.55)])
    P("hat", 28, S.scale_vel(S.hits("xxxx xxxx xxxx xx..", g, at=(28, 1)), (0.08, 0.42)))
    P("cswell", 29, [ev(g, (29, 1), 1.2, 0.6, CH["D"])], anchor="end")

    # ---- bars 29-32: the title and the button ----
    P("sub", 29, [ev(g, (29, 1), 0.55, 0.85, "D2", glide_from=12.0, glide_s=0.025)])
    P("kick", 29, [ev(g, (29, 1), 0, 0.7)])
    P("snap", 29, [ev(g, (29, 4), 0, 0.55)])
    P("hat", 29, hats(g, 29, "x.x.x.x.x.x.x.x.", vel=0.4))
    chords(A, 29, [("D", 4)], vel=0.45, cutoff=2400.0)
    P("pad_soft", 29, [ev(g, (29, 1), g.bars(2) - 0.35, 0.5, CH["D"])])
    P("lead", 29, phrase(g, 29, RESOLVED, vel=0.68))
    P("sub", 30, [ev(g, (30, 1), 0.45, 0.6, "G1", glide_from=12.0, glide_s=0.025)])
    P("kick", 30, [ev(g, (30, 1), 0, 0.62)])
    P("snap", 30, [ev(g, (30, 4), 0, 0.5)])
    P("hat", 30, hats(g, 30, "x.x.x.x.x.x.x...", vel=0.38))
    chords(A, 30, [("Gmaj9", 3.5)], vel=0.42, cutoff=2200.0)

    accent(A, 31, crash=1.0, kick=1.0, sub="D1")                                   # the final hit
    end = 2250 / FPS
    P("final", 31, [Event(g.t((31, 1)), end - g.t((31, 1)), 0.9, N(CH["Dadd9"]))])
    P("pad_soft", 31, [Event(g.t((31, 1)), end - g.t((31, 1)), 0.55, N(CH["Dadd9"]))])
    P("stabs", 31, [ev(g, (31, 1), 0, 0.8, STAB["Dadd9"])])

    # The tension act as a whole (everything before the drop but the hold's pad, which keeps hold 1 within 5-9 LU of
    # the montage): bars 1-9 must sit 6 LU under each master, the x30's too, where no montage lifts the integrated level
    if A.has(10):
        drop_t = A.pos[10] * g.bar
        k = core.amp(TENSION_TRIM_DB)
        for name, evs in A.ev.items():
            if name != "pad_hold":
                A.ev[name] = [e.but(vel=e.vel * k) if e.t < drop_t - 1e-6 else e for e in evs]


def session(A, seed=SEED):
    """The tracks and buses: drums + bass make the drive, music + fx make the bed."""
    g = A.g
    s = S.Session(g, n=A.n, seed=seed)
    kicks = sorted(e.t for e in A.ev.get("kick", []) + A.ev.get("kick_hit", []))
    dly = lambda mix, fb=0.3: (lambda x: fx.delay(x, g.beats(0.75), feedback=fb, mix=mix, pingpong=True, sr=SR))  # noqa
    table = [  # name, bus, gain dB, extra
        ("kick", "drums", -4.5, {}), ("kick_hit", "drums", -2.5, {}), ("snare", "drums", -6, {}),
        ("clap", "drums", -5, {}), ("snap", "drums", -8, {}), ("roll", "drums", -9, {}),
        ("hat", "drums", -11, dict(pan=0.12)), ("hat_open", "drums", -14, dict(pan=-0.15)), ("tom", "drums", -6, {}),
        ("shaker", "drums", -17, dict(pan=0.3)),
        ("rim", "drums", -12, {}), ("tick", "drums", -15, dict(pan=0.2)), ("crash", "drums", -10, {}),
        ("heart", "bass", -3, {}), ("reese", "bass", -8, {}),
        ("bass", "bass", -10, dict(duck=dict(by=kicks, depth_db=5, attack_ms=1, hold_ms=30, release_ms=90))),
        ("sub", "bass", -7, {}),
        ("sub8", "bass", -9, dict(duck=dict(by=kicks, depth_db=8, attack_ms=1, hold_ms=20, release_ms=120))),
        ("pad", "music", -9, {}), ("pad_hold", "music", 0, {}), ("pad_soft", "music", -10, {}),
        ("frag", "music", -10, {}), ("air", "music", -24, {}),
        ("pluck", "music", -6, dict(fx=dly(0.25))),
        ("chords", "music", -3, dict(duck=dict(by=kicks, depth_db=5, attack_ms=2, hold_ms=30, release_ms=140))),
        ("stabs", "music", -7, dict(duck=dict(by=kicks, depth_db=3, attack_ms=2, hold_ms=20, release_ms=120))),
        ("lead", "music", -6, dict(mono=True, glide_s=0.05, fx=dly(0.16, 0.25))),
        ("lead2", "music", -12, dict(mono=True, glide_s=0.05)),
        ("lead_hi", "music", -16, dict(mono=True, glide_s=0.05)),
        ("arp", "music", -9, dict(fx=dly(0.22),
                                  duck=dict(by=kicks, depth_db=3, attack_ms=2, hold_ms=20, release_ms=120))),
        ("final", "music", -6, {}),
        ("qhit", "fx", -2, {}), ("hit", "fx", -4, {}), ("braam", "fx", -14, {}), ("riser", "fx", -19, {}),
        ("cluster", "fx", -23, {}), ("swell", "fx", -12, {}), ("cswell", "fx", -14, {}), ("downlifter", "fx", -14, {}),
        ("thump", "fx", -10, {}),
    ]
    inst = dict(V, sub8=S.get("sub", harmonics=0.3, decay=0.1, sustain=0.75, release=0.04))
    for name, bus, gain, extra in table:
        evs = A.ev.get(name)
        if evs:
            s.track(name, inst[name], evs, bus=bus, gain_db=gain, **extra)
    s.bus("drums", gain_db=-6, fx=[lambda x: fx.compressor(x, -14, 2.2, 15, 140, sr=SR),
                                    lambda x: fx.saturate(x, 1.15)])
    s.bus("bass", gain_db=-6, fx=[lambda x: fx.saturate(x, 1.2), lambda x: fx.mono_below(x, 120.0, SR)])
    s.bus("music", gain_db=0, fx=[lambda x: fx.reverb(x, 0.72, 0.5, 0.15, 1.0, predelay_ms=10, hp_hz=250, lp_hz=8500,
                                                       sr=SR), lambda x: fx.mono_below(x, 150.0, SR)])
    s.bus("fx", gain_db=-2)
    return s


def silence(x, i0, i1, out_ms=8.0, in_ms=1.0):
    """Exact zeros over samples [i0, i1): a raised-cosine fade reaching zero on i0, and back in after i1."""
    n = x.shape[-1]
    k = int(out_ms * SR / 1000)
    a = max(0, i0 - k)
    if i0 > a:
        u = (np.arange(a, i0) - a + 1) / (i0 - a)
        x[:, a:i0] *= 0.5 + 0.5 * np.cos(np.pi * u)
    x[:, max(0, i0):min(n, i1)] = 0.0
    k = int(in_ms * SR / 1000)
    if k and i1 < n:
        b = min(n, i1 + k)
        x[:, i1:b] *= 0.5 - 0.5 * np.cos(np.pi * np.arange(b - i1) / k)
    return x


def render(bars, out_dir, prefix, seed=SEED):
    t0 = time.perf_counter()
    g = S.Grid.from_beatmap()
    A = Arrangement(g, bars)
    compose(A)
    s = session(A, seed)
    bed = s.render_bus("music") + s.render_bus("fx")
    drive = s.render_bus("drums") + s.render_bus("bass")
    s._cache.clear()
    fs = lambda f: int(round(f * SR / FPS))  # noqa: E731
    spans = {"dead_stop": [], "drive_holds": []}
    a, b = A.frame(612), A.frame(648)
    if a is not None and b is not None and b == a + 36:                         # the dead stop: both stems
        silence(bed, fs(a), fs(b), 6.0, 1.0)
        silence(drive, fs(a), fs(b), 6.0, 1.0)
        spans["dead_stop"].append([a, b])
    for h0, h1 in ((445, 504), (1453, 1512)):                                     # the holds: the drive alone
        a, b = A.frame(h0), A.frame(h1)
        if a is not None and b is not None and b == a + (h1 - h0):
            silence(drive, fs(a), fs(b), 10.0, 2.0)
            spans["drive_holds"].append([a, b])
    zf = A.frame(2250)
    bed_peak_before, drive_peak_before = round(core.peak_db(bed), 2), round(core.peak_db(drive), 2)
    bed = fx.brickwall(bed, ceiling_db=BED_PEAK_DB, true_peak=False, lookahead_ms=5.0, sr=SR)
    drive = fx.brickwall(drive, ceiling_db=DRIVE_PEAK_DB, true_peak=False, lookahead_ms=5.0, sr=SR)
    pk = max(core.peak_db(bed), core.peak_db(drive)) + STEM_TRIM_DB
    trim = STEM_TRIM_DB + min(0.0, -0.5 - pk)              # both stems together, so their balance holds
    k = core.amp(trim)
    rep = {"bars": list(bars), "samples": A.n, "seed": seed, "events": sum(map(len, A.ev.values())),
           "spans_out_frames": spans, "zeros_from_frame": zf, "trim_db": round(trim, 2),
           "peaks_before_the_stem_limiters_dbfs": {"bed": bed_peak_before, "drive": drive_peak_before},
           "stem_limiter_ceilings_dbfs": {"bed": BED_PEAK_DB, "drive": DRIVE_PEAK_DB}}
    mix = (bed + drive) * k
    rep["mix_lufs"] = None if stems.loudness(mix) is None else round(stems.loudness(mix), 2)
    rep["mix_peak_dbfs"] = round(core.peak_db(mix), 2)
    del mix
    zs = None if zf is None else fs(zf)
    rep["bed"] = stems.write_stem(os.path.join(out_dir, f"bed{prefix}.wav"), bed * k, A.n, zeros_from=zs)
    rep["drive"] = stems.write_stem(os.path.join(out_dir, f"drive{prefix}.wav"), drive * k, A.n, zeros_from=zs)
    rep["seconds_to_render"] = round(time.perf_counter() - t0, 1)
    return rep


# ---------------------------------------------------------------------------------------------------------------------
# The preview mixes: the blueprint's automation and the stand-ins, through mix_master.py

def standins(out_dir):
    d = os.path.join(out_dir, "fx")
    os.makedirs(d, exist_ok=True)
    y, _ = V["swell"](vel=1.0, dur=0.3, rng=core.rng(SEED, "suck"))
    stems.write_stem(os.path.join(d, "suck.wav"), y, fade_in_ms=0.5, fade_out_ms=1.5)
    y = V["tick"](vel=0.7, rng=core.rng(SEED, "gap-tick"))
    stems.write_stem(os.path.join(d, "tick.wav"), y, fade_in_ms=0.2, fade_out_ms=2.0)
    cues = []
    for f in (72, 648):
        # -16 dB: it rises in the 0.6 s before the first question's hit, which must clear them by 10 dB; at -13 dB,
        # over the tension's trimmed level (TENSION_TRIM_DB), it left 9.6 dB
        cues.append({"file": os.path.join(d, "suck.wav"), "t": round(f / FPS, 4), "align": "end", "gain_db": -16,
                     "pan": 0, "duck_db": 0, "frame": f, "peak_frame": f, "role": "suck", "take": "suck",
                     "event": f"STAND-IN for the timeline's suck-back into f{f}: it sits inside a breath gap, "
                              "where the automation would swallow a stem's"})
    for i, f in enumerate((450, 468, 486, 1458, 1476, 1494)):
        take = "rim_a" if i % 2 == 0 else "rim_b"
        cues.append({"file": os.path.join(KIT, f"{take}.wav"), "t": round((f + 1) / FPS, 4), "align": "peak",
                     "gain_db": -15, "pan": 0, "duck_db": 0, "frame": f, "peak_frame": f + 1, "role": "rim",
                     "take": take, "event": "STAND-IN for the timeline's rim tick, keeping the beat in the hold"})
    cues.append({"file": os.path.join(d, "tick.wav"), "t": round(1651 / FPS, 4), "align": "peak", "gain_db": -18,
                 "pan": 0, "duck_db": 0, "frame": 1650, "peak_frame": 1651, "role": "tick", "take": "tick",
                 "event": "STAND-IN for the soft noise tick inside the breath before Verified"})
    for c in AUTOMATION:
        e = dict(c)
        e["t"], e["t_end"] = round(c["frame"] / FPS, 4), round(c["to_frame"] / FPS, 4)
        if "release_frame" in c:
            e["t_release"] = round(c["release_frame"] / FPS, 4)
        cues.append(e)
    path = os.path.join(out_dir, "preview_cues.json")
    with open(path, "w") as f:
        json.dump(cues, f, indent=1)
    cut = {"schema": "pebble-film-cut/1", "name": "x30", "fps": FPS, "ranges": X30_RANGES,
           "frames": sum(b - a for a, b in X30_RANGES), "music": {"form": "x30", "score_bars": X30_BARS},
           "about": "candidate A's preview copy of the blueprint's x30 (TRAILER_RESEARCH §6.7), not docs/film-cuts"}
    with open(os.path.join(out_dir, "x30_cut.json"), "w") as f:
        json.dump(cut, f, indent=1)
    subprocess.run([PY, "-I", os.path.join(AUDIO, "cut_cues.py"), os.path.join(out_dir, "x30_cut.json"), "--cues", path,
                    "--out", os.path.join(out_dir, "preview_cues.x30.json")], check=True)
    return path


def mix(out_dir):
    standins(out_dir)
    jobs = [("web", "", "preview_cues.json", ["--lufs", "-16", "--tp", "-1.7", "--aac", "160k:-1.5"]),
            ("social", "", "preview_cues.json", ["--lufs", "-14", "--tp", "-1.5", "--aac", "192k:-1.0"]),
            ("x30", "_x30", "preview_cues.x30.json", ["--lufs", "-14", "--tp", "-1.5", "--aac", "192k:-1.0"])]
    reps = {}
    for name, sfx_, cues, args in jobs:
        p = subprocess.run([PY, "-I", os.path.join(AUDIO, "mix_master.py"), os.path.join(out_dir, f"bed{sfx_}.wav"),
                            os.path.join(out_dir, cues), os.path.join(out_dir, f"preview_{name}.wav"), "--drive",
                            os.path.join(out_dir, f"drive{sfx_}.wav"), *args, "--ffmpeg", FFMPEG],
                           capture_output=True, text=True, check=True)
        reps[name] = json.loads(p.stdout.strip().splitlines()[-1])
    with open(os.path.join(out_dir, "mix.json"), "w") as f:
        json.dump(reps, f, indent=1)
    return reps


# ---------------------------------------------------------------------------------------------------------------------
# The blueprint's dynamics report (report.music, LOUDNESS AND DYNAMICS GATES)

KW = [([1.53512485958697, -2.69169618940638, 1.19839281085285], [1.0, -1.69065929318241, 0.73248077421585]),
      ([1.0, -2.0, 1.0], [1.0, -1.99004745483398, 0.99007225036621])]


def kweight(x):
    for b, a in KW:
        x = lfilter(b, a, x, axis=1)
    return x


class Meter:
    """K-weighted loudness of spans of one master (ungated, BS.1770 power, LUFS) and gated integrated loudness."""

    def __init__(self, path):
        y, sr = sf.read(path, always_2d=True, dtype="float64")
        assert sr == SR, path
        self.y = y.T
        self.z = kweight(self.y)
        self.meter = pyln.Meter(SR)
        self.I = float(self.meter.integrated_loudness(y))
        self.n = self.y.shape[1]

    def lu(self, t0, t1):
        a, b = max(0, int(round(t0 * SR))), min(self.n, int(round(t1 * SR)))
        if b <= a:
            return None
        p = float(np.sum(np.mean(self.z[:, a:b] ** 2, axis=1)))
        return round(-0.691 + 10 * math.log10(p + 1e-20), 2)

    def gated(self, spans):
        x = np.concatenate([self.y[:, int(round(a * SR)):int(round(b * SR))] for a, b in spans], axis=1)
        v = self.meter.integrated_loudness(x.T)
        return round(float(v), 2) if np.isfinite(v) else None

    def bars(self, out_bars, bar_s=2.4):
        return self.gated([((b - 1) * bar_s, b * bar_s) for b in out_bars])

    def peak_db(self, t0, t1):
        a, b = int(round(t0 * SR)), int(round(t1 * SR))
        pk = float(np.abs(self.y[:, a:b]).max()) if b > a else 0.0
        return None if pk == 0 else round(20 * math.log10(pk), 1)

    def short_term(self, hop=0.1, win=3.0):
        out = []
        t = 0.0
        while t + win <= self.n / SR + 1e-9:
            out.append((round(t, 2), self.lu(t, t + win)))
            t += hop
        return out

    def lra(self):
        """EBU Tech 3342: short-term (3 s) values every 0.1 s, gated at -70 LUFS and 20 LU under their power mean;
        the range from the 10th to the 95th percentile."""
        st = np.array([v for _, v in self.short_term() if v is not None and v > -70])
        if not len(st):
            return None
        rel = 10 * math.log10(np.mean(10 ** (st / 10))) - 20
        st = st[st > rel]
        return round(float(np.percentile(st, 95) - np.percentile(st, 10)), 2)


def dyn_report(master, bars, name):
    """The blueprint's dynamics report on one master. `bars` lists the film bars it plays, in order."""
    M = Meter(master)
    pos = {b: i for i, b in enumerate(bars)}
    fs = lambda f: None if (f // 72 + 1) not in pos else (pos[f // 72 + 1] * 72 + f % 72) / FPS  # noqa: E731
    out = {"master": os.path.relpath(master, REPO), "integrated_lufs": round(M.I, 2), "lra_lu": M.lra(),
           "per_bar": [{"out_bar": i + 1, "film_bar": b, "lufs": M.bars([i + 1]),
                        "ungated": M.lu(i * 2.4, (i + 1) * 2.4)} for i, b in enumerate(bars)],
           "checks": []}

    def check(label, value, ok, want, **extra):
        out["checks"].append({"check": label, "value": value, "want": want, "ok": bool(ok), **extra})

    t19 = [pos[b] + 1 for b in range(1, 10) if b in pos]
    v = M.bars(t19)
    if v is not None:
        check("bars 1-9 under the integrated level (LU)", round(M.I - v, 2), M.I - v >= 6.0, ">= 6", bars_lufs=v)
    for f, q in ((72, "Q1"), (216, "Q2"), (360, "Q3")):
        t = fs(f)
        if t is None:
            continue
        hit, before = M.lu(t, t + 0.3), M.lu(t - 0.6, t)
        check(f"{q} hit f{f}: its 300 ms over the 600 ms before (dB)", round(hit - before, 1), hit - before >= 10.0,
              ">= 10", hit=hit, before=before)
    a, d = fs(612), fs(648)
    if a is not None and d is not None:
        stop, drop = M.lu(a, fs(639)), M.lu(d, d + 0.3)
        check("the dead stop f612-638 under the drop's first 300 ms (dB)", round(drop - stop, 1), drop - stop >= 20.0,
              ">= 20", stop=stop, drop_300ms=drop, stop_peak_dbfs=M.peak_db(a, fs(639)))
    b9 = fs(576)
    if d is not None and b9 is not None:
        drop3, first = M.lu(d, d + 3.0), M.lu(b9, b9 + 1.2)
        check("the drop's 3 s over bar 9's first half (LU)", round(drop3 - first, 2), drop3 - first >= 6.0, ">= 6",
              drop_3s=drop3, bar9_first_half=first)
    montage = [pos[b] + 1 for b in range(15, 21) if b in pos]
    mont = M.bars(montage) if montage else None
    for f0, label in ((444, "hold 1 (bar 7)"), (1452, "hold 2 (bar 21)")):
        t = fs(f0)
        if t is None:
            continue
        h = M.lu(t + 0.0, t + 2.0)
        check(f"{label} 2 s short-term under the integrated level (LU)", round(M.I - h, 2), 5.0 <= M.I - h <= 9.0,
              "5-9", hold=h, window_s=[round(t, 2), round(t + 2, 2)])
        if mont is not None:
            check(f"{label} under the montage, bars 15-20 (LU)", round(mont - h, 2), 5.0 <= mont - h <= 9.0, "5-9",
                  montage=mont)
    v = fs(1656)
    if v is not None:
        st = M.short_term()
        best_t, best = max(((t, l) for t, l in st if l is not None), key=lambda r: r[1])
        ver = M.lu(v, v + 3.0)
        check("Verified's 3 s is the loudest 3 s window", f"loudest window at {best_t:.1f} s ({best} LUFS); "
              f"Verified's from {v:.1f} s: {ver}", v - 3.0 + 0.3 <= best_t <= v + 0.05 or ver >= best - 0.05,
              "the loudest window holds f1656's first 300 ms")
        if mont is not None:
            check("Verified's 3 s over the montage (LU)", round(ver - mont, 2), ver - mont >= 1.5, ">= 1.5")
        others = [(t, l) for t, l in st if l is not None and (t + 3.0 <= v - 0.5 or t >= v + 3.0)]
        if others:
            ot, ol = max(others, key=lambda r: r[1])
            check("Verified's 3 s over the loudest window elsewhere (LU)", round(ver - ol, 2), ver >= ol, ">= 0",
                  elsewhere_at_s=ot)
    clim = [pos[b] + 1 for b in range(21, 26) if b in pos]
    pay = [pos[b] + 1 for b in range(23, 26) if b in pos]
    brk = [pos[b] + 1 for b in range(26, 29) if b in pos]
    if brk and clim:
        vb = M.bars(brk)
        check("the breakdown (26-28) under the climax 21-25 (LU)", round(M.bars(clim) - vb, 2), M.bars(clim) - vb >= 6,
              ">= 6", breakdown=vb, climax=M.bars(clim))
        check("the breakdown (26-28) under bars 23-25 (LU)", round(M.bars(pay) - vb, 2), M.bars(pay) - vb >= 6, ">= 6")
    k = int(round((M.n / SR - 1.8) * SR))
    pk = float(np.abs(M.y[:, k:]).max())
    check("the last 54 frames are digital silence", "exact zeros" if pk == 0 else f"{20 * math.log10(pk):.1f} dBFS",
          pk <= 10 ** (-70 / 20), "<= -70 dBFS")
    out["lra_target"] = "8-10 LU (a target, not a gate)"
    out["pass"] = all(c["ok"] for c in out["checks"])
    out["name"] = name
    return out


def stem_balance(out_dir, prefix=""):
    """Per bar: the bed's and the drive's gated loudness and the drive's level over the bed (LU)."""
    meter = pyln.Meter(SR)
    b, _ = sf.read(os.path.join(out_dir, f"bed{prefix}.wav"), always_2d=True)
    d, _ = sf.read(os.path.join(out_dir, f"drive{prefix}.wav"), always_2d=True)
    k = int(round(2.4 * SR))
    rows = []
    for i in range(b.shape[0] // k):
        lb, ld = meter.integrated_loudness(b[i * k:(i + 1) * k]), meter.integrated_loudness(d[i * k:(i + 1) * k])
        f = lambda v: round(float(v), 2) if np.isfinite(v) else None  # noqa: E731
        rows.append({"out_bar": i + 1, "bed": f(lb), "drive": f(ld),
                     "drive_over_bed": f(ld - lb) if np.isfinite(lb) and np.isfinite(ld) else None})
    return rows


def report(out_dir):
    reps = {}
    for name, bars in (("web", FILM_BARS), ("social", FILM_BARS), ("x30", X30_BARS)):
        p = os.path.join(out_dir, f"preview_{name}.wav")
        if os.path.exists(p):
            reps[name] = dyn_report(p, bars, name)
    if os.path.exists(os.path.join(out_dir, "bed.wav")):
        reps["stem_balance_film"] = stem_balance(out_dir)
    with open(os.path.join(out_dir, "report.json"), "w") as f:
        json.dump(reps, f, indent=1)
    return reps


def print_report(reps):
    for name, r in reps.items():
        if name.startswith("stem_balance"):
            print("   drive over bed per bar (LU):", " ".join(f"{x['out_bar']}:{x['drive_over_bed']}" for x in r))
            continue
        print(f"== {name}: {r['integrated_lufs']} LUFS, LRA {r['lra_lu']} LU, pass {r['pass']}")
        row = " ".join(f"{b['film_bar']}:{b['lufs'] if b['lufs'] is not None else '-'}" for b in r["per_bar"])
        print("   bars (LUFS):", row)
        for c in r["checks"]:
            print(f"   [{'ok' if c['ok'] else 'MISS'}] {c['check']}: {c['value']} (want {c['want']})")


# ---------------------------------------------------------------------------------------------------------------------
# The classifier: mix_checks.py on each master, the after-silence passes the trailer adds, the drive alone

AFTER_SILENCE = {"web": [(0, "bar 1"), (648, "the drop"), (1512, "the climax release"), (1656, "Verified")],
                 "x30": [(0, "bar 1"), (360, "the drop"), (432, "the climax release"), (576, "Verified")]}
WINDOWS = {"web": {"hold 1": (14.8, 16.8), "hold 2": (48.4, 50.4), "end card": (67.2, 72.0)},
           "x30": {"hold 1": (5.2, 7.2), "end card": (21.6, 24.0)}}


def after_silence(master, points, tmp):
    y, sr = sf.read(master, always_2d=True, dtype="float32")
    rows, fails, warns = [], [], []
    n3 = int(round(3.0 * sr))
    for f, label in points:
        i = int(round(f / FPS * sr))
        for xs in tagcheck.OPENING_XS:
            k = int(round(xs * sr))
            clip = np.zeros((n3, y.shape[1]), np.float32)
            seg = y[i:i + k]
            clip[n3 - len(seg):] = seg
            p = os.path.join(tmp, "clip.wav")
            sf.write(p, clip, sr, subtype="FLOAT")
            tg = tagcheck.tag(p, SOUND_TAGS)
            top = [t["label"] for t in tg["timeline"][0]["top"]] if tg["timeline"] else []
            watch = {w["label"]: w["max"] for w in tg["watch"]}
            rows.append({"at": label, "frame": f, "first_s": xs, "top3": top,
                         "watch": {k_: v for k_, v in sorted(watch.items(), key=lambda r: -r[1])[:6]}})
            for lab, v in watch.items():
                kind = tagcheck.label_kind(lab)
                if kind in ("phone", "voice", "alarm", "foghorn") and v >= tagcheck.LIMIT:
                    fails.append(f"{label} (first {xs} s after silence): {kind} '{lab}' {v}")
                elif kind == "phone" and v >= tagcheck.PHONE_TARGET:
                    warns.append(f"{label} (first {xs} s after silence): phone '{lab}' {v}")
                if kind in ("voice", "alarm") and lab in top:
                    fails.append(f"{label} (first {xs} s after silence): {kind} '{lab}' in the top 3")
    return {"rows": rows, "fails": fails, "warnings": warns, "pass": not fails}


def windows(check_dir, name, spans):
    """The phone, voice-like, alarm and foghorn readings in mix_checks.py's windows (both grids) that overlap spans."""
    out = {}
    for label, (a, b) in spans.items():
        rows = []
        for fname, off in ((f"{name}.tags.json", 0.0), (f"{name}.tags-shift.json", 1.5)):
            p = os.path.join(check_dir, fname)
            if not os.path.exists(p):
                continue
            tg = json.load(open(p))
            for w in tg["timeline"]:
                s0 = w["t"] - off
                if s0 + 3.0 <= a or s0 >= b:
                    continue
                rd = {}
                for lab, pts in tg.get("watch_windows", {}).items():
                    kind = tagcheck.label_kind(lab)
                    if kind in ("phone", "voice", "alarm", "foghorn"):
                        for t_, p_ in pts:
                            if abs(t_ - w["t"]) < 1e-6:
                                rd[lab] = p_
                rows.append({"window_s": [round(s0, 1), round(s0 + 3, 1)], "top3": [t["label"] for t in w["top"]],
                             "watch": rd})
        out[label] = {"span_s": [a, b], "windows": rows,
                      "max": max((v for r in rows for v in r["watch"].values()), default=0.0)}
    return out


def checks(out_dir):
    cdir = os.path.join(out_dir, "checks")
    os.makedirs(cdir, exist_ok=True)
    res = {}
    jobs = [("web", "web", "", "preview_cues.json", []),
            ("social", "social", "", "preview_cues.json", ["--no-png"]),
            ("x30", "x30", "_x30", "preview_cues.x30.json",
             ["--target", "social", "--cut", os.path.join(out_dir, "x30_cut.json")])]
    for name, label, sfx_, cues, extra in jobs:
        p = subprocess.run([PY, "-I", os.path.join(AUDIO, "mix_checks.py"),
                            os.path.join(out_dir, f"preview_{name}.wav"),
                            cdir, "--name", label, "--bed", os.path.join(out_dir, f"bed{sfx_}.wav"), "--cues",
                            os.path.join(out_dir, cues), "--film-cues", os.path.join(out_dir, "preview_cues.json"),
                            "--sound-tags", SOUND_TAGS, "--ffmpeg", FFMPEG, *extra], capture_output=True, text=True)
        lines = p.stdout.strip().splitlines()
        res[name] = {"exit": p.returncode, "summary": json.loads(lines[-1]) if lines else None,
                     "stderr": p.stderr[-2000:]}
    with tempfile.TemporaryDirectory(dir=cdir) as tmp:
        for name in ("web", "social", "x30"):
            pts = AFTER_SILENCE["x30" if name == "x30" else "web"]
            res[name]["after_silence"] = after_silence(os.path.join(out_dir, f"preview_{name}.wav"), pts, tmp)
            res[name]["windows"] = windows(cdir, name, WINDOWS["x30" if name == "x30" else "web"])
        for sfx_ in ("", "_x30"):                                                   # the drive alone, at -16 LUFS
            x = stems.read_stem(os.path.join(out_dir, f"drive{sfx_}.wav"))
            y, _ = stems.master(x, lufs=-16.0, ceiling_db=-1.7)
            p = os.path.join(tmp, f"drive{sfx_}.wav")
            sf.write(p, y.T.astype(np.float32), SR, subtype="FLOAT")
            rep = tagcheck.check(p, SOUND_TAGS, tmp)
            res[f"drive{sfx_}"] = {k: rep[k] for k in ("watch_max", "phone_max", "fails", "warnings", "notes", "pass")}
    with open(os.path.join(out_dir, "checks.json"), "w") as f:
        json.dump(res, f, indent=1)
    return res


def print_checks(res):
    for name, r in res.items():
        if name.startswith("drive"):
            wm = sorted(r["watch_max"].items(), key=lambda kv: -kv[1])[:6]
            print(f"== {name} alone (-16 LUFS, tagcheck's four passes): pass {r['pass']}, phone {r['phone_max']}; "
                  f"top watch {wm}; fails {r['fails']}")
            continue
        s = r["summary"] or {}
        print(f"== {name}: mix_checks exit {r['exit']}, {s.get('lufs')} LUFS, LRA {s.get('lra')}, TP {s.get('tp')}, "
              f"AAC {s.get('aac_tp_160k_192k')}, mono loss {s.get('mono_loss_db')}, share>150 {s.get('share_150')}, "
              f"phone {s.get('phone_max')}")
        for x in s.get("fails", []):
            print("   FAIL", x)
        for x in s.get("warnings", []):
            if not x.startswith("dynamics:"):
                print("   warn", x)
        a = r["after_silence"]
        print(f"   after silence: pass {a['pass']}", a["fails"] or "", a["warnings"] or "")
        for label, w in r["windows"].items():
            print(f"   {label} {w['span_s']}: max phone/voice/alarm/foghorn {w['max']}")
        if r["exit"] not in (0, 1):
            print(r["stderr"])


def pictures(out_dir):
    """Pictures to look at (then delete): the web preview's waveform, and spectrograms of the trailer's own key
    moments (the turn, the dead stop and the drop 16.8-25.2 s; the climax 47.4-58.8 s; the title and the button
    66-76.8 s)."""
    d = os.path.join(out_dir, "checks")
    os.makedirs(d, exist_ok=True)
    src = os.path.join(out_dir, "preview_web.wav")
    out = [os.path.join(d, "web.wave.png")]
    subprocess.run([FFMPEG, "-hide_banner", "-loglevel", "error", "-y", "-i", src, "-filter_complex",
                    "aformat=channel_layouts=mono,showwavespic=s=1800x360:colors=0x2a6f4a:scale=lin", "-frames:v", "1",
                    out[0]], check=True)
    for name, ss, dur in (("drop", 16.8, 8.4), ("climax", 47.4, 11.4), ("title", 66.0, 10.8)):
        p = os.path.join(d, f"web.zoom-{name}.png")
        subprocess.run([FFMPEG, "-hide_banner", "-loglevel", "error", "-y", "-ss", str(ss), "-t", str(dur), "-i", src,
                        "-lavfi", "showspectrumpic=s=1400x500:legend=1:fscale=log:mode=combined:drange=100",
                        "-frames:v", "1", p], check=True)
        out.append(p)
    return out


def preview_m4a(out_dir, dest):
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    subprocess.run([FFMPEG, "-hide_banner", "-loglevel", "error", "-y", "-i", os.path.join(out_dir, "preview_web.wav"),
                    "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2", "-movflags", "+faststart", dest],
                   check=True)
    return dest


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("step", choices=["render", "mix", "report", "checks", "pictures", "preview", "all"])
    ap.add_argument("--out", default=OUT)
    ap.add_argument("--x30-only", action="store_true", help="render: only the x30 stems")
    ap.add_argument("--film-only", action="store_true", help="render: only the film's stems")
    ap.add_argument("--bars", help="render: only these film bars, in this order (e.g. 8,9,10), into bed_part.wav")
    ap.add_argument("--checks", action="store_true", help="all: run the classifier checks too")
    ap.add_argument("--m4a", help="preview (or all): the AAC 192k file to write from preview_web.wav")
    a = ap.parse_args(argv)
    os.makedirs(a.out, exist_ok=True)
    if a.step in ("render", "all"):
        reps = {}
        if a.bars:
            reps["part"] = render([int(b) for b in a.bars.split(",")], a.out, "_part")
        else:
            if not a.x30_only:
                reps["film"] = render(FILM_BARS, a.out, "")
            if not a.film_only:
                reps["x30"] = render(X30_BARS, a.out, "_x30")
        with open(os.path.join(a.out, "render.json"), "w") as f:
            json.dump(reps, f, indent=1)
        for k, r in reps.items():
            print(f"{k}: {r['events']} events, {r['seconds_to_render']} s, trim {r['trim_db']} dB; mix "
                  f"{r['mix_lufs']} LUFS, peak {r['mix_peak_dbfs']} dBFS; bed {r['bed']['lufs']} LUFS peak "
                  f"{r['bed']['peak_dbfs']}; drive {r['drive']['lufs']} LUFS peak {r['drive']['peak_dbfs']}; "
                  f"spans {r['spans_out_frames']}")
    if a.step in ("mix", "all") and not a.bars:
        for k, r in mix(a.out).items():
            print(f"{k}: {r['integrated_lufs']} LUFS, {r['true_peak_dbtp_4x']} dBTP, ceiling {r['ceiling_dbtp']}, "
                  f"{r['samples']} samples, AAC {r.get('aac', {}).get('true_peak_dbtp')}")
    if a.step in ("report", "all") and not a.bars:
        print_report(report(a.out))
    if a.step == "checks" or (a.step == "all" and a.checks):
        print_checks(checks(a.out))
    if a.step in ("pictures", "all") and not a.bars:
        print("pictures:", *pictures(a.out))
    if a.step == "preview" or (a.step == "all" and a.m4a and not a.bars):
        print("preview:", preview_m4a(a.out, a.m4a))


if __name__ == "__main__":
    main()
