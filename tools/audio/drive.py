"""The energetic recut's drive stem (ENERGY_SPEC §8.2): a synthesised drum-and-sub groove that runs under the kept bed.
numpy, scipy and pedalboard only, no samples: our own work, released CC0 1.0 with the film. The bed
(compose_score.py --seed 7, played by render_sampled.py) is untouched: the drive is a separate stem, and
tools/audio/mix_master.py --drive mixes it under the bed, so the hold and the gaps can treat the two apart.

Voices (all mono except the hats and the crash):
  SUB    a sine on the bar's root, through a biased tanh (2nd harmonic -21 dB, 3rd -22 dB, so laptops hear it),
         HPF 28 Hz. On a hit it starts an octave above and falls to the root in 25 ms. In a groove it is ducked 6 dB
         for 90 ms by each kick, the drive's own and the bed's felt kick (compose_score.py: bars 8-25 on 1 and 3, 2.5
         in 23-25; bars 29-31 on 1).
  KICK   a 2 ms click and a 160 -> 48 Hz sine, tau 0.18 s.
  SNAP   three 1-3 kHz noise bursts 6-11 ms apart (irregular, per hit) and a 120 ms plate tail. CLAP is the same at
         60 % with a 190 Hz noise body, used in groove C only.
  HAT    7-12 kHz noise, closed (tau 18 ms, 3 ms attack, pan +0.2) and open (tau 110 ms, pan -0.2); 16ths accented
         1 .45 .7 .45.
  TOM    A2, D3 and E3 (110, 147, 165 Hz: chord tones of bars 9 and 22), each falling 25 % in 60 ms.
  CRASH  5-12 kHz noise, 8 ms attack, tau 1.1 s, no tone.
  RIM    a 12 ms 2-6 kHz noise click (the breakdown's tick-hits only).
The pattern is the spec's 32-bar table, keyed by the score's bars, with the grooves A, A', B and C. Roots per bar are
hard-coded and checked against tools/audio/beatmap.json chords_by_bar. Every onset sits exactly on the 18-frame beat
grid: no humanisation, and each starts on sample frame x 1,600 (the 16ths too). validate_bed.py's <= 5 ms gate holds:
a 2.5 ms median on this stem alone and 4.1 ms on the bed plus the drive (the bed alone: 3.4 ms). Single downbeats can
read up to 34 ms late, because the validator, made for the bed, measures sustained low sines poorly: its 2 ms envelope
ripples at twice the tone's frequency, and where the kick's sweep beats against a sub it can pick a later ripple (the
first version of this stem, with a harder tanh, read 6.4 ms). The hats skip every click and key frame (f18, 54, 810,
1080, 1224, 1332, 1404, 1440, 1530). Where the table says "silent from", the drive gates itself to exact zeros
(10 ms down, ending on that frame; back on the next bar line): the composed breath f486-503 is silent by itself.
Each event draws its noise from its own generator, seeded by (seed, score bar, beat, voice), so a bar sounds the same
wherever an arrangement plays it.

CLASSIFIER (the gate binds over §8.2's recipe: OVERRIDES §34, ENERGY_SPEC §11). The drive alone tags clean (phone 0.067,
voice 0.043, alarm 0.109), but under the kept bed the spec's pattern made Apple's SoundAnalysis hear a phone:
telephone and ringtone up to 0.63 (gate 0.30, target 0.25), where the bed alone reads under 0.15. The bed's mallets
(marimba and kalimba ostinatos in 8ths) with any steady percussion over them read as a ringtone; the level hardly
matters (the whole drive 6 dB down still read 0.59). Measured one change at a time on test mixes (bed + automation
+ drive, -16 LUFS, both window grids), these changes bring it to 0.25:
  - the closed hats play quarter notes (QUARTER_HAT_BARS) instead of 8ths and 16ths: 0.63 -> 0.41; 8ths kept 12 dB
    down still read 0.48. The drop (bar 8) and the AgentGuard climax (bars 13-17, the bar 16 build included) keep
    their 8ths and 16ths, which read no worse; 8ths in the hook read 0.30 (3-6 s);
  - grooves A and A' have no snaps on 2 and 4 (the bed's own groove carries the proof's backbeat): the windows over
    bars 9-12 and 18-22 fall under 0.25; snaps there at half velocity still read 0.41;
  - no short ghost subs in bars 4-5 (f252, f315, f324) and no sub on 2.5 in groove C: short pitched sub blips over
    the kalimba read as a ringtone (0.34 -> 0.28);
  - the snap's three bursts at irregular gaps (exactly 7 ms apart they buzz at 143 Hz: "mosquito_buzz" 0.79), the
    snap and clap 4 dB down, softer hat and burst attacks, half the kick's click, and a gentler bias on the sub's
    tanh (2nd and 3rd harmonics at -21 and -22 dB instead of -14 and -19.5).
Darker snaps (400-1500 Hz) read worse in the build (0.57). The tension bars' slams, the drop, the lift, the final hit,
grooves B and C, the fills and the bar 16 build keep the spec's shape. On part 1's scratch masters every gate passed,
with phone readings of 0.25-0.28 (warnings) at 21-25.5 s and 67.5-70.5 s; FINAL MIXES (below) brings every window under
0.25. The final stem alone reads phone 0.082, voice 0.042, alarm 0.142 ('beep', in the 0.75 s opening pass, not in a
top 3).

Level: one bus gain (BUS_DB), calibrated so the drive alone over bars 3-30 sits 4 LU under the bed alone over the same
bars (ENERGY_SPEC §8.2: 3-5 LU, start at 4). With the bed on disk the script measures and prints that difference.
Tune it here (final_mix.sh re-renders the drive when this file is newer than drive.wav), or with --bus-db.

FINAL MIXES (the score lane, part 2, 2026-10-25; scratch masters through mix_master.py and mix_checks.py, both grids):
  - BUS_DB stays at -9.9. A louder bus helps the hook's dynamics check but not enough: at 3.0 LU under the bed (-8.8,
    the hook's drive held at its level) bars 1-2 sit 3.74 LU under the web master (want 4-8), 3.98 with no drive in
    bars 1-2 at all, because the kept bed's own bars 1-2 sit only 2.74 LU under its integrated level. It also took
    the social master's phone reading to 0.297 (gate 0.30) and the AAC true peak up.
  - The hits (each hit's effects and this stem against the bed, K-weighted over the impact's peak +- 100 ms; ENERGY_SPEC
    §8.5 wants 3-6 dB): the breakdown's hit (bar 26) and the end-card landing (bar 29) were 1.2 and 3.0 dB over the
    bed, so their kick and sub rise (bar 26 0.7 and 0.6 -> 1.0 and 0.85; bar 29 0.8 -> 0.9), and Verified (bar 17)
    was 6.6, so its slam plays at 0.85 (its crash unchanged: a crash 0.9 -> 0.6 moved it 0.1 dB). With the kit's
    impacts at -4 dB the hits read: the first slam 4.9, the reveal 3.6, Verified 5.6, the lift 3.4, the breakdown 3.9,
    the end-card landing 3.7, the final hit 6.0. Raising the whole of bar 29 instead read 'ringtone' 0.30 at
    67.5-70.5 s on the social master: only the downbeat's hit rises.
  - Bar 7 (the build) plays 1 dB under the levels written below, and the kit's riser 1 dB down, so the drop sits 3 LU
    or more over the build on the -14 LUFS x30 too (3.10; web 3.36; social 2.86, under its 3, from the heavier
    limiting at -14 LUFS).
  - Phone windows (OVERRIDES §36: every window under 0.25 before delivery). Ablations on the web master, one change per
    window, found the cause of each reading over 0.25, and these changes bring them all under it:
      21-24 s (telephone 0.279; bed alone < 0.1) and 22.5-25.5 s (ringtone 0.253): bars 10-11's hats at half
      velocity and no sub on 3 in bars 10 and 12 (both windows < 0.2). Hats off read 0.20, the sub off alone 0.24;
      the toms on f630-642 and the f666 snap help: without the toms 0.39, without the snap (and the sub) 0.33;
      55.5-58.5 s (0.245 web, 0.252 social; bed alone < 0.1): no claps in bars 24-25 and their snaps 3 dB down
      (< 0.2; the claps off alone 0.21; the open hats off changed nothing). Bar 23, the lift, keeps its claps;
      67.5-70.5 s (telephone 0.266, ringtone 0.26; bed alone 0.15 and 0.13): no soft snap on beat 4 of bar 29 (0.18;
      bar 29's sub on 3 off 0.25, its hats off 0.22, bar 30's kick off changed nothing).
  - 'foghorn' over the final hit (OVERRIDES §36: under 0.30): 0.46 web, 0.52 social, 0.59 x30. Shortening or lowering
    the sub did not lower it (1.5 s 0.46, 1.0 s 0.49, at 0.7 0.50), and neither did leaving out the sub (0.43), the
    crash (0.71) or the impact (0.79): the same mix with no fade at all reads 0.12. The cause is the tail's fade,
    linear in dB, which takes the final chord 30 dB down in its first 0.6 s. With the kit's equal-power tail (tail
    curve 'sine'), the sub at 1.5 s, the kick at 0.6 and the crash at 1.4 the hit reads 0.25 web, 0.25 social, 0.28
    x30 (all its windows), and sits 5.6 dB over the bed.
  - Final (web, social, x30): phone max 0.219, 0.194 and 0.178; the hits 3.4-5.6 dB over the bed.

Usage: python -I drive.py [--form film|x30|<bar,bar,...>] [--cut docs/film-cuts/x30.json] [--out OUT.wav] [--seed 7]
                          [--bus-db DB] [--bed .work/audio/render/music_bed.wav] [--stems DIR]
  --form film (the default) writes .work/audio/render/drive.wav: exactly 3,686,400 samples (76.8 s).
  --cut CUT.json plays the cut's music.score_bars in order (checked against its music.form and its frames) and writes
        .work/audio/render/drive_<name>.wav: for x30, exactly 1,382,400 samples (28.8 s).
Writes 48 kHz 24-bit stereo, plus OUT.json (the events, the gates and the level report), and prints its SHA-256.
"""
import argparse
import hashlib
import json
import os
import sys

