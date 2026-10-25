"""Pebble's trailer score, candidate B: a bright electro-pop launch.

The score for the launch film recut as a trailer (76.8 s, 32 bars at 100 BPM, 30 fps), written to the trailer
blueprint's music section and its frames (the research lane's TRAILER_RESEARCH §6-§7, report.music) and to the lead's
decisions (OVERRIDES §34-§41), on the synthesis engine in tools/audio/synth (its README.md): no samples, no downloads,
no vocals.

The angle: optimistic and catchy, a modern AI product launch reel. Under the tension, a filtered pulse (gated saw chords
behind a low pass) and a sub heartbeat; at the drop, sidechained supersaw chords, a syncopated pluck bass, claps and
offbeat hats, and a supersaw-pluck hook that carries the motif; a second lift with a plucked counter-melody in the
montage; the hook harmonised and pushed a 16th early on Verified; a big, hopeful D(add9) to finish.

Form. Bar n starts on film frame 72(n-1); beat b of a bar falls 18(b-1) frames later; a 16th is 4.5 frames.
  1      the look       a soft triangle pad (B4 F#5 C#6: an open fifth and ninth; the motif's D5 is its third), a
                        muffled lub-dub heartbeat on 1 and 3 (F#1), the motif D5 A5 G#5 A5 on a soft pluck over beats
                        2-4; the breath f63-71 (the mix's gap)
  2 4 6  the questions  a trailer hit on each downbeat (f72 B1, f216 G1, f360 A1): a sub falling an octave onto its
                        root in 25 ms and gone in 0.42 s, an unpitched thwack and crack, a room of 0.10 above 650 Hz;
                        then near silence: noise ticks in quarters, 8ths, then 16ths, and the heartbeat. Q3 is the
                        biggest (an impact under it). Reverse swells suck back into f216 and f360
  3 5    the glimpses   the half-time skeleton (kick on 1, snare on 3, hats in 8ths, then 16ths), a short reese on
                        the root, and the filtered pulse (Bm, then G) opening; all out by beat 4, so each hit lands
                        on near silence
  7      the hold       the skeleton and the pulse to f444; on f445, Pebble's own hold, the drive stops dead and a dark
                        Asus4 holds (the mix low-passes and lowers the bed)
  8      the turn       G(add9), the motif's first two notes (D5, A5) left hanging on a pad, the heartbeat back and
                        in 8ths from f558, the pulse back in 8ths, a chopped noise riser and a supersaw cluster
                        (D4 A4 E5, rising a minor third) from f504 to the stop
  9      the build      kicks on the beat, the heartbeat between them, an accelerating roll (8ths to 32nds), the
                        pulse in 16ths opening; then the dead stop f612-647: both stems are exact zeros
  10     the drop       crash, a big kick, an impact and a short sub on D2; the drop groove (kick on 1 and 2.5,
                        irregular claps on 2 and 4, 16th hats led by the offbeat, an open hat on the and of 4, the
                        syncopated pluck bass), supersaw D pumping on every beat, and the hook: the motif at full
                        level on a bright supersaw pluck, with a saw lead an octave under it
  11     the star beat  the same groove on A/C#, the hook's answer (C#5 A5 G#5 A5 C#6 ...)
  12-13  the quick chat the groove sits back: soft hats and bass, soft chords (Bm, G), ducked under the click (f792),
                        the send key (f828) and the answer (f876)
  14     the workspace  crash and kick on the cut (f936), the groove back at full on A, a rising lead, a tom and snare
                        fill over f990-1007
  15-20  the montage    groove C (kick on 1, 2.5 and 3; snare and clap on 2 and 4; 16th hats; open hats on every
                        offbeat; a shaker) over the loop D A/C# Bm G, then D A/C# | Bm G; the hook on every bar; a kick
                        and snap on every cut; crashes on the lifts (f1008, f1224). The second lift (bar 18): the
                        chords' filter opens and a plucked counter-melody enters; bar 20 builds (a roll from 8ths to
                        16ths, a noise riser into f1440, no gap)
  21     the held run   crash, big kick, impact and a short sub on A1 land the wide shot (f1440); on f1453 the drive
                        stops again and the Asus4 holds; a soft thump under the line (f1476)
  22     run the tests  on the click (f1512): rising snaps and hats, offbeat bass, the filtered pulse back and opening
                        (with the mix's release), a riser into f1584
  23     the run        a crash on the click (f1584), four on the floor, pumping 8th subs on A1, extra snaps, the hook
                        on A, a short riser; out by f1647 (the breath)
  24     the tests pass f1656: crash, big kick, impact and a short sub on G1 under Gmaj9 (the card reads Done). Then
                        the wait (the model's turn) climbs: four on the floor, 8th subs G1 -> A1, Asus4 -> A, a rising
                        arp, a roll (16ths to 32nds) and a riser into the push
  24.4.4 Verified       f1723.5 (OVERRIDES §41: Verified arrives on f1723): bar 25's downbeat hit, chord and crash a
                        16th early and tied over the line: crash, big kick, impact, clap, snare, snap and an open hat,
                        a short sub on D2, D(add9) on its own unpumped track, the harmonised hook's first note. The
                        climax's peak, louder than f1656 (its weight is in the mids and highs: the stems' limiter takes
                        every hit's low peaks alike)
  25     celebration    the hook harmonised a third below (lead and lead_harm) and on the supersaw pluck, the
                        four-on-the-floor groove with offbeat open hats, D -> A/C#; a downlifter over f1782-1799
  26-28  the breakdown  no drums: an impact and one short sub on B1 (f1800); pads Bm(add9), Gmaj9, Asus4 -> A pumping
                        softly; the motif on a soft pluck; a soft tom and rim on each fact (f1872, f1926); the hats
                        swell over f1944-2006; a reverse chord swell into the title
  29-30  the title      an impact and a short sub on D2 (f2016); the motif resolved on the lead (D5 A5 G#5 A5 F#5 E5
                        D5 ... C#5 over A); a soft groove (kick on 1, snap on 4, 8th hats); D, then Gmaj9 -> A; the
                        breath f2151-2159. In the x30, where bar 24 plays into bar 29, the push lands the title and
                        bar 29 leaves out its own impact, sub and kick
  31-32  the button     crash, big kick, impact and a short sub (0.6 s) on D2 under D(add9) in open voicing (f2160);
                        the mix fades it over f2214-2249 on an equal-power curve; exact zeros from f2250
Harmony: Bm(add9) | G | Asus4 under the questions and the glimpses, G -> Asus4 for the build, the drop on D, the loop
D A/C# Bm G, the holds on Asus4, the tests passing on Gmaj9, Verified on D, D(add9) at the end. Every sustained chord
is voiced from octave 4 up (synth/README.md: a close octave-3 saw chord reads as brass and foghorn under low hits).

The hook: the motif's contour as a 16-step pluck figure, the same rhythm on every bar (steps 0 2 3 4 6 7 8 10 12 14):
D5 A5 G#5 A5 D6 A5 G#5 A5 F#5 E5 over D; C#5 ... C#6 ... over A/C#; B4 A5 F#5 A5 D6 A5 F#5 A5 E5 D5 over Bm and G
(the motif's G# only over D and A/C#, where it is the lydian fourth and the major seventh). It plays on a supersaw
pluck (7 saws, 22 cents): on a thin, bright arp pluck the montage read 'ringtone' 0.31 (round 5).

Levels, measured on the preview masters over seven rounds (the numbers are by each setting): everything before the
drop but the holds' pad plays TENSION_DB under its written velocity, the build BUILD_DB; the low end came down until
the x30 kept 30 % of its power above 150 Hz; and a linked limiter holds the stems' sum STEM_PLR_DB over its loudness,
so the -14 LUFS masters keep their level through mix_master.py's own limiter.

Stems (tools/audio/mix_master.py takes them as BED and --drive): bed.wav (pads, chords, the pulse, the hook, leads,
plucks, and the score's own hits, risers and swells, which carry on through the holds) and drive.wav (drums and bass,
which stop in the holds: the stem is silent there by itself). Both are 48 kHz stereo float32, exactly 3,686,400
samples. The x30 cut (report.music: score bars 1 6 7 8 9 10 22 23 24 29 31 32, in that order, joined on bar lines) is
the same arrangement placed on those bars: bed_x30.wav and drive_x30.wav, 1,382,400 samples. A sound runs over a bar
line only where the next bar follows in that order (the push is tied over its line in both); elsewhere it is cut at
the line and its release rings on.

Preview mixes. The picture lane exports the effects and the automation to tools/audio/cues.json after this score, so the
previews use the blueprint's automation (gaps f63, f639, f1647, f2151; holds f445-503 and f1453-1511, released to the
next bar lines f576 and f1584; the tail) plus stand-ins for score sounds the automation would swallow if they lived in
the stems: the suck-backs into f72 and f648 (inside gaps; cut_cues.py carries the f72 one onto the x30's Q3), the rim
ticks in both holds (the kit's rim_a and rim_b, -15 dB, f450 f468 f486 f1458 f1476 f1494) and a soft noise tick inside
the f1647 gap.
They are marked STAND-IN in preview_cues.json; the timeline's own effects replace them. No UI sounds are in the
previews.

Usage, from the repo root (every step is a heavy job: scripts/heavy.sh, at utility priority):
  PY=.work/audio/.venv/bin/python
  scripts/heavy.sh score-b /usr/sbin/taskpolicy -c utility $PY -I tools/audio/scores/trailer_b.py all
  ... trailer_b.py render [--film-only | --x30-only] | audition --bars 1,2,3 | mix | report | checks | pictures
                   | preview --m4a FILE | all [--checks] [--m4a FILE]
Writes into .work/audio/render/candidates/trailer-b/ (never into git): the stems, fx/ (the stand-ins),
preview_cues.json and preview_cues.x30.json, x30_cut.json, preview_web.wav (-16 LUFS), preview_social.wav and
preview_x30.wav (-14 LUFS), render.json, mix.json, report.json (the blueprint's dynamics report, with §41's climax)
and checks/ (mix_checks.py's gates, the after-silence passes, the windows, and the drive alone in tagcheck's passes).
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
from scipy.ndimage import minimum_filter1d, uniform_filter1d  # noqa: E402
from scipy.signal import lfilter, welch  # noqa: E402

import synth as S  # noqa: E402
from synth import core, env, filters, fills, fx, osc, stems, tagcheck  # noqa: E402
from synth.grid import Event  # noqa: E402
from synth.presets import Instrument  # noqa: E402

SR = core.SR
FPS = 30
SEED = 52
OUT = os.path.join(REPO, ".work", "audio", "render", "candidates", "trailer-b")
KIT = os.path.join(REPO, ".work", "audio", "sfx")
SOUND_TAGS = os.path.join(REPO, ".work", "audio", "sound_tags")
FFMPEG = os.environ.get("FF", "/opt/homebrew/bin/ffmpeg")
PY = sys.executable

FILM_BARS = list(range(1, 33))
X30_BARS = [1, 6, 7, 8, 9, 10, 22, 23, 24, 29, 31, 32]                # report.music: the x30's score bars
X30_RANGES = [[0, 72], [360, 720], [1512, 1728], [2016, 2088], [2160, 2304]]

# The sync points, in film frames: the blueprint's beat sheet with OVERRIDES §41's climax
Q_HITS = (72, 216, 360)                                 # the three questions' hits
HOLDS = ((445, 504, 576), (1453, 1512, 1584))           # Pebble's hold, the drive back (to_frame), the release's end
STOP = (612, 648)                                       # the dead stop, then the drop
PASSED = 1656                                           # bar 24's downbeat: the tests pass, the card reads Done
VERIFIED = 1723.5                                       # Verified (f1723): the 16th before bar 25, the climax's peak
ZEROS = 2250                                            # digital silence from here
CLICKS = (198, 792, 828, 1170, 1260, 1512, 1584)        # clicks and the send key: the hats leave these frames empty

STEM_PEAK_DB = -1.0                                     # both stems trimmed together to this sample peak
# The tension's level, measured on the preview masters (report.music: bars 1-9 at least 6 LU under each master, the drop
# at least 6 LU over bar 9's first half): at their written velocities bars 1-9 sat 1.9 LU under the web master and the
# build 0.5 LU under the drop. Everything before the drop plays TENSION_DB under its velocity, and the build (bar 9,
# its riser and cluster) BUILD_DB, all but the holds' pad, which keeps hold 1 5-9 LU under the montage.
TENSION_DB = -7.3
BUILD_DB = -9.5
SUCK_Q1_DB = -24.0                                      # the f72 suck-back stand-in, against the trimmed bar 1
# The stems' peaks against their loudness. mix_master.py normalises, then limits at -1.7 (web) or -1.5 dBTP (social,
# x30): with the stems' sum peaking 14 dB over its loudness, its limiter took 0.57 dB off the social master and 1.04 dB
# off the x30 (both outside -14 +-0.5). A linked lookahead limiter (one gain on both stems, from their sum) holds the
# sum's sample peak STEM_PLR_DB over its integrated loudness, so the masters' own limiter has almost nothing to do.
STEM_PLR_DB = 11.5

# Sustained voicings: octave 4 up, open where it counts
CH = {
    "Bm": ("F#4", "B4", "D5", "F#5", "B5"),
    "Bm9": ("B4", "D5", "F#5", "C#6"),                  # the breakdown's: add9, no seventh under the motif's G#5/A5
    "G": ("G4", "B4", "D5", "G5", "B5"),
    "Gmaj9": ("G4", "B4", "D5", "F#5", "A5"),
    "Gadd9": ("G4", "D5", "A5", "B5"),
    "Asus4": ("E4", "A4", "D5", "E5", "A5"),
    "A": ("E4", "A4", "C#5", "E5", "A5"),
    "A/C#": ("E4", "A4", "C#5", "E5", "A5"),             # the bass plays the C#
    "D": ("D4", "A4", "D5", "F#5", "A5"),
    "Dadd9": ("D4", "A4", "D5", "E5", "F#5", "A5"),
}
OPEN_BM = ("B4", "F#5", "C#6")                          # bar 1: an open fifth and ninth; the motif supplies the D5
HOLD_CH = ("E4", "A4", "D5", "E5")                      # the holds' Asus4, low enough to keep its level under 1.2 kHz
PULSE = {"Bm": ("B4", "D5", "F#5"), "G": ("G4", "B4", "D5"), "Asus4": ("A4", "D5", "E5")}
ROOT = {"D": "D2", "Dadd9": "D2", "A/C#": "C#2", "A": "A1", "Asus4": "A1", "Bm": "B1", "Bm9": "B1", "G": "G1",
        "Gmaj9": "G1", "Gadd9": "G1"}

# The hook: one rhythm (16th step, length in 16ths), the notes per chord, the accents
HOOK_RHYTHM = ((0, 2), (2, 1), (3, 1), (4, 2), (6, 1), (7, 1), (8, 2), (10, 2), (12, 2), (14, 2))
HOOK_ACC = (1.0, 0.72, 0.68, 0.9, 0.82, 0.66, 0.86, 0.74, 0.8, 0.7)
HOOK = {"D": ("D5", "A5", "G#5", "A5", "D6", "A5", "G#5", "A5", "F#5", "E5"),
        "A/C#": ("C#5", "A5", "G#5", "A5", "C#6", "A5", "G#5", "A5", "F#5", "E5"),
        "Bm": ("B4", "A5", "F#5", "A5", "D6", "A5", "F#5", "A5", "E5", "D5")}
HOOK.update({"A": HOOK["A/C#"], "G": HOOK["Bm"], "Gmaj9": HOOK["Bm"]})
# The harmonised hook (bar 25) moves in thirds below the tune, in D lydian: harmonised a third above (up to G#6) the
# bed alone read 'ringtone' 0.26-0.28 under the celebration in round 5
THIRD = {"B4": "G4", "C#5": "A4", "D5": "B4", "E5": "C#5", "F#5": "D5", "G#5": "E5", "A5": "F#5", "C#6": "A5",
         "D6": "B5"}
MOTIF = ((2.0, "D5", 0.5), (2.5, "A5", 0.5), (3.0, "G#5", 0.25), (3.25, "A5", 1.0))          # over beats 2-4
MOTIF_1 = MOTIF[:3] + ((3.25, "A5", 0.7),)              # bar 1: the last note shorter, so the breath before Q1 is clean
RESOLVED = ((1.0, "D5", 0.5), (1.5, "A5", 0.25), (1.75, "G#5", 0.25), (2.0, "A5", 1.5), (3.5, "F#5", 0.5),
            (4.0, "E5", 0.5), (4.5, "D5", 2.5))         # bar 29: the lydian G# resolves through A, F#, E onto D
COUNTER = {  # the second lift's plucked counter-melody (bars 18-20), an arpeggio with its own line
    18: ((1.0, "B4", 1.0), (2.0, "D5", 0.5), (2.5, "E5", 0.5), (3.0, "D5", 0.5), (3.5, "B4", 0.5), (4.0, "A4", 0.5),
         (4.5, "B4", 0.5)),
    19: ((1.0, "A4", 1.0), (2.0, "D5", 0.5), (2.5, "F#5", 0.5), (3.0, "E5", 0.5), (3.5, "C#5", 0.5), (4.0, "A4", 0.5),
         (4.5, "C#5", 0.5)),
    20: ((1.0, "B4", 0.5), (1.5, "D5", 0.5), (2.0, "F#5", 1.0), (3.0, "G5", 0.5), (3.5, "B5", 0.5), (4.0, "A5", 0.5),
         (4.5, "D6", 0.5)),
}
BASS_STEPS = ((0, 1.0, 0), (3, 0.72, 0), (6, 0.88, 12), (8, 0.92, 0), (11, 0.72, 0), (14, 0.84, 12))  # 3-3-2, twice
HAT_ACC = (0.5, 0.3, 0.85, 0.34)                        # 16th hats led by the offbeat 8th

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
    dict(role="gap", frame=1647, to_frame=1656, event="the breath before the tests pass (f1656)", **GAP),
    dict(role="gap", frame=2151, to_frame=2160, event="the breath before the final hit", **GAP),
    dict(role="tail", frame=2214, to_frame=2250, curve="sine", fade_to_db=-60, then="zeros", after_limiter=True,
         event="the equal-power fade, then digital silence", applies_to=["master"]),
]


# ---------------------------------------------------------------------------------------------------------------------
# Voices the engine lacks (each: note, vel, dur, rng, sr, **params -> stereo (2, n), exact zero at both ends)

def _sine_from(f, sr):
    ph = np.concatenate([[0.0], np.cumsum(f[:-1])]) / sr
    return np.sin(2.0 * np.pi * ph)


def heartbeat(note="F#1", vel=0.8, dur=None, rng=None, sr=SR, dub=True, gap=0.16, dub_vel=0.68, dub_drop=-1.0,
              length=0.2, bend=12.0, bend_tau=0.012, tau=0.045, warmth=2.4, felt=0.22, lp=900.0, level=0.9):
    """A muffled sub heartbeat ('lub-dub'): each beat is a sine bent down `bend` semitones onto the note in about
    3 x bend_tau, decaying with tau and gone within `length` (<= 0.25 s), warmed with tanh so a phone hears its 2nd and
    3rd harmonics, with a little low-passed felt noise on the attack; the 'dub' comes `gap` s later, softer and
    dub_drop semitones lower. Everything under lp Hz: a pulse that is felt more than heard."""
    r = rng if rng is not None else core.rng(0, "heartbeat")
    n = core.samples(length, sr)
    t = np.arange(n) / sr

    def beat(semis, v):
        f = core.hz(note) * 2.0 ** ((semis + bend * np.exp(-t / bend_tau)) / 12.0)
        y = fx.saturate(_sine_from(f, sr) * env.perc(length, 0.002, tau, 0.012, 0.03, sr), warmth)
        nz = filters.lowpass(r.standard_normal(n), 380.0, poles=2, sr=sr) * env.perc(length, 0.001, 0.02, 0.0, 0.02,
                                                                                     sr)
        y = y + felt * nz / (np.abs(nz).max() + 1e-12)
        return v * filters.lowpass(y, lp, sr=sr)

    y = beat(0.0, 1.0)
    if dub:
        k = core.samples(gap, sr)
        y = np.concatenate([y, np.zeros(k)])
        y[k:k + n] += beat(dub_drop, dub_vel)
    y = y / (np.abs(y).max() + 1e-12) * level
    return core.stereo(core.end_clean(y * vel, 0.006, sr))


def question_hit(note="B1", vel=1.0, dur=None, rng=None, sr=SR, sub=1.0, sub_len=0.42, fall_s=0.025, sub_tau=0.13,
                 thwack=0.9, thwack_tau=0.045, body=(160.0, 2400.0), crack=0.45, crack_hz=(2400.0, 9000.0), low=0.4,
                 low_tau=0.16, warmth=1.8, room=0.10, room_hp=650.0, length=1.4, level=0.95):
    """A trailer hit for a question card (report.music): a sub that starts an octave above the note and falls onto it
    in fall_s (25 ms, a smoothstep), gone within sub_len (<= 0.5 s); an unpitched noise thwack (body Hz) and a crack;
    a low noise thud; tanh warmth; a small room (wet <= 0.12) above room_hp, so no low tail can read as a horn."""
    r = rng if rng is not None else core.rng(0, "question_hit")
    n = core.samples(length, sr)
    t = np.arange(n) / sr
    u = np.clip(t / fall_s, 0.0, 1.0)
    u = u * u * (3.0 - 2.0 * u)
    f = core.hz(note) * 2.0 ** (1.0 - u)
    k = min(n, core.samples(sub_len, sr))
    y = np.zeros(n)
    y[:k] = sub * _sine_from(f[:k], sr) * env.perc(k / sr, 0.0006, sub_tau, 0.015, 0.05, sr)
    y += thwack * filters.band(r.standard_normal(n), body[0], body[1], 2, sr) * \
        env.perc(length, 0.0005, thwack_tau, 0.003, 0.05, sr) / 1.5
    kc = core.samples(0.04, sr)
    y[:kc] += crack * filters.band(r.standard_normal(kc), crack_hz[0], crack_hz[1], 2, sr) * \
        env.perc(0.04, 0.0002, 0.006, 0.0, 0.004, sr) / 1.5
    y += low * filters.lowpass(osc.noise(n, r, "brown"), 160.0, poles=4, sr=sr) * \
        env.perc(length, 0.001, low_tau, 0.0, 0.08, sr)
    st = core.stereo(fx.saturate(y, warmth))
    if room:
        st = core.fit(fx.reverb(st, size=0.75, damping=0.6, wet=room, dry=1.0, hp_hz=room_hp, lp_hz=6500.0, sr=sr), n)
    st = fx.mono_below(st, 140.0, sr)
    st = st / (np.abs(st).max() + 1e-12) * level
    return core.end_clean(st * vel, 0.08, sr)


V = {  # the instruments: presets with this score's settings, and the voices above
    # drums
    "kick": S.get("kick", drive=2.0),
    "kick_big": S.get("kick", tau=0.22, length=0.8, drive=2.3, tune=48.0, click=0.35, level=0.8),
    "clap": S.get("clap"),
    "snare": S.get("snare", tone_hz=200.0),
    "snap": S.get("clap", bursts=3, tail=0.35, length=0.22, fc=2100.0, q=1.3, tail_tau=0.03),
    "roll": S.get("snare", tone=0.35, length=0.22),
    "hat": S.get("hat"),
    "hat_open": S.get("hat_open"),
    "shaker": S.get("shaker"),
    "tom": S.get("tom"),
    "rim": S.get("rim"),
    "tick": S.get("tick"),
    "crash": S.get("crash", decay=2.2),
    # bass
    "heart": Instrument(heartbeat, "heartbeat"),
    "reese": S.get("reese", attack=0.004, decay=0.14, sustain=0.6, release=0.05, cutoff=560.0, keytrack=0.0,
                   drive=1.8),
    "bass": S.get("pluck_bass", cutoff=420.0, env_oct=2.6, ftau=0.07, keytrack=0.4, q=1.3, sub=0.55, decay=0.18,
                  sustain=0.45, release=0.05),
    "sub": S.get("sub", harmonics=0.28, decay=0.25, sustain=0.6, release=0.12),
    "sub8": S.get("sub", harmonics=0.45, decay=0.1, sustain=0.75, release=0.04),
    # music
    "pad_open": S.get("pad", shape="triangle", cutoff=1900.0, env_oct=0.4, attack=0.35, release=0.35, sub=0.0,
                      chorus=0.3),
    "pad": S.get("pad", cutoff=2000.0, env_oct=0.5, attack=0.4, release=1.0, sub=0.0, chorus=0.25),
    "pad_hold": S.get("pad", cutoff=2200.0, env_oct=0.6, attack=0.12, decay=1.2, sustain=0.9, release=1.2, sub=0.08),
    "pad_bd": S.get("pad", cutoff=1500.0, env_oct=0.4, attack=0.3, release=1.2, sub=0.0, chorus=0.25),
    "frag": S.get("pad", cutoff=2400.0, env_oct=0.3, attack=0.1, decay=0.8, sustain=0.8, release=1.0, sub=0.0,
                  voices=5),
    "pulse": S.get("pulse", shape="saw", voices=3, detune=12.0, cutoff=700.0, env_oct=1.2, ftau=0.05, keytrack=0.2,
                   q=1.5, tau=0.11, release=0.03),
    "chords": S.get("supersaw", cutoff=3200.0, env_oct=0.8, attack=0.006, decay=0.5, sustain=0.85, release=0.3,
                    detune=30.0),
    "push_chord": S.get("supersaw", cutoff=3600.0, env_oct=1.0, attack=0.004, decay=0.5, sustain=0.85, release=0.3,
                        detune=30.0),
    # The hook and the counter-melody are supersaw plucks: detuned saws through a short filter envelope. On the arp
    # preset's thin, bright pluck (3 saws, its attack all but unfiltered) the montage's hook read 'ringtone' 0.31 in
    # round 5's web master (36-39 s; the gate is 0.30); the detuned stack reads as a synthesizer
    "hook": S.get("supersaw", voices=7, detune=22.0, width=0.75, side=0.7, cutoff=1400.0, env_oct=1.6, keytrack=0.3,
                  vel_oct=0.6, attack=0.003, decay=0.16, sustain=0.3, release=0.08, fattack=0.002, fdecay=0.12,
                  fsustain=0.15),
    "lead": S.get("lead", cutoff=3600.0, env_oct=1.0, detune=10.0, sub=0.15, vibrato_cents=0.0, attack=0.004,
                  decay=0.12, sustain=0.65, release=0.09, fdecay=0.15, width=0.6),
    "lead_harm": S.get("lead", cutoff=2600.0, env_oct=0.8, detune=12.0, sub=0.0, vibrato_cents=0.0, attack=0.004,
                       decay=0.12, sustain=0.6, release=0.09, fdecay=0.15, width=0.8),
    "counter": S.get("supersaw", voices=5, detune=16.0, width=0.6, cutoff=1100.0, env_oct=1.4, keytrack=0.3,
                     attack=0.004, decay=0.2, sustain=0.35, release=0.1, fattack=0.002, fdecay=0.15, fsustain=0.15),
    "pluck": S.get("pluck", voices=3, detune=7.0, cutoff=1100.0, env_oct=2.4, ftau=0.16, tau=0.45, release=0.15,
                   width=0.5),
    "final": S.get("supersaw", attack=0.004, decay=1.4, sustain=0.6, release=2.0, cutoff=3000.0, env_oct=1.2,
                   fdecay=0.6, fsustain=0.35),
    # the score's effects
    "qhit": Instrument(question_hit, "question_hit"),
    "impact": S.get("impact", length=1.8, sub_hz=(70.0, 32.0), sub_tau=0.4, sub=0.45, verb=0.1, size=0.7),
    "riser": S.get("riser", chop=(3.0, 14.0), chop_depth=0.35, f0=300.0, f1=9000.0),
    "riser_s": S.get("riser", f0=500.0, f1=10000.0, curve=2.2),
    # the cluster rises a minor third: a supersaw cluster gliding an octave read as a siren in candidate A's masters
    "cluster": S.get("riser_pitch", noise=0.0, octave=0.0, semitones=3.0, detune=40.0, f_lo=600.0, f_hi=6500.0),
    "swell": S.get("reverse_swell", source="noise"),
    "cswell": S.get("reverse_swell", source="chord"),
    "downlifter": S.get("downlifter"),
    "thump": Instrument(heartbeat, "thump", dub=False, tau=0.07, length=0.24, felt=0.3),
}


# ---------------------------------------------------------------------------------------------------------------------
# The arrangement: events written in film time, at home in a film bar, placed on an output timeline (the film's 32
# bars, or the x30's bars in its own order)

class Arr:
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

    def before(self, bar):
        """The film bar that plays just before `bar` on this timeline, or None."""
        i = self.pos.get(bar)
        return None if not i else self.bars[i - 1]

    def run(self, bar):
        """Film seconds [start, end) of the run of bars around `bar` that plays on without a joint."""
        a = c = bar
        while self.follows(a):
            a -= 1
        while self.follows(c + 1):
            c += 1
        return (a - 1) * self.g.bar, c * self.g.bar

    def put(self, track, bar, events, anchor="start", tie=False):
        """Events in film seconds, at home in film bar `bar`. anchor='end' is for effects that arrive on their time
        (risers, swells): they reach back only as far as their run of bars goes. A held sound is cut where its run
        ends, unless tie=True (the push into bar 25, tied over the line whatever bar follows)."""
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
                if not tie and e.dur and e.t + e.dur > hi + 1e-9:
                    e = e.but(dur=hi - e.t)
            out.append(e.but(t=e.t + d))

    def frame(self, f):
        """The output frame where film frame f plays, or None."""
        bar = int(f // 72) + 1
        return None if bar not in self.pos else self.pos[bar] * 72 + (f - (bar - 1) * 72)


def N(x):
    if x is None:
        return None
    if isinstance(x, (list, tuple)):
        return tuple(core.note(v) for v in x)
    return core.note(x)


def E(t, dur=0.0, vel=1.0, note=None, **params):
    return Event(float(t), float(dur), float(vel), N(note), params)


def no_clicks(evs, tol=1.0):
    """The events, less any within `tol` frames of a UI click (the hats leave the clicks empty, report.music)."""
    return [e for e in evs if min(abs(e.t * FPS - f) for f in CLICKS) > tol]


def steps(g, bar, text, vel=1.0, b0=1.0, step=0.25, note=None, dur=None, **params):
    return S.hits(text, g, at=(bar, b0), step=step, note=note, vel=vel, dur=dur, **params)


def line(g, bar, notes, vel=0.9, legato=0.95):
    out = []
    for item in notes:
        b, nm, ln = item[:3]
        out.append(Event(g.t((bar, b)), g.beats(ln) * legato, item[3] if len(item) > 3 else vel, core.note(nm)))
    return out


def pulses(g, bar, chord, b0, b1, step=0.5, gate=0.55, vel=(0.6, 0.8), cutoff=None, accents=None):
    """A note or chord every `step` beats over beats [b0, b1) of a bar; vel a level or a (v0, v1) ramp; cutoff a
    (c0, c1) ramp (exponential) for the voices that take one."""
    k = int(round((b1 - b0) / step))
    out = []
    for i in range(k):
        u = i / max(1, k - 1)
        v = vel[0] + (vel[1] - vel[0]) * u if isinstance(vel, tuple) else vel
        if accents:
            v *= accents[i % len(accents)]
        p = {"cutoff": cutoff[0] * (cutoff[1] / cutoff[0]) ** u} if cutoff else {}
        out.append(Event(g.t((bar, b0 + i * step)), g.beats(step) * gate, v, N(chord), p))
    return out


def ticks(g, bar, b0, b1, step, vel):
    k = int(round((b1 - b0) / step))
    out = []
    for i in range(k):
        v = vel[0] + (vel[1] - vel[0]) * i / max(1, k - 1)
        out.append(Event(g.t((bar, b0 + i * step)), 0.0, v * (1.0 if i % 2 == 0 else 0.86), None, {"tock": i % 2 == 1}))
    return out


def hat16(g, bar, b0=1.0, b1=5.0, vel=1.0, acc=HAT_ACC):
    out = []
    k = int(round((b1 - b0) * 4))
    for i in range(k):
        bb = b0 + i * 0.25
        out.append(Event(g.t((bar, bb)), 0.0, vel * acc[int(round((bb - 1.0) * 4)) % 4]))
    return no_clicks(out)


def spans_of(plan):
    out, b = [], 1.0
    for ch, beats in plan:
        out.append((b, b + beats, ch))
        b += beats
    return out


def chord_at(plan, beat):
    return next(c for b0, b1, c in spans_of(plan) if b0 - 1e-9 <= beat < b1 - 1e-9)


def hook(g, bar, plan, vel=1.0, gate=0.9, b_from=1.0, until=5.0, third=False):
    """The hook's steps in a bar over plan [(chord, beats)], from beat b_from up to `until`; third=True plays a third
    above each note (the harmonised hook)."""
    out = []
    for i, ((st, ln), acc) in enumerate(zip(HOOK_RHYTHM, HOOK_ACC)):
        bb = 1.0 + st * 0.25
        if bb < b_from - 1e-9 or bb >= until - 1e-9:
            continue
        nm = HOOK[chord_at(plan, bb)][i]
        if third:
            nm = THIRD[nm]
        out.append(Event(g.t((bar, bb)), g.beats(ln * 0.25) * gate, vel * acc, core.note(nm)))
    return out


def chords(A, bar, plan, vel=0.9, cutoff=None, track="chords", legato=0.98, b_from=1.0):
    g, out = A.g, []
    for b0, b1, ch in spans_of(plan):
        if b0 >= b_from - 1e-9:
            p = {"cutoff": cutoff} if cutoff else {}
            out.append(Event(g.t((bar, b0)), g.beats(b1 - b0) * legato, vel, N(CH[ch]), p))
    A.put(track, bar, out)


def bassline(A, bar, plan, vel=1.0, skip_first=False, until=5.0, gate=1.7):
    """The syncopated pluck bass: a 3-3-2 figure twice a bar on each chord's root, the 3rd and 6th notes an octave
    up."""
    g, out = A.g, []
    for i, (st, acc, up) in enumerate(BASS_STEPS):
        bb = 1.0 + st * 0.25
        if (skip_first and i == 0) or bb >= until - 1e-9:
            continue
        out.append(Event(g.t((bar, bb)), g.beats(0.25 * gate), vel * acc, core.note(ROOT[chord_at(plan, bb)]) + up))
    A.put("bass", bar, out)


def pump(A, bar, beats=(1, 2, 3, 4), track="ghost"):
    """Ghost triggers for the sidechain pump (the chords breathe on every beat, kick or no kick)."""
    A.put(track, bar, [Event(A.g.t((bar, b)), 0.0, 1.0) for b in beats])


def hit(A, bar, crash=0.0, kick=0.0, impact=0.0, snap=0.0, sub=None, sub_vel=1.0, sub_len=0.55):
    """A bar's downbeat hit: a big kick, and optionally a crash, an impact, a snap and a short sub (an octave above
    onto the note in 25 ms)."""
    t0 = A.g.t((bar, 1))
    for name, v in (("kick_big", kick), ("crash", crash), ("impact", impact), ("snap", snap)):
        if v:
            A.put(name, bar, [E(t0, 0.0, v)])
    if sub:
        A.put("sub", bar, [E(t0, sub_len, sub_vel, sub, glide_from=12.0, glide_s=0.025)])


def _until(g, evs, until):
    return [e for e in evs if g.where(e.t)[1] < until - 1e-6]


def groove_drop(A, bar, plan, vel=1.0, kick_one=False, until=5.0, skip_first_bass=False):
    """The drop's groove: kick on 1 and 2.5, irregular claps on 2 and 4, 16th hats led by the offbeat, an open hat on
    the and of 4, a soft shaker, the syncopated pluck bass, the pump on every beat."""
    g = A.g
    P = lambda name, evs: A.put(name, bar, _until(g, evs, until))  # noqa: E731
    P("kick", steps(g, bar, ("X" if kick_one else ".") + ".....x.........", vel=vel))
    P("clap", steps(g, bar, "....X.......X...", vel=0.9 * vel))
    P("hat", hat16(g, bar, vel=0.9 * vel))
    P("hat_open", steps(g, bar, "..............o.", vel=vel, dur=0.16))
    P("shaker", steps(g, bar, "gogo gogo gogo gogo", vel=vel))
    bassline(A, bar, plan, vel, skip_first=skip_first_bass, until=until)
    pump(A, bar, [b for b in (1, 2, 3, 4) if b < until])


def groove_c(A, bar, plan, vel=1.0, kick_one=False, until=5.0):
    """The montage's groove C: kick on 1, 2.5 and 3; snare and clap on 2 and 4; 16th hats; open hats on every
    offbeat; the shaker; the bass; the pump."""
    g = A.g
    P = lambda name, evs: A.put(name, bar, _until(g, evs, until))  # noqa: E731
    P("kick", steps(g, bar, ("X" if kick_one else ".") + ".....x.x.......", vel=vel))
    P("snare", steps(g, bar, "....x.......x...", vel=0.7 * vel))
    P("clap", steps(g, bar, "....X.......X...", vel=0.85 * vel))
    P("hat", hat16(g, bar, vel=0.95 * vel))
    P("hat_open", no_clicks(steps(g, bar, "..o...o...o...o.", vel=0.75 * vel, dur=0.14)))
    P("shaker", steps(g, bar, "gogo gogo gogo gogo", vel=vel))
    bassline(A, bar, plan, vel, until=until)
    pump(A, bar, [b for b in (1, 2, 3, 4) if b < until])


def groove_four(A, bar, vel=1.0, kick_one=False, b_from=1.0, until=5.0, open_hats=True):
    """The climax's four on the floor: kicks on the beats, claps on 2 and 4, 16th hats, open hats on the offbeats."""
    g = A.g
    P = lambda name, evs: A.put(name, bar, [e for e in _until(g, evs, until)  # noqa: E731
                                            if g.where(e.t)[1] >= b_from - 1e-6])
    P("kick", steps(g, bar, ("X" if kick_one else ".") + "...x...x...x...", vel=vel))
    P("clap", steps(g, bar, "....X.......X...", vel=0.9 * vel))
    P("snare", steps(g, bar, "....x.......x...", vel=0.55 * vel))
    P("hat", hat16(g, bar, vel=vel))
    if open_hats:
        P("hat_open", no_clicks(steps(g, bar, "..o...o...o...o.", vel=0.8 * vel, dur=0.14)))
    P("shaker", steps(g, bar, "gogo gogo gogo gogo", vel=vel))


