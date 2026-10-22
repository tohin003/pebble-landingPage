"""Recorded CC0 foley for the film's taps and pops (critic H9): picks from Kenney's Impact Sounds and Interface Sounds
packs (CC0 1.0, www.kenney.nl), trimmed, faded, gently filtered, the pops tuned into the score's key (D major), and
rendered as 2-3 takes each (pitch +-2 %, gain +-1.5 dB) so repeated sounds never repeat exactly.

Usage: python -I sfx_foley.py KENNEY_DIR OUT_DIR MANIFEST.json
  KENNEY_DIR holds impact/Audio/*.ogg and interface/Audio/*.ogg, extracted from:
    https://kenney.nl/media/pages/assets/impact-sounds/87b4ddecda-1677589768/kenney_impact-sounds.zip
    https://kenney.nl/media/pages/assets/interface-sounds/fa43c1dd4d-1677589452/kenney_interface-sounds.zip
  (their SHA-256 are in tools/audio/sha256-sources.txt). Writes 48 kHz 24-bit WAVs and a manifest with every source.
"""
import hashlib
import json
import os
import sys

import numpy as np
import soundfile as sf
import soxr
from pedalboard import HighpassFilter, HighShelfFilter, LowpassFilter, Pedalboard, Reverb

SRC, OUT, MAN = sys.argv[1], sys.argv[2], sys.argv[3]
SR = 48000
rng = np.random.default_rng(11)
os.makedirs(OUT, exist_ok=True)
D_MAJOR_PENT = [62, 64, 66, 69, 71]          # D E F# A B: the pops land on notes of the score's key


def load(rel):
    x, sr = sf.read(os.path.join(SRC, rel), always_2d=True)
    x = x.T.astype(np.float64)
    if sr != SR:
        x = soxr.resample(x.T, sr, SR, quality="VHQ").T
    if x.shape[0] == 1:
        x = np.vstack([x, x])
    return x


def sha(rel):
    return hashlib.sha256(open(os.path.join(SRC, rel), "rb").read()).hexdigest()


