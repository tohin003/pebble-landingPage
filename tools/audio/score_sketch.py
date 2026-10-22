"""Score-to-picture sketch: a 100-BPM warm ambient-electronic cue composed to exact cue points, rendered with numpy + pedalboard
(no samples, no plugins -> 100% our own work). Writes WAV (48k/24-bit), a beat/cue map JSON for the video timeline, and stats.
Usage: python -I score_sketch.py OUT_DIR"""
import sys, json, numpy as np, soundfile as sf, pyloudnorm as pyln
from pedalboard import (Pedalboard, Convolution, Compressor, BrickwallLimiter, HighpassFilter, LowpassFilter,
                        HighShelfFilter, LowShelfFilter, Chorus, Delay, Gain, LadderFilter)
SR = 48000; BPM = 100.0; BEAT = 60.0 / BPM; BAR = 4 * BEAT; OUT = sys.argv[1]; rng = np.random.default_rng(42)
N_BARS = 17                                    # 16 bars of music + 1 bar for the final chord to ring out
LEN = int((N_BARS * BAR + 3.0) * SR)
def T(bar, beat=0.0): return (bar * 4 + beat) * BEAT  # bar index from 0
CUES = {"intro": T(0), "build": T(4), "reveal_hit": T(8), "features": T(8), "lift": T(12), "button_end": T(16)}
def mtof(m): return 440.0 * 2 ** ((m - 69) / 12)
def blep_saw(f, n, phi=0.0):
    t = np.arange(n) / SR; ph = np.mod(f * t + phi, 1.0); dt = f / SR
    y = 2 * ph - 1
    a = ph < dt; x = ph[a] / dt; y[a] -= x + x - x * x - 1
    b = ph > 1 - dt; x = (ph[b] - 1) / dt; y[b] -= x * x + x + x + 1
    return y
def adsr(n, a, d, s, r):
    a, d, r = max(1, int(a * SR)), max(1, int(d * SR)), max(1, int(r * SR)); hold = max(0, n - a - d - r)
    e = np.concatenate([np.linspace(0, 1, a, endpoint=False), np.linspace(1, s, d, endpoint=False), np.full(hold, s), s * np.linspace(1, 0, r) ** 2])
    return e[:n] if len(e) >= n else np.pad(e, (0, n - len(e)))
def add(buf, start_s, sig):
    i = int(round(start_s * SR)); j = min(buf.shape[-1], i + sig.shape[-1]); buf[..., i:j] += sig[..., : j - i]
def pan(m, p):  # p in [-1, 1], equal-power
    a = (p + 1) * np.pi / 4; return np.stack([m * np.cos(a), m * np.sin(a)])
def synth_ir(sec=3.2, damp=0.35):
    n = int(sec * SR); t = np.arange(n) / SR; ir = np.zeros((2, n), np.float32)
    for c in range(2):
        nz = rng.standard_normal(n) * np.exp(-t * 6.9 / sec)          # -60 dB at `sec`
        k = int(0.0008 * SR) + 1; lp = np.convolve(nz, np.ones(k) / k, "same")  # gentle darkening
        mix = np.clip(t / sec, 0, 1) ** damp                              # later = darker
        ir[c] = (1 - mix) * nz + mix * lp
    ir[:, : int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))       # 12 ms pre-delay-ish fade-in
    return ir / np.abs(ir).max()