import numpy as np
import pyloudnorm as pyln
import soundfile as sf
from scipy.signal import butter, sosfilt

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
RENDER = os.path.join(REPO, ".work", "audio", "render")

ap = argparse.ArgumentParser()
ap.add_argument("--form", default=None, help="film (default), a name from FORMS, or the score's bars, e.g. 1,6,7,8")
ap.add_argument("--cut", help="a cut file (docs/film-cuts/<name>.json): its music.score_bars, in order")
ap.add_argument("--out", help="default: .work/audio/render/drive.wav, or drive_<cut name>.wav")
ap.add_argument("--seed", type=int, default=7)
ap.add_argument("--bus-db", type=float, default=None, help="override BUS_DB, the drive's bus gain")
ap.add_argument("--bed", default=os.path.join(RENDER, "music_bed.wav"), help="the film bed, for the level report")
ap.add_argument("--beatmap", default=os.path.join(HERE, "beatmap.json"))
ap.add_argument("--stems", help="also write each voice group (sub, kick, snap, hat, tom, crash, rim) to this folder")
a = ap.parse_args()

SR = 48000
FPS = 30
BEAT_F = 18                      # frames per beat (100 BPM at 30 fps)
BAR_F = 72
SPF = SR // FPS                  # 1,600 samples per frame: every 16th (4.5 frames) is a whole number of samples
N_BARS = 32
BUS_DB = -9.9                    # the bus gain: 4.1 LU under the film bed over bars 3-30 (see "Level" above)