# ---------------------------------------------------------------------------------------------------------------------
# The score

def compose(A):
    g, P = A.g, A.put
    b = lambda bar, beat=1.0: g.t((bar, beat))  # noqa: E731
    fr = lambda f: f / FPS  # noqa: E731

    # ---- bars 1-9: the tension, a filtered pulse and a heartbeat under sound design ----
    P("pad_open", 1, [E(b(1), 1.7, 0.55, OPEN_BM)])                               # the look
    P("heart", 1, [E(b(1, 1), 0, 0.8, "F#1"), E(b(1, 3), 0, 0.72, "F#1")])
    P("pluck", 1, line(g, 1, MOTIF_1, vel=0.62))

    P("qhit", 2, [E(b(2), 0, 0.82, "B1")])                                        # Q1 "What did it change?"
    P("heart", 2, [E(b(2, 3), 0, 0.7, "F#1")])
    P("tick", 2, ticks(g, 2, 2.0, 5.0, 1.0, (0.5, 0.56)))

    # the glimpses play 3 dB over the questions' near silence (in round 2 they sat 3.5 LU under the question bars)
    P("kick", 3, [E(b(3), 0, 0.95)])                                              # glimpse 1: out by f198
    P("snare", 3, [E(b(3, 3), 0, 0.7)])
    P("hat", 3, no_clicks(steps(g, 3, "x.x.x.x.x.x.....", vel=0.6)))
    P("reese", 3, [E(b(3, 1), g.beats(0.75), 0.85, "B1"), E(b(3, 3), g.beats(0.75), 0.78, "B1")])
    P("pulse", 3, pulses(g, 3, PULSE["Bm"], 1.0, 4.0, step=0.5, vel=(0.75, 0.95), cutoff=(560.0, 760.0)))
    P("swell", 4, [E(fr(216), 0.3, 0.5)], anchor="end")                          # the suck-back into Q2

    P("qhit", 4, [E(b(4), 0, 0.9, "G1")])                                         # Q2 "Can I undo it?"
    P("heart", 4, [E(b(4, 3), 0, 0.72, "G1")])
    P("tick", 4, ticks(g, 4, 1.5, 5.0, 0.5, (0.45, 0.6)))

    P("kick", 5, [E(b(5), 0, 1.0)])                                               # glimpse 2 (Done, f288)
    P("snare", 5, [E(b(5, 3), 0, 0.78)])
    P("hat", 5, S.scale_vel(steps(g, 5, "xxxx xxxx xxxx ....", vel=0.62), (0.6, 1.0)))
    P("reese", 5, [E(b(5, 1), g.beats(0.75), 0.9, "G1"), E(b(5, 3), g.beats(0.75), 0.82, "G1")])
    P("pulse", 5, pulses(g, 5, PULSE["G"], 1.0, 4.0, step=0.25, vel=(0.7, 0.98), cutoff=(700.0, 1000.0),
                         accents=(1.0, 0.6, 0.85, 0.6)))
    P("swell", 6, [E(fr(360), 0.3, 0.55)], anchor="end")                         # the suck-back into Q3

    P("qhit", 6, [E(b(6), 0, 1.0, "A1")])                                         # Q3 "Did it run the tests?"
    P("impact", 6, [E(b(6), 0, 0.4)])                                             # the biggest of the three
    P("heart", 6, [E(b(6, 3), 0, 0.75, "A1")])
    P("tick", 6, ticks(g, 6, 1.25, 5.0, 0.25, (0.32, 0.58)))

    P("kick", 7, [E(b(7), 0, 1.0)])                                               # glimpse 3, until the hold (f445)
    P("hat", 7, [E(b(7, 1), 0, 0.65), E(b(7, 1.25), 0, 0.45), E(b(7, 1.5), 0, 0.58)])
    P("reese", 7, [E(b(7, 1), g.beats(0.6), 0.9, "A1")])
    P("pulse", 7, pulses(g, 7, PULSE["Asus4"], 1.0, 1.75, step=0.25, vel=0.95, cutoff=(1000.0, 1050.0)))
    P("pad_hold", 7, [E(fr(HOLDS[0][0]), fr(504) - fr(HOLDS[0][0]), 1.0, HOLD_CH)])  # hold 1: 5-9 LU under

    P("pad", 8, [E(b(8), g.bar - 0.05, 0.55, CH["Gadd9"])])                      # the turn
    P("frag", 8, [E(b(8, 1), g.beats(2), 0.6, "D5"), E(b(8, 3), fr(STOP[0]) - b(8, 3) - 0.02, 0.62, "A5")])
    P("heart", 8, [E(b(8, 1), 0, 0.72, "G1"), E(b(8, 3), 0, 0.74, "G1"),
                   E(fr(558), 0, 0.68, "G1", dub=False), E(fr(567), 0, 0.72, "G1", dub=False)])
    P("pulse", 8, pulses(g, 8, PULSE["G"], 1.0, 5.0, step=0.5, vel=(0.45, 0.62), cutoff=(700.0, 1200.0)))
    stop = fr(STOP[0])
    P("riser", 9, [E(stop, stop - fr(504), 0.8)], anchor="end")
    P("cluster", 9, [E(stop, stop - fr(504), 0.6, m) for m in ("D4", "A4", "E5")], anchor="end")

    P("kick", 9, [E(b(9, 1), 0, 0.55), E(b(9, 2), 0, 0.62)])                     # the build, to the stop (f612)
    P("heart", 9, [E(b(9, 1.5), 0, 0.7, "A1", dub=False), E(b(9, 2.5), 0, 0.76, "A1", dub=False)])
    P("roll", 9, fills.accel_roll(g, (9, 1), beats=2.0, start_rate=0.5, end_rate=0.125, vel=(0.15, 0.6)))
    P("pulse", 9, pulses(g, 9, PULSE["Asus4"], 1.0, 3.0, step=0.25, vel=(0.5, 0.82), cutoff=(1100.0, 2800.0)))
    P("pad", 9, [E(b(9), g.beats(2) - 0.02, 0.5, CH["Asus4"])])
    # f612-647: the dead stop (both stems are cut to exact zeros after the render)

    # ---- bars 10-14: the reveal ----
    hit(A, 10, crash=1.0, kick=1.0, impact=1.0, sub="D2")                        # the drop (f648)
    groove_drop(A, 10, [("D", 4)], skip_first_bass=True)
    chords(A, 10, [("D", 4)], vel=0.95)
    # the motif at full level on the bright supersaw hook, with the saw lead an octave under it for weight (in unison
    # with the hook, the drop read 'ringtone' 0.26 in the x30's shifted pass in round 6, the bed alone 0.34)
    P("hook", 10, hook(g, 10, [("D", 4)], vel=1.0))
    P("lead", 10, S.transpose(hook(g, 10, [("D", 4)], vel=0.85), -12))

    groove_drop(A, 11, [("A/C#", 4)], kick_one=True)                             # the star beat
    chords(A, 11, [("A/C#", 4)], vel=0.92)
    P("hook", 11, hook(g, 11, [("A/C#", 4)], vel=0.95))
    P("lead", 11, S.transpose(hook(g, 11, [("A/C#", 4)], vel=0.78), -12))

    for bar, ch in ((12, "Bm"), (13, "G")):                                       # the quick chat: sitting back
        P("hat", bar, hat16(g, bar, vel=0.78))                                    # (about 6 LU under the drop)
        bassline(A, bar, [(ch, 4)], vel=0.8)
        chords(A, bar, [(ch, 4)], vel=0.76, cutoff=2400.0)
        pump(A, bar)
    P("ui", 12, [E(fr(792)), E(fr(828))])
    P("ui", 13, [E(fr(876))])

    hit(A, 14, crash=0.85, kick=0.95)                                             # the whole workspace (f936)
    groove_drop(A, 14, [("A", 4)], until=4.0)
    chords(A, 14, [("A", 4)], vel=0.9)
    P("lead", 14, line(g, 14, ((1.0, "A4", 0.5), (1.5, "C#5", 0.5), (2.0, "E5", 0.5), (2.5, "A5", 1.5)), vel=0.88))
    P("hook", 14, hook(g, 14, [("A", 4)], vel=0.8, until=4.0))
    P("tom", 14, fills.tom_fill(g, (14, 4), beats=1.0, step=0.25, notes=("E3", "D3", "A2", "A2"), vel=(0.6, 0.9)))
    P("roll", 14, fills.snare_roll(g, (14, 4), beats=1.0, rates=(0.25,), vel=(0.4, 0.85)))

    # ---- bars 15-20: the montage, groove C ----
    plan = {15: [("D", 4)], 16: [("A/C#", 4)], 17: [("Bm", 4)], 18: [("G", 4)], 19: [("D", 2), ("A/C#", 2)],
            20: [("Bm", 2), ("G", 2)]}
    for bar in range(15, 21):
        lift = bar in (15, 18)
        hit(A, bar, crash=(1.0 if bar == 15 else 0.9) if lift else 0.0, kick=0.95 if lift else 0.85, snap=0.85)
        groove_c(A, bar, plan[bar])
        chords(A, bar, plan[bar], vel=0.85, cutoff=3000.0 if bar < 18 else 4800.0)
        P("hook", bar, hook(g, bar, plan[bar], vel=0.95 if bar < 18 else 1.0))
    for bar in (18, 19, 20):                                                      # the second lift: the counter-melody
        P("counter", bar, line(g, bar, COUNTER[bar], vel=0.85))
    P("roll", 20, fills.snare_roll(g, (20, 1), beats=4.0, rates=(0.5, 0.25), vel=(0.2, 0.75)))
    P("riser", 21, [E(b(21), g.bar, 0.8)], anchor="end")

    # ---- bars 21-25: the climax ----
    hit(A, 21, crash=0.9, kick=1.0, impact=0.8, sub="A1")                        # the held run lands (f1440)
    P("hat", 21, [E(b(21, 1), 0, 0.6), E(b(21, 1.25), 0, 0.4), E(b(21, 1.5), 0, 0.5)])
    P("pad_hold", 21, [E(b(21), g.bars(2) - 0.05, 0.95, HOLD_CH)])              # hold 2: 5-9 LU under the montage
    P("thump", 21, [E(fr(1476), 0, 0.8, "A1")])                                  # under "AgentGuard checks ..."
    if not A.follows(22):                                                         # a cut that opens on bar 22
        P("pad_hold", 22, [E(b(22), g.bar - 0.05, 0.8, HOLD_CH)])

    P("snap", 22, S.scale_vel(steps(g, 22, ".xxx xxxx xxxx xxxx"), (0.4, 0.9)))  # Run the tests (f1512): the release
    P("hat", 22, S.scale_vel(hat16(g, 22, b0=1.25), (0.35, 0.9)))
    P("bass", 22, pulses(g, 22, "A1", 1.5, 5.5, step=1.0, gate=0.5, vel=(0.5, 0.85)))
    P("pulse", 22, pulses(g, 22, PULSE["Asus4"], 1.25, 5.0, step=0.25, vel=(0.3, 0.85), cutoff=(700.0, 3200.0)))
    P("riser_s", 23, [E(b(23), g.bar, 0.65)], anchor="end")

    hit(A, 23, crash=0.9, kick=0.95)                                              # the run (f1584, the click's crash)
    groove_four(A, 23, until=4.5, open_hats=False)
    P("snap", 23, steps(g, 23, "..x...x...x.....", vel=0.55))
    P("sub8", 23, pulses(g, 23, "A1", 1.0, 4.5, step=0.5, gate=0.7, vel=0.78))
    chords(A, 23, [("A", 3.5)], vel=0.95)
    P("hook", 23, hook(g, 23, [("A", 4)], vel=0.9, until=4.5))
    P("riser_s", 23, [E(fr(1647), 0.9, 0.6)], anchor="end")
    pump(A, 23)

    hit(A, 24, crash=0.4, kick=0.85, impact=0.55, sub="G1")                      # f1656: the tests pass (Done)
    groove_four(A, 24, until=4.75)
    P("sub8", 24, pulses(g, 24, "G1", 1.5, 3.0, step=0.5, gate=0.7, vel=0.8) +
      pulses(g, 24, "A1", 3.0, 4.5, step=0.5, gate=0.7, vel=0.84) +
      pulses(g, 24, "A1", 4.5, 4.75, step=0.25, gate=0.6, vel=0.9))
    chords(A, 24, [("Gmaj9", 2), ("Asus4", 1), ("A", 0.75)], vel=1.0)
    P("hook", 24, hook(g, 24, [("G", 2)], vel=1.0, until=3.0))
    P("hook", 24, line(g, 24, ((3.0, "A4", 0.25), (3.25, "C#5", 0.25), (3.5, "E5", 0.25), (3.75, "A5", 0.25),
                               (4.0, "C#6", 0.25), (4.25, "E6", 0.25), (4.5, "A5", 0.25)), vel=0.92, legato=0.85))
    P("roll", 24, fills.snare_roll(g, (24, 3), beats=1.75, rates=(0.25, 0.125), vel=(0.35, 1.0)))
    tp = g.t((24, 4, 4))                                                          # the push: f1723.5
    P("riser", 24, [E(tp, g.beats(2.75), 0.8)], anchor="end")
    pump(A, 24)
    # Verified (OVERRIDES §41): bar 25's downbeat hit, chord and crash a 16th early, tied over the bar line. The
    # push's chord is its own track, never pumped, so its attack lands whole. Its weight is in the mids and highs (the
    # chord, the crash, clap and snare, an open hat): the stems' limiter takes the low peaks of every hit alike, so a
    # louder kick or sub would not make it bigger than f1656
    # (its kick, sub and impact sit lower than f1656's: stacked, their low peaks made the limiter pull the whole push
    # down, and in round 10 the x30's push came 0.37 LU under f1656 over its first 0.4 s)
    for name, v in (("crash", 1.0), ("kick_big", 0.75), ("impact", 0.6), ("clap", 1.0), ("snare", 1.0),
                    ("hat_open", 1.0), ("snap", 1.0)):
        P(name, 24, [E(tp, 0.0 if name != "hat_open" else 0.3, v)], tie=True)
    P("sub", 24, [E(tp, 0.6, 0.6, "D2", glide_from=12.0, glide_s=0.025)], tie=True)
    P("push_chord", 24, [E(tp, b(25, 3) - tp - 0.02, 1.0, CH["Dadd9"])], tie=True)
    first = b(25, 1.5) - tp - 0.02                                                # the harmonised hook's first note
    P("lead", 24, [E(tp, first, 1.0, "D5")], tie=True)
    P("lead_harm", 24, [E(tp, first, 0.9, THIRD["D5"])], tie=True)
    P("hook", 24, [E(tp, first, 1.0, "D5")], tie=True)

    groove_four(A, 25, b_from=2.0, until=4.25)                                    # the one celebration
    P("hat", 25, [e for e in hat16(g, 25, b0=1.25, b1=2.0)])
    P("hat_open", 25, steps(g, 25, "..o.............", vel=0.8, dur=0.14))
    bassline(A, 25, [("D", 2), ("A/C#", 2)], vel=0.95, skip_first=True, until=4.25)
    chords(A, 25, [("D", 2), ("A/C#", 2)], vel=1.0, b_from=3.0, legato=0.9)
    for name, v, third in (("hook", 1.0, False), ("lead", 1.0, False), ("lead_harm", 0.92, True)):
        P(name, 25, hook(g, 25, [("D", 2), ("A/C#", 2)], vel=v, b_from=1.25, until=4.25, third=third))
    P("downlifter", 25, [E(fr(1782), 0.6, 0.8)])
    pump(A, 25, (2, 3, 4))

    # ---- bars 26-28: the breakdown, no drums ----
    P("impact", 26, [E(b(26), 0, 0.3)])
    P("sub", 26, [E(b(26), 0.5, 0.6, "B1", glide_from=12.0, glide_s=0.025)])
    P("pad_bd", 26, [E(b(26), g.bar - 0.05, 0.6, CH["Bm9"])])
    P("pad_bd", 27, [E(b(27), g.bar - 0.05, 0.6, CH["Gmaj9"])])
    P("pad_bd", 28, [E(b(28), g.beats(2) - 0.05, 0.6, CH["Asus4"]), E(b(28, 3), g.beats(2) - 0.05, 0.62, CH["A"])])
    for bar in (26, 27, 28):
        pump(A, bar, track="ghost_bd")
    P("pluck", 26, line(g, 26, MOTIF, vel=0.42))
    P("pluck", 27, line(g, 27, ((2.0, "B4", 0.5), (2.5, "F#5", 0.5), (3.0, "E5", 0.25), (3.25, "F#5", 1.0)), vel=0.4))
    P("pluck", 28, line(g, 28, ((1.5, "E5", 0.5), (2.0, "D5", 1.0), (3.0, "C#5", 0.5), (3.5, "E5", 0.5),
                                (4.0, "A5", 1.0)), vel=0.42))
    P("tom", 27, [E(b(27, 1), 0, 0.45, "D3"), E(b(27, 4), 0, 0.45, "B2")])      # the facts (f1872, f1926)
    P("rim", 27, [E(b(27, 1), 0, 0.5), E(b(27, 4), 0, 0.5)])
    P("hat", 28, S.scale_vel(steps(g, 28, "xxxx xxxx xxxx xx.."), (0.05, 0.38)))  # the swell, f1944-2006
    P("cswell", 29, [E(b(29), 1.2, 0.6, CH["D"])], anchor="end")

    # ---- bars 29-32: the title and the button ----
    if A.before(29) != 24:                                                        # the title lands (f2016)
        P("impact", 29, [E(b(29), 0, 0.5)])
        P("sub", 29, [E(b(29), 0.55, 0.85, "D2", glide_from=12.0, glide_s=0.025)])
        P("kick", 29, [E(b(29), 0, 0.75)])
    # (in the x30, bar 24 plays into bar 29: the push, tied over the joint 4.5 frames earlier, lands the title)
    P("snap", 29, [E(b(29, 4), 0, 0.55)])
    P("hat", 29, steps(g, 29, "x.x.x.x.x.x.x.x.", vel=0.42))
    if A.before(29) != 24:
        chords(A, 29, [("D", 4)], vel=0.5, cutoff=2400.0)
        P("pad", 29, [E(b(29), g.bar - 0.05, 0.45, CH["D"])])
    else:                                                     # the push's tied D(add9) carries the title's first beat
        chords(A, 29, [("D", 1), ("D", 3)], vel=0.5, cutoff=2400.0, b_from=2.0)
        P("pad", 29, [E(b(29, 2), g.beats(3) - 0.05, 0.45, CH["D"])])
    P("lead", 29, line(g, 29, RESOLVED, vel=0.72))
    P("kick", 30, [E(b(30), 0, 0.7)])
    P("snap", 30, [E(b(30, 4), 0, 0.5)])
    P("hat", 30, steps(g, 30, "x.x.x.x.x.x.x...", vel=0.4))                      # out before the breath (f2151)
    chords(A, 30, [("Gmaj9", 2), ("A", 1.5)], vel=0.5, cutoff=2400.0)
    P("sub", 30, [E(b(30), 0.4, 0.6, "G1"), E(b(30, 3), 0.4, 0.62, "A1")])
    P("lead", 30, line(g, 30, ((3.0, "C#5", 1.5),), vel=0.7))

    hit(A, 31, crash=1.0, kick=1.0, impact=1.0, sub="D2", sub_len=0.6)          # the final hit (f2160)
    end = fr(ZEROS)
    P("final", 31, [E(b(31), end - b(31), 0.92, CH["Dadd9"])])
    P("pad", 31, [E(b(31), end - b(31), 0.5, CH["Dadd9"])])

    # the tension's level (TENSION_DB, BUILD_DB): risers and clusters carry their end time, so the build's are in bar 9
    if A.has(10):
        drop_t = A.pos[10] * g.bar
        build_t = A.pos[9] * g.bar if A.has(9) else drop_t
        for name, evs in A.ev.items():
            if name in ("pad_hold", "ghost", "ghost_bd", "ui"):
                continue
            A.ev[name] = [e if e.t >= drop_t - 1e-6 else
                          e.but(vel=e.vel * core.amp(BUILD_DB if e.t >= build_t - 1e-6 else TENSION_DB)) for e in evs]


