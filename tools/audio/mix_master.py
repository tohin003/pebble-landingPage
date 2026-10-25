"""Place SFX on a music bed from a cue list, mix in the drive stem, apply the mix automation, duck the bed under big hits,
master to a loudness/true-peak target.
cues.json: [{"file": "sfx/whoosh.wav", "t": 11.95, "align": "peak"|"start"|"end", "gain_db": -8, "pan": -0.3, "duck_db": 0}]
  align=peak  -> the SFX's loudest point lands at t (put t = picture event + 1 frame)
  align=end   -> the last point within 20 dB of the SFX's peak lands at t (end of a swell, ignoring its reverb tail)
  Risers / reverse cymbals: use align=peak with t = the downbeat they lead into (their peak IS the end of the swell).
A cue with no "file" is mix automation (ENERGY_SPEC §8.3; tools/audio/sfx_kit.json "automation", whose params fill any
the entry leaves out). Its span comes from its frames at --fps (frame, to_frame, release_frame), else from t, t_end:
  gap   the bed and the drive go down `db` (-24) in attack_ms (10 ms, ending on `frame`) and come back in release_ms
        (4 ms, ending on `to_frame`, the hit). The effects are never gapped.
  hold  from `frame` the drive is muted (drive_ms, 10 ms, ending on it) and the bed crossfades in crossfade_ms (30 ms)
        to a copy through pedalboard LowpassFilter(bed_lowpass_hz) at bed_db (-6 dB). The drive is back on `to_frame`
        (the click); over to_frame -> release_frame the bed's crossfade and gain reverse on release_curve (ease-in: u^2).
  tail  after the limiter, the whole master fades from `frame` to fade_to_db (-60 dB, linear in dB) at `to_frame`, then
        is exact zeros to its last sample. Loudness is normalised as if the tail were already there.
The ducks (duck_db) act on the bed only. --drive mixes the drive stem (tools/audio/drive.py; loaded and resampled like
the bed, and as long as it) under the bed at --drive-db; the ducks never touch it. Without --drive and automation the
arithmetic is the old mixer's, so an old cue list re-makes its old master bit for bit.
Usage: python -I mix_master.py BED.wav cues.json OUT.wav [--drive DRIVE.wav] [--drive-db 0] [--lufs -16] [--tp -1.7]
       [--fps 30] [--kit tools/audio/sfx_kit.json]
Prints the integrated loudness, the 4x true peak, the length and the automation it applied."""
import sys, json, argparse, os, numpy as np, soundfile as sf, pyloudnorm as pyln
from scipy.signal import resample_poly
from pedalboard import Pedalboard, HighpassFilter, LowpassFilter, BrickwallLimiter
ap = argparse.ArgumentParser(); ap.add_argument('bed'); ap.add_argument('cues'); ap.add_argument('out')
ap.add_argument('--lufs', type=float, default=-16.0); ap.add_argument('--tp', type=float, default=-1.7); ap.add_argument('--sr', type=int, default=48000)
ap.add_argument('--drive', help='the drive stem (tools/audio/drive.py), mixed under the bed'); ap.add_argument('--drive-db', type=float, default=0.0)
ap.add_argument('--fps', type=int, default=30, help="the frame rate of the automation entries' frames")
ap.add_argument('--kit', default=os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sfx_kit.json'))
a = ap.parse_args(); SR = a.sr
def load(p):
    x, sr = sf.read(p, always_2d=True); x = x.T.astype(np.float64)
    if x.shape[0] == 1: x = np.vstack([x, x])
    if sr != SR:
        from math import gcd; g = gcd(sr, SR); x = resample_poly(x, SR // g, sr // g, axis=1)
    return x
bed = load(a.bed); out = bed.copy(); duck = np.ones(bed.shape[1])
base = os.path.dirname(os.path.abspath(a.cues))
cues = json.load(open(a.cues))
auto = [c for c in cues if 'file' not in c]
for c in cues:
    if 'file' not in c: continue                                       # automation: below
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
N = bed.shape[1]

# ---- the automation (cues with no "file") ----
kit_auto = json.load(open(a.kit)).get('automation', {}) if os.path.exists(a.kit) else {}
def param(c, key):
    if key in c: return c[key]
    if key in kit_auto.get(c.get('role'), {}): return kit_auto[c['role']][key]
    sys.exit(f"mix_master: automation {c.get('role')!r} at {c.get('frame', c.get('t'))} has no {key!r}, and the kit none")
def sample(c, frame_key, t_key):
    """A span edge as a sample: from the entry's frame at --fps when it has one, else from its seconds."""
    if c.get(frame_key) is not None: return int(round(c[frame_key] * SR / a.fps))
    if c.get(t_key) is not None: return int(round(c[t_key] * SR))
    sys.exit(f"mix_master: automation {c.get('role')!r} has neither {frame_key!r} nor {t_key!r}")
def ramp(env, i0, i1, v0, v1, curve='cos'):
    """env[i0:i1] goes from v0 to v1, reaching v1 on sample i1 - 1 (clipped to env); 'cos' is a raised cosine, 'ease-in'
    is u^2 (slow, then fast)."""
    if i1 <= i0: return
    u = (np.arange(i0, i1) - i0 + 1) / (i1 - i0)
    w = u ** 2 if curve == 'ease-in' else 0.5 - 0.5 * np.cos(np.pi * u)
    k0, k1 = max(0, i0), min(len(env), i1)
    if k1 > k0: env[k0:k1] = (v0 + (v1 - v0) * w)[k0 - i0:k1 - i0]
bed_gain = np.ones(N); drive_gain = np.ones(N); lp_w = np.zeros(N)   # lp_w: the low-passed copy's share of the bed
tails, applied, lp_hz = [], [], None
for c in sorted(auto, key=lambda c: sample(c, 'frame', 't')):
    role = c.get('role')
    i0, i1 = sample(c, 'frame', 't'), sample(c, 'to_frame', 't_end')
    release_only = role == 'hold' and i1 == i0 and sample(c, 'release_frame', 't_release') > i1   # a cut kept its release
    if i1 < i0 or (i1 == i0 and not release_only): sys.exit(f"mix_master: automation {role!r} at {i0} ends before it starts")
    if role == 'gap':                                                  # down over [i0 - attack, i0], held, back by i1
        g = 10 ** (param(c, 'db') / 20); k_a, k_r = int(param(c, 'attack_ms') * SR / 1000), int(param(c, 'release_ms') * SR / 1000)
        env = np.full(N, g); ramp(env, i0 - k_a, i0, 1.0, g); ramp(env, i1 - k_r, i1, g, 1.0)
        env[:max(0, i0 - k_a)] = 1.0; env[max(0, i1):] = 1.0
        bed_gain *= env; drive_gain *= env
    elif role == 'hold':
        ir = sample(c, 'release_frame', 't_release')
        gdb = float(param(c, 'bed_db')); hz = float(param(c, 'bed_lowpass_hz')); curve = param(c, 'release_curve')
        if lp_hz not in (None, hz): sys.exit("mix_master: two holds with different low-pass frequencies")
        if param(c, 'drive') != 'mute': sys.exit(f"mix_master: hold drive {param(c, 'drive')!r}: only 'mute' is known")
        if curve not in ('ease-in', 'cos'): sys.exit(f"mix_master: hold release_curve {curve!r}: 'ease-in' or 'cos'")
        lp_hz = hz
        k_x, k_d = int(param(c, 'crossfade_ms') * SR / 1000), int(param(c, 'drive_ms') * SR / 1000)
        share = np.zeros(N); ramp(share, i0 - k_x, i0, 0.0, 1.0); share[max(0, i0):max(0, i1)] = 1.0
        ramp(share, i1, ir, 1.0, 0.0, curve)                           # the release: the filter opens into the downbeat
        lp_w = np.maximum(lp_w, share)
        bed_gain *= 10 ** (gdb * share / 20)                           # -6 dB where the copy is in, back with it
        mute = np.ones(N); ramp(mute, i0 - k_d, i0, 1.0, 0.0); mute[max(0, i0):max(0, i1 - k_d)] = 0.0
        ramp(mute, i1 - k_d, i1, 0.0, 1.0)                             # the drive is back on the click
        drive_gain *= mute
    elif role == 'tail':
        tails.append((i0, i1, float(param(c, 'fade_to_db'))))
    else:
        sys.exit(f"mix_master: unknown automation role {role!r}")
    applied.append({k: c[k] for k in ('role', 'frame', 'to_frame', 'release_frame', 't', 't_end') if k in c})
if lp_hz is not None:                                                  # the hold's pre-filtered copy, crossfaded in
    bed_lp = Pedalboard([LowpassFilter(lp_hz)])(bed.astype(np.float32), SR).astype(np.float64)
    bed_mix = bed * (1 - lp_w) + bed_lp * lp_w
else:
    bed_mix = bed
if auto: bed_mix = bed_mix * bed_gain
out = bed_mix * duck + (out - bed)                                     # duck only the bed, not the SFX
if a.drive:
    drv = load(a.drive)
    if drv.shape[1] != N: sys.exit(f"mix_master: the drive has {drv.shape[1]} samples, the bed {N}")
    out = out + drv * (10 ** (a.drive_db / 20)) * drive_gain
def apply_tails(y):
    y = y.copy()
    for i0, i1, db in tails:
        u = (np.arange(i0, i1) - i0 + 1) / (i1 - i0)
        k0, k1 = max(0, i0), min(y.shape[1], i1)
        if k1 > k0: y[:, k0:k1] *= (10 ** (db * u / 20))[k0 - i0:k1 - i0]   # 0 dB -> db, reached on to_frame - 1 sample
        y[:, max(0, i1):] = 0.0                                        # exact zeros to the last sample
    return y
y = Pedalboard([HighpassFilter(28)])(out.astype(np.float32), SR)
meter = pyln.Meter(SR); l0 = meter.integrated_loudness((apply_tails(y) if tails else y).T)
y = (y * 10 ** ((a.lufs - l0) / 20)).astype(np.float32)
y = Pedalboard([BrickwallLimiter(ceiling_db=a.tp, true_peak=True, lookahead_ms=5)])(y, SR)
if tails: y = apply_tails(y).astype(np.float32)                       # after the limiter, so the zeros stay zeros
l1 = meter.integrated_loudness(y.T); tp = 20 * np.log10(np.abs(resample_poly(y, 4, 1, axis=1)).max() + 1e-12)
sf.write(a.out, y.T, SR, subtype='PCM_24')
rep = {"out": a.out, "integrated_lufs": round(float(l1), 2), "true_peak_dbtp_4x": round(float(tp), 2), "duration_s": round(y.shape[1] / SR, 3),
       "samples": int(y.shape[1])}
if a.drive: rep["drive"] = {"file": a.drive, "gain_db": a.drive_db}
if applied: rep["automation"] = applied
if tails: rep["zeros_from_sample"] = max(0, min(i1 for _, i1, _ in tails))
print(json.dumps(rep))