# ---- the arrangement: the score's bars in playing order (as compose_score.py's FORMS) ----
FORMS = {"film": list(range(1, N_BARS + 1)), "x30": [1, 6, 7, 8, 9, 14, 15, 16, 17, 30, 31, 32],
         "x30-product": [1, 13, 14, 15, 16, 17, 6, 7, 29, 30, 31, 32]}
cut = None
if a.cut:
    cut = json.load(open(a.cut, encoding="utf-8"))
    music = cut["music"]
    form_name = a.form or music["form"]
    FORM = list(music["score_bars"])
    if form_name in FORMS and FORMS[form_name] != FORM:
        sys.exit(f"drive: the cut's music.score_bars {FORM} is not form {form_name!r} {FORMS[form_name]}")
    if len(FORM) * BAR_F != cut["frames"]:
        sys.exit(f"drive: {len(FORM)} bars of {BAR_F} frames is not the cut's {cut['frames']} frames")
    if cut.get("fps", FPS) != FPS:
        sys.exit(f"drive: the cut runs at {cut.get('fps')} fps, the score at {FPS}")
else:
    form_name = a.form or "film"
    try:
        FORM = FORMS[form_name] if form_name in FORMS else [int(b) for b in form_name.split(",")]
    except ValueError:
        sys.exit(f"drive: --form {form_name!r}: a name ({', '.join(FORMS)}) or a comma list of bars")
if not FORM or any(not 1 <= b <= N_BARS for b in FORM):
    sys.exit(f"drive: every bar must be 1-{N_BARS}")
OUT_FRAMES = len(FORM) * BAR_F
N = OUT_FRAMES * SPF
name = cut["name"] if cut else ("film" if FORM == FORMS["film"] else form_name.replace(",", "-"))
out_path = a.out or os.path.join(RENDER, "drive.wav" if name == "film" else f"drive_{name}.wav")


# ---- roots per bar (ENERGY_SPEC §8.2), checked against the beat map's chords ----
def nm(s):
    """'F#2' -> MIDI."""
    p = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}[s[0]] + (1 if "#" in s else -1 if s[1] == "b" else 0)
    return 12 * (int(s[-1]) + 1) + p


ROOT = {1: "D2", 2: "D2", 3: "B1", 4: "G1", 5: "E2", 6: "G1", 7: "A1", 8: "D2", 9: "D2",
        10: "C#2", 11: "B1", 12: "G1", 13: "D2", 14: "C#2", 15: "B1", 16: "G1",
        17: "E2", 18: "A1", 19: "F#2", 20: "B1", 21: "G1", 22: "A1",
        23: "D2", 24: "C#2", 25: "G1", 26: "B1", 27: "G1", 28: "A1",
        29: "D2", 30: "G1", 31: "D2", 32: "D2"}
BM = json.load(open(a.beatmap))
for bar, root in ROOT.items():
    chord = BM["chords_by_bar"][str(bar)]
    bass = chord.split("/")[1] if "/" in chord else chord[: 2 if len(chord) > 1 and chord[1] in "#b" else 1]
    if nm(root) % 12 != nm(bass + "2") % 12 or not nm("E1") <= nm(root) <= nm("F#2"):
        sys.exit(f"drive: bar {bar}: root {root} is not the bass of {chord} (beatmap.json chords_by_bar)")
if (BM["fps"], BM["frames_per_beat"], BM["bar_frames"]) != (FPS, BEAT_F, BAR_F):
    sys.exit("drive: beatmap.json's grid is not 30 fps, 18 frames a beat, 72 a bar")

TOMS = {"A2": nm("A2"), "D3": nm("D3"), "E3": nm("E3")}
# click and key frames of the film (FILM_SPEC §10, ENERGY_SPEC §8.2) as (score bar, beat): the hats skip them
SKIP_HAT = {(1, 2.0), (1, 4.0), (12, 2.0), (16, 1.0), (18, 1.0), (19, 3.0), (20, 3.0), (21, 1.0), (22, 2.0)}
# the bed's felt kick (compose_score.py), which ducks the groove sub as the drive's own kicks do
BED_KICKS = {**{b: (1.0, 3.0) for b in range(8, 23)}, **{b: (1.0, 2.5, 3.0) for b in (23, 24, 25)},
             29: (1.0,), 30: (1.0,), 31: (1.0,)}


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def frame_of(bar, beat):
    """The film frame of (score bar, beat): 72(bar - 1) + 18(beat - 1)."""
    return BAR_F * (bar - 1) + BEAT_F * (beat - 1)


