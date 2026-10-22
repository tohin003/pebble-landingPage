"""Procedural, license-free UI/transition SFX (whoosh, riser, soft hit, click, pop, shimmer, downlifter) with numpy + pedalboard.
All output is our own work (no third-party samples) -> can be licensed with the site (e.g. CC0)."""
import sys, numpy as np, soundfile as sf
from pedalboard import Pedalboard, Reverb, Compressor, Limiter, HighpassFilter, LowpassFilter, Chorus, Delay, Gain
SR = 48000; rng = np.random.default_rng(7); OUT = sys.argv[1]
def env_adsr(n, a, d, s, r, sus_level=0.6):
    a, d, r = int(a*SR), int(d*SR), int(r*SR); s = max(0, n-a-d-r)
    return np.concatenate([np.linspace(0,1,a,endpoint=False)**2, np.linspace(1,sus_level,d,endpoint=False), np.full(s,sus_level), sus_level*np.linspace(1,0,r)**2])[:n]
def svf_bandpass(x, fc, q):
    """Time-varying state-variable band-pass (Chamberlin). fc: array of cutoff Hz per sample."""
    y = np.zeros_like(x); low = band = 0.0
    f = 2*np.sin(np.pi*np.clip(fc, 20, SR/6)/SR); qq = 1.0/q
    for i in range(len(x)):
        high = x[i] - low - qq*band; band += f[i]*high; low += f[i]*band; y[i] = band
    return y
def stereo(m, width=0.0):
    if width <= 0: return np.stack([m, m])
    d = int(0.012*SR*width); r = np.concatenate([np.zeros(d), m[:-d]]) if d else m
    return np.stack([m, 0.6*m + 0.4*r])
def fx(x, board, tail=0.6):
    # pad with silence so reverb/delay tails are not truncated, then 10 ms fade-out to avoid an end click
    x = np.concatenate([x, np.zeros((x.shape[0], int(tail*SR)))], axis=1).astype(np.float32)
    y = board(x, SR); f = int(0.01*SR); y[:, -f:] *= np.linspace(1, 0, f)
    return y
def norm(x, peak_db=-3.0): return x / (np.max(np.abs(x)) + 1e-9) * 10**(peak_db/20)
def save(name, x): sf.write(f"{OUT}/{name}.wav", norm(x).T, SR, subtype='PCM_24'); print(name, f"{x.shape[-1]/SR:.2f}s")

# 1) whoosh: pink-ish noise through a band-pass sweeping up then down, amplitude swell, stereo pan movement
n = int(0.9*SR); t = np.linspace(0, 1, n)
noise = np.cumsum(rng.standard_normal(n)) ; noise = noise - np.convolve(noise, np.ones(400)/400, 'same')  # brown->band-limited
fc = 300 + 3200*np.sin(np.pi*t)**2
w = svf_bandpass(noise, fc, 1.8) * np.sin(np.pi*t)**3
pan = 0.5 + 0.45*np.sin(np.pi*(t-0.5))
x = np.stack([w*(1-pan), w*pan]) * 2
save('whoosh', fx(x, Pedalboard([HighpassFilter(120), Reverb(room_size=0.35, wet_level=0.18, dry_level=0.9)])))

# 2) riser (2 bars @ 120 BPM = 4 s): noise sweep + rising detuned saw, ends exactly at t=4.0 (place its END on the downbeat of the reveal)
n = int(4.0*SR); t = np.arange(n)/SR; u = t/4.0
f0 = 110*2**(u*2.0)  # two octaves up
ph = 2*np.pi*np.cumsum(f0)/SR
saw = sum((np.mod(ph*k/(2*np.pi)+0.13*j, 1.0)*2-1) for j,k in enumerate([1.0, 1.006, 0.994]))/3
nz = svf_bandpass(rng.standard_normal(n)*0.5, 400+7000*u**2, 2.5)
x = (0.10*saw*u**2 + 1.4*nz*u**3)   # noise-led: a pitched saw sweep alone reads as a siren (Apple's classifier tagged it 'civil_defense_siren')
x = stereo(x, 1.0)
save('riser_4s', fx(x, Pedalboard([HighpassFilter(150), LowpassFilter(9000), Chorus(rate_hz=0.4, depth=0.3, mix=0.4), Reverb(room_size=0.6, wet_level=0.25)])))

# 3) soft hit / impact: sine drop 90->45 Hz + filtered noise transient + long reverb tail (the "reveal" hit)
n = int(2.5*SR); t = np.arange(n)/SR
f = 45 + 45*np.exp(-t*18); body = np.sin(2*np.pi*np.cumsum(f)/SR) * np.exp(-t*2.2)
trans = svf_bandpass(rng.standard_normal(n), np.full(n, 2500.0), 0.8) * np.exp(-t*60)
x = stereo(0.9*body + 0.35*trans, 0.6)
save('soft_hit', fx(x, Pedalboard([Compressor(threshold_db=-12, ratio=3, attack_ms=5, release_ms=200), Reverb(room_size=0.8, damping=0.6, wet_level=0.22, dry_level=0.85), Limiter(threshold_db=-1)])))

# 4) UI click: 2 ms filtered noise burst + 4 ms 2.2 kHz sine blip
n = int(0.08*SR); t = np.arange(n)/SR
x = 0.6*svf_bandpass(rng.standard_normal(n), np.full(n, 4500.0), 1.2)*np.exp(-t*900) + 0.5*np.sin(2*np.pi*2200*t)*np.exp(-t*450)
save('ui_click', fx(stereo(x), Pedalboard([HighpassFilter(300), Reverb(room_size=0.1, wet_level=0.06)])))

# 5) bubbly "pop" (fits a pebble character): fast upward pitch-swept sine with soft attack
n = int(0.22*SR); t = np.arange(n)/SR
f = 380 + 900*(1-np.exp(-t*40)); x = np.sin(2*np.pi*np.cumsum(f)/SR) * env_adsr(n, 0.004, 0.05, 0, 0.12, 0.4)
save('pebble_pop', fx(stereo(x), Pedalboard([Reverb(room_size=0.25, wet_level=0.15)])))

# 6) shimmer / sparkle for a logo or "ready" moment: random high partials with staggered decays + delay + big reverb
n = int(2.0*SR); t = np.arange(n)/SR; x = np.zeros(n)
for k in range(14):
    st = rng.uniform(0, 0.5); fr = 1567.98 * 2**(rng.integers(0, 2))  # keep partials < ~6 kHz (no harsh near-Nyquist tones) * [1, 1.25, 1.5, 1.875][rng.integers(0, 4)]  # notes of a Gmaj7 chord
    x += np.sin(2*np.pi*fr*np.clip(t-st, 0, None)) * np.exp(-np.clip(t-st, 0, None)*6) * (t > st) * rng.uniform(0.3, 1)
save('shimmer', fx(stereo(x/14, 1.0), Pedalboard([HighpassFilter(1200), Delay(delay_seconds=0.125, feedback=0.35, mix=0.25), Reverb(room_size=0.9, wet_level=0.35, dry_level=0.7)])))

# 7) downlifter (end of a section): falling filtered noise
n = int(1.5*SR); t = np.arange(n)/SR; u = t/1.5
x = svf_bandpass(rng.standard_normal(n), 6000*(1-u)**2+200, 2.0) * (1-u)**1.5
save('downlifter', fx(stereo(x, 1.0), Pedalboard([Reverb(room_size=0.5, wet_level=0.2)])))