IR = synth_ir()
# ---- harmony (D major): Dmaj9, Bm11, Gmaj9, Asus4->A ; close voicings around D3..A4 -------------------------
PROG = [[50, 54, 57, 61, 64], [47, 50, 54, 57, 64], [43, 50, 54, 57, 59], [45, 50, 52, 57, 61]]
ROOT = [38, 35, 31, 33]
pads = np.zeros((2, LEN)); keys = np.zeros((2, LEN)); bass = np.zeros((2, LEN)); drums = np.zeros((2, LEN)); fx = np.zeros((2, LEN))
for bar in range(16):
    ch = PROG[bar % 4]; n = int(BAR * SR) + int(1.8 * SR)
    lvl = 0.5 if bar < 4 else (0.62 if bar < 8 else 0.85)
    if bar >= 8:                                                         # reveal: add an airy octave-up layer (wider)
        for vi, note in enumerate(ch[2:]):
            m = sum(blep_saw(mtof(note + 12) * 2 ** (d / 1200), n, rng.random()) for d in (-9, 9)) / 2
            add(pads, T(bar), pan(m * adsr(n, 0.5, 0.4, 0.7, 1.6) * 0.22, -0.8 + 0.8 * vi))
    for vi, note in enumerate(ch[1:]):                                   # pad: 4 upper voices x 5 detuned saws
        m = np.zeros(n)
        for d in (-14, -6, 0, 6, 14):
            m += blep_saw(mtof(note) * 2 ** (d / 1200), n, rng.random())
        m *= adsr(n, 0.7, 0.4, 0.8, 1.6) * lvl / 5
        add(pads, T(bar), pan(m, -0.6 + 0.4 * vi))
    # keys: FM e-piano arpeggio in 8ths from bar 2, denser from bar 8
    if bar >= 2:
        pattern = [0, 2, 3, 4, 3, 2, 1, 2] if bar >= 8 else [0, 2, 4, 2]
        step = BEAT / 2 if bar >= 8 else BEAT
        for k, idx in enumerate(pattern):
            note = ch[idx] + 12; f = mtof(note); dur = 1.4; nn = int(dur * SR); t = np.arange(nn) / SR
            I = 2.2 * np.exp(-t / 0.25) + 0.3
            sig = np.sin(2 * np.pi * f * t + I * np.sin(2 * np.pi * f * t)) + 0.12 * np.sin(2 * np.pi * 14 * f * t) * np.exp(-t / 0.03)
            vel = 0.30 * (1 + 0.08 * rng.standard_normal()) * (1.15 if k % 2 == 0 else 0.9)
            sig *= vel * adsr(nn, 0.002, 0.9, 0.25, 0.35) * np.exp(-t * (0.6 + note / 120))
            add(keys, T(bar) + k * step + rng.normal(0, 0.004), pan(sig, 0.25 * np.sin(k)))
    # sub bass from bar 4 (root, whole bar; re-attack on beat 3 from bar 8)
    if bar >= 4:
        hits = [0.0, 2.0] if bar >= 8 else [0.0]
        for hb in hits:
            dur = (4.0 - hb if hb == 2.0 or bar < 8 else 2.0) * BEAT; nn = int(dur * SR); t = np.arange(nn) / SR
            f = mtof(ROOT[bar % 4]); sig = np.tanh(1.6 * np.sin(2 * np.pi * f * t)) * 0.5 * adsr(nn, 0.01, 0.2, 0.85, 0.15)
            add(bass, T(bar, hb), pan(sig, 0))
# ---- drums: soft kick (bar 4-7 on 1&3, 4-on-floor from bar 8), shaker 16ths and rim on 2&4 from bar 8 --------
def kick():
    nn = int(0.5 * SR); t = np.arange(nn) / SR; f = 46 + 70 * np.exp(-t * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7) * 0.9 + 0.08 * rng.standard_normal(nn) * np.exp(-t * 300)
def shaker(v):
    nn = int(0.09 * SR); t = np.arange(nn) / SR; s = rng.standard_normal(nn) * np.exp(-t * 55) * v
    return np.diff(np.concatenate([[0], s]))                              # crude high-pass
def rim():
    nn = int(0.25 * SR); t = np.arange(nn) / SR
    return (np.sin(2 * np.pi * 820 * t) * np.exp(-t * 40) * 0.4 + rng.standard_normal(nn) * np.exp(-t * 70) * 0.25)
kick_times = []
for bar in range(4, 16):
    beats = [0, 2] if bar < 8 else [0, 1, 2, 3]
    for b in beats:
        kick_times.append(T(bar, b)); add(drums, T(bar, b), pan(kick(), 0))
    if bar >= 8:
        for s16 in range(16):
            add(drums, T(bar, s16 / 4) + (0.012 if s16 % 2 else 0), pan(shaker(0.10 if s16 % 4 else 0.16), 0.35))
        for b in (1, 3):
            add(drums, T(bar, b), pan(rim(), -0.15))
# ---- transitions: 2-bar noise riser into the reveal (bar 8) and a soft impact on the reveal downbeat ------------
nn = int(2 * BAR * SR); u = np.arange(nn) / nn; nz = rng.standard_normal(nn)
k = np.maximum(1, (40 * (1 - u) ** 2).astype(int))                      # moving-average width shrinks -> brighter
riser = np.array([nz[max(0, i - k[i]):i + 1].mean() for i in range(0, nn, 16)]).repeat(16)[:nn] * u ** 2.5
add(fx, T(6), np.stack([riser, riser[::-1] * 0 + np.roll(riser, 240)]) * 1.2)
nn = int(3.0 * SR); t = np.arange(nn) / SR; f = 42 + 50 * np.exp(-t * 16)
hit = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.8) * 0.9 + rng.standard_normal(nn) * np.exp(-t * 25) * 0.25
add(fx, T(8), pan(hit, 0))
# final "button": full Dmaj9 chord (pads + keys) on bar 16 downbeat, then natural decay
nn = int(4.5 * SR); t = np.arange(nn) / SR
for note in PROG[0] + [62 + 12]:
    f = mtof(note + 12); I = 1.8 * np.exp(-t / 0.3) + 0.2
    add(keys, T(16), pan(np.sin(2 * np.pi * f * t + I * np.sin(2 * np.pi * f * t)) * np.exp(-t * 0.9) * 0.16, 0.0))
    m = sum(blep_saw(mtof(note) * 2 ** (d / 1200), nn, rng.random()) for d in (-10, 0, 10)) / 3
    add(pads, T(16), pan(m * adsr(nn, 0.05, 0.3, 0.7, 3.5) * 0.5, 0.0))