# ---------------------------------------------------------------------------------------------------------------------
# Tracks, buses and the render

LEVELS = {  # track: (bus, gain dB)
    # the low end came down 1.5-4 dB in round 3 and 1-1.5 dB more in round 4: the x30 had 21 %, then 27.7 % of its
    # power above 150 Hz (the gate is 30 %)
    "kick": ("drums", -4.0), "kick_big": ("drums", -2.5), "clap": ("drums", -5.0), "snare": ("drums", -8.0),
    "snap": ("drums", -10.0), "roll": ("drums", -10.0), "hat": ("drums", -13.0), "hat_open": ("drums", -16.0),
    "shaker": ("drums", -19.0), "tom": ("drums", -8.0), "rim": ("drums", -12.0), "tick": ("drums", -13.0),
    "crash": ("drums", -13.0),
    "heart": ("bass", -2.0), "reese": ("bass", -9.0), "bass": ("bass", -7.0), "sub": ("bass", -7.0),
    "sub8": ("bass", -12.0),
    "pad_open": ("music", -9.0), "pad": ("music", -10.0), "pad_hold": ("music", -5.0), "pad_bd": ("music", -15.5),
    "frag": ("music", -12.0), "pulse": ("music", -9.0), "chords": ("music", -8.0), "push_chord": ("music", -2.5),
    "hook": ("music", -8.0),
    "lead": ("music", -11.0), "lead_harm": ("music", -15.0), "counter": ("music", -11.0), "pluck": ("music", -8.0),
    "final": ("music", -7.0),
    "qhit": ("fx", -2.0), "impact": ("fx", -6.0), "riser": ("fx", -20.0), "riser_s": ("fx", -22.0),
    "cluster": ("fx", -24.0), "swell": ("fx", -14.0), "cswell": ("fx", -16.0), "downlifter": ("fx", -15.0),
    "thump": ("fx", -10.0),
}
BUSES = {"drums": -4.0, "bass": -6.5, "music": 0.0, "fx": -2.0}       # bass -1 dB in round 7: the x30's share 0.299


