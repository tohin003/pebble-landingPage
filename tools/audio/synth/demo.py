"""The engine's demo: four bars in the trailer shape the new film wants (OVERRIDES §37; the user: tension first, then
the reveal, then the full reveal), at the film's 100 BPM.

  bar 1  tension   a braam and a trailer hit on the downbeat, a ticking texture, a dark pad, low pulses swelling
  bar 2  build     a snare roll (8ths, 16ths, 32nds), kicks building, a noise riser with a stutter, a pitch riser and
                   a reverse swell, all arriving on bar 3; the last 16th is a breath
  bar 3  drop      an impact, a trailer hit and a crash; the groove: kick, clap and snare, hats, shaker, an 808 line
                   with slides, supersaw chords (Bm G | D A) pumping under the kick, a plucked arp with a delay
  bar 4  lift      the groove goes on; FM piano stabs, a short lead with a glide, a whoosh on the downbeat, a tom fill
                   and a downlifter into the next bar

--bars 32 repeats the four bars eight times: 76.8 s, the film's length, to time a full arrangement.

Usage: python -I tools/audio/synth/demo.py OUT_DIR [--bars 4] [--seed 7] [--lufs -16] [--ceiling -1.7] [--no-master]
Writes OUT_DIR/drive.wav (drums and bass), music.wav (chords, keys, textures), fx.wav (braam, hits, risers),
bed.wav (music + fx: what tools/audio/mix_master.py takes as BED), mix.wav, master.wav (the preview master) and
demo.json (lengths, loudness, peaks, timings). Every WAV is 48 kHz float32 stereo, exactly bars x 115,200 samples.
"""
import argparse
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import synth as S  # noqa: E402
from synth import core, fills, fx, stems  # noqa: E402
from synth.grid import Event  # noqa: E402

CHORDS = ["Bm", "G", "D", "A"]            # the drop's progression, two beats each (vi IV I V in D)
ROOTS = ["B1", "G1", "D2", "A1"]


