"""Pebble launch cue, sampled: the composed score played on recorded CC0 instruments (our own small sampler).

The notes, durations, dynamics, pans and fader ride are exactly those of compose_score.py --seed 7 (read from its
--events export); only the sound changes. Each part is played by recorded instruments from the Versilian Community
Sample Library (VCSL) and VS Chamber Orchestra: Community Edition (VSCO 2 CE), both CC0 1.0 (kit, pinned commits and
hashes: tools/audio/sample_kit.json; fetch with tools/audio/sample_kit.py fetch):
  mallet -> marimba (VCSL; soft / med / loud)                 vibes -> vibraphone, soft mallets (VCSL; 2 dynamics)
  kal    -> upright piano (VCSL Yamaha; 2 dynamics, 2 round robins): the recorded kalimba was tried first and dropped,
            SoundAnalysis heard its tines as cowbell, bell and ringtone (up to 0.4)
  glock  -> glockenspiel, soft (VCSL)                          perc  -> small shaker, down/up strokes (VCSL; 2 rr)
  pad    -> viola section sustains, violin section for the upper octave from B4 (VSCO 2 CE; 2 dynamics each)
  bass   -> solo double bass pizzicato (VSCO 2 CE; 2 dynamics where recorded, 2 round robins)
  kick   -> bass drum (VCSL Bass Drum 1; 4 dynamics, 2 round robins)
How a note is played:
  - the nearest sampled note in the velocity layer is pitch-shifted with soxr (VHQ resampling), tuned from the sample's
    MEASURED pitch (the libraries name middle C "C3"; some samples sit 10-30 cents off); shifts stay within 3 semitones;
  - round robins rotate where the library has them; elsewhere each hit gets a tiny detune (+-3 cents) and level change
    (+-0.4 dB) so repeats never sound identical;
  - each sample is trimmed to its measured onset (0.5 ms pre-roll; one bass take that opens with handling noise has its
    onset set in the kit) so its attack lands on the note's time (the shaker, whose beads swell for 10-60 ms, lands
    its stroke's peak 4 ms after it), and is level-matched; velocity then sets the level with the score's curves;
  - the bass drum and the pizzicato get a transient shaper (attack +5 / +4 dB, the 20-60 ms bloom of their low end held
    at the attack's level), so their thump peaks on the hit and a picture cut on a downbeat lands on it; the bass is
    low-passed at 3 kHz (4th order), which removes the forte takes' finger fizz;
  - release tails: vibraphone pedal-up after the written hold (with the score's slow 3.2 Hz motor), the bass hand-damped
    after its written length, piano keys let go after 1.4 s, the strings' swell (less the bow's own) and release as
    written; marimba and glockenspiel ring naturally (capped);
  - humanised gently: timing within 5 ms (none on downbeats or on notes the score places exactly on the grid, so every
    downbeat stays on the grid), velocity within 6 %.
The mix: per-part EQ, bus levels calibrated to the original score's measured stem loudness (plus the offsets in
OFFSET_DB), a convolution hall (an impulse response synthesised here: our own, no third-party IR), the score's fader
ride, two touches on the final bar (touch_db), light bus compression and a brick-wall limiter, then normalised like
compose_score.py: -18 LUFS integrated, >= 1 dB of sample-peak headroom, 48 kHz / 24-bit, exactly 76.8 s.

Usage: python -I render_sampled.py OUT.wav [--seed 7] [--events EVENTS.json] [--stems DIR] [--report DIR]
Writes OUT.wav and OUT.score.json (form, instrument map, pitch shifts, levels). Deterministic: the same command and
kit rebuild the same file bit for bit. Without --events it runs compose_score.py --events first (about 10 s).
"""
import argparse
import hashlib
import json
import os
import subprocess
import sys

import numpy as np
import pyloudnorm as pyln
import soundfile as sf
import soxr
from pedalboard import (BrickwallLimiter, Compressor, HighpassFilter, HighShelfFilter, LowpassFilter, LowShelfFilter,
                        Pedalboard, PeakFilter)
from scipy.ndimage import maximum_filter1d, uniform_filter1d
from scipy.signal import butter, fftconvolve, sosfilt, sosfiltfilt

ap = argparse.ArgumentParser()
ap.add_argument("out")
ap.add_argument("--seed", type=int, default=7)
ap.add_argument("--events")
ap.add_argument("--stems")
ap.add_argument("--report")
ap.add_argument("--kit", default="tools/audio/sample_kit.json")
ap.add_argument("--samples", default=".work/audio/samples")
a = ap.parse_args()