assert sorted(frame_of(b, t) for b, t in SKIP_HAT) == [18, 54, 810, 1080, 1224, 1332, 1404, 1440, 1530]

# ---- the pattern: events per score bar, (beat, voice, params) ----
QUARTER_HAT_BARS = set(range(1, N_BARS + 1)) - {8, 13, 14, 15, 16, 17}   # quarter-note hats (CLASSIFIER, above)
EV = {b: [] for b in range(1, N_BARS + 1)}
GATES = {}          # score bar -> beat from which the drive is silent to the bar's end


def ev(bar, beat, voice, vel, **kw):
    EV[bar].append(dict(beat=float(beat), voice=voice, vel=float(vel), **kw))


def sub(bar, beat, length, vel, hit=False, duck=None):
    """A sub note. hit: the octave drop, never ducked. Otherwise ducked under kicks (a groove) unless duck=False."""
    ev(bar, beat, "sub", vel, length=length, hit=hit, duck=(not hit) if duck is None else duck)


def hats(bar, beats, vel, open_at=(), sixteenths=False, ramp=None):
    """Closed hats on each 8th (or 16th) in [beats[0], beats[1]), on the quarters in QUARTER_HAT_BARS (CLASSIFIER, above);
    open hats at open_at; ramp=(v0, v1) for a swell."""
    step = 1.0 if bar in QUARTER_HAT_BARS else 0.25 if sixteenths else 0.5
    grid = np.arange(beats[0], beats[1] - 1e-9, step)
    for i, t in enumerate(grid):
        if any(abs(t - o) < 1e-9 for o in open_at):
            continue
        acc = [1.0, 0.45, 0.7, 0.45][int(round((t - 1) / 0.25)) % 4] if sixteenths else 1.0
        v = vel if ramp is None else ramp[0] + (ramp[1] - ramp[0]) * i / max(1, len(grid) - 1)
        ev(bar, t, "hat", v * acc)
    for o in open_at:
        ev(bar, o, "ohat", vel)


def groove(bar, kind, start=1.0, end=5.0, sub_on_3=False, hat_vel=0.5, vel=1.0, clap=True, backbeat=1.0):
    """Grooves A, A', B and C (ENERGY_SPEC §8.2) over beats [start, end); vel scales the subs, kicks and snaps. Groove C
    only: clap=False leaves out its claps, and backbeat scales its snaps on 2 and 4 (FINAL MIXES, above)."""
    inside = lambda t: start <= t < end  # noqa: E731
    if kind in ("A", "A'"):
        if inside(1.0):
            sub(bar, 1.0, 0.8, 0.6 * vel)
        if kind == "A" and sub_on_3 and inside(3.0):
            sub(bar, 3.0, 0.8, 0.55 * vel)
        hats(bar, (start, end), hat_vel)              # no snaps on 2 and 4 (CLASSIFIER, above)
    elif kind == "B":
        for t in (1.0, 3.0):
            if inside(t):
                sub(bar, t, 0.3, 0.6 * vel)
        if inside(2.5):
            ev(bar, 2.5, "kick", 0.7 * vel)
        for t in (2.0, 4.0):
            if inside(t):
                ev(bar, t, "snap", 0.7 * vel)
        hats(bar, (start, end), hat_vel, open_at=[t for t in (4.5,) if inside(t)], sixteenths=True)
    elif kind == "C":
        for t, ln in ((1.0, 0.5), (3.0, 0.5)):        # the sub on 2.5 left out (CLASSIFIER, above)
            if inside(t):
                sub(bar, t, ln, 0.6 * vel)
        for t in (2.0, 4.0):
            if inside(t):
                ev(bar, t, "snap", 0.75 * vel * backbeat)
                if clap:
                    ev(bar, t, "clap", 0.75 * vel)
        hats(bar, (start, end), hat_vel, open_at=[t for t in (1.5, 2.5, 3.5, 4.5) if inside(t)], sixteenths=True)


def slam(bar, vel=1.0, sub_len=0.5, snap=True, crash=0.0):
    """A hit on the downbeat: the sub's octave drop, a kick, a snap (and a crash)."""
    sub(bar, 1.0, sub_len, vel, hit=True)
    ev(bar, 1.0, "kick", vel)
    if snap:
        ev(bar, 1.0, "snap", vel)
    if crash:
        ev(bar, 1.0, "crash", crash)


SOFT = 10 ** (-18 / 20)          # "about 18 dB under the slam level"

# bar 1: a soft kick and a 0.3 s sub on beat 2 (the click, f18); soft 8th hats from beat 2.5 (none on f54)
ev(1, 2.0, "kick", SOFT)
sub(1, 2.0, 0.3, SOFT, duck=False)
hats(1, (2.5, 5.0), 0.22)
# bar 2: the sub heartbeat on 1 and 3; 8th hats rising, 16ths on beat 4; silent from f135
sub(2, 1.0, 0.4, 0.3, duck=False)
sub(2, 3.0, 0.4, 0.3, duck=False)
hats(2, (1.0, 4.0), 0.25, ramp=(0.25, 0.45))
ev(2, 4.0, "hat", 0.5)
ev(2, 4.25, "hat", 0.32)
GATES[2] = 4.5
# bars 3-5: the slams; hats build quarters -> 8ths -> 16ths; pickups and the bar-5 snap fill
slam(3)
for t in (2.0, 3.0, 4.0):
    ev(3, t, "hat", 0.42)