def session(A, seed=SEED):
    """The tracks and buses: drums + bass make the drive, music + fx make the bed."""
    g = A.g
    s = S.Session(g, n=A.n, seed=seed)
    times = lambda name: sorted(e.t for e in A.ev.get(name, []))  # noqa: E731
    kicks = sorted(times("kick") + times("kick_big"))
    ghost, ghost_bd, ui = times("ghost"), times("ghost_bd"), times("ui")
    dly = lambda mix, fb=0.3: (lambda x: fx.delay(x, g.beats(0.75), feedback=fb, mix=mix, pingpong=True, sr=SR))  # noqa
    pumped = lambda depth, rel=300.0: dict(by=ghost, depth_db=depth, attack_ms=4, hold_ms=15, release_ms=rel)  # noqa
    extra = {
        "hat": dict(pan=0.1, duck=dict(by=ui, depth_db=6, attack_ms=5, hold_ms=60, release_ms=250)),
        "hat_open": dict(pan=-0.12), "shaker": dict(pan=0.28), "tick": dict(pan=0.15), "snap": dict(pan=-0.06),
        # Session's duck takes plain times; fx.sidechain also takes (time, depth scale) pairs: the UI's are softer
        "bass": dict(fx=lambda x: fx.sidechain(x, [(t, 1.0) for t in kicks] + [(t, 0.8) for t in ui], depth_db=5,
                                               attack_ms=1, hold_ms=25, release_ms=90, sr=SR)),
        "sub8": dict(duck=dict(by=kicks, depth_db=9, attack_ms=1, hold_ms=20, release_ms=130)),
        "chords": dict(duck=pumped(7.0)), "pulse": dict(duck=dict(by=kicks, depth_db=4, attack_ms=2, hold_ms=10,
                                                                  release_ms=120)),
        "hook": dict(pan=0.14, fx=dly(0.14, 0.25), duck=pumped(3.0, 200.0)),
        "lead": dict(fx=dly(0.12, 0.25), duck=pumped(2.0, 180.0)),
        "lead_harm": dict(pan=-0.05, fx=dly(0.1, 0.2)),
        "counter": dict(pan=-0.22, fx=dly(0.16, 0.25), duck=pumped(3.0, 200.0)),
        "pluck": dict(fx=dly(0.16, 0.28)),
        "pad_bd": dict(duck=dict(by=ghost_bd, depth_db=3.5, attack_ms=6, hold_ms=10, release_ms=420)),
    }
    for name, (bus, gain) in LEVELS.items():
        evs = A.ev.get(name)
        if evs:
            s.track(name, V[name], evs, bus=bus, gain_db=gain, **extra.get(name, {}))
    s.bus("drums", gain_db=BUSES["drums"], fx=[lambda x: fx.compressor(x, -16, 2.5, 10, 120, sr=SR),
                                                lambda x: fx.saturate(x, 1.15)])
    s.bus("bass", gain_db=BUSES["bass"], fx=[lambda x: fx.saturate(x, 1.2), lambda x: fx.mono_below(x, 120.0, SR)])
    s.bus("music", gain_db=BUSES["music"],
          fx=[lambda x: fx.reverb(x, 0.7, 0.5, 0.14, 1.0, predelay_ms=12, hp_hz=250, lp_hz=8500, sr=SR),
              lambda x: fx.mono_below(x, 150.0, SR)])
    s.bus("fx", gain_db=BUSES["fx"])
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
        c = min(n, i1 + k)
        x[:, i1:c] *= 0.5 - 0.5 * np.cos(np.pi * np.arange(c - i1) / k)
    return x