SR = 48000
HERE = os.path.dirname(os.path.abspath(__file__))

# ----------------------------------------------------------------------------------------------------------------
# the score's events (compose_score.py --events)
# ----------------------------------------------------------------------------------------------------------------
ev_path = a.events
fresh = ev_path is None or not os.path.exists(ev_path)        # without --events: always from the current score
if fresh:
    base = os.path.join(os.path.dirname(os.path.abspath(a.out)), ".render-sampled-")
    tmp = base + "compose.wav"
    ev_path = ev_path or base + "events.json"
    subprocess.run([sys.executable, "-I", os.path.join(HERE, "compose_score.py"), tmp, "--seed", str(a.seed),
                    "--events", ev_path], check=True, stdout=subprocess.DEVNULL)
    for p in (tmp, tmp.rsplit(".", 1)[0] + ".score.json"):
        if os.path.exists(p):
            os.remove(p)
score = json.load(open(ev_path))
if fresh and a.events is None:
    os.remove(ev_path)
if score["seed"] != a.seed:
    sys.exit(f"{ev_path} was written with --seed {score['seed']}, not {a.seed}")
BPM, BEAT, BAR, N_BARS = score["bpm"], score["beat_s"], score["bar_s"], score["bars"]
LEN_S = score["duration_s"]
N = int(round(LEN_S * SR))
EVENTS = score["events"]
rng = np.random.default_rng(a.seed)


def t_of(bar, beat=1.0):
    return ((bar - 1) * 4 + (beat - 1)) * BEAT


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


NOTE = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def nm(s):
    p = NOTE[s[0]] + (1 if "#" in s else 0)
    return 12 * (int(s[-1]) + 1) + p


# ----------------------------------------------------------------------------------------------------------------
# the kit: load, verify, measure (onset, level, pitch)
# ----------------------------------------------------------------------------------------------------------------
KIT = json.load(open(a.kit))
# part -> kit instruments, how they are played (layers: velocity thresholds of layers 2, 3, ...; gamma: the original
# score's velocity curve; cap: longest ring in s; width: stereo width of the sample (1 = as recorded))
PARTS = {
    "mallet": dict(kit=["marimba"], layers=[0.55, 0.80], gamma=1.25, cap=3.0, width=0.55, detune=True, kind="hit"),
    "vibes": dict(kit=["vibes"], layers=[0.46], gamma=1.3, width=0.6, detune=True, kind="hit"),
    "kal": dict(kit=["piano"], layers=[0.40], gamma=1.3, ring=1.4, width=0.6, detune=True, kind="hit"),
    "glock": dict(kit=["glock"], layers=[], gamma=1.4, cap=3.0, width=0.5, detune=True, kind="hit"),
    "pad": dict(kit=["strings_viola", "strings_violin"], split=71, layers=[0.35], gamma=1.0, width=0.9, kind="sustain"),
    "bass": dict(kit=["bass"], layers=[0.66], gamma=1.2, width=0.3, kind="pluck", shape=(4.0, 0.0, 10.0)),
    "kick": dict(kit=["kick_vcsl"], layers=[0.50, 0.66, 0.82], gamma=1.0, cap=1.2, width=0.25, kind="drum",
                 shape=(5.0, -2.0, 10.0)),
    "perc": dict(kit=["shaker_vcsl"], layers=[], gamma=1.0, cap=0.5, width=0.4, kind="drum", align=("peak", 0.004)),
}
# a sample's time point (what lands on the note's time): its onset (0.5 ms pre-roll), except the shaker, whose stroke
# peaks 4 ms after the note (its beads swell for 10-60 ms). shape: shape_transient(boost_db, clamp_db, tau_ms) on the
# bass drum and the pizzicato, so their thump peaks on the hit itself. ring: a piano key held this long, then damped.
SHAKER_ART = "HighFaster"


def sha256(p):
    return hashlib.sha256(open(p, "rb").read()).hexdigest()


def peak_freq(mag, freqs, fc, cents):
    """Interpolated frequency and magnitude of the strongest spectral peak within +-cents of fc."""
    sel = np.nonzero((freqs > fc * 2 ** (-cents / 1200)) & (freqs < fc * 2 ** (cents / 1200)))[0]
    k = sel[np.argmax(mag[sel])]
    la, lb, lc = np.log(mag[k - 1:k + 2] + 1e-30)
    den = la - 2 * lb + lc
    d = 0.5 * (la - lc) / den if den != 0 else 0.0
    return (k + d) * (freqs[1] - freqs[0]), float(mag[k])