ev(3, 4.5, "snap", 0.35)
slam(4)
hats(4, (1.0, 5.0), 0.42)
ev(4, 4.5, "snap", 0.35)                          # no ghost sub on f252 (CLASSIFIER, above)
slam(5)
hats(5, (1.0, 5.0), 0.46, sixteenths=True)        # no subs on f315 and f324 (CLASSIFIER, above)
for i, t in enumerate((4.0, 4.25, 4.5, 4.75)):
    ev(5, t, "snap", 0.4 + 0.5 * i / 3)
# bar 6: a hit, then four on the floor, snaps on 2 and 4, 8th hats in a crescendo
slam(6, vel=0.9, sub_len=0.6)
for t in (2.0, 3.0, 4.0):
    ev(6, t, "kick", 0.75)
for t in (2.0, 4.0):
    ev(6, t, "snap", 0.7)
hats(6, (1.0, 5.0), 0.5, ramp=(0.25, 0.7))
# bar 7: kicks on 1, 2, 3 and 3.5; a snap roll in 8ths then 16ths, 0.3 -> 1.0; 16th hats; sub A1 on 1 and 3;
# nothing from beat 4 (the composed breath, f486-503). Held under bar 6, so the drop lands at least 3 LU over this
# bar on the web master (ENERGY_SPEC §8.5; measured: 2.78 LU with bar 7 a quarter louder, 3.13 as here)
for t, v in ((1.0, 0.49), (2.0, 0.45), (3.0, 0.49), (3.5, 0.45)):
    ev(7, t, "kick", v)
roll = (1.0, 1.5, 2.0, 2.5, 3.0, 3.25, 3.5, 3.75)
for i, t in enumerate(roll):
    ev(7, t, "snap", 0.64 * (0.3 + 0.7 * i / (len(roll) - 1)))
hats(7, (1.0, 4.0), 0.36, sixteenths=True)
sub(7, 1.0, 0.6, 0.34)
sub(7, 3.0, 0.5, 0.34)
GATES[7] = 4.0
for e in EV[7]:                                   # 1 dB under the levels above (FINAL MIXES: the drop over the build)
    e["vel"] *= 10 ** (-1.0 / 20)
# bar 8: THE DROP (crash, kick, a 1.5 s sub D2 from the octave above), then groove B from beat 2
slam(8, sub_len=1.5, snap=False, crash=1.0)
groove(8, "B", start=2.0, vel=1.15, hat_vel=0.55)
# bar 9: groove A; the tom triplets on beat 4 (A2 f630, D3 f636, E3 f642) instead of beat 4's snap and hats
groove(9, "A", end=4.0)
for i, (t, tom) in enumerate(((4.0, "A2"), (4.0 + 1 / 3, "D3"), (4.0 + 2 / 3, "E3"))):
    ev(9, t, "tom", 0.6 + 0.1 * i, note=tom)
# bars 10-12: groove A; an accent kick and snap on f666; the snap fill f846-859.5. Not §8.2's sub on 3 in bars 10 and 12,
# and the hats at half velocity in bars 10-11 (FINAL MIXES: the phone readings at 21-25.5 s)
for b in (10, 11, 12):
    groove(b, "A", end=4.0 if b == 12 else 5.0, hat_vel=0.25 if b in (10, 11) else 0.5)
ev(10, 2.0, "kick", 0.75)
ev(10, 2.0, "snap", 0.85)
hats(12, (4.0, 5.0), 0.5)
for i, t in enumerate((4.0, 4.25, 4.5, 4.75)):
    ev(12, t, "snap", 0.4 + 0.5 * i / 3)
# bar 13: a hit, then groove B (the mix's hold mutes it from f891)
slam(13, vel=0.9, sub_len=0.6)
groove(13, "B", start=2.0)
# bar 14: silent on beats 1-3; the release on beat 4: snaps f994.5, 999, 1003.5 (0.4 -> 0.9), rising hats
for i, t in enumerate((4.25, 4.5, 4.75)):
    ev(14, t, "snap", 0.4 + 0.25 * i)
    ev(14, t, "hat", 0.3 + 0.15 * i)
# bar 15: crash, kick and sub B1 on 1; groove B
slam(15, vel=0.9, sub_len=0.6, snap=False, crash=0.8)
groove(15, "B")
# bar 16: the build: a kick on every beat, snaps on 2 and 4 plus 8ths f1116, 1125, 1134, 16th hats, pumping 8th subs
for t in (1.0, 2.0, 3.0, 4.0):
    ev(16, t, "kick", 0.8)
for t, v in ((2.0, 0.7), (3.0, 0.6), (3.5, 0.7), (4.0, 0.85)):
    ev(16, t, "snap", v)
hats(16, (1.0, 4.5), 0.5, sixteenths=True)
for t in np.arange(1.0, 4.5, 0.5):
    sub(16, float(t), 0.26, 0.5)
GATES[16] = 4.5
# bar 17: Verified: crash, kick and a 1.5 s sub E2 on 1; groove B from beat 2; a ghost snap on 4.75. The slam's kick and
# sub at 0.85, so the hit sits 6 dB or less over the bed (FINAL MIXES)
slam(17, vel=0.85, sub_len=1.5, snap=False, crash=0.9)
groove(17, "B", start=2.0)
ev(17, 4.75, "snap", 0.3)
# bars 18-21: groove A' (sub on 1 only)
for b in (18, 19, 20, 21):
    groove(b, "A'")
