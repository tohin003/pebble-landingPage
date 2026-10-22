"""Place SFX on a music bed from a cue list, duck the bed under big hits, master to a loudness/true-peak target.
cues.json: [{"file": "sfx/whoosh.wav", "t": 11.95, "align": "peak"|"start"|"end", "gain_db": -8, "pan": -0.3, "duck_db": 0}]
  align=peak  -> the SFX's loudest point lands at t (put t = picture event + 1 frame)
  align=end   -> the last point within 20 dB of the SFX's peak lands at t (end of a swell, ignoring its reverb tail)
  Risers / reverse cymbals: use align=peak with t = the downbeat they lead into (their peak IS the end of the swell).
Usage: python -I mix_master.py BED.wav cues.json OUT.wav [--lufs -16] [--tp -1.7] [--fps 60]"""
import sys, json, argparse, os, numpy as np, soundfile as sf, pyloudnorm as pyln
from scipy.signal import resample_poly
from pedalboard import Pedalboard, HighpassFilter, BrickwallLimiter
ap = argparse.ArgumentParser(); ap.add_argument('bed'); ap.add_argument('cues'); ap.add_argument('out')
ap.add_argument('--lufs', type=float, default=-16.0); ap.add_argument('--tp', type=float, default=-1.7); ap.add_argument('--sr', type=int, default=48000)
a = ap.parse_args(); SR = a.sr
def load(p):
    x, sr = sf.read(p, always_2d=True); x = x.T.astype(np.float64)
    if x.shape[0] == 1: x = np.vstack([x, x])
    if sr != SR:
        from math import gcd; g = gcd(sr, SR); x = resample_poly(x, SR // g, sr // g, axis=1)
    return x
bed = load(a.bed); out = bed.copy(); duck = np.ones(bed.shape[1])
base = os.path.dirname(os.path.abspath(a.cues))
for c in json.load(open(a.cues)):
    s = load(c['file'] if os.path.isabs(c['file']) else os.path.join(base, c['file']))
    g = 10 ** (c.get('gain_db', -6) / 20); p = float(c.get('pan', 0)); ang = (p + 1) * np.pi / 4
    s = np.vstack([s[0] * np.cos(ang) * np.sqrt(2), s[1] * np.sin(ang) * np.sqrt(2)]) * g
    al = c.get('align', 'start'); mono = np.abs(s).max(0)
    off = int(np.argmax(mono)) if al == 'peak' else (int(np.nonzero(mono > mono.max() * 0.1)[0][-1]) if al == 'end' else 0)
    i = int(round(c['t'] * SR)) - (off if al in ('peak', 'end') else 0)
    j0, j1 = max(0, i), min(out.shape[1], i + s.shape[1])
    if j1 > j0: out[:, j0:j1] += s[:, j0 - i:j1 - i]
    if c.get('duck_db', 0):                                           # gentle bed duck around the hit (40 ms in, 600 ms out)
        d = 10 ** (-abs(c['duck_db']) / 20); k = int(c['t'] * SR); a1, r1 = int(0.04 * SR), int(0.6 * SR)
        env = np.concatenate([np.linspace(1, d, a1), np.linspace(d, 1, r1)]); k0 = max(0, k - a1)
        duck[k0:k0 + len(env)] = np.minimum(duck[k0:k0 + len(env)], env[: len(duck[k0:k0 + len(env)])])
out = bed * duck + (out - bed)                                         # duck only the bed, not the SFX
y = Pedalboard([HighpassFilter(28)])(out.astype(np.float32), SR)
meter = pyln.Meter(SR); l0 = meter.integrated_loudness(y.T)
y = (y * 10 ** ((a.lufs - l0) / 20)).astype(np.float32)
y = Pedalboard([BrickwallLimiter(ceiling_db=a.tp, true_peak=True, lookahead_ms=5)])(y, SR)
l1 = meter.integrated_loudness(y.T); tp = 20 * np.log10(np.abs(resample_poly(y, 4, 1, axis=1)).max() + 1e-12)
sf.write(a.out, y.T, SR, subtype='PCM_24')
print(json.dumps({"out": a.out, "integrated_lufs": round(float(l1), 2), "true_peak_dbtp_4x": round(float(tp), 2), "duration_s": round(y.shape[1] / SR, 3)}))
