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
The energetic recut's takes (ENERGY_SPEC §8.4), appended after the older ones, each from its own generator, so seed 7
still writes every older take bit for bit. They also use scipy's Butterworth filters. All unpitched (noise, grains, and
sines only below 200 Hz):
  impact_a       a 70 -> 32 Hz sine drop over 120 ms (tau 0.35 s), a noise body low-passed at 800 Hz (tau 80 ms), an
                 8 ms 600-2000 Hz thwack, room 0.7 at 12 % wet; nothing tonal above 200 Hz. Peak -2 dBFS
  impact_b       the same at 60 % of the length, dry. Peak -2 dBFS
  ui_card        a 230 ms noise slide, band-passed 1.2 -> 3.4 kHz, then a 3 ms settle. Peak -6 dBFS
  ui_lock        a 12 ms 1-4 kHz click over a 60 -> 45 Hz thump (tau 60 ms), low-passed at 1.2 kHz. Peak -3 dBFS
  ui_done        a 5 ms 1.5-3 kHz click and a 40 ms 150-400 Hz noise body. Peak -6 dBFS
  ui_verified    a 6 ms 3-8 kHz transient, then 30 grains (5-9.5 kHz) over 0.8 s (the shimmer's grains, without its
                 partials), with a 60 ms 120-200 Hz noise seal under the transient. Peak -2 dBFS
  ui_forget      24 grains whose band falls 5.5 -> 1.4 kHz over 0.4 s, densest first. Peak -5 dBFS
  rim_a/b        a 12 ms 2-6 kHz noise click with a 25 ms decay; b is 1.5 dB softer (-7.5 against -6 dBFS) and brighter
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


# ==== The energetic recut's takes (ENERGY_SPEC §8.4, 2026-10-25) ====
# Appended after every older take, so the older takes above are written before any of this runs. Each new take draws
# from its own generator (seed * 1000 + k), so changing one never changes another. All unpitched: noise, grains, and
# sines only below 200 Hz. No chimes, dings, pitched pops or anything voice-like. Wide noise bands use scipy's
# Butterworth filters (scipy is in the audio venv, tools/audio/requirements-mix.txt).
from scipy.signal import butter, sosfilt  # noqa: E402  (here, so nothing above changes)


def take_rng(k):
    return np.random.default_rng(a.seed * 1000 + k)


def noise_band(g, n, lo, hi, order=2):
    """n samples of white noise through a Butterworth band-pass, -3 dB at lo and hi Hz (order 2: 12 dB per octave
    outside the band). Not the SVF above: at a low Q and a kHz centre the Chamberlin filter passes its stability limit
    (f + 1/q > 2) and sends the energy toward Nyquist. The SVF stays for the grains and the slide, where it is stable."""
    return sosfilt(butter(order, [lo, hi], btype="bandpass", fs=SR, output="sos"), g.standard_normal(n))


def rms_over(x, sec):
    """The RMS of x's first sec seconds."""
    return float(np.sqrt(np.mean(x[..., :int(sec * SR)] ** 2)) + 1e-12)


def lowpassed(m, hz, order=2):
    """A mono signal through a Butterworth low-pass, -3 dB at hz (6 dB per octave per order)."""
    return sosfilt(butter(order, hz, btype="lowpass", fs=SR, output="sos"), m)


def decay(n, tau, attack=0.0005):
    """A short linear attack (no click at the start), then an exponential decay with time constant tau (s)."""
    t = np.arange(n) / SR
    return np.minimum(1.0, t / attack) * np.exp(-t / tau)


def burst(g, n, at, length, lo, hi, tau, attack=0.0003, order=2):
    """A noise burst band-passed to lo..hi Hz, `length` s long from `at` s, decaying with tau: an n-sample track."""
    out = np.zeros(n)
    i0, k = int(round(at * SR)), int(round(length * SR))
    out[i0:i0 + k] = noise_band(g, k, lo, hi, order) * decay(k, tau, attack) * np.linspace(1, 0, k) ** 0.5
    return out