def linked_limit(bed, drive, plr_db=STEM_PLR_DB, la_ms=5.0, rel_ms=90.0):
    """A lookahead peak limiter on the stems' sum whose one gain goes on both stems, so their balance holds and the sum
    never passes ceiling = its integrated loudness + plr_db (sample peak). The needed gain's moving minimum over +-la,
    averaged over la, ramps down before each peak and never lets one through; the reduction (in dB) then releases
    exponentially (time constant rel_ms), as a running maximum in the log domain. In place; returns its report."""
    s = bed + drive
    lufs = stems.loudness(s)
    ceiling = core.amp(lufs + plr_db)
    need = np.minimum(1.0, ceiling / np.maximum(np.max(np.abs(s), axis=0), 1e-12))
    del s
    L = max(1, int(la_ms * SR / 1000))
    g = np.minimum(1.0, uniform_filter1d(minimum_filter1d(need, size=2 * L + 1, mode="nearest"), size=L + 1,
                                         mode="nearest"))
    r = -20.0 * np.log10(np.maximum(g, 1e-9))                       # dB of reduction, >= 0
    del g, need
    k = np.arange(len(r)) / (rel_ms / 1000.0 * SR)
    with np.errstate(divide="ignore"):
        q = np.log(r) + k
    hold = np.exp(np.maximum.accumulate(q) - k)                     # max over j <= n of r[j] exp(-(n - j) / rel)
    del q, k
    hold[~np.isfinite(hold)] = 0.0
    gain = 10.0 ** (-np.maximum(hold, r) / 20.0)
    bed *= gain
    drive *= gain
    return {"sum_lufs": round(lufs, 2), "ceiling_dbfs": round(lufs + plr_db, 2),
            "max_reduction_db": round(float(r.max()), 2),
            "seconds_reduced_over_1db": round(float(np.count_nonzero(hold > 1.0)) / SR, 2)}


