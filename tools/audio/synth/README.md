# synth: the film score's synthesis engine

A deterministic, vectorised synthesiser for the launch film's music, in Python (numpy, scipy, soxr, pedalboard; the
audio venv at `.work/audio/.venv`). It covers the trailer and launch-film vocabulary: tension (braams, pulses, ticking,
Shepard risers), builds (rolls, risers, reverse swells), drops (impacts, trailer hits, kicks, 808s, supersaw chords) and
the groove after them. It writes stems that `tools/audio/mix_master.py` mixes with the film's effects and automation.

Everything here is synthesis: no samples and no downloads, so the music is our own work (OVERRIDES §37: original
music only).

- **Deterministic:** every random draw comes from a generator keyed by strings and numbers through CRC-32, never from
  Python's per-process `hash()`. Each event's noise is keyed by (session seed, track, its sample, its order on that
  sample), so changing one bar never changes another bar's sound.
- **Vectorised:** oscillators, envelopes and fixed filters are whole-array numpy and scipy. Time-varying filters run
  scipy's `lfilter` in 32-sample blocks.
- **Clean:** every voice starts and ends on an exact zero, and the tests check each one. The oscillators are
  band-limited (measurements below).
- **Exact:** stems are 48 kHz stereo float32 WAVs of exactly the samples you ask for, with raised-cosine fades.

## Running it