add(fx, T(16), pan(hit[: int(2.5 * SR)] * 0.6, 0))
# ---- sidechain: duck pads + bass under each kick (classic "pump", subtle) -------------------------------------
duck = np.ones(LEN)
for kt in kick_times:
    i = int(kt * SR); nn = min(int(0.35 * SR), LEN - i); x = np.arange(nn) / (0.35 * SR)
    duck[i:i + nn] = np.minimum(duck[i:i + nn], 1 - 0.45 * (1 - x) ** 2)
pads *= duck; bass *= duck
sec_gain = np.interp(np.arange(LEN) / SR, [0, T(4), T(8) - 0.05, T(8), T(17)], [0.45, 0.45, 0.6, 1.0, 1.0])  # -7 dB -> -4.4 dB -> 0 dB
bass *= sec_gain; drums *= sec_gain
# ---- per-bus processing ---------------------------------------------------------------------------------------
def P(x, chain): return chain(x.astype(np.float32), SR)
filt_cut = np.interp(np.arange(LEN) / SR, [0, T(4), T(8), T(16), T(17)], [900, 1400, 4200, 5200, 3000])
pads_f = np.zeros_like(pads)
blk = 4800
for i in range(0, LEN, blk):                                             # block-wise automated low-pass (filter opens in the build)
    pads_f[:, i:i + blk] = P(pads[:, i:i + blk], Pedalboard([LowpassFilter(cutoff_frequency_hz=float(filt_cut[i]))]))
pads_b = P(pads_f, Pedalboard([HighpassFilter(140), Chorus(rate_hz=0.25, depth=0.35, mix=0.45), Convolution(IR, mix=0.45, sample_rate=SR), Gain(-4)]))
keys_b = P(keys, Pedalboard([HighpassFilter(180), Delay(delay_seconds=0.75 * BEAT, feedback=0.28, mix=0.22), Convolution(IR, mix=0.3, sample_rate=SR), Gain(-2)]))
bass_b = P(bass, Pedalboard([LowpassFilter(220), Gain(-6)]))
drums_b = P(drums, Pedalboard([HighpassFilter(30), Compressor(threshold_db=-14, ratio=3, attack_ms=8, release_ms=120), Convolution(IR, mix=0.12, sample_rate=SR), Gain(-5)]))
fx_b = P(fx, Pedalboard([HighpassFilter(35), Convolution(IR, mix=0.35, sample_rate=SR), Gain(-7)]))
mix = pads_b + keys_b + bass_b + drums_b + fx_b
master = Pedalboard([HighpassFilter(28), LowShelfFilter(cutoff_frequency_hz=120, gain_db=-1.0), HighShelfFilter(cutoff_frequency_hz=9000, gain_db=1.5),
                     Compressor(threshold_db=-20, ratio=2.0, attack_ms=25, release_ms=250)])
y = P(mix / (np.abs(mix).max() + 1e-9) * 0.5, master)
# loudness: normalize to -16 LUFS integrated, then true-peak brick-wall at -1.5 dBTP
meter = pyln.Meter(SR); lufs0 = meter.integrated_loudness(y.T)
y = (y.T * 10 ** ((-16.0 - lufs0) / 20)).T   # plain gain (float headroom; the limiter below catches peaks)
y = P(y, Pedalboard([BrickwallLimiter(ceiling_db=-1.7, true_peak=True, lookahead_ms=5)]))
end = int((T(16) + 4.8) * SR); y = y[:, :end]; f = int(0.5 * SR); y[:, -f:] *= np.linspace(1, 0, f) ** 2
from scipy.signal import resample_poly
tp = 20 * np.log10(np.abs(resample_poly(y, 4, 1, axis=1)).max())
lufs = meter.integrated_loudness(y.T)
sf.write(f"{OUT}/pebble_cue_sketch_100bpm.wav", y.T, SR, subtype="PCM_24")
grid = {"bpm": BPM, "time_signature": "4/4", "bar_s": BAR, "cues_s": CUES,
        "downbeats_s": [round(T(b), 4) for b in range(17)], "beats_s": [round(i * BEAT, 4) for i in range(16 * 4 + 1)],
        "duration_s": round(y.shape[1] / SR, 3), "integrated_lufs": round(float(lufs), 2), "true_peak_dbtp": round(float(tp), 2)}
json.dump(grid, open(f"{OUT}/pebble_cue_sketch_100bpm.beatmap.json", "w"), indent=1)
print(json.dumps({k: v for k, v in grid.items() if k not in ("beats_s", "downbeats_s")}, indent=1))