def render(bars, out_dir, prefix, seed=SEED):
    t0 = time.perf_counter()
    g = S.Grid.from_beatmap()
    A = Arr(g, bars)
    compose(A)
    s = session(A, seed)
    loud = {}
    music = s.render_bus("music")
    loud["music_bus_lufs"] = stems.loudness(music)
    bed = music + s.render_bus("fx")
    del music
    s._cache.clear()
    drums = s.render_bus("drums")
    bass = s.render_bus("bass")
    loud["bass_bus_lufs"] = stems.loudness(bass)
    drive = drums + bass
    del drums, bass
    s._cache.clear()
    fs = lambda f: int(round(f * SR / FPS))  # noqa: E731
    spans = {"dead_stop": [], "drive_holds": []}
    a, c = A.frame(STOP[0]), A.frame(STOP[1])
    if a is not None and c is not None and c - a == STOP[1] - STOP[0]:
        silence(bed, fs(a), fs(c), 6.0, 1.0)
        silence(drive, fs(a), fs(c), 6.0, 1.0)
        spans["dead_stop"].append([a, c])
    for h0, h1, _ in HOLDS:
        a, c = A.frame(h0), A.frame(h1)
        if a is not None and c is not None and c - a == h1 - h0:
            silence(drive, fs(a), fs(c), 10.0, 2.0)
            spans["drive_holds"].append([a, c])
    zf = A.frame(ZEROS)
    lim = linked_limit(bed, drive)
    pk = max(core.peak_db(bed), core.peak_db(drive))
    trim = min(0.0, STEM_PEAK_DB - pk)
    k = core.amp(trim)
    rep = {"bars": list(bars), "samples": A.n, "seed": seed, "events": sum(len(v) for n_, v in A.ev.items()
                                                                           if n_ in LEVELS),
           "spans_out_frames": spans, "zeros_from_frame": zf, "trim_db": round(trim, 2), "linked_limiter": lim,
           "bass_bus_under_music_bus_lu": None if None in loud.values() else
           round(loud["music_bus_lufs"] - loud["bass_bus_lufs"], 2)}
    zs = None if zf is None else fs(zf)
    rep["bed"] = stems.write_stem(os.path.join(out_dir, f"bed{prefix}.wav"), bed * k, A.n, zeros_from=zs)
    rep["drive"] = stems.write_stem(os.path.join(out_dir, f"drive{prefix}.wav"), drive * k, A.n, zeros_from=zs)
    rep["seconds_to_render"] = round(time.perf_counter() - t0, 1)
    return rep


def audition(bars, out_dir):
    """Render some film bars (no automation), a -16 LUFS preview master of them, and tagcheck's four passes on it."""
    rep = render(bars, out_dir, "_part")
    x = stems.read_stem(os.path.join(out_dir, "bed_part.wav"))
    x = x + stems.read_stem(os.path.join(out_dir, "drive_part.wav"))
    y, mrep = stems.master(x, lufs=-16.0, ceiling_db=-1.7)
    p = os.path.join(out_dir, "audition.wav")
    sf.write(p, y.T.astype(np.float32), SR, subtype="FLOAT")
    with tempfile.TemporaryDirectory(dir=out_dir) as tmp:
        tags = tagcheck.check(p, SOUND_TAGS, tmp)
    rep["tags"] = {k: tags[k] for k in ("watch_max", "phone_max", "fails", "warnings", "notes", "pass")}
    rep["tags"]["top3"] = {v: tags["passes"][v]["top3_by_window"] for v in tags["passes"]}
    return rep