def trim(x, keep_s, fade_s):
    on = np.argmax(np.abs(x).max(0) > 10 ** (-50 / 20) * np.abs(x).max())     # drop leading silence
    x = x[:, max(0, on - int(0.001 * SR)):]
    x = x[:, : int(keep_s * SR)].copy()
    f = min(int(fade_s * SR), x.shape[1] // 2)
    x[:, -f:] *= np.linspace(1, 0, f) ** 2
    x[:, : int(0.0005 * SR)] *= np.linspace(0, 1, int(0.0005 * SR))
    return x


def pitch(x, ratio):
    """Varispeed: ratio > 1 raises pitch (and shortens). Used for +-2 % take variation and key tuning."""
    return soxr.resample(x.T, SR * ratio, SR, quality="VHQ").T if abs(ratio - 1) > 1e-6 else x


def dominant_hz(x, lo=200, hi=4000):
    m = x.mean(0)[: int(0.06 * SR)]
    spec = np.abs(np.fft.rfft(m * np.hanning(len(m)), 1 << 16))
    f = np.fft.rfftfreq(1 << 16, 1 / SR)
    band = (f >= lo) & (f <= hi)
    return float(f[band][np.argmax(spec[band])])


def norm(x, peak_db):
    return x / (np.abs(x).max() + 1e-12) * 10 ** (peak_db / 20)


def run(board, x, tail=0.0):
    """Process with a pedalboard chain, padding first so reverb tails are not cut, then fade the last 10 ms to zero."""
    if tail:
        x = np.concatenate([x, np.zeros((x.shape[0], int(tail * SR)))], axis=1)
    y = board(x.astype(np.float32), SR).astype(np.float64)
    f = min(int(0.01 * SR), y.shape[1] // 4)
    y[:, -f:] *= np.linspace(1, 0, f) ** 2
    return y


manifest = []


def save(name, x, sources, processing, peak_db=-3.0):
    x = norm(x, peak_db)
    sf.write(os.path.join(OUT, name + ".wav"), x.T, SR, subtype="PCM_24")
    manifest.append({"file": name + ".wav", "duration_s": round(x.shape[1] / SR, 3), "origin": "Kenney (CC0 1.0)",
                     "sources": sources, "processing": processing})
    print(f"{name}: {x.shape[1] / SR * 1000:.0f} ms  <- {', '.join(s['file'] for s in sources)}")


tone = Pedalboard([HighpassFilter(180), HighShelfFilter(7000, -2.0)])
# ---- soft click: the first transient of a recorded mechanical switch (a real click, short and low), three takes.
#      (the hollow impactGeneric "tok" was heard as beep / tuning fork by SoundAnalysis, so it was not used) ----
for take, (src, pr, g) in enumerate([("interface/Audio/switch_005.ogg", 1.00, 0.0),
                                     ("interface/Audio/switch_006.ogg", 1.02, -1.5),
                                     ("interface/Audio/switch_007.ogg", 0.98, -0.8)]):
    x = run(tone, trim(pitch(load(src), pr), 0.07, 0.03))
    save(f"click_{'abc'[take]}", x, [{"pack": "Interface Sounds", "file": os.path.basename(src), "sha256": sha(src)}],
         f"first transient only: trimmed to 70 ms, 30 ms fade, HPF 180 Hz, -2 dB shelf above 7 kHz, pitch x{pr}, take gain {g} dB",
         peak_db=-3.0 + g)
# ---- pebble pop: a short water-drop "plip" (drop_002/003, cut to 80 ms so its glide does not read as a bird call),
#      tuned to D-major notes, three takes; landings layer it over a thud (thud_a/b) in tools/audio/cues.json ----
pops = [("interface/Audio/drop_002.ogg", 0.0), ("interface/Audio/drop_003.ogg", -1.2), ("interface/Audio/drop_002.ogg", -0.6)]
for take, (src, g) in enumerate(pops):
    x0 = trim(load(src), 0.08, 0.035)
    f0 = dominant_hz(x0)
    m0 = 69 + 12 * np.log2(f0 / 440)
    scale = sorted(n + 12 * o for n in D_MAJOR_PENT for o in (-2, -1, 0, 1, 2))
    nearest = min(scale, key=lambda n: abs(n - m0))
    target = nearest if take < 2 else scale[scale.index(nearest) + 1]   # take c: the next scale note up, for variety
    ratio = 2 ** ((target - m0) / 12)
    x = run(Pedalboard([HighpassFilter(250), LowpassFilter(9000), Reverb(room_size=0.18, wet_level=0.08, dry_level=1.0)]),
            pitch(x0, ratio), tail=0.12)
    save(f"pop_{'abc'[take]}", x, [{"pack": "Interface Sounds", "file": os.path.basename(src), "sha256": sha(src)}],
         f"trimmed to 80 ms (35 ms fade), tuned from {f0:.0f} Hz to MIDI {target} ({440 * 2 ** ((target - 69) / 12):.0f} Hz, D major), "
         f"HPF 250 Hz, LPF 9 kHz, small room 8 %, take gain {g} dB", peak_db=-3.0 + g)
# ---- ticks (very low in the mix): tick_001/002 and a softened click_003 ----
for take, (src, pr) in enumerate([("interface/Audio/tick_001.ogg", 1.0), ("interface/Audio/tick_002.ogg", 1.0),
                                  ("interface/Audio/click_003.ogg", 0.98)]):
    x = run(Pedalboard([HighpassFilter(400), LowpassFilter(8000)]), trim(pitch(load(src), pr), 0.06, 0.02))
    save(f"tick_{'abc'[take]}", x, [{"pack": "Interface Sounds", "file": os.path.basename(src), "sha256": sha(src)}],
         f"trimmed to 60 ms, 20 ms fade, HPF 400 Hz, LPF 8 kHz, pitch x{pr}", peak_db=-6.0)
# ---- soft thud (texture under the synthesised reveal hit, and the end-card landing), two takes ----
for take, src in enumerate(["impact/Audio/impactSoft_heavy_000.ogg", "impact/Audio/impactSoft_heavy_003.ogg"]):
    x = run(Pedalboard([HighpassFilter(35), LowpassFilter(1800), Reverb(room_size=0.35, wet_level=0.12, dry_level=1.0)]),
            trim(load(src), 0.6, 0.25), tail=0.25)
    save(f"thud_{'ab'[take]}", x, [{"pack": "Impact Sounds", "file": os.path.basename(src), "sha256": sha(src)}],
         "trimmed to 600 ms, 250 ms fade, HPF 35 Hz, LPF 1.8 kHz, small room 12 %")
json.dump(manifest, open(MAN, "w"), indent=1)