def block(g, b0, ev):
    """The four bars from bar b0, appended to ev[track]."""
    def at(bar, beat=1, six=1):
        return (b0 + bar - 1, beat, six)

    def add(track, events):
        ev.setdefault(track, []).extend(events)

    t = lambda bar, beat=1, six=1: g.t(at(bar, beat, six))  # noqa: E731

    # bar 1: tension
    add("braam", [Event(t(1), 2.4, 0.9, core.note("D1"))])
    add("hit", [Event(t(1), 0.0, 0.85, core.note("D1"))])
    add("tick", fills.ticking(g, at(1), beats=8, step=0.25, vel=0.55, ramp=(0.45, 1.0)))
    # the pad from octave 4, open: a close saw chord in octave 3 under the braam read as a brass section (README.md)
    add("pad", S.progression(["Bm7"], g, at(1), beats_each=8, octave=4, vel=0.7, legato=0.9, open_voicing=True))
    add("pulse", S.scale_vel(S.hits("..x.x.x. x.x.x.x. | x.x.x.x. x.x.x.x.", g, at(1), note=("D2", "A2")), (0.35, 0.8)))
    # bar 2: build
    roll = fills.snare_roll(g, at(2), beats=3.75, rates=(0.5, 0.25, 0.125), vel=(0.25, 1.0))
    add("roll", roll)
    add("kick_build", S.scale_vel(S.hits("x... x... x... x.x.", g, at(2)), (0.55, 1.0)))
    add("riser", [Event(t(3), 2.4, 0.9)])                       # anchored at their ends: they arrive on bar 3
    add("riser_pitch", [Event(t(3), 2.4, 0.7, core.note("D3"))])
    add("swell", [Event(t(3), 1.2, 0.8, tuple(core.notes(("D3", "A3", "D4", "F#4"))))])
    # bars 3-4: the drop and the lift
    add("impact", [Event(t(3), 0.0, 1.0)])
    add("hit", [Event(t(3), 0.0, 0.9, core.note("D1"))])
    add("crash", [Event(t(3), 0.0, 0.9)])
    groove_kick = "X..x ..x. X... ..x. | X..x ..x. X..x ...."
    add("kick", S.hits(groove_kick, g, at(3)))
    add("clap", S.hits(".... X... .... X... | .... X... .... X...", g, at(3)))
    add("snare", S.hits(".... x... .... x... | .... x... .... x..o", g, at(3), vel=0.8))
    add("hat", S.humanise(S.hits("x.x.x.x.x.x.x.xx | x.x.x.x.x.x.x.x.", g, at(3), vel=0.8), ms=3, vel=0.12, key="hat"))
    add("hat_open", S.hits("..o...o...o...o. | ..o...o...o.....", g, at(3), dur=0.15))
    add("shaker", S.hits("gogo gogo gogo gogo | gogo gogo gogo gogo", g, at(3)))
    add("bass", S.seq(" ".join(f"{r}*8" for r in ROOTS), g, at(3), step=0.25, vel=0.95, legato=0.95))
    add("bass", [Event(t(4, 4, 3), 0.15, 0.9, core.note("B1"), dict(glide=True))])     # a slide up into the next bar
    add("chords", S.progression(CHORDS, g, at(3), beats_each=2, octave=4, vel=0.85, legato=0.95))
    for k, sym in enumerate(CHORDS):
        add("arp", S.arp(S.chord(sym, 5), g, (b0 + 2 + k // 2, 1 + 2 * (k % 2)), beats=2, step=0.25, mode="updown",
                         gate=0.5, vel=0.75, accents=[1.0, 0.6, 0.8, 0.6], seed=k))
    add("epiano", S.progression(["D/F#", "A"], g, at(4, 2, 3), beats_each=[1.5, 1.5], octave=4, vel=0.6, legato=0.5))
    add("lead", S.seq("F#5*3 E5~*2 D5*3", g, at(4, 1), step=0.25, vel=0.7))
    add("whoosh", [Event(t(4), 0.6, 0.8)])                      # anchored at its peak
    add("toms", fills.tom_fill(g, at(4, 4), beats=1.0, notes=("A2", "F#2", "D2", "A1"), vel=(0.6, 0.95)))
    add("downlifter", [Event(t(4, 4), 1.6, 0.7)])


def arrange(bars=4, seed=7):
    g = S.Grid.from_beatmap()
    if bars % 4:
        raise SystemExit("demo: --bars must be a multiple of 4")
    ev = {}
    for b0 in range(1, bars + 1, 4):
        block(g, b0, ev)
    s = S.Session(g, bars=bars, seed=seed)
    kicks = ev["kick"] + ev["kick_build"]
    riser = S.get("riser").variant(chop=(4.0, 20.0), chop_depth=0.5)
    # the drive: drums and bass. The levels keep 46 % of the master's power above 150 Hz (mix_checks.py's speaker
    # gate wants 30 %): with the 808 at -4 dB the sub took 86 % of it
    s.track("kick", "kick", ev["kick"], bus="drive", gain_db=-3)
    s.track("kick_build", "kick", ev["kick_build"], bus="drive", gain_db=-4)
    s.track("clap", "clap", ev["clap"], bus="drive", gain_db=-3)
    s.track("snare", "snare", ev["snare"], bus="drive", gain_db=-4)
    s.track("roll", S.get("snare", tone=0.4, length=0.25), ev["roll"], bus="drive", gain_db=-7)
    s.track("hat", "hat", ev["hat"], bus="drive", gain_db=-9, pan=0.15)
    s.track("hat_open", "hat_open", ev["hat_open"], bus="drive", gain_db=-12, pan=-0.2)
    s.track("shaker", "shaker", ev["shaker"], bus="drive", gain_db=-14, pan=0.3)
    s.track("toms", "tom", ev["toms"], bus="drive", gain_db=-6)
    s.track("crash", "crash", ev["crash"], bus="drive", gain_db=-11)
    s.track("bass", "bass_808", ev["bass"], bus="drive", gain_db=-12, mono=True, glide_s=0.07,
            duck=dict(by=kicks, depth_db=6, attack_ms=1, hold_ms=40, release_ms=90))
    s.bus("drive", gain_db=-6, fx=[lambda x: fx.compressor(x, -14, 2.5, 12, 120, sr=s.sr),
                                    lambda x: fx.saturate(x, 1.2)])
    # the music: chords, keys and textures
    s.track("pad", "pad", ev["pad"], bus="music", gain_db=-7)
    s.track("pulse", "pulse", ev["pulse"], bus="music", gain_db=-8)
    s.track("tick", "tick", ev["tick"], bus="music", gain_db=-16, pan=0.25)
    s.track("chords", "supersaw", ev["chords"], bus="music", gain_db=-3,
            duck=dict(by=kicks, depth_db=5, attack_ms=2, hold_ms=30, release_ms=140))
    s.track("arp", "arp", ev["arp"], bus="music", gain_db=-7,
            fx=lambda x: fx.delay(x, s.grid.beats(0.75), feedback=0.3, mix=0.25, pingpong=True, sr=s.sr),
            duck=dict(by=kicks, depth_db=3, attack_ms=2, hold_ms=20, release_ms=120))
    s.track("epiano", "epiano", ev["epiano"], bus="music", gain_db=-8)
    s.track("lead", "lead", ev["lead"], bus="music", gain_db=-9, mono=True, glide_s=0.08)
    s.bus("music", gain_db=2, fx=[lambda x: fx.reverb(x, 0.7, 0.5, 0.16, 1.0, sr=s.sr),
                                   lambda x: fx.mono_below(x, 150.0, s.sr)])
    # the effects: braam, hits, risers, swells
    s.track("braam", "braam", ev["braam"], bus="fx", gain_db=-6)
    s.track("hit", "trailer_hit", ev["hit"], bus="fx", gain_db=-10)
    s.track("impact", "impact", ev["impact"], bus="fx", gain_db=-9)
    s.track("riser", riser, ev["riser"], bus="fx", gain_db=-10)
    s.track("riser_pitch", S.get("riser_pitch", semitones=12.0), ev["riser_pitch"], bus="fx", gain_db=-14)
    s.track("swell", S.get("reverse_swell", source="chord"), ev["swell"], bus="fx", gain_db=-10)
    s.track("whoosh", "whoosh", ev["whoosh"], bus="fx", gain_db=-12)
    s.track("downlifter", "downlifter", ev["downlifter"], bus="fx", gain_db=-12)
    s.bus("fx", gain_db=-5)
    return s, ev


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("out")
    ap.add_argument("--bars", type=int, default=4)
    ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--lufs", type=float, default=-16.0)
    ap.add_argument("--ceiling", type=float, default=-1.7)
    ap.add_argument("--no-master", action="store_true")
    a = ap.parse_args(argv)
    t0 = time.perf_counter()
    s, ev = arrange(a.bars, a.seed)
    t1 = time.perf_counter()
    timing = {}
    st = {}
    for b in ("drive", "music", "fx"):
        tb = time.perf_counter()
        st[b] = s.render_bus(b)
        timing[f"render_{b}_s"] = round(time.perf_counter() - tb, 2)
    os.makedirs(a.out, exist_ok=True)
    rep = {"bars": a.bars, "seed": a.seed, "samples": s.n, "seconds": s.n / s.sr, "events": sum(map(len, ev.values())),
           "stems": {}}
    for b, y in st.items():
        rep["stems"][b] = stems.write_stem(os.path.join(a.out, f"{b}.wav"), y, s.n)
    bed = st["music"] + st["fx"]
    rep["stems"]["bed"] = stems.write_stem(os.path.join(a.out, "bed.wav"), bed, s.n)
    mix = bed + st["drive"]
    rep["mix"] = stems.write_stem(os.path.join(a.out, "mix.wav"), mix, s.n)
    if not a.no_master:
        y, mrep = stems.master(mix, lufs=a.lufs, ceiling_db=a.ceiling)
        rep["master"] = {**mrep, **stems.write_stem(os.path.join(a.out, "master.wav"), y, s.n)}
    timing.update(arrange_s=round(t1 - t0, 2), total_s=round(time.perf_counter() - t0, 2))
    rep["timing"] = timing
    with open(os.path.join(a.out, "demo.json"), "w") as f:
        json.dump(rep, f, indent=1)
    print(json.dumps({k: rep[k] for k in ("bars", "samples", "events", "timing")}))
    for name, r in list(rep["stems"].items()) + [("mix", rep["mix"])] + ([("master", rep["master"])] if "master" in rep
                                                                         else []):
        print(f"{name:7s} {r['samples']} samples  peak {r['peak_dbfs']:6.2f} dBFS  true peak {r['true_peak_dbtp']:6.2f}"
              f"  {r['lufs']} LUFS")


if __name__ == "__main__":
    main()