# ---------------------------------------------------------------------------------------------------------------------
# The preview mixes: the blueprint's automation and the stand-ins, through mix_master.py

def standins(out_dir):
    d = os.path.join(out_dir, "fx")
    os.makedirs(d, exist_ok=True)
    y, _ = S.get("reverse_swell", source="noise", bright=7000.0)(vel=1.0, dur=0.3, rng=core.rng(SEED, "suck"))
    suck = os.path.join(d, "suck.wav")
    stems.write_stem(suck, y, fade_in_ms=0.5, fade_out_ms=1.5)
    tick = os.path.join(d, "tick.wav")
    stems.write_stem(tick, V["tick"](vel=0.7, rng=core.rng(SEED, "gap-tick")), fade_in_ms=0.2, fade_out_ms=2.0)

    def suck_cue(f, gain=-16.0):
        return {"file": suck, "t": round(f / FPS, 4), "align": "end", "gain_db": gain, "pan": 0, "duck_db": 0,
                "frame": f, "peak_frame": f, "role": "suck", "take": "suck",
                "event": f"STAND-IN for the timeline's suck-back into f{f}: it sits inside a breath gap, where the "
                         "automation would swallow a stem's"}

    cues = [suck_cue(72, SUCK_Q1_DB), suck_cue(STOP[1])]
    for i, f in enumerate((450, 468, 486, 1458, 1476, 1494)):
        take = "rim_a" if i % 2 == 0 else "rim_b"
        cues.append({"file": os.path.join(KIT, f"{take}.wav"), "t": round((f + 1) / FPS, 4), "align": "peak",
                     "gain_db": -15, "pan": 0, "duck_db": 0, "frame": f, "peak_frame": f + 1, "role": "rim",
                     "take": take, "event": "STAND-IN for the timeline's rim tick, keeping the beat in the hold"})
    cues.append({"file": tick, "t": round(1652 / FPS, 4), "align": "peak", "gain_db": -18, "pan": 0, "duck_db": 0,
                 "frame": 1651, "peak_frame": 1652, "role": "tick", "take": "tick",
                 "event": "STAND-IN for the soft noise tick inside the breath before f1656"})
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
           "frames": sum(c1 - c0 for c0, c1 in X30_RANGES), "music": {"form": "x30", "score_bars": X30_BARS},
           "about": "candidate B's preview copy of the blueprint's x30 (TRAILER_RESEARCH §6.7), not docs/film-cuts"}
    with open(os.path.join(out_dir, "x30_cut.json"), "w") as f:
        json.dump(cut, f, indent=1)
    # cut_cues.py keeps an end-aligned cue that ends on a range's end, so the f72 suck-back lands on the x30's own Q3
    # (cut f72): no second stand-in is needed there
    x30 = os.path.join(out_dir, "preview_cues.x30.json")
    subprocess.run([PY, "-I", os.path.join(AUDIO, "cut_cues.py"), os.path.join(out_dir, "x30_cut.json"), "--cues", path,
                    "--out", x30], check=True, capture_output=True, text=True)
    return path


def mix(out_dir):
    standins(out_dir)
    jobs = [("web", "", "preview_cues.json", ["--lufs", "-16", "--tp", "-1.7", "--aac", "160k:-1.5"]),
            ("social", "", "preview_cues.json", ["--lufs", "-14", "--tp", "-1.5", "--aac", "192k:-1.0"]),
            ("x30", "_x30", "preview_cues.x30.json", ["--lufs", "-14", "--tp", "-1.5", "--aac", "192k:-1.0"])]
    reps = {}
    for name, sfx_, cues, args in jobs:
        bed = os.path.join(out_dir, f"bed{sfx_}.wav")
        if not os.path.exists(bed):
            continue
        p = subprocess.run([PY, "-I", os.path.join(AUDIO, "mix_master.py"), bed, os.path.join(out_dir, cues),
                            os.path.join(out_dir, f"preview_{name}.wav"), "--drive",
                            os.path.join(out_dir, f"drive{sfx_}.wav"), *args, "--ffmpeg", FFMPEG],
                           capture_output=True, text=True, check=True)
        reps[name] = json.loads(p.stdout.strip().splitlines()[-1])
    with open(os.path.join(out_dir, "mix.json"), "w") as f:
        json.dump(reps, f, indent=1)
    return reps


# ---------------------------------------------------------------------------------------------------------------------
# The blueprint's dynamics report (report.music, LOUDNESS AND DYNAMICS GATES), with OVERRIDES §41's climax

KW = [([1.53512485958697, -2.69169618940638, 1.19839281085285], [1.0, -1.69065929318241, 0.73248077421585]),
      ([1.0, -2.0, 1.0], [1.0, -1.99004745483398, 0.99007225036621])]


class Meter:
    """K-weighted loudness of spans of one master (ungated BS.1770 power, LUFS) and gated integrated loudness."""

    def __init__(self, path):
        y, sr = sf.read(path, always_2d=True, dtype="float64")
        assert sr == SR, path
        self.y = y.T
        z = self.y
        for b_, a_ in KW:
            z = lfilter(b_, a_, z, axis=1)
        self.z = z
        self.meter = pyln.Meter(SR)
        self.I = float(self.meter.integrated_loudness(y))
        self.n = self.y.shape[1]

    def lu(self, t0, t1):
        a, c = max(0, int(round(t0 * SR))), min(self.n, int(round(t1 * SR)))
        if c <= a:
            return None
        p = float(np.sum(np.mean(self.z[:, a:c] ** 2, axis=1)))
        return round(-0.691 + 10 * math.log10(p + 1e-20), 2)

    def gated(self, spans):
        x = np.concatenate([self.y[:, int(round(a * SR)):int(round(c * SR))] for a, c in spans], axis=1)
        v = self.meter.integrated_loudness(x.T)
        return round(float(v), 2) if np.isfinite(v) else None

    def bars(self, out_bars):
        return self.gated([((b_ - 1) * 2.4, b_ * 2.4) for b_ in out_bars]) if out_bars else None

    def short_term(self, hop=0.1, win=3.0):
        out, t = [], 0.0
        while t + win <= self.n / SR + 1e-9:
            out.append((round(t, 2), self.lu(t, t + win)))
            t += hop
        return out

    def lra(self):
        """EBU Tech 3342: short-term values every 0.1 s, gated at -70 LUFS and 20 LU under their power mean; the range
        from the 10th to the 95th percentile."""
        st = np.array([v for _, v in self.short_term() if v is not None and v > -70])
        if not len(st):
            return None
        st = st[st > 10 * math.log10(np.mean(10 ** (st / 10))) - 20]
        return round(float(np.percentile(st, 95) - np.percentile(st, 10)), 2)