def unit(x):
    return x / (np.abs(x).max() + 1e-12)


def grains(g, n, count, span, band, q, amp_tau, pan=0.8, at=0.0, power=1.6, octaves=None, lengths=(0.012, 0.03)):
    """count grains over span s from `at` (densest first, as the shimmer's): band(u) gives each grain's centre in Hz
    for its place u in 0..1. Each grain is the shimmer's SVF band at Q q, or, with `octaves`, a Butterworth band that
    wide (12 dB per octave outside it, so a moving band is heard moving). Returns a stereo (2, n) track."""
    L, R = np.zeros(n), np.zeros(n)
    for k in range(count):
        t0 = span * (k / count) ** power + g.uniform(0, 0.03 * span / 0.6)
        ln = int(g.uniform(*lengths) * SR)
        i0 = int((at + t0) * SR)
        fc = band(t0 / span, g)
        if octaves:
            grain = noise_band(g, ln, fc * 2 ** (-octaves / 2), fc * 2 ** (octaves / 2)) * np.hanning(ln)
        else:
            grain = svf_bandpass(g.standard_normal(ln), np.full(ln, fc), q) * np.hanning(ln)
        grain /= np.sqrt(np.mean(grain ** 2)) + 1e-12                           # equal energy at any band
        amp = g.uniform(0.3, 1.0) * np.exp(-t0 / amp_tau)
        p = g.uniform(-pan, pan)
        L[i0:i0 + ln] += grain * amp * np.cos((p + 1) * np.pi / 4)
        R[i0:i0 + ln] += grain * amp * np.sin((p + 1) * np.pi / 4)
    return np.stack([L, R])


# ---- impacts: a felt sub drop, a low noise body and a short thwack; the weight comes from the body and the thwack
#      on small speakers, the drop under them on big ones ----
for name, k, seed in (("impact_a", 1.0, 1), ("impact_b", 0.6, 2)):
    g = take_rng(seed)
    n = int(round(1.4 * k * SR))
    t = np.arange(n) / SR
    close = np.clip((n - np.arange(n)) / (0.35 * k * SR), 0, 1) ** 2          # a smooth close: no click at the end
    sweep = 0.12 * k
    f = np.where(t < sweep, 70.0 * (32.0 / 70.0) ** (t / sweep), 32.0)          # 70 -> 32 Hz, log-linear
    drop = np.sin(2 * np.pi * np.cumsum(f) / SR) * decay(n, 0.35 * k, 0.0008)
    body = lowpassed(g.standard_normal(n), 800.0) * decay(n, 0.08 * k, 0.001)
    body *= rms_over(drop, 0.1 * k) / rms_over(body, 0.1 * k)                     # as loud as the drop's first 0.1 s
    thwack = 0.8 * unit(burst(g, n, 0.0, 0.008 * k, 600, 2000, 0.003 * k))
    m = (drop + body + thwack) * close                                             # about 0.3 of the power above 150 Hz
    board = Pedalboard([Reverb(room_size=0.7, damping=0.6, wet_level=0.12, dry_level=0.88)] if k == 1.0 else [])
    save(name, fx(np.stack([m, m]), board, tail=0.7 if k == 1.0 else 0.1), -2.0)

# ---- ui_card: the drawer opens with the edit card: a noise slide up through 1.2 -> 3.4 kHz, then a 3 ms settle ----
g = take_rng(3)
n_slide = int(round(0.23 * SR))
u = np.arange(n_slide) / n_slide
fc = 1200.0 * (3400.0 / 1200.0) ** u
slide = svf_bandpass(svf_bandpass(g.standard_normal(n_slide), fc, 1.03), fc, 1.03)  # two passes (f + 1/q < 1.5: stable)
slide *= np.minimum(1.0, u / 0.06) * np.exp(-2.2 * u) * np.minimum(1.0, (1 - u) / 0.02)  # in 14 ms, easing off
n = n_slide + int(0.06 * SR)
m = np.zeros(n)
m[:n_slide] = unit(slide)
m += 0.45 * unit(burst(g, n, 0.23, 0.003, 2000, 5000, 0.0012))
save("ui_card", fx(np.stack([m, m]), Pedalboard([HighpassFilter(500), Reverb(room_size=0.25, wet_level=0.08, dry_level=0.92)]),
                   tail=0.15), -6.0)

