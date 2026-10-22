"""Synthesised sound effects for the Pebble film (MASTER_PLAN §6.3, critic H9: synthesis only for the riser, the
shimmer, the whooshes, plus the reveal's felt sub thump and a downlifter). numpy + pedalboard only, no samples:
our own work, released CC0 1.0. Taps and pops are recorded CC0 foley instead (tools/audio/sfx_foley.py).

Usage: python -I sfx_synth.py OUT_DIR [--bpm 100] [--riser-bars 2] [--seed 7]
Writes 48 kHz 24-bit WAVs:
  whoosh_a/b/c   0.32-0.40 s airy, low-passed sweeps, each panned differently; the peak is the cut (align "peak")
  riser          exactly riser_bars bars long (4.8 s at 100 BPM), noise-led with no pitch glide (a gliding tone reads
                 as a siren to Apple's classifier); its loudest point is its last sample: put its END on the reveal
  soft_hit_a/b   felt sub thump (sine drop + soft transient + small room); not an "epic boom"
  shimmer_a/b    airy sparkle: granular high-noise grains over faint D-major partials (110 ms attacks, so no ding)
  downlifter     falling filtered noise, 1.2 s
Lessons kept from R3: pad before reverb (tails are not cut), a 10 ms fade at every end, no partials near Nyquist.
"""
import argparse
import os

import numpy as np
import soundfile as sf
from pedalboard import Chorus, Compressor, Delay, HighpassFilter, Limiter, LowpassFilter, Pedalboard, Reverb

ap = argparse.ArgumentParser()
ap.add_argument("out")
ap.add_argument("--bpm", type=float, default=100.0)
ap.add_argument("--riser-bars", type=int, default=2)
ap.add_argument("--seed", type=int, default=7)
a = ap.parse_args()
SR = 48000
rng = np.random.default_rng(a.seed)
os.makedirs(a.out, exist_ok=True)


def svf_bandpass(x, fc, q):
    """Time-varying Chamberlin state-variable band-pass; fc in Hz per sample."""
    y = np.zeros_like(x)
    low = band = 0.0
    f = 2 * np.sin(np.pi * np.clip(fc, 20, SR / 6) / SR)
    qq = 1.0 / q
    for i in range(len(x)):
        high = x[i] - low - qq * band
        band += f[i] * high
        low += f[i] * band
        y[i] = band
    return y


def fx(x, board, tail=0.6):
    x = np.concatenate([x, np.zeros((x.shape[0], int(tail * SR)))], axis=1).astype(np.float32)
    y = board(x, SR).astype(np.float64)
    f = int(0.01 * SR)
    y[:, -f:] *= np.linspace(1, 0, f)
    return y


def delayed(x, sec):
    """x delayed by sec (zeros in front, same length): a stereo offset that never wraps the end round to the start."""
    d = int(sec * SR)
    return np.concatenate([np.zeros(d), x[:-d]]) if d else x


def fade_in(x, sec):
    k = int(sec * SR)
    x[..., :k] *= np.linspace(0, 1, k)
    return x


def pan_move(m, p0, p1):
    p = np.linspace(p0, p1, len(m))
    ang = (p + 1) * np.pi / 4
    return np.stack([m * np.cos(ang), m * np.sin(ang)]) * np.sqrt(2)


def save(name, x, peak_db=-3.0):
    x = x / (np.abs(x).max() + 1e-12) * 10 ** (peak_db / 20)
    sf.write(os.path.join(a.out, name + ".wav"), x.T, SR, subtype="PCM_24")
    print(f"{name}: {x.shape[1] / SR:.2f} s")


# ---- whooshes: short airy sweeps, the peak at ~60 % (where the cut is), low-passed so they stay soft ----
for name, dur, p0, p1, lo, hi, peak in (("whoosh_a", 0.36, -0.7, 0.6, 350, 2600, 0.6),
                                        ("whoosh_b", 0.32, 0.6, -0.5, 450, 3200, 0.55),
                                        ("whoosh_c", 0.40, -0.2, 0.3, 300, 2200, 0.65)):
    n = int(dur * SR)
    u = np.linspace(0, 1, n)
    noise = np.cumsum(rng.standard_normal(n))
    noise -= np.convolve(noise, np.ones(300) / 300, "same")
    fc = lo + (hi - lo) * np.sin(np.pi * np.minimum(1, u / peak / 2 + np.where(u > peak, (u - peak) / (1 - peak) / 2, 0)))
    env = np.where(u < peak, (u / peak) ** 2, np.exp(-((u - peak) / (1 - peak)) * 3.5))
    m = svf_bandpass(noise, fc, 1.4) * env
    save(name, fx(pan_move(m, p0, p1), Pedalboard([HighpassFilter(140), LowpassFilter(4500),
                                                  Reverb(room_size=0.3, wet_level=0.12, dry_level=0.9)]), tail=0.3), -4.0)