# bar 22: groove A' to beat 3; the tom fill in 16ths from f1548; silent from f1575
groove(22, "A'", end=3.0)
for i, (t, tom) in enumerate(((3.0, "A2"), (3.25, "A2"), (3.5, "D3"), (3.75, "D3"), (4.0, "E3"), (4.25, "E3"))):
    ev(22, t, "tom", 0.5 + 0.35 * i / 5, note=tom)
GATES[22] = 4.5
# bars 23-25: THE LIFT (crash, kick, a 1 s sub D2); groove C; accents (kick and snap) on f1656 and f1728; silent from
# f1782 (the badge dive's whoosh carries the seam)
slam(23, sub_len=1.0, snap=False, crash=1.0)
for b in (23, 24, 25):                            # the fullest groove; bars 24-25 without claps, their snaps 3 dB down
    groove(b, "C", end=4.0 if b == 25 else 5.0, vel=1.2, hat_vel=0.6, clap=b == 23, backbeat=1.0 if b == 23 else 0.708)
for b in (24, 25):
    ev(b, 1.0, "kick", 0.85)
    ev(b, 1.0, "snap", 0.85)
GATES[25] = 4.0
# bar 26: the breakdown's one hit (kick, a 1 s sub B1), then no drums; at a slam's kick, so the hit sits 3 dB or more
# over the bed (FINAL MIXES)
sub(26, 1.0, 1.0, 0.85, hit=True)
ev(26, 1.0, "kick", 1.0)
# bar 27: a soft tom A2 and a rim tick on f1872 and f1926
for t in (1.0, 4.0):
    ev(27, t, "tom", SOFT, note="A2")
    ev(27, t, "rim", SOFT)
# bar 28: the hats return and swell f1944-2006 (0.1 -> 0.6), an open hat on f2007
hats(28, (1.0, 4.5), 0.6, ramp=(0.1, 0.6))
ev(28, 4.5, "ohat", 0.5)
# bars 29-30: the end card: a hit, then a soft groove (sub on 3, 8th hats; not §8.2's soft snap on 4); silent from
# f2151. The hit's kick and sub at 0.9 (FINAL MIXES)
sub(29, 1.0, 1.0, 0.9, hit=True)
ev(29, 1.0, "kick", 0.9)
sub(29, 3.0, 0.5, 0.45)
hats(29, (1.0, 5.0), 0.34)
sub(30, 1.0, 0.6, 0.6)                            # not a hit: no octave drop, ducked under its kick
ev(30, 1.0, "kick", 0.6)
sub(30, 3.0, 0.5, 0.45)
hats(30, (1.0, 4.5), 0.34)
GATES[30] = 4.5
# bar 31: THE FINAL HIT (crash, kick, a sub D2 from the octave above), then nothing; bar 32: nothing. The sub 1.5 s, not
# §8.2's 2.5 s, the kick at 0.6 and the crash at 1.4, with the kit's equal-power tail (FINAL MIXES: 'foghorn')
sub(31, 1.0, 1.5, 1.0, hit=True)
ev(31, 1.0, "kick", 0.6)
ev(31, 1.0, "crash", 1.4)

# the hats skip the click and key frames; a groove sub never starts under a hit's sub that is still sounding
for b in EV:
    EV[b] = [e for e in EV[b] if not (e["voice"] in ("hat", "ohat") and (b, e["beat"]) in SKIP_HAT)]
    hits = [(e["beat"], e["beat"] + e["length"] * FPS / BEAT_F) for e in EV[b] if e["voice"] == "sub" and e["hit"]]
    EV[b] = [e for e in EV[b] if not (e["voice"] == "sub" and not e["hit"] and any(h0 <= e["beat"] < h1 for h0, h1 in hits))]

# ---- the voices (mono numpy arrays at SR, starting at their onset) ----
# voice levels, set on each hit's K-weighted level over its first 100 ms against the kick's: the hit sub level with
# it, the groove sub about 5 dB under, snap 3.5, open hat 12, closed hat 14, crash 6 and the toms 2 dB under
VOICE_DB = {"sub": -2.0, "kick": 0.0, "snap": 4.0, "clap": 2.0, "hat": -8.0, "ohat": -13.0, "tom": -4.0,
            "crash": -10.0, "rim": 8.0}                                   # snap and clap 4 dB down (CLASSIFIER)
SUB_DC = float(np.mean(np.tanh(1.2 * (np.sin(2 * np.pi * np.arange(4800) / 4800) + 0.2)) - np.tanh(0.24)))


def band(g, n, lo, hi, order=2):
    return sosfilt(butter(order, [lo, min(hi, 0.45 * SR)], btype="bandpass", fs=SR, output="sos"), g.standard_normal(n))


def env_decay(n, tau, attack):
    t = np.arange(n) / SR
    return np.minimum(1.0, t / attack) * np.exp(-t / tau)


def close(x, sec):
    """A smooth end over the last sec seconds."""
    k = min(len(x), int(sec * SR))
    x[len(x) - k:] *= np.cos(0.5 * np.pi * np.arange(k) / k) ** 2
    return x