`python -I` (the repo's rule) does not put a script's folder on `sys.path`, so scripts insert `tools/audio` themselves:

```python
import os, sys
sys.path.insert(0, os.path.join(REPO, "tools", "audio"))   # REPO: the landing repo's root
import synth as S
```

From the repo root (`cd <repo> && source scripts/env.sh`):

```sh
.work/audio/.venv/bin/python -I -m unittest discover -s tools/audio/synth/tests -t tools/audio    # 29 tests, ~1.3 s
scripts/heavy.sh synth-demo /usr/sbin/taskpolicy -c utility \
  .work/audio/.venv/bin/python -I tools/audio/synth/demo.py <out-dir>                             # the 4-bar demo
scripts/heavy.sh synth-tags /usr/sbin/taskpolicy -c utility \
  .work/audio/.venv/bin/python -I tools/audio/synth/tagcheck.py <out-dir>/master.wav --tmp <scratch>
```

Renders go through `scripts/heavy.sh`, at utility priority. Write them to `.work/` or a scratch folder, never into git:
`*.wav` is ignored, and the repo keeps no raw audio.

## A first arrangement

```python
g = S.Grid.from_beatmap()                    # 100 BPM, 4/4, 30 fps, bar 1 at 0 s (tools/audio/beatmap.json)
s = S.Session(g, bars=4, seed=7)             # exactly 4 x 115,200 samples

kicks = S.hits("X..x ..x. X... ..x.", g, at="3")
s.track("kick", "kick", kicks, bus="drive", gain_db=-3)
s.track("clap", "clap", S.hits(".... X... .... X...", g, at="3"), bus="drive", gain_db=-3)
s.track("hat", "hat", S.humanise(S.hits("x.x.x.x.x.x.x.xx", g, at="3"), ms=3, key="hat"),
        bus="drive", gain_db=-9, pan=0.15)
s.track("bass", "bass_808", S.seq("B1*8 G1*8", g, at="3"), bus="drive", gain_db=-12,
        mono=True, duck=dict(by="kick", depth_db=6, release_ms=90))
s.track("chords", "supersaw", S.progression(["Bm", "G"], g, at="3", beats_each=2, octave=4),
        bus="music", gain_db=-3, duck=dict(by="kick", depth_db=5))
s.track("riser", "riser", [S.Event(g.t("3"), dur=g.bars(1), vel=0.9)], bus="fx", gain_db=-10)
s.track("impact", "impact", [S.Event(g.t("3"))], bus="fx", gain_db=-9)
s.bus("music", fx=lambda x: S.fx.reverb(x, size=0.7, wet=0.16))
s.bus("drive", fx=[lambda x: S.fx.compressor(x, -14, 2.5), lambda x: S.fx.saturate(x, 1.2)])

rep = s.write("out/", master=dict(lufs=-16, ceiling_db=-1.7))   # drive.wav music.wav fx.wav mix.wav master.wav
```

`tools/audio/synth/demo.py` is a complete example: four bars of tension, build, drop and lift.

## The grid (`grid.py`)

`Grid(bpm=100, beats_per_bar=4, sr=48000, fps=30, start_s=0, swing=0.5, swing_unit=0.25)` is frozen;
`g.but(swing=0.58)` makes a copy. `Grid.from_beatmap(path=None, **overrides)` reads a beat map (default
`tools/audio/beatmap.json`). Any tempo works: `S.Grid(bpm=128)`.

**Positions** (every `at=`, `g.t()`, `g.s()`):

| form | meaning |
|---|---|
| `2.5` | beats from bar 1, beat 1 (0-based; negative is a pickup) |
| `(9, 3)`, `(9, 3, 2)` | bar 9, beat 3 (and its 2nd 16th), 1-based like a score; the beat may be fractional |
| `"9"`, `"9.3"`, `"9.3.2"` | the same as strings |
| `"f504"` | film frame 504 |
| `"16.8s"` | seconds |

**Conversions:**

- `g.t(pos)` gives seconds and `g.s(pos)` the sample.
- `g.frame(pos)`, `g.frame_t(f)` and `g.frame_s(f)` convert to and from film frames: at 100 BPM and 30 fps a beat is
  18 frames, a frame 1,600 samples and a 16th 7,200 samples.
- `g.beats(n)` and `g.bars(n)` give lengths in seconds.
- `g.length(bars=32)` gives an exact stem length: 3,686,400 samples for the film, the same as
  `g.length(frames=2304)`.
- `g.where(t)` gives (bar, beat).

**Swing** moves the second unit of each pair to `swing` of the pair: 0.5 is straight, 0.58 a light shuffle and 0.667
a triplet feel. `swing_unit=0.25` swings 16ths and 0.5 swings 8ths. On-beat units never move.

**Humanise:** `S.humanise(events, ms=4, vel=0.06, seed=0, key="", grid=None, downbeat_ms=None)` adds seeded timing
and velocity variation per event, and the result does not change when other events are added or removed. Pass a grid
and `downbeat_ms=1` to keep bar lines tighter.

**Events:** `S.Event(t, dur=0, vel=1, note=None, params={})`. t and dur are seconds. note is a MIDI number, a tuple
of them (a chord) or None. params are extra keyword arguments for the voice, such as `{"tock": True}` or
`{"glide": True}`. The helpers are `S.shift`, `S.merge`, `S.repeat(events, times, every, grid)`,
`S.scale_vel(events, 0.8 or (v0, v1))` and `S.transpose`.

**`S.hits(text, grid, at=0, step=0.25, note=None, vel=1, dur=None, **params)`** has one character per step:

| char | meaning |
|---|---|
| `X` `x` `o` `g` | 1.0, 0.8, 0.5, 0.3 |
| `1`-`9` | 0.1-0.9 |
| `.` | rest |
| `_` | tie: the previous hit lasts a step longer (gated stabs, pulses) |
| `r` | roll: two hits in the step |
| `f` | flam: a 0.4 grace 25 ms early |
| `\|` | bar line: each bar must then hold exactly one bar of steps |

Spaces are ignored. `step=1/3` gives 8th triplets.

**`S.seq(text, grid, at=0, step=0.25, vel=0.8, legato=1, octave=3)`** has one whitespace-separated token per step:

- Notes: `D2`, `F#3`, `Bb1` or a MIDI number such as `38`.
- Stacks: `D3+F#3+A3`.
- Chord symbols: `[Bm7]`, or `[Gmaj7/D:2]` for octave 2.
- `.` is a rest, `_` or `-` a tie, and `|` a checked bar line.
- Suffixes: `!` accent (1.0), `?` soft (0.45), `@0.6` velocity, `*3` lasts 3 steps, `~` glides into the note in a
  mono line.

**Other generators:**

- `S.arp(chord, grid, at, beats=4, step=0.25, mode="up", octaves=1, gate=0.6, accents=None, seed=0)`, with the modes
  up, down, updown, downup, order, random (seeded) and converge.
- `S.progression(["Bm", "G", "D", "A"], grid, at, beats_each=2, octave=3, open_voicing=False)`: held chords, one
  event each.
- `S.chord("Gmaj7/D", 3, inversion=0, open_voicing=False)` returns MIDI notes. The qualities are in `core.CHORDS`:
  m, 5, dim, aug, sus2, sus4, 6, m6, 7, maj7, m7, mmaj7, m7b5, dim7, 7sus4, add9, madd9, 9, maj9, m9, 6/9, 11, m11 and
  maj7#11.

**Fills and textures (`fills.py`):**

- `snare_roll(g, at, beats=4, rates=(0.5, 0.25, 0.125), vel=(0.3, 1))` steps from 8ths to 16ths to 32nds.
- `accel_roll(g, at, beats=4, start_rate=0.5, end_rate=0.0625)` accelerates smoothly, geometrically.
- `tom_fill(g, at, beats=1, notes=("A2", "F2", "D2"))` and `hat_roll(g, at, beats=1, rate=0.125)`.
- `build(g, at, bars=2)` returns `{"kick": [...], "snare": [...]}`: quarters, then 8ths, then 16ths, with the last
  16th left empty.
- `ticking(g, at, beats, step=0.25, tock_every=1, ramp=(v0, v1))` is a ticking texture for `synths.tick`.
- `stutter(events, g, rate=0.125, times=4)` repeats each event.

## Oscillators (`osc.py`)

Every oscillator takes freq in Hz, as a number or as one value per sample, so glides and vibrato are just arrays.

- `saw`, `square`, `pulse` (PWM: `width` may be an array) and `triangle`, plus `sine`. All except the sine are
  band-limited with polyBLEP (polyBLAMP for the triangle).
- `osc(shape, ...)` selects any of them by name.
- `noise(n, rng, "white" | "pink" | "brown" | "blue")` and `slow_random` (smooth drift and wobble).
- `unison(freq, n, voices=7, detune=25 cents, width, side, shape)` and `supersaw` (the JP-8000's detune spacing,
  random phases, neighbours panned apart, a high pass at the fundamental).
- `fm(freq, n, mods=((ratio, index), ...), stack=False)`: phase modulation. The index may be an envelope array, and
  modulators start at ratio × the carrier's phase, so 1:1 FM carries no DC.
- `pitch_drop`, `pitch_sweep`, `vibrato` and `freq_curve(note, n, freq=None, glide_from=None, glide_s)`.

**Aliasing**, measured on exactly periodic 1 s spectra (the worst non-harmonic component below 16 kHz, against the
fundamental):

| saw at | naive | polyBLEP 1x | 2x | 4x |
|---|---|---|---|---|
| 441 Hz | -37 dB | -53 dB | -74 dB | -88 dB |
| 1,319 Hz | -28 dB | -45 dB | -65 dB | -83 dB |
| 3,517 Hz | -20 dB | -40 dB | -57 dB | -79 dB |

With `oversample=None`, the default, the oscillator picks 1x up to 300 Hz, 2x up to 1.8 kHz and 4x above, and
resamples through soxr (VHQ). That keeps every alias about 56 dB or more under the fundamental. The triangle starts
about 35 dB lower: -90 dB at 441 Hz at 1x. FM picks its oversampling from Carson's rule.

## Envelopes and filters (`env.py`, `filters.py`)

**Envelopes:**

- `adsr(gate, attack, decay, sustain, release, curves=(1, 4, 4))` starts at exactly 0 and ends at exactly 0. It
  releases from wherever it is, mid-attack too.
- `perc(dur, attack, tau, hold, end)` is a one-shot.
- `breakpoints([(t, v), (t, v, curve), ...], n)` is automation.
- `step_gate("x.x.xx..", grid, n)` is a trance gate with ramped edges.
- `gate(n, gate_s, release_s)` chokes a sound.
- `lfo` and `smooth`.
- Curves: 0 is a straight line, a positive curve moves fast and then settles (about 4 is an analogue decay), and a
  negative curve swells.

**Filters:**

- `filt(x, kind, fc, q=0.707, poles=2, gain_db=0)` with kinds `lp hp bp notch ap peak lowshelf highshelf` (RBJ
  biquads) and 2, 4, 6 or 8 poles (Butterworth cascades, with the resonance on the sharpest section).
- A number for fc and q gives one `sosfilt` pass. An array, such as an envelope, key tracking or an LFO, gives a
  time-varying filter updated every 32 samples. Between blocks it carries each section's last two inputs and
  outputs, so it behaves like a direct-form-I filter: no transients and no zipper noise. A sine through a wobbling
  low pass shows nothing above -92 dB. On a constant curve it equals the fixed filter to 1e-14, and a 10 s 4-pole
  sweep takes 0.27 s.
- `cutoff(base_hz, n, note=, keytrack=, env=, env_oct=, mod=, mod_oct=, vel=, vel_oct=)` builds that curve.
- `crossover` is a Linkwitz-Riley split, and `dc_block` removes DC.

## Voices and presets (`drums.py`, `bass.py`, `synths.py`, `sfx.py`, `presets.py`)

`S.get(name, **overrides)` returns an `Instrument`. Call it as `inst(note, vel, dur, rng=, **params)`, change it
with `inst.variant("name", **params)`, and list its parameters with `inst.params()`. A misspelt parameter raises.
`note=None` keeps the voice's own pitch. A positive `dur` overrides a preset's length, and a one-shot event (dur 0)
keeps it. At velocity 1 every preset peaks at about -2 dBFS: -1.9 to -3.5 measured across seeds and registers.

| group | presets |
|---|---|
| drums | `kick` (punchy: 240 → 52 Hz plus a snap chirp, click, drive), `kick_808` (`glide` semitones down, long tau; `choke=True` lets dur cut it), `snare`, `clap` (irregular bursts), `hat`, `hat_open` (dur chokes it), `shaker`, `tom` (note), `rim`, `crash` and `ride` (filtered noise only: no bell partials), `trailer_hit` |
| bass | `sub` (sine plus a quiet 2nd and 3rd harmonic for small speakers), `bass_808`, `pluck_bass`, `reese`, `saw_bass` |
| chords and keys | `supersaw` (chords, filter envelope), `stab`, `pad` (`shape` saw/triangle/pulse, `hp`), `pluck`, `arp`, `lead`, `epiano` (FM, 1:1 plus a quiet 14:1 tine) |
| textures | `pulse` (gated chord stabs for ostinatos), `tick` (noise ticks, `tock=True`) |
| effects (anchored) | `riser` (noise, optional accelerating `chop`), `riser_pitch` (a supersaw cluster over noise), `shepard`, `downlifter`, `impact` (a sub drop plus noise), `reverse_swell` (noise or a chord), `whoosh`, `braam` |

**Anchors:** an effect returns `(audio, anchor)`, and the mixer places the anchor on the event's time.

- `riser`, `riser_pitch`, `shepard` and `reverse_swell` end on it: put the event on the downbeat they arrive at.
- `whoosh` peaks on it: put the event on the cut.
- `impact`, `downlifter` and `braam` start on it.

An effect's length is the event's dur, or the preset's when the event's dur is 0.

**Mono lines:** `S.render_mono(events, "bass_808", n)`, or `Session.track(..., mono=True, glide_s=0.07)`. Notes that
touch or overlap, or that carry `~`, become one note that glides with no retrigger. `sub`, `bass_808`, `pluck_bass`,
`reese`, `saw_bass` and `lead` take the curve through `freq=`.

## Processing and mixing (`fx.py`, `mix.py`)

- pedalboard: `reverb(x, size, damping, wet, dry, width, predelay_ms, hp_hz=200, lp_hz=9000, tail_s)` (a filtered
  send), `delay(x, time_s, feedback, mix, pingpong=False, hp_hz, lp_hz)` (use `g.beats(0.75)` for a dotted 8th),
  `chorus`, `compressor(x, threshold_db, ratio, attack_ms, release_ms, makeup_db)`, `distortion(x, drive_db,
  oversample=2)`, `limiter`, `brickwall(x, ceiling_db, true_peak=True)` (mix_master.py's limiter), and
  `eq(x, ("hp", 30), ("low", 120, 2), ("peak", 3000, -2, 1), ("high", 8000, 1.5), ("lp", 16000))`. pedalboard
  compensates its own latency, and the tests check that an impulse stays on its sample.
- `saturate(x, drive, bias, oversample)`, `widen(x, width)`, `mono_below(x, 120)` (keeps the low end mono for
  phones), `pan` and `gain`. `chain(f, g, ...)` composes them.
- **Sidechain:** `duck_env(n, triggers, depth_db=6, attack_ms=2, hold_ms=30, release_ms=150, curve="cos",
  lead_ms=0)` and `sidechain(x, triggers, ...)`. Triggers are seconds or events, so a kick track's events work as
  they are. A trigger may also be a `(t, scale)` pair.
- **Session:** `Session(grid, bars= | frames= | seconds= | n=, seed=)` has these methods:
  - `.track(name, instrument, events, bus, gain_db, pan, fx, duck=dict(by="kick" or a list, ...), mono, glide_s)`
  - `.bus(name, gain_db, fx, duck)`
  - `.render_track(name, cache=False)`, `.render_bus(name)`, `.stems()` and `.mixdown()`
  - `.write(dir, prefix, mix=True, master=None, zeros_from=None)`

  Buses keep their sums. Tracks are not cached unless you ask, because a full-length stereo track is 59 MB.

## Stems (`stems.py`)

- `write_stem(path, x, n=None, fade_in_ms=2, fade_out_ms=10, zeros_from=None, peak_limit_db=0)` writes a 48 kHz
  stereo float32 WAV of exactly n samples. It pads or cuts, fades in from an exact zero and out to one, and can write
  exact zeros from a sample on. It refuses NaN or infinity and a peak above the limit, and returns samples, peak,
  true peak, LUFS and SHA-256.
- `read_stem`, `loudness` (BS.1770 through pyloudnorm) and `true_peak_db` (4x through soxr).
- `master(x, lufs=-16, ceiling_db=-1.7)` is a preview master on mix_master.py's chain: a 28 Hz high pass, the
  loudness, then the true-peak brickwall.

## How the stems feed the film's pipeline

`tools/audio/mix_master.py BED.wav cues.json OUT.wav --drive DRIVE.wav` makes the film's masters. It takes two
music stems. Both must be exactly the same length (it exits on a mismatch), and that length must be the film's:
3,686,400 samples (`g.length(bars=32)`), or 1,382,400 for the 30 s cut.

- **The bed** (`BED.wav`) is everything that carries on, darker, through AgentGuard's hold: chords, pads, keys,
  leads, textures, and the score's own risers and hits. Write it as `music + fx`, as demo.py's `bed.wav` does.
- **The drive** (`--drive`, mixed at `--drive-db`, 0 dB by default) is what stops in the hold: drums and bass.

The automation entries in `tools/audio/cues.json` (the entries with no `file`; their defaults come from
`tools/audio/sfx_kit.json` `automation`) act on the two stems differently:

| span | frames | bed | drive |
|---|---|---|---|
| ride (the hook) | f0-144 | -1.5 dB | -1.5 dB |
| gap (each breath before a hit) | f135-144, f1143-1152, f1575-1584, f2151-2160 | -24 dB, 10 ms down ending on the first frame, back in 4 ms on the hit | the same |
| hold (AgentGuard) | f891-990, released to f1008 | crossfades in 30 ms to a 1.2 kHz low-passed copy at -6 dB, released on an ease-in curve | muted in 10 ms, back on f990 |
| tail (the end) | f2214-2250 | the whole master fades (sine) after the limiter, then exact zeros | the same |
| effect ducks | the impacts' `duck_db` (1.5-2.5 dB, 40 ms down, 600 ms back) | ducked | never ducked |

What that means for a composer:

- Put anything that should go silent in the hold into the drive. Anything that should continue, darker, goes in the
  bed.
- The gaps already make the breaths, but writing a natural break there (a rest on the last 16th) keeps them clean.
- `cues.json` already places the film's effects with their own gains: UI sounds, whooshes, the riser ending on the
  reveal (f504), impacts at -4 dB and thuds. The score's own risers and hits add to them, so keep one of each, or
  balance them with the bed's level. `cues.json` is generated by `bun video/scripts/export-cues.ts` from
  `video/src/film/timeline.ts`, which is another lane's file.
- mix_master normalises the whole master (-16 LUFS web, -14 social), so only the stems' balance and peaks matter.
  Keep every stem under 0 dBFS: `write_stem` refuses louder.
- `final_mix.sh` makes the trailer's masters from the chosen score's stems (`tools/audio/scores/trailer_b.py`, rendered
  into `.work/audio/render/score/` when they are missing or older than the score), and `mix_checks.sh` gates them. For
  a quick master of other stems, call mix_master.py directly:

```sh
PY=.work/audio/.venv/bin/python; R=.work/audio/render/score
$PY -I tools/audio/mix_master.py $R/bed.wav tools/audio/cues.json $R/soundtrack_web.wav --drive $R/drive.wav \
  --lufs -16 --tp -1.7 --aac 160k:-1.5 --ffmpeg "$FF"
$PY -I tools/audio/mix_checks.py $R/soundtrack_web.wav .work/audio/analysis/score --name web --bed $R/bed.wav \
  --sound-tags .work/audio/sound_tags --ffmpeg "$FF"
```

A cut renders its own bars in its own order (`docs/film-cuts/x30.json` `music.score_bars`), with its own cue list
(`tools/audio/cues.x30.json`): build a Session per cut, or render per-bar blocks and splice them on bar lines.

## The classifier (`tagcheck.py`)

`python -I tools/audio/synth/tagcheck.py FILE.wav --tmp DIR [--out JSON]` runs Apple's SoundAnalysis
(`.work/audio/sound_tags`) the way mix_checks.py runs it on a master. There are four passes:

- the helper's own 3 s windows;
- a copy delayed by 1.5 s;
- the first 0.75 s after silence;
- the first 1.5 s after silence.

It applies the same gates: no voice-like label, and no siren, alarm, beep or buzzer, at 0.30 or in a window's top 3.
Telephone and ringtone stay under 0.30, with a warning from 0.25. Foghorn stays under 0.30 (OVERRIDES §37). It exits 1
on a failure. Tag a render after every change of sound or level, because the classifier hears combinations that no
single voice has.

What these presets were tuned against. All of it was measured with tagcheck's passes on -16 LUFS clips, 2026-10-25.

- **The braam.** The first design read `brass_instrument` 0.65, `foghorn` 0.59 and `trombone` 0.53 in the demo's
  opening, and on D2 alone foghorn 0.82. That design had a 24-cent detune, a 2.2 kHz filter peak, -0.35 semitones of
  drift and tau 0.9. The defaults now are: a 45-cent detune, 0.6 noise, a 1.2 kHz peak, a 4-semitone fall, tau 0.4
  and a small room above 600 Hz.
  - Alone, from A0 to F1, they read foghorn 0.08 or less and french_horn 0.07 or less. On A1 they read 0.10 and 0.14
    or less. On D2 foghorn reaches 0.25, and on E2 (2.4 s) 0.32. Keep the root at A1 or below, or tag it.
  - A shorter braam is not automatically safer: in the demo's first 1.5 s, on the previous defaults, a 1.6 s braam
    read foghorn 0.42 where the 2.4 s one read 0.25.
- **Pads under low hits.** A close saw chord in octave 3 (the trombone register, B2-A3) under a braam or a trailer
  hit reads as a brass section: brass_instrument 0.72-0.84, foghorn 0.35-0.60. The same chord from octave 4, in an
  open voicing, read music, drum and percussion in the demo's opening. Voice sustained chords there from octave 4 up
  (`open_voicing=True`), or tag them.
- **The trailer hit's room.** At 0.32 wet, its low-mid tail under an octave-3 chord read foghorn 0.39 and air_horn
  0.37. At 0.12, the default, it read 0.09. For a long tail, use a send high-passed at 600 Hz or more.
- **Inherited from drive.py and sfx_synth.py.**
  - Clap bursts at even 7 ms gaps buzz ('mosquito_buzz' 0.79), so the bursts are irregular.
  - Mallet, bell and marimba timbres over a steady beat read as a ringtone, so nothing here has bell partials.
  - A lone gliding tone reads as a siren, so risers glide clusters or noise, never a bare tone.
  - A short sine blip reads as a beep, so ticks are noise.
  - A slow dB fade on a low chord read as a foghorn. The film's tail uses mix_master's equal-power fade.
- **The speaker share.** mix_checks wants 30 % of the master's power above 150 Hz. In demo.py's first balance, with
  the 808 at -4 dB, the share was 14 %. With the 808 at -12 dB and the music bus up 5 dB it is 47 %. Measure it on
  every master: subs are loud.

## The demo and its numbers

`demo.py` renders four bars at the film's tempo:

| bar | section | what plays |
|---|---|---|
| 1 | tension | a braam and a trailer hit on the downbeat, ticking, a pad, swelling low pulses |
| 2 | build | a snare roll, kicks building, a stuttering noise riser, a pitch riser and a reverse swell, all landing on bar 3, then a 16th of breath |
| 3 | drop | an impact, a hit and a crash; the groove: kick, clap, snare, hats, shaker, an 808 line with slides, supersaw chords pumping under the kick, a plucked arp with a ping-pong delay |
| 4 | lift | FM piano stabs, a short lead with a glide, a whoosh on the downbeat, a tom fill and a downlifter |

It writes `drive.wav`, `music.wav`, `fx.wav`, `bed.wav`, `mix.wav`, `master.wav` (-16 LUFS, -1.7 dBTP) and
`demo.json`. `--bars 32` repeats it to the film's length.

| what | measured |
|---|---|
| 4 bars, 205 events | 2.2-3.7 s |
| 32 bars (76.8 s, 1,640 events, three buses, bed, mix and master) | 19-24 s at utility priority, about 0.9 GB peak memory |
| the 4-bar master in tagcheck's four passes | every window's top 3 is music, keyboard_musical, synthesizer (electronic_organ third in the first window) |
| its highest watch readings | ringtone 0.103, telephone 0.079, foghorn 0.109, french_horn 0.10; voice-like 0.039 or less (singing), alarm 0.025 or less (beep), siren 0.006 or less |
| its master | -16.0 LUFS, -1.71 dBTP, 47 % of the power above 150 Hz |

## Files

| file | contents |
|---|---|
| `core.py` | levels, notes and chords, pan, placement, fades, seeded generators, checks |
| `grid.py` | Grid, Event, swing, humanise, hits, seq, arp, progression |
| `osc.py` | oscillators, noise, unison and supersaw, FM, pitch curves |
| `env.py` | envelopes |
| `filters.py` | biquads, fixed and time-varying, cutoff curves, crossover |
| `fx.py` | pedalboard processing, saturation, width, sidechain |
| `drums.py`, `bass.py`, `synths.py`, `sfx.py` | the voices |
| `presets.py` | Instrument and the preset registry |
| `fills.py` | rolls, fills, builds, ticking |
| `mix.py` | render, render_mono, Session |
| `stems.py` | WAV writing, loudness, true peak, the preview master |
| `tagcheck.py` | the classifier passes |
| `demo.py` | the demo |
| `tests/` | the unit tests |