# ---- riser: riser_bars bars, noise-led, brightening and swelling to its last sample; no pitch glide ----
dur = a.riser_bars * 4 * 60 / a.bpm
n = int(round(dur * SR))
u = np.arange(n) / n
nz = rng.standard_normal(n)
bp = svf_bandpass(nz, 300 + 6500 * u ** 2.2, 2.2)
air = svf_bandpass(rng.standard_normal(n), 5000 + 4000 * u, 1.2) * 0.25
drone = sum(np.sin(2 * np.pi * f * np.arange(n) / SR + rng.uniform(0, 6.28)) for f in (110.0, 220.0, 330.0)) / 3  # A, held
x = (1.2 * bp + air) * u ** 3.2 + 0.05 * drone * u ** 2
st = np.stack([x, delayed(x, 0.011)])
y = Pedalboard([HighpassFilter(150), LowpassFilter(10000), Chorus(rate_hz=0.3, depth=0.25, mix=0.3)])(st.astype(np.float32), SR)
y = np.asarray(y, dtype=np.float64)[:, :n]
y[:, -int(0.008 * SR):] *= np.linspace(1, 0, int(0.008 * SR))   # an 8 ms close: no click, still ends on the downbeat
save("riser", y, -3.0)                                                   # exactly riser_bars bars, no reverb tail

# ---- soft hit: a felt sub thump for the reveal (and, smaller, the end-card landing) ----
for name, f_hi, f_lo, tau in (("soft_hit_a", 92.0, 46.0, 0.34), ("soft_hit_b", 84.0, 42.0, 0.42)):
    n = int(1.6 * SR)
    t = np.arange(n) / SR
    f = f_lo + (f_hi - f_lo) * np.exp(-t * 16)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / tau)
    felt = svf_bandpass(rng.standard_normal(n), np.full(n, 900.0), 0.7) * np.exp(-t * 90) * 0.35
    m = fade_in(0.95 * body + felt, 0.001)
    save(name, fx(np.stack([m, m]), Pedalboard([Compressor(threshold_db=-14, ratio=2.5, attack_ms=6, release_ms=180),
                                                Reverb(room_size=0.55, damping=0.7, wet_level=0.14, dry_level=0.9),
                                                LowpassFilter(3500), Limiter(threshold_db=-1.0)]), tail=0.6), -2.0)

# ---- shimmer: an airy sparkle. Granular high-noise grains carry it; the D-major partials (D6 F#6 A6 D7) sit low with
#      110 ms attacks. (A first version led with the partials and SoundAnalysis heard a ringtone: no dings.) ----
D6, Fs6, A6, D7 = 1174.66, 1479.98, 1760.0, 2349.32
for name, notes, seed in (("shimmer_a", (D6, A6, D7), 3), ("shimmer_b", (Fs6, A6, D7), 5)):
    g = np.random.default_rng(a.seed * 100 + seed)
    n = int(1.6 * SR)
    t = np.arange(n) / SR
    L, R = np.zeros(n), np.zeros(n)
    for k in range(46):                                                  # sparkle grains, densest early, thinning out
        t0 = 0.6 * (k / 46) ** 1.6 + g.uniform(0, 0.03)
        ln = int(g.uniform(0.012, 0.03) * SR)
        i0 = int(t0 * SR)
        grain = svf_bandpass(g.standard_normal(ln), np.full(ln, g.uniform(5200, 9500)), 4.0) * np.hanning(ln)
        amp = g.uniform(0.3, 1.0) * np.exp(-t0 / 0.5)
        p = g.uniform(-0.8, 0.8)
        L[i0:i0 + ln] += grain * amp * np.cos((p + 1) * np.pi / 4)
        R[i0:i0 + ln] += grain * amp * np.sin((p + 1) * np.pi / 4)
    tone_ = np.zeros(n)
    for fr, o in zip(notes, (0.04, 0.1, 0.17)):
        tt = np.clip(t - o, 0, None)
        tone_ += np.sin(2 * np.pi * fr * tt) * np.clip(tt / 0.11, 0, 1) ** 2 * np.exp(-tt / 0.45) * (t > o)
    st = np.stack([L, R]) + 0.06 * np.stack([tone_, tone_])
    save(name, fx(st, Pedalboard([HighpassFilter(1500), LowpassFilter(11000),
                                  Reverb(room_size=0.85, damping=0.45, wet_level=0.35, dry_level=0.7)]), tail=1.2), -6.0)

# ---- downlifter: falling filtered noise ----
n = int(1.2 * SR)
u = np.arange(n) / n
x = svf_bandpass(rng.standard_normal(n), 5500 * (1 - u) ** 2 + 220, 1.8) * (1 - u) ** 1.4
save("downlifter", fx(fade_in(np.stack([x, delayed(x, 0.009)]), 0.005), Pedalboard([Reverb(room_size=0.5, wet_level=0.18)]), tail=0.5), -5.0)