def need_s(part):
    """The longest stretch of any sample this part plays (s, at the written pitch)."""
    evs = [e for e in EVENTS if e["bus"] == part]
    if part == "vibes":
        return max(e["hold"] for e in evs) + 0.3
    if part == "pad":
        return max(e["dur"] + e["rel"] for e in evs) + 0.1
    if part == "bass":
        return max(e["dur"] for e in evs) + 0.2
    if PARTS[part].get("ring"):
        return PARTS[part]["ring"] + 0.3
    return PARTS[part]["cap"] + 0.05


def shape_transient(y, sr, boost_db, clamp_db, tau_ms=6.0):
    """A transient designer for the bass drum and the pizzicato: +boost_db on the attack (decaying with tau_ms), and
    the low end's bloom (a plucked string or a soft beater keeps building for 20-60 ms after the hit) held to clamp_db
    above its level in the first 10 ms; after the bloom's peak the natural decay continues at that gain. The thump
    then peaks on the hit itself, so a picture cut on the beat lands on it."""
    m = y.mean(0)
    lo = sosfiltfilt(butter(2, [40, 200], btype="band", fs=sr, output="sos"), m)
    E = np.sqrt(np.maximum(uniform_filter1d(lo ** 2, int(0.012 * sr)), 0.0) + 1e-20)
    ref = E[: int(0.010 * sr)].max()
    iM = int(np.argmax(E[: int(0.15 * sr)]))
    G = np.ones(len(m))
    s0 = int(0.004 * sr)
    if iM > s0:
        G[s0:iM + 1] = np.minimum(1.0, ref * 10 ** (clamp_db / 20) / E[s0:iM + 1])
        G[iM + 1:] = G[iM]
    t = np.arange(len(m)) / sr
    G *= 1 + (10 ** (boost_db / 20) - 1) * np.exp(-t / (tau_ms / 1000))
    return y * uniform_filter1d(G, max(1, int(0.002 * sr)))