def v_sub(g, root, length, hit):
    n = int(round((length + 0.03) * SR))
    t = np.arange(n) / SR
    f0 = mtof(root)
    f = f0 * 2 ** np.clip(1 - t / 0.025, 0, 1) if hit else np.full(n, f0)   # the octave drop in 25 ms
    s = np.sin(2 * np.pi * np.cumsum(f) / SR)
    y = np.tanh(1.2 * (s + 0.2)) - np.tanh(0.24) - SUB_DC                    # 2nd and 3rd harmonics, no DC
    e = np.minimum(1.0, t / 0.003) * np.exp(-t / max(0.25, 1.2 * length))
    return close(y * e, min(0.12, 0.35 * length))


def v_kick(g):
    n = int(0.75 * SR)
    t = np.arange(n) / SR
    f = 48.0 + 112.0 * np.exp(-t / 0.03)                                     # 160 -> 48 Hz
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_decay(n, 0.18, 0.0005)
    k = int(0.002 * SR)
    click = np.zeros(n)
    click[:k] = band(g, k, 1500, 6000) * np.linspace(1, 0, k)
    click *= 0.25 / (np.abs(click).max() + 1e-12)
    return close(body + click, 0.1)


def v_snap(g, clap=False):
    n = int(0.16 * SR)
    y = np.zeros(n)
    d1, d2 = g.uniform(0.006, 0.011), g.uniform(0.006, 0.011)             # irregular gaps: no 143 Hz buzz
    for i, (at, amp) in enumerate(((0.0, 1.0), (d1, 0.85), (d1 + d2, 0.95))):
        k, i0 = int(0.006 * SR), int(at * SR)
        y[i0:i0 + k] += amp * band(g, k, 1000, 3000) * env_decay(k, 0.0025, 0.0012)
    k, i0 = int(0.106 * SR), int(0.014 * SR)                                  # the 120 ms plate tail
    y[i0:i0 + k] += 0.32 * band(g, k, 800, 6000) * env_decay(k, 0.035, 0.002)
    if clap:
        y *= 0.6
        k = int(0.1 * SR)
        y[:k] += 0.5 * band(g, k, 150, 240) * env_decay(k, 0.03, 0.002)     # the 190 Hz body
    return close(y, 0.01)


def v_hat(g, open_):
    tau = 0.11 if open_ else 0.018
    n = int((6 * tau + 0.01) * SR)
    return close(band(g, n, 7000, 12000) * env_decay(n, tau, 0.003), 0.01)


def v_tom(g, note):
    n = int(0.7 * SR)
    t = np.arange(n) / SR
    f0 = mtof(TOMS[note])
    f = f0 * (0.75 + 0.25 * np.exp(-t / 0.02))                               # falls 25 % in about 60 ms
    s = np.sin(2 * np.pi * np.cumsum(f) / SR)
    body = (np.tanh(1.4 * s) / np.tanh(1.4)) * env_decay(n, 0.2, 0.001)
    k = int(0.003 * SR)
    stick = np.zeros(n)
    stick[:k] = 0.25 * band(g, k, 2000, 5000) * np.linspace(1, 0, k)
    return close(body + stick, 0.08)


def v_crash(g):
    n = int(4.0 * SR)
    m = band(g, n, 5000, 12000)
    d = band(g, n, 5000, 12000)
    e = env_decay(n, 1.1, 0.008)
    return np.stack([close((0.8 * m + 0.35 * d) * e, 0.5), close((0.8 * m - 0.35 * d) * e, 0.5)])


def v_rim(g):
    n = int(0.04 * SR)
    return close(band(g, n, 2000, 6000) * env_decay(n, 0.006, 0.0002) * np.linspace(1, 0, n) ** 0.5, 0.004)


VOICE_ID = {v: i for i, v in enumerate(VOICE_DB)}
PAN = {"hat": 0.2, "ohat": -0.2}

# ---- render: each out bar plays its score bar's events at its own place on the timeline ----
GROUP = {"kick": "kick", "snap": "snap", "clap": "snap", "hat": "hat", "ohat": "hat", "tom": "tom", "crash": "crash",
         "rim": "rim"}
sub_hit = np.zeros(N)
sub_groove = np.zeros(N)
kit = {grp: np.zeros((2, N)) for grp in ("kick", "snap", "hat", "tom", "crash", "rim")}
duck_at = []          # samples where a kick ducks the groove sub
placed = []
for out_bar, bar in enumerate(FORM, 1):
    for k, e in enumerate(sorted(EV[bar], key=lambda e: (e["beat"], VOICE_ID[e["voice"]]))):
        f_out = BAR_F * (out_bar - 1) + BEAT_F * (e["beat"] - 1)
        i = int(round(f_out * SPF))
        g = np.random.default_rng([a.seed, bar, int(round(e["beat"] * 1000)), VOICE_ID[e["voice"]], k])
        v = e["voice"]
        amp = e["vel"] * 10 ** (VOICE_DB[v] / 20)
        if v == "sub":
            x = v_sub(g, nm(ROOT[bar]), e["length"], e["hit"]) * amp
            dst = sub_groove if e["duck"] else sub_hit
            j = min(N, i + len(x))
            dst[i:j] += x[: j - i]
        else:
            x = {"kick": lambda: v_kick(g), "snap": lambda: v_snap(g), "clap": lambda: v_snap(g, clap=True),
                 "hat": lambda: v_hat(g, False), "ohat": lambda: v_hat(g, True), "tom": lambda: v_tom(g, e["note"]),
                 "crash": lambda: v_crash(g), "rim": lambda: v_rim(g)}[v]() * amp
            if x.ndim == 1:
                ang = (PAN.get(v, 0.0) + 1) * np.pi / 4
                x = np.stack([x * np.cos(ang), x * np.sin(ang)]) * np.sqrt(2)
            j = min(N, i + x.shape[1])
            kit[GROUP[v]][:, i:j] += x[:, : j - i]
            if v == "kick":
                duck_at.append(i)
        placed.append({"out_bar": out_bar, "bar": bar, "beat": round(e["beat"], 4), "frame": round(f_out, 2),
                       "voice": v, "vel": round(e["vel"], 3),
                       **{k2: e[k2] for k2 in ("length", "hit", "duck", "note") if k2 in e}})
    for t in BED_KICKS.get(bar, ()):
        duck_at.append(int(round((BAR_F * (out_bar - 1) + BEAT_F * (t - 1)) * SPF)))