def dyn_report(master, bars, name):
    """The blueprint's dynamics report on one master; `bars` lists the film bars it plays, in order."""
    M = Meter(master)
    pos = {b_: i for i, b_ in enumerate(bars)}

    def ts(f):
        """Output seconds where film frame f plays, or None."""
        bar = int(f // 72) + 1
        return None if bar not in pos else (pos[bar] * 72 + f - (bar - 1) * 72) / FPS

    out_bars = lambda film: [pos[b_] + 1 for b_ in film if b_ in pos]  # noqa: E731
    r = {"master": os.path.relpath(master, REPO), "name": name, "integrated_lufs": round(M.I, 2), "lra_lu": M.lra(),
         "lra_target": "8-10 LU (a target, not a gate)",
         "per_bar": [{"out_bar": i + 1, "film_bar": b_, "lufs": M.bars([i + 1]),
                      "ungated": M.lu(i * 2.4, (i + 1) * 2.4)} for i, b_ in enumerate(bars)], "checks": []}

    def check(label, value, ok, want, **extra):
        r["checks"].append({"check": label, "value": value, "want": want, "ok": bool(ok), **extra})

    v = M.bars(out_bars(range(1, 10)))
    if v is not None:
        check("bars 1-9 under the integrated level (LU)", round(M.I - v, 2), M.I - v >= 6.0, ">= 6", bars_lufs=v)
    for f, q in zip(Q_HITS, ("Q1", "Q2", "Q3")):
        t = ts(f)
        if t is not None:
            h, before = M.lu(t, t + 0.3), M.lu(t - 0.6, t)
            check(f"{q} hit f{f}: its 300 ms over the 600 ms before (dB)", round(h - before, 1), h - before >= 10.0,
                  ">= 10", hit=h, before=before)
    a, d = ts(STOP[0]), ts(STOP[1])
    if a is not None and d is not None:
        stop, drop = M.lu(a, ts(639)), M.lu(d, d + 0.3)
        pk = float(np.abs(M.y[:, int(round(a * SR)):int(round(ts(639) * SR))]).max())
        check("the dead stop f612-638 under the drop's first 300 ms (dB)", round(drop - stop, 1), drop - stop >= 20.0,
              ">= 20", stop=stop, drop_300ms=drop, stop_peak_dbfs=None if pk == 0 else round(20 * math.log10(pk), 1))
        b9 = ts(576)
        if b9 is not None:
            drop3, first = M.lu(d, d + 3.0), M.lu(b9, b9 + 1.2)
            check("the drop's 3 s over bar 9's first half (LU)", round(drop3 - first, 2), drop3 - first >= 6.0, ">= 6",
                  drop_3s=drop3, bar9_first_half=first)
    montage = out_bars(range(15, 21))
    mont = M.bars(montage) if montage else None
    if mont is not None:
        r["montage_lufs"] = mont
    for (h0, _, _), label in zip(HOLDS, ("hold 1 (bar 7)", "hold 2 (bar 21)")):
        t = ts(h0)
        if t is None:
            continue
        h = M.lu(t, t + 2.0)
        check(f"{label}: 2 s from f{h0} under the integrated level (LU)", round(M.I - h, 2), 5.0 <= M.I - h <= 9.0,
              "5-9", hold=h)
        if mont is not None:
            check(f"{label}: under the montage, bars 15-20 (LU)", round(mont - h, 2), 5.0 <= mont - h <= 9.0, "5-9")
    tv, tp_ = ts(VERIFIED), ts(PASSED)
    if tv is not None:
        st = [(t, lv) for t, lv in M.short_term() if lv is not None]
        best_t, best = max(st, key=lambda q: q[1])
        holding = [lv for t, lv in st if tv - 2.7 - 1e-9 <= t <= tv + 1e-9]
        ver = max(holding) if holding else None
        check("Verified (the push, f1723.5) is in the loudest 3 s window",
              f"loudest window from {best_t:.1f} s ({best} LUFS); the best holding the push: {ver}",
              ver is not None and ver >= best - 0.05, "a window holding f1723.5 and its next 300 ms is the loudest")
        if mont is not None and ver is not None:
            check("Verified's loudest 3 s over the montage (LU)", round(ver - mont, 2), ver - mont >= 1.5, ">= 1.5")
        if tp_ is not None:
            for win in (0.4, 1.0):
                mv, mp = M.lu(tv, tv + win), M.lu(tp_, tp_ + win)
                check(f"Verified's first {win} s at least as loud as the tests passing (f1656) (LU)", round(mv - mp, 2),
                      mv >= mp, ">= 0", verified=mv, passed=mp)
            b23 = [M.lu(ts(1584) + 0.6 * i, ts(1584) + 0.6 * (i + 1)) for i in range(4)]
            b24 = [M.lu(tp_ + 0.6 * i, tp_ + 0.6 * (i + 1)) for i in range(4)]
            ref = float(np.mean(b23[1:3]))
            check("bar 24 never drops: beats 2-4 against bar 23's beats 2-3 (LU)", [round(x - ref, 2) for x in b24[1:]],
                  min(b24[1:]) >= ref - 1.0, ">= -1 each", bar23_beats=b23, bar24_beats=b24)
    clim, pay, brk = out_bars(range(21, 26)), out_bars(range(23, 26)), out_bars(range(26, 29))
    if brk and clim:
        vb = M.bars(brk)
        check("the breakdown (26-28) under the climax 21-25 (LU)", round(M.bars(clim) - vb, 2), M.bars(clim) - vb >= 6,
              ">= 6", breakdown=vb, climax=M.bars(clim))
        check("the breakdown (26-28) under bars 23-25 (LU)", round(M.bars(pay) - vb, 2), M.bars(pay) - vb >= 6, ">= 6")
    k = int(round((M.n / SR - 1.8) * SR))
    pk = float(np.abs(M.y[:, k:]).max())
    check("the last 54 frames are digital silence", "exact zeros" if pk == 0 else f"{20 * math.log10(pk):.1f} dBFS",
          pk <= 10 ** (-70 / 20), "<= -70 dBFS")
    # the phone checks, as mix_checks.py measures them (it gates them; here they steer the balance between rounds)
    mono = M.y.mean(axis=0)
    loss = M.I - float(M.meter.integrated_loudness(np.stack([mono, mono], axis=1)))
    check("mono fold-down loss (dB)", round(loss, 2), loss <= 3.0, "<= 3")
    f_, pxx = welch(mono, fs=SR, nperseg=8192)
    band = (f_ >= 20) & (f_ <= 20000)
    share = float(pxx[band & (f_ >= 150)].sum() / pxx[band].sum())
    check("share of the power above 150 Hz", round(share, 3), share >= 0.30, ">= 0.30")
    r["pass"] = all(c["ok"] for c in r["checks"])
    return r


def stem_balance(out_dir, prefix=""):
    """Per bar: the bed's and the drive's gated loudness and the drive's level over the bed (LU)."""
    meter = pyln.Meter(SR)
    bd, _ = sf.read(os.path.join(out_dir, f"bed{prefix}.wav"), always_2d=True)
    dr, _ = sf.read(os.path.join(out_dir, f"drive{prefix}.wav"), always_2d=True)
    k = int(round(2.4 * SR))
    f = lambda v: round(float(v), 2) if np.isfinite(v) else None  # noqa: E731
    rows = []
    for i in range(bd.shape[0] // k):
        lb, ld = meter.integrated_loudness(bd[i * k:(i + 1) * k]), meter.integrated_loudness(dr[i * k:(i + 1) * k])
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
        print(f"== {name}: {r['integrated_lufs']} LUFS, LRA {r['lra_lu']} LU, montage {r.get('montage_lufs')}, "
              f"pass {r['pass']}")
        print("   bars (LUFS):", " ".join(f"{x['film_bar']}:{x['lufs'] if x['lufs'] is not None else '-'}"
                                          for x in r["per_bar"]))
        for c in r["checks"]:
            print(f"   [{'ok' if c['ok'] else 'MISS'}] {c['check']}: {c['value']} (want {c['want']})")


# ---------------------------------------------------------------------------------------------------------------------
# The classifier: mix_checks.py on each master, the after-silence passes the trailer adds, the drive alone

AFTER_SILENCE = {"film": [(0, "bar 1"), (648, "the drop, after the dead stop"), (1512, "the climax release"),
                          (1656, "the tests pass (f1656), after the breath")],
                 "x30": [(0, "bar 1"), (360, "the drop, after the dead stop"), (432, "the climax release"),
                         (576, "the tests pass (film f1656), after the breath")]}
WINDOWS = {"film": {"hold 1": (14.8, 16.8), "hold 2": (48.4, 50.4), "the push (Verified)": (56.4, 59.4),
                    "end card": (67.2, 72.0)},
           "x30": {"hold 1": (5.2, 7.2), "the push (Verified)": (20.4, 23.4), "end card": (21.6, 24.0)}}


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
                         "watch": dict(sorted(watch.items(), key=lambda q: -q[1])[:6])})
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
    for label, (a, c) in spans.items():
        rows = []
        for fname, off in ((f"{name}.tags.json", 0.0), (f"{name}.tags-shift.json", 1.5)):
            p = os.path.join(check_dir, fname)
            if not os.path.exists(p):
                continue
            tg = json.load(open(p))
            for w in tg["timeline"]:
                s0 = w["t"] - off
                if s0 + 3.0 <= a or s0 >= c:
                    continue
                rd = {}
                for lab, pts in tg.get("watch_windows", {}).items():
                    if tagcheck.label_kind(lab) in ("phone", "voice", "alarm", "foghorn"):
                        for t_, p_ in pts:
                            if abs(t_ - w["t"]) < 1e-6:
                                rd[lab] = p_
                rows.append({"window_s": [round(s0, 1), round(s0 + 3, 1)], "top3": [t["label"] for t in w["top"]],
                             "watch": rd})
        out[label] = {"span_s": [a, c], "windows": rows,
                      "max": max((v for r_ in rows for v in r_["watch"].values()), default=0.0)}
    return out


def checks(out_dir):
    cdir = os.path.join(out_dir, "checks")
    os.makedirs(cdir, exist_ok=True)
    res = {}
    jobs = [("web", "", "preview_cues.json", []),
            ("social", "", "preview_cues.json", ["--no-png"]),
            ("x30", "_x30", "preview_cues.x30.json",
             ["--target", "social", "--cut", os.path.join(out_dir, "x30_cut.json")])]
    for name, sfx_, cues, extra in jobs:
        p = subprocess.run([PY, "-I", os.path.join(AUDIO, "mix_checks.py"),
                            os.path.join(out_dir, f"preview_{name}.wav"), cdir, "--name", name,
                            "--bed", os.path.join(out_dir, f"bed{sfx_}.wav"), "--cues",
                            os.path.join(out_dir, cues), "--film-cues", os.path.join(out_dir, "preview_cues.json"),
                            "--sound-tags", SOUND_TAGS, "--ffmpeg", FFMPEG, *extra], capture_output=True, text=True)
        lines = p.stdout.strip().splitlines()
        res[name] = {"exit": p.returncode, "summary": json.loads(lines[-1]) if lines else None,
                     "stderr": p.stderr[-2000:]}
    with tempfile.TemporaryDirectory(dir=cdir) as tmp:
        for name in ("web", "social", "x30"):
            kind = "x30" if name == "x30" else "film"
            res[name]["after_silence"] = after_silence(os.path.join(out_dir, f"preview_{name}.wav"),
                                                       AFTER_SILENCE[kind], tmp)
            res[name]["windows"] = windows(cdir, name, WINDOWS[kind])
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
        for x in s.get("notes", []):
            print("   note", x)
        a = r["after_silence"]
        print(f"   after silence: pass {a['pass']}", a["fails"] or "", a["warnings"] or "")
        for row in a["rows"]:
            print(f"      {row['at']} ({row['first_s']} s): {row['top3']} {row['watch']}")
        for label, w in r["windows"].items():
            print(f"   {label} {w['span_s']}: max phone/voice/alarm/foghorn {w['max']}")
        if r["exit"] not in (0, 1):
            print(r["stderr"])


def pictures(out_dir):
    """Pictures to look at (then delete): the web preview's waveform, and spectrograms of the trailer's key moments
    (the tension 0-21.6 s; the turn, the stop and the drop 16.8-26.4 s; the climax 47.4-60.0 s; the end 66-76.8 s)."""
    d = os.path.join(out_dir, "checks")
    os.makedirs(d, exist_ok=True)
    src = os.path.join(out_dir, "preview_web.wav")
    out = [os.path.join(d, "web.wave.png")]
    subprocess.run([FFMPEG, "-hide_banner", "-loglevel", "error", "-y", "-i", src, "-filter_complex",
                    "aformat=channel_layouts=mono,showwavespic=s=1800x360:colors=0x2a6f4a:scale=lin", "-frames:v", "1",
                    out[0]], check=True)
    for name, ss, dur in (("tension", 0.0, 21.6), ("drop", 16.8, 9.6), ("climax", 47.4, 12.6), ("title", 66.0, 10.8)):
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
    ap.add_argument("step", choices=["events", "render", "audition", "mix", "report", "checks", "pictures", "preview",
                                     "all"])
    ap.add_argument("--out", default=OUT)
    ap.add_argument("--x30-only", action="store_true", help="render: only the x30 stems")
    ap.add_argument("--film-only", action="store_true", help="render: only the film's stems")
    ap.add_argument("--bars", default="1,2", help="audition: these film bars, in this order")
    ap.add_argument("--checks", action="store_true", help="all: run the classifier checks too")
    ap.add_argument("--m4a", help="preview (or all): the AAC 192k file to write from preview_web.wav")
    a = ap.parse_args(argv)
    os.makedirs(a.out, exist_ok=True)
    if a.step == "events":                                    # the arrangement only, no audio: counts and sync points
        g = S.Grid.from_beatmap()
        for label, bars in (("film", FILM_BARS), ("x30", X30_BARS)):
            A = Arr(g, bars)
            compose(A)
            counts = {k: len(v) for k, v in sorted(A.ev.items())}
            print(f"{label}: {sum(counts.values())} events, {A.n} samples; {counts}")
            for name in ("crash", "impact", "qhit", "sub"):
                print(f"   {name} frames:",
                      [round(e.t * FPS, 2) for e in sorted(A.ev.get(name, []), key=lambda e: e.t)])
        return
    if a.step == "audition":
        rep = audition([int(x) for x in a.bars.split(",")], a.out)
        print(json.dumps(rep, indent=1))
        return
    if a.step in ("render", "all"):
        reps = {}
        if not a.x30_only:
            reps["film"] = render(FILM_BARS, a.out, "")
        if not a.film_only:
            reps["x30"] = render(X30_BARS, a.out, "_x30")
        with open(os.path.join(a.out, "render.json"), "w") as f:
            json.dump(reps, f, indent=1)
        for k, r in reps.items():
            print(f"{k}: {r['events']} events, {r['seconds_to_render']} s, limiter {r['linked_limiter']}, "
                  f"trim {r['trim_db']} dB; bed "
                  f"{r['bed']['lufs']} LUFS peak {r['bed']['peak_dbfs']}; drive {r['drive']['lufs']} LUFS peak "
                  f"{r['drive']['peak_dbfs']}; bass bus under music bus {r['bass_bus_under_music_bus_lu']} LU; "
                  f"spans {r['spans_out_frames']}")
    if a.step in ("mix", "all"):
        for k, r in mix(a.out).items():
            print(f"{k}: {r['integrated_lufs']} LUFS, {r['true_peak_dbtp_4x']} dBTP, ceiling {r['ceiling_dbtp']}, "
                  f"{r['samples']} samples, AAC {r.get('aac', {}).get('true_peak_dbtp')}")
    if a.step in ("report", "all"):
        print_report(report(a.out))
    if a.step == "checks" or (a.step == "all" and a.checks):
        print_checks(checks(a.out))
    if a.step in ("pictures", "all"):
        print("pictures:", *pictures(a.out))
    if a.step == "preview" or (a.step == "all" and a.m4a):
        if not a.m4a:
            ap.error("preview needs --m4a FILE")
        print("preview:", preview_m4a(a.out, a.m4a))


if __name__ == "__main__":
    main()