class Sample:
    def __init__(self, inst, f, path, kind, keep_s, align=None, shape=None):
        x, sr = sf.read(path, always_2d=True, dtype="float64")
        x = x.T
        if x.shape[0] == 1:
            x = np.vstack([x, x])
        x = x - x.mean(axis=1, keepdims=True)
        self.inst, self.file, self.sr = inst, f["file"], sr
        self.layer, self.rr = f.get("layer", 1), f.get("rr", 1)
        self.note, self.art = f.get("note"), f.get("articulation")
        mono = x.mean(0)
        env = maximum_filter1d(np.abs(mono), max(1, int(0.0005 * sr)))
        pk = float(env.max())
        i = int(np.argmax(env > 0.03 * pk))                       # first clear rise ...
        lo, j = max(0, i - int(0.006 * sr)), i
        while j > lo and env[j - 1] > 0.006 * pk:                 # ... traced back to where it leaves the floor
            j -= 1
        if f.get("onset_ms") is not None:                          # a take with handling noise before the hit:
            j = int(round(f["onset_ms"] / 1000 * sr))              # its onset was measured by hand (sample_kit.json)
        self.onset = j
        tail = mono[-int(0.1 * sr):]
        self.floor_db = float(10 * np.log10(np.mean(tail ** 2) + 1e-20) - 20 * np.log10(pk + 1e-20))
        above = np.nonzero(env > pk * 10 ** (-60 / 20))[0]        # cut the tail 60 dB down: no noise build-up
        end = int(above[-1]) + 1 if len(above) else len(mono)
        pre = int(0.0005 * sr)
        end = min(end, j - pre + int(keep_s * sr))                # never longer than the part can use
        y = x[:, max(0, j - pre):end].copy()
        k = min(pre, y.shape[1])
        y[:, :k] *= np.linspace(0, 1, k) if k > 1 else 1.0
        fo = min(int(0.03 * sr), y.shape[1] // 4)
        y[:, -fo:] *= np.linspace(1, 0, fo) ** 2
        if shape:
            y = shape_transient(y, sr, *shape)
        self.dur = y.shape[1] / sr
        # level: steady sustain RMS for strings, the loudest 10 ms of the first 250 ms for everything struck or plucked
        m = y.mean(0)
        self.anchor = 0.0                                          # s from the trimmed start to the time point
        if align and align[0] == "peak":
            e2 = np.sqrt(uniform_filter1d(m[:int(0.25 * sr)] ** 2, max(1, int(0.005 * sr))))
            self.anchor = float(np.argmax(e2)) / sr - align[1]
        self.rise_s = 0.0
        if kind == "sustain":
            seg = m[int(0.35 * sr):int(1.35 * sr)]
            self.level_db = float(10 * np.log10(np.mean(seg ** 2) + 1e-20))
            st = 10 * np.log10(uniform_filter1d(m[:int(2.0 * sr)] ** 2, int(0.05 * sr)) + 1e-20)
            self.rise_s = float(np.argmax(st >= self.level_db - 3.0)) / sr   # the bow's own swell, onset to -3 dB
        else:
            st = uniform_filter1d(m[:int(0.25 * sr)] ** 2, max(1, int(0.01 * sr)))
            self.level_db = float(10 * np.log10(st.max() + 1e-20))
        self.peak_db = float(20 * np.log10(np.abs(y).max() + 1e-20))
        # pitch: named note + 12 (the libraries name middle C "C3"), refined from the spectrum
        self.midi = self.named_midi = None
        self.cents_off_name = None
        if self.note:
            self.named_midi = nm(self.note) + 12
            if kind == "sustain":
                a0, L = int(0.4 * sr), int(1.6 * sr)
            else:
                a0, L = int(0.03 * sr), int(0.3 * sr)
            seg = m[a0:a0 + L]
            if len(seg) < L // 2:
                seg = m[:L]
            seg = seg * np.hanning(len(seg))
            mag = np.abs(np.fft.rfft(seg, 1 << 20))
            freqs = np.fft.rfftfreq(1 << 20, 1 / sr)
            f0 = mtof(self.named_midi)
            if kind in ("sustain", "pluck"):                       # harmonic: average the lowest partials
                hs = (1, 2, 3, 4) if kind == "sustain" else (1, 2)   # (a plucked string's upper partials run sharp)
                est = [peak_freq(mag, freqs, f0 * h, 60) for h in hs if f0 * h < 0.45 * sr]
                w = np.array([e[1] for e in est])
                fz = float(np.sum([e[0] / (h + 1) for h, e in enumerate(est)] * w) / w.sum())
            else:                                                  # bars and tines: the fundamental
                fz = peak_freq(mag, freqs, f0, 80)[0]
            self.midi = float(69 + 12 * np.log2(fz / 440.0))
            self.cents_off_name = round(100 * (self.midi - self.named_midi), 1)
        self.y = y.astype(np.float32)
        self._cache = {}

    def at(self, p):
        """The sample at 48 kHz with its pitch multiplied by p (soxr VHQ; cached)."""
        key = round(p, 7)
        if key not in self._cache:
            z = soxr.resample(self.y.T, self.sr * p, SR, quality="VHQ").T
            self._cache[key] = np.ascontiguousarray(z, dtype=np.float32)
        return self._cache[key]


samples = {}
kit_report = []
for pname, part in PARTS.items():
    for iname in part["kit"]:
        inst = KIT["instruments"][iname]
        out = []
        for f in inst["files"]:
            p = os.path.join(a.samples, inst["lib"], inst["dir"], f["file"])
            if not os.path.exists(p):
                sys.exit(f"missing sample {p}: run  python -I tools/audio/sample_kit.py fetch")
            if sha256(p) != f["sha256"]:
                sys.exit(f"{p}: SHA-256 differs from {a.kit}")
            s = Sample(iname, f, p, part["kind"], need_s(pname) * 1.2 + 0.1, part.get("align"), part.get("shape"))
            out.append(s)
            kit_report.append({"instrument": iname, "file": s.file, "layer": s.layer, "rr": s.rr, "note": s.note,
                               "sounding_midi": None if s.midi is None else round(float(s.midi), 3),
                               "cents_off_name_plus_octave": s.cents_off_name,
                               "onset_ms": round(1000 * s.onset / s.sr, 2), "length_used_s": round(s.dur, 3),
                               "level_db": round(s.level_db, 2), "peak_db": round(s.peak_db, 2),
                               "noise_floor_db_re_peak": round(s.floor_db, 1), "rise_s": round(s.rise_s, 3),
                               "anchor_ms": round(1000 * s.anchor, 2),
                               "sample_rate": s.sr})
        samples[iname] = out

# ----------------------------------------------------------------------------------------------------------------
# playing the notes
# ----------------------------------------------------------------------------------------------------------------
rr_count = {}
shifts = {p: [] for p in PARTS}
usage = {}


def layer_of(part, vel):
    return 1 + sum(vel >= th for th in PARTS[part]["layers"])


def pick(part, midi, vel, beat):
    """The sample for a note: the instrument (strings split by register), the velocity layer, the nearest measured
    pitch (ties go to the sample above: a small downward shift), then the next round robin of that note and layer."""
    P = PARTS[part]
    iname = P["kit"][0] if "split" not in P or midi < P["split"] else P["kit"][1]
    pool = samples[iname]
    if part == "perc":
        k = int(round((beat - 1) * 4)) % 2
        art = f"{SHAKER_ART}_{'Up' if k else 'Down'}"
        cands = [s for s in pool if s.art == art]
    elif part == "kick":
        L = layer_of(part, vel)
        cands = [s for s in pool if s.layer == L] or pool
    else:
        L = min(layer_of(part, vel), max(s.layer for s in pool))
        cands = [s for s in pool if s.layer == L and abs(s.midi - midi) <= 3.05]
        if not cands:
            cands = [s for s in pool if abs(s.midi - midi) <= 3.05] or pool
        groups = {}
        for s in cands:                                            # one group per sampled note, with its
            groups.setdefault(s.named_midi, []).append(s)          # round robins
        dist = {k: min(abs(s.midi - midi) for s in g) for k, g in groups.items()}
        best = min(dist.values())
        cands = groups[max(k for k, d in dist.items() if d <= best + 0.05)]
    cands = sorted(cands, key=lambda s: (s.rr, s.file))
    key = (iname, cands[0].note, cands[0].layer, cands[0].art)
    i = rr_count.get(key, 0)
    rr_count[key] = i + 1
    return iname, cands[i % len(cands)]


def envelope(part, ev, y, s):
    """Release tails and caps, in place on the 48 kHz note y (2, n) played from sample s."""
    n = y.shape[1]
    t = np.arange(n) / SR
    P = PARTS[part]
    if part == "vibes":                                            # pedal up after the written hold
        off = int(ev["hold"] * SR)
        if off < n:
            r = int(0.25 * SR)
            y[:, off:off + r] *= (0.5 + 0.5 * np.cos(np.pi * np.arange(min(r, n - off)) / r))
            y[:, off + r:] = 0.0
        trem = ev.get("trem") or 0.0                               # the score's slow motor (3.2 Hz, depth 0.07, 0.02 on
        if trem:                                                   # the final chord) on the motor-off recordings
            y *= 1 + trem * np.sin(2 * np.pi * 3.2 * t + rng.uniform(0, 2 * np.pi))
    elif P.get("ring"):                                            # piano: the key is let go, the damper falls
        off = int(P["ring"] * SR)
        if off < n:
            r = int(0.2 * SR)
            y[:, off:off + r] *= (0.5 + 0.5 * np.cos(np.pi * np.arange(min(r, n - off)) / r))
            y[:, off + r:] = 0.0
    elif part == "bass":                                           # the hand damps the string after its length
        off = int(ev["dur"] * SR)
        if off < n:
            r = int(0.12 * SR)
            y[:, off:off + r] *= np.linspace(1, 0, min(r, n - off)) ** 2
            y[:, off + r:] = 0.0
    elif part == "pad":                                            # the written swell (less the bow's own) and release
        att, dur, rel = max(0.08, ev["att"] - s.rise_s), ev["dur"], ev["rel"]
        e = np.minimum(1.0, t / att) ** 1.5
        off = int(dur * SR)
        e[off:] *= np.exp(-(t[off:] - dur) / (rel / 4))
        end = int((dur + rel) * SR)
        if end < n:
            fo = int(0.05 * SR)
            e[end - fo:end] *= np.linspace(1, 0, fo)
            e[end:] = 0.0
        y *= e
    if P.get("cap"):
        c = int(P["cap"] * SR)
        if c < n:
            fo = int(0.3 * SR)
            y[:, c - fo:c] *= np.linspace(1, 0, fo) ** 2
            y[:, c:] = 0.0
    return y


BUSES = list(PARTS)
bus = {b: np.zeros((2, N), dtype=np.float32) for b in BUSES}
LEVEL_REF_DB = -30.0     # every sample is level-matched to this (its loudest 10 ms, or a string's sustain), so a part's
                         # balance comes from the score's velocities alone; the bus calibration sets the absolute level


def touch_db(ev):
    """Two mix touches on single notes of the final bar: on recorded instruments the marimba roll under the strings'
    swell reads as a two-tone horn (SoundAnalysis "foghorn" 0.6-0.9 on the final chord), so the roll dies away 6 dB
    softer and the strings' final chord sits 3 dB lower (their written dynamics are otherwise unchanged)."""
    if ev.get("roll"):
        return -6.0
    if ev["bus"] == "pad" and ev["bar"] == 31:
        return -3.0
    return 0.0


timing_ms = []
for ev in EVENTS:
    part = ev["bus"]
    P = PARTS[part]
    on_grid = ev["exact"] or abs(ev["beat"] - 1.0) < 1e-9
    if ev.get("roll"):
        t0 = ev["t"]                                               # the final roll is timed off the grid on purpose
    elif on_grid:
        t0 = ev["t_grid"]
    else:
        t0 = ev["t_grid"] + float(np.clip(rng.normal(0, 0.0018), -0.005, 0.005))
    timing_ms.append(1000 * (t0 - ev["t_grid"]) if not ev.get("roll") else 0.0)
    vel = float(np.clip(ev["vel_nominal"] * (1 + np.clip(rng.normal(0, 0.03), -0.06, 0.06)), 0.03, 1.0))
    midi = ev["midi"]
    iname, s = pick(part, midi if midi is not None else 0.0, vel, ev["beat"])
    cents = 0.0
    if P.get("detune"):
        cents = float(rng.choice([-3.0, 0.0, 3.0]))
    p = 1.0 if midi is None else 2 ** ((midi + cents / 100 - s.midi) / 12)
    if midi is not None:
        shifts[part].append(midi - s.midi)
    usage[s.file] = usage.get(s.file, 0) + 1
    y = envelope(part, ev, s.at(p).copy(), s)
    g = 10 ** ((LEVEL_REF_DB - s.level_db + touch_db(ev)) / 20) * vel ** P["gamma"]
    if P.get("detune"):
        g *= 10 ** (rng.uniform(-0.4, 0.4) / 20)
    mid, side = 0.5 * (y[0] + y[1]), 0.5 * (y[0] - y[1]) * P["width"]
    ang = (np.clip(ev["pan"], -1, 1) + 1) * np.pi / 4
    i0 = int(round((t0 - s.anchor / p) * SR))                     # the sample's time point lands on the note's time
    k0 = max(0, -i0)                                               # (a stroke that swells before bar 1 starts cut)
    i0 += k0
    if i0 >= N:
        continue
    j = min(N, i0 + y.shape[1] - k0)
    bus[part][0, i0:j] += g * np.cos(ang) * np.sqrt(2) * (mid + side)[k0:k0 + j - i0]
    bus[part][1, i0:j] += g * np.sin(ang) * np.sqrt(2) * (mid - side)[k0:k0 + j - i0]

# ----------------------------------------------------------------------------------------------------------------
# mix
# ----------------------------------------------------------------------------------------------------------------
# loudness of each dry stem of compose_score.py --seed 7 --stems (post-EQ, pre-reverb; pyloudnorm, 2026-10-23): the
# sampled buses are set to the same balance, then moved by OFFSET_DB where recorded instruments sit differently
ORIGINAL_STEM_LUFS = {"mallet": -11.53, "bass": -17.76, "vibes": -19.71, "kick": -20.89, "kal": -23.87, "pad": -28.85,
                      "glock": -44.08, "perc": -44.18}
OFFSET_DB = {"mallet": -1.5, "bass": 0.0, "vibes": 0.0, "kick": 2.0, "kal": 3.0, "pad": 0.5, "glock": 0.0, "perc": 0.0}
CHAIN = {
    "mallet": [HighpassFilter(80), PeakFilter(260, -1.5, 0.9), PeakFilter(2800, -2.5, 0.9), HighShelfFilter(5500, -2.0)],
    "vibes": [HighpassFilter(110), PeakFilter(2600, -1.0, 0.8)],
    "kal": [HighpassFilter(120), PeakFilter(300, -1.5, 0.8), LowpassFilter(9500)],
    "glock": [HighpassFilter(600), LowpassFilter(11000)],
    "pad": [HighpassFilter(120), LowShelfFilter(250, -1.0), PeakFilter(450, -3.0, 0.8), PeakFilter(4000, 3.0, 0.7),
            HighShelfFilter(10000, 2.0)],
    "bass": [HighpassFilter(35), LowShelfFilter(90, 1.0), PeakFilter(700, -1.5, 1.0), Compressor(-26, 2.2, 15, 160)],
    "kick": [HighpassFilter(30), LowpassFilter(4500)],
    "perc": [HighpassFilter(1500), HighShelfFilter(9000, -2.0)],
}
PRE_LOWPASS = {"bass": 3000}   # Hz, 4th order: the forte pizzicato takes' finger fizz has no place above 3 kHz here
SEND = {"mallet": 0.30, "vibes": 0.28, "kal": 0.28, "glock": 0.40, "pad": 0.24, "bass": 0.05, "kick": 0.03, "perc": 0.12}
WET = 0.65
meter = pyln.Meter(SR)


def P_(x, chain):
    return Pedalboard(chain)(x.astype(np.float32), SR).astype(np.float64)


def lufs(x):
    return float(meter.integrated_loudness(x.T))


def hall_ir(seed=2026, length=3.0, predelay=0.021):
    """Our own stereo hall: decorrelated noise per channel with a decay time per band (1.9 s in the lows, 0.8 s
    above 6 kHz), a 40 ms diffuse build-up and 14 sparse early reflections; unit energy per channel."""
    g = np.random.default_rng(seed)
    n = int(length * SR)
    t = np.arange(n) / SR
    bands = [(None, 200, 1.9), (200, 800, 1.8), (800, 2500, 1.6), (2500, 6000, 1.3), (6000, None, 0.8)]
    late = np.zeros((2, n))
    for c in range(2):
        nz = g.standard_normal(n)
        for lo, hi, rt in bands:
            if lo is None:
                sos = butter(4, hi, "lowpass", fs=SR, output="sos")
            elif hi is None:
                sos = butter(4, lo, "highpass", fs=SR, output="sos")
            else:
                sos = butter(4, [lo, hi], "bandpass", fs=SR, output="sos")
            late[c] += sosfilt(sos, nz) * 10 ** (-3 * t / rt)
    k = int(0.04 * SR)
    late[:, :k] *= np.linspace(0, 1, k) ** 1.5
    late /= np.sqrt((late ** 2).sum(axis=1, keepdims=True))
    er = np.zeros((2, n))
    for i in range(14):
        d = g.uniform(0.006, 0.075)
        er[i % 2, int(d * SR)] += (1 - d / 0.09) * g.uniform(0.6, 1.0) * (1 if g.random() > 0.5 else -1)
    er = sosfilt(butter(2, 5000, fs=SR, output="sos"), er, axis=1)
    er *= np.sqrt(0.3 / (er ** 2).sum(axis=1, keepdims=True))
    ir = late + er
    fo = int(0.3 * SR)
    ir[:, -fo:] *= np.linspace(1, 0, fo) ** 2
    ir = np.concatenate([np.zeros((2, int(predelay * SR))), ir], axis=1)
    return ir / np.sqrt((ir ** 2).sum(axis=1, keepdims=True))


bus_report = {}
dry = np.zeros((2, N))
send = np.zeros((2, N))
stems = {}
for b in BUSES:
    x = bus.pop(b).astype(np.float64)
    target = ORIGINAL_STEM_LUFS[b] + OFFSET_DB[b]
    l0 = lufs(x)
    x = x * 10 ** ((target - l0) / 20)                             # pre-gain to the target, then the chain ...
    if b in PRE_LOWPASS:
        x = sosfilt(butter(4, PRE_LOWPASS[b], "lowpass", fs=SR, output="sos"), x, axis=1)
    x = P_(x, CHAIN[b])
    l1 = lufs(x)
    x = x * 10 ** ((target - l1) / 20)                             # ... and trimmed back to it after the chain
    if a.stems:
        stems[b] = x.astype(np.float32)
    dry += x
    send += x * SEND[b]
    bus_report[b] = {"target_lufs": round(target, 2), "raw_lufs": round(l0, 2), "send": SEND[b]}
IR = hall_ir()
wet = np.stack([fftconvolve(send[c], IR[c])[:N] for c in range(2)])
wet = P_(wet, [HighpassFilter(170), LowpassFilter(9000)])
mix = dry + WET * wet
# the score's fader ride, exactly as compose_score.py applies it: dB per bar, each change ramping over 60 ms and
# ending 10 ms before the downbeat
RIDE = {int(k): v for k, v in score["ride_db_by_bar"].items()}
ride_db = np.zeros(N)
for bar in range(1, N_BARS + 1):
    ride_db[int(round(t_of(bar) * SR)):] = RIDE.get(bar, 0.0)
k = int(0.06 * SR)
ride = 10 ** (np.convolve(np.pad(ride_db, (k, 0), mode="edge"), np.ones(k) / k, "valid")[:N] / 20)
lead = k + int(0.01 * SR)
ride = np.concatenate([ride[lead:], np.full(lead, ride[-1])])
mix *= ride
# master: working level -20 LUFS, gentle EQ, light glue compression, a brick-wall limiter 13 dB above the loudness
work = 10 ** ((-20.0 - lufs(mix)) / 20)
mix *= work
mix = P_(mix, [HighpassFilter(30), LowShelfFilter(110, -0.5), HighShelfFilter(9000, 0.5),
               Compressor(threshold_db=-27, ratio=1.6, attack_ms=30, release_ms=300)])
CEIL = -7.0
over = np.abs(mix).max(axis=0) > 10 ** (CEIL / 20)
limiter = {"ceiling_dbfs_at_-20_lufs": CEIL, "samples_over_pct": round(100 * float(over.mean()), 4),
           "max_over_db": round(float(20 * np.log10(np.abs(mix).max()) - CEIL), 2)}
mix = P_(mix, [BrickwallLimiter(ceiling_db=CEIL, release_ms=80, lookahead_ms=5, true_peak=True)])
f = int(0.6 * SR)                                                  # the ringing chord lands in silence on the last frame
mix[:, -f:] *= np.linspace(1, 0, f) ** 2
mix[:, : int(0.002 * SR)] *= np.linspace(0, 1, int(0.002 * SR))
lufs0 = lufs(mix)
TARGET = -18.0
mix *= 10 ** ((TARGET - lufs0) / 20)
pk = float(np.abs(mix).max())
if pk > 0.89:
    mix *= 0.89 / pk
assert mix.shape[1] == N
sf.write(a.out, mix.T, SR, subtype="PCM_24")
scale = work * 10 ** ((TARGET - lufs0) / 20)                         # the stems at the bed's level
if a.stems:
    os.makedirs(a.stems, exist_ok=True)
    for b, x in stems.items():
        sf.write(f"{a.stems}/{b}.wav", (x * scale).T, SR, subtype="PCM_24")
    sf.write(f"{a.stems}/reverb.wav", (WET * wet * scale).T, SR, subtype="PCM_24")

bar_rms = []
for bar in range(1, N_BARS + 1):
    s0, s1 = int(t_of(bar) * SR), int(t_of(bar + 1) * SR)
    bar_rms.append(round(float(10 * np.log10(np.mean(mix[:, s0:s1] ** 2) + 1e-12)), 1))
mx = {p: (round(float(np.max(np.abs(v))), 3) if v else 0.0) for p, v in shifts.items()}
info = {"title": "Pebble launch cue (sampled instruments)", "bpm": BPM, "meter": "4/4", "key": "D major", "bars": N_BARS,
        "duration_s": LEN_S, "seed": a.seed, "events_from": "tools/audio/compose_score.py --seed %d --events" % a.seed,
        "notes": len(EVENTS), "integrated_lufs": round(lufs(mix), 2),
        "sample_peak_dbfs": round(20 * np.log10(np.abs(mix).max()), 2),
        "instruments": {p: {"kit": PARTS[p]["kit"], "what": [KIT["instruments"][i]["what"] for i in PARTS[p]["kit"]]}
                        for p in PARTS},
        "max_pitch_shift_semitones": mx,
        "humanisation": {"timing_ms_max_abs": round(float(np.max(np.abs(timing_ms))), 2),
                         "timing_ms_sd": round(float(np.std(timing_ms)), 2), "velocity_pct_max": 6.0,
                         "downbeats_and_exact_notes": "on the grid (0 ms)"},
        "bus_levels": bus_report, "offset_db": OFFSET_DB, "limiter": limiter,
        "sections": score["sections"], "chords": score["chords"],
        "bar_rms_db": bar_rms}
json.dump(info, open(a.out.rsplit(".", 1)[0] + ".score.json", "w"), indent=1)
if a.report:
    os.makedirs(a.report, exist_ok=True)
    json.dump({"samples": kit_report, "usage": usage}, open(os.path.join(a.report, "kit-analysis.json"), "w"), indent=1)
print(json.dumps({k: v for k, v in info.items() if k in ("integrated_lufs", "sample_peak_dbfs", "notes", "max_pitch_shift_semitones", "humanisation", "limiter")}))
print("bar RMS dB:", " ".join(f"{i + 1}:{v}" for i, v in enumerate(bar_rms)))