# the groove sub ducks 6 dB for 90 ms under each kick (2 ms down, 50 ms held, 38 ms back)
duck = np.ones(N)
shape = np.concatenate([np.linspace(1, 0.5, int(0.002 * SR)), np.full(int(0.05 * SR), 0.5),
                        0.5 + 0.5 * np.sin(0.5 * np.pi * np.arange(int(0.038 * SR)) / int(0.038 * SR)) ** 2])
for i in sorted(set(duck_at)):
    j = min(N, i + len(shape))
    duck[i:j] = np.minimum(duck[i:j], shape[: j - i])
subs = sosfilt(butter(2, 28.0, btype="highpass", fs=SR, output="sos"), sub_hit + sub_groove * duck)
groups = {"sub": np.stack([subs, subs]), **kit}
y = sum(groups.values()) * 10 ** ((BUS_DB if a.bus_db is None else a.bus_db) / 20)

# the composed silences: exact zeros from the gate's frame (10 ms down, ending on it) to the next bar line
gates = []
gain = np.ones(N)
for out_bar, bar in enumerate(FORM, 1):
    if bar in GATES:
        f0 = BAR_F * (out_bar - 1) + BEAT_F * (GATES[bar] - 1)
        f1 = BAR_F * out_bar
        i0, i1 = int(round(f0 * SPF)), f1 * SPF
        k = int(0.01 * SR)
        k0 = max(0, i0 - k)
        gain[k0:i0] = np.minimum(gain[k0:i0], (np.cos(0.5 * np.pi * np.arange(k) / k) ** 2)[k0 - (i0 - k):])
        gain[i0:i1] = 0.0
        gates.append({"out_bar": out_bar, "bar": bar, "from_frame": round(f0, 2), "to_frame": f1})
y *= gain
if a.stems:
    os.makedirs(a.stems, exist_ok=True)
    for grp, x in groups.items():
        sf.write(os.path.join(a.stems, f"{grp}.wav"),
                 (x * gain * 10 ** ((BUS_DB if a.bus_db is None else a.bus_db) / 20)).T, SR, subtype="FLOAT")
peak = float(np.abs(y).max())
if peak >= 10 ** (-1.0 / 20):
    sys.exit(f"drive: the stem peaks at {20 * np.log10(peak):.2f} dBFS: lower BUS_DB (no limiter here, by design)")
os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
sf.write(out_path, y.T, SR, subtype="PCM_24")

# ---- the report ----
meter = pyln.Meter(SR)
check, _ = sf.read(out_path, always_2d=True)
rep = {"out": os.path.relpath(out_path, REPO), "form": form_name, "score_bars": FORM, "samples": int(check.shape[0]),
       "expected_samples": N, "seconds": check.shape[0] / SR, "bus_db": BUS_DB if a.bus_db is None else a.bus_db,
       "peak_dbfs": round(20 * np.log10(peak), 2), "integrated_lufs": round(float(meter.integrated_loudness(check)), 2)}
if check.shape[0] != N:
    sys.exit(f"drive: wrote {check.shape[0]} samples, not {N}")
if FORM == FORMS["film"]:
    s0, s1 = frame_of(3, 1) * SPF, frame_of(31, 1) * SPF                     # bars 3-30
    rep["bars_3_30_lufs"] = round(float(meter.integrated_loudness(check[s0:s1])), 2)
    if os.path.exists(a.bed):
        bed, bsr = sf.read(a.bed, always_2d=True)
        if bsr == SR and bed.shape[0] == N:
            b330 = float(meter.integrated_loudness(bed[s0:s1]))
            rep["bed_bars_3_30_lufs"] = round(b330, 2)
            rep["drive_under_bed_lu"] = round(b330 - rep["bars_3_30_lufs"], 2)
            rep["level_ok_3_to_5_lu"] = 3.0 <= rep["drive_under_bed_lu"] <= 5.0
digest = hashlib.sha256(open(out_path, "rb").read()).hexdigest()
rep["sha256"] = digest
with open(os.path.splitext(out_path)[0] + ".json", "w") as f:
    json.dump({**rep, "gates": gates, "events": placed,
               "about": "drive.py's report: the events as placed (frame = the out timeline's frame), the composed "
                        "silences (gates) and the level"}, f, indent=1)
print(json.dumps({**rep, "events": len(placed), "gates": [(g_["from_frame"], g_["to_frame"]) for g_ in gates]}))
print(f"{digest}  {rep['out']}")