# ---- ui_lock: AgentGuard holds the task: a click over a short sub thump, both behind the hold's 1.2 kHz low-pass ----
g = take_rng(4)
n = int(round(0.42 * SR))
t = np.arange(n) / SR
f = 45.0 + 15.0 * np.exp(-t / 0.025)                                                # 60 -> 45 Hz
thump = np.sin(2 * np.pi * np.cumsum(f) / SR) * decay(n, 0.06, 0.0008)
click = burst(g, n, 0.0, 0.012, 1000, 4000, 0.004)
click *= 2.2 * rms_over(thump, 0.012) / rms_over(click, 0.012)                     # the click carries it on a phone
m = lowpassed(thump + click, 1200.0, order=1)
save("ui_lock", fx(np.stack([m, m]), Pedalboard([]), tail=0.05), -3.0)

# ---- ui_done: Done: a small click and a short woody noise body ----
g = take_rng(5)
n = int(round(0.12 * SR))
click = burst(g, n, 0.0, 0.005, 1500, 3000, 0.0018)
body = burst(g, n, 0.0, 0.04, 150, 400, 0.014, attack=0.002)
m = 0.8 * unit(click) + unit(body)
save("ui_done", fx(np.stack([m, m]), Pedalboard([Reverb(room_size=0.2, wet_level=0.06, dry_level=0.94)]),
                   tail=0.12), -6.0)

# ---- ui_verified: Verified: a bright transient, then airy grains (the shimmer's method, no partials), with a low noise
#      seal under the transient ----
g = take_rng(6)
n = int(round(1.0 * SR))
hi = grains(g, n, 30, 0.8, lambda u, gg: gg.uniform(5000, 9500), 4.0, 0.65, at=0.006)
hi = fx(hi, Pedalboard([HighpassFilter(1500), LowpassFilter(11000),
                        Reverb(room_size=0.85, damping=0.45, wet_level=0.35, dry_level=0.7)]), tail=0.9)
nn = hi.shape[1]
tr = unit(burst(g, nn, 0.0, 0.006, 3000, 8000, 0.002))
seal = unit(burst(g, nn, 0.0, 0.06, 120, 200, 0.022, attack=0.003))
st = 0.5 * hi / (np.abs(hi).max() + 1e-12) + np.stack([tr, tr]) + 0.6 * np.stack([seal, seal])
save("ui_verified", st, -2.0)

# ---- ui_forget: the record dissolves: grains whose band falls 5.5 -> 1.4 kHz over 0.4 s, densest first. Octave-wide,
#      short and scattered grains: half-octave ones falling evenly read as a bird's chirp (SoundAnalysis 0.56) ----
g = take_rng(7)
n = int(round(0.6 * SR))
st = grains(g, n, 24, 0.4, lambda u, gg: 5500.0 * (1400.0 / 5500.0) ** u * gg.uniform(0.75, 1.25), 2.0, 0.5,
            pan=0.5, power=1.7, octaves=1.0, lengths=(0.006, 0.016))
save("ui_forget", fx(st, Pedalboard([HighpassFilter(600), Reverb(room_size=0.5, wet_level=0.18, dry_level=0.85)]),
                     tail=0.4), -5.0)

# ---- rim_a / rim_b: the hold's clock: a 12 ms noise click with a 25 ms decay; b softer and brighter ----
for name, lo, hi_, peak, seed in (("rim_a", 2000, 6000, -6.0, 8), ("rim_b", 2600, 7600, -7.5, 9)):
    g = take_rng(seed)
    n = int(round(0.05 * SR))
    m = unit(burst(g, n, 0.0, 0.037, lo, hi_, 0.0075))
    save(name, fx(np.stack([m, m]), Pedalboard([]), tail=0.01), peak)
