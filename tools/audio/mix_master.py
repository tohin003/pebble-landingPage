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
  tail  after the limiter, the whole master fades from `frame` and is silent at `to_frame`, then exact zeros to its last
        sample, on `curve`: 'db' (the default when neither the entry nor the kit names one: linear in dB down to
        fade_to_db, -60 dB), 'sine' (amplitude cos(pi u / 2), equal power; the film's, OVERRIDES §36 'foghorn'), 'cos'
        (a raised cosine) or 'lin' (amplitude 1 -> 0). Loudness is normalised as if the tail were already there.
  ride  a level (the hook's, OVERRIDES §36): the bed and the drive sit `db` (-1.5) down over [frame, to_frame), with
        the gap's ramps (attack_ms ending on `frame`, release_ms ending on `to_frame`). It multiplies with a gap inside
        it. The effects are never ridden.
The ducks (duck_db) act on the bed only. --drive mixes the drive stem (tools/audio/drive.py; loaded and resampled like
the bed, and as long as it) under the bed at --drive-db; the ducks never touch it. Without --drive and automation the
arithmetic is the old mixer's, so an old cue list re-makes its old master bit for bit.
--aac BITRATE:GATE (the score lane, part 2): FFmpeg's AAC encoder overshoots the limiter's ceiling by 0.1-0.5 dB on this
film's hits, unevenly: at 160 kb/s an earlier mix of the recut's web master read -1.44 dBTP at a -1.7 ceiling, -1.32 at
-1.8, -1.42 at -1.9 and -1.57 at -2.0 (the final one -1.525 at -1.7, -1.618 at -1.8). So after writing OUT, the master is encoded as tools/encode/encode.sh encodes it (aac, BITRATE,
48 kHz, stereo) and its true peak read as tools/encode/verify.mjs reads it (the largest of ebur128's per-frame
true_peak, full precision). While that is over GATE - --aac-margin (0.05 dB), the ceiling comes down --tp-step (0.1 dB)
and the same normalised mix is limited again, down to --tp-floor. The ceiling it settles on and every try are reported.
The encoder is deterministic, so the delivered encode reads what this measured. Without --aac nothing changes.
--voice VOICE.wav (the narrated twin, OVERRIDES §38; docs/film-narration.json): a voice stem as long as the bed (mono is
heard as dual mono), with exact zeros outside its lines. Its lines are its non-zero runs (merged across gaps under
--voice-merge-ms). Under each line the whole music and effects mix (bed, drive and effects, after the automation) goes
down --voice-duck-db (3-6 dB; it reaches the depth on the line's first sample over --voice-attack-ms and comes back over
--voice-release-ms after its last), then the voice is added at the gain that puts its lines, on average, at
--voice-lufs in the master (BS.1770 K-weighted, ungated, over each line's span), after the loudness normalisation.
--voice-lead-ms moves the duck: it starts that long before the line's first sample (the default, --voice-attack-ms, has
the music down by that sample; 0 starts it there, so a hit just before the line plays whole).
--me-out ME.wav also writes the music and effects as the narrated master plays them (ducked, at the master's gain and
ceiling, through the same limiter and tail): the classifier's 'nothing voice-like' gate is run on it. Without --voice
nothing changes.
--settle (the trailer's masters): the limiter takes loudness off a dense master (the trailer's x30 lost 0.4-0.6 LU), so
after it the master is normalised and limited again until its integrated loudness is within 0.03 LU of --lufs, with at
most --settle-max-db (0.5 dB) of make-up gain: pushed further, the limiter flattens the hits and the quiet sections
come up against them (uncapped, the trailer's social master took 1.2 dB, its ceiling fell to -2.5 dBTP through the
--aac loop, and its holds rose to 4.5 LU under the master). Each ceiling the --aac loop tries is settled the same way.
The make-up gain and every pass are reported. Without --settle nothing changes.
Usage: python -I mix_master.py BED.wav cues.json OUT.wav [--drive DRIVE.wav] [--drive-db 0] [--lufs -16] [--tp -1.7]
       [--fps 30] [--kit tools/audio/sfx_kit.json] [--aac 160k:-1.5 [--aac-margin 0.05] [--tp-step 0.1]
       [--tp-floor -3] [--ffmpeg /opt/homebrew/bin/ffmpeg]]
       [--voice VOICE.wav [--voice-lufs -15] [--voice-duck-db 4.5] [--voice-attack-ms 60] [--voice-lead-ms 60]
        [--voice-release-ms 300]
        [--voice-merge-ms 250] [--me-out ME.wav]] [--settle [--settle-max-db 0.5]]
Prints the integrated loudness, the 4x true peak, the length and the automation it applied."""
import sys, json, argparse, os, math, re, subprocess, tempfile, numpy as np, soundfile as sf, pyloudnorm as pyln
from scipy.signal import lfilter, resample_poly
from pedalboard import Pedalboard, HighpassFilter, LowpassFilter, BrickwallLimiter
ap = argparse.ArgumentParser(); ap.add_argument('bed'); ap.add_argument('cues'); ap.add_argument('out')
ap.add_argument('--lufs', type=float, default=-16.0); ap.add_argument('--tp', type=float, default=-1.7); ap.add_argument('--sr', type=int, default=48000)
ap.add_argument('--drive', help='the drive stem (tools/audio/drive.py), mixed under the bed'); ap.add_argument('--drive-db', type=float, default=0.0)
ap.add_argument('--fps', type=int, default=30, help="the frame rate of the automation entries' frames")
ap.add_argument('--kit', default=os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sfx_kit.json'))
ap.add_argument('--aac', metavar='BITRATE:GATE', help="e.g. 160k:-1.5: lower the ceiling until that AAC encode's true peak is under GATE")
ap.add_argument('--aac-margin', type=float, default=0.05); ap.add_argument('--tp-step', type=float, default=0.1)
ap.add_argument('--tp-floor', type=float, default=-3.0); ap.add_argument('--ffmpeg', default='/opt/homebrew/bin/ffmpeg')
ap.add_argument('--voice', help="the narrated twin's voice stem: the music and effects duck under its lines")
ap.add_argument('--voice-lufs', type=float, default=-15.0, help="the lines' mean loudness in the master (LUFS, ungated over each line)")
ap.add_argument('--voice-duck-db', type=float, default=4.5, help='how far the music and effects go down under each line (3-6)')
ap.add_argument('--voice-attack-ms', type=float, default=60.0); ap.add_argument('--voice-release-ms', type=float, default=300.0)
ap.add_argument('--voice-lead-ms', type=float, default=None,
                help="how long before a line's first sample the duck starts (default: --voice-attack-ms, so the music is down "
                     "by the line's first sample; 0 starts it on that sample, keeping a hit just before the line whole)")
ap.add_argument('--voice-merge-ms', type=float, default=250.0, help="non-zero runs closer than this are one line")
ap.add_argument('--me-out', help='with --voice: also write the music and effects as the narrated master plays them')
ap.add_argument('--settle', action='store_true', help="make up the limiter's loudness loss, so the master lands on --lufs")
ap.add_argument('--settle-max-db', type=float, default=0.5, help='the most make-up gain --settle may add (dB)')
a = ap.parse_args(); SR = a.sr
if a.voice and SR != 48000: sys.exit("mix_master: --voice measures with the 48 kHz K-weighting: use --sr 48000")
if a.me_out and not a.voice: sys.exit("mix_master: --me-out needs --voice")
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
TAIL_CURVES = {'db': lambda u, db: 10 ** (db * u / 20),                 # 0 dB -> fade_to_db, linear in dB
               'cos': lambda u, db: 0.5 + 0.5 * np.cos(np.pi * u),     # amplitude 1 -> 0, a raised cosine
               'sine': lambda u, db: np.cos(0.5 * np.pi * u),          # amplitude 1 -> 0, a quarter cosine (equal power)
               'lin': lambda u, db: 1.0 - u}                            # amplitude 1 -> 0, linear
tails, applied, lp_hz = [], [], None
for c in sorted(auto, key=lambda c: sample(c, 'frame', 't')):
    role = c.get('role')
    i0, i1 = sample(c, 'frame', 't'), sample(c, 'to_frame', 't_end')
    release_only = role == 'hold' and i1 == i0 and sample(c, 'release_frame', 't_release') > i1   # a cut kept its release
    if i1 < i0 or (i1 == i0 and not release_only): sys.exit(f"mix_master: automation {role!r} at {i0} ends before it starts")
    if role in ('gap', 'ride'):                                        # down over [i0 - attack, i0], held, back by i1
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
        curve = c.get('curve', kit_auto.get('tail', {}).get('curve', 'db'))     # 'db' (the default): linear in dB
        if curve not in TAIL_CURVES: sys.exit(f"mix_master: tail curve {curve!r}: one of {', '.join(TAIL_CURVES)}")
        tails.append((i0, i1, float(param(c, 'fade_to_db')), curve))
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
    for i0, i1, db, curve in tails:
        u = (np.arange(i0, i1) - i0 + 1) / (i1 - i0)
        k0, k1 = max(0, i0), min(y.shape[1], i1)
        if k1 > k0: y[:, k0:k1] *= TAIL_CURVES[curve](u, db)[k0 - i0:k1 - i0]   # reached on to_frame - 1 sample
        y[:, max(0, i1):] = 0.0                                        # exact zeros to the last sample
    return y
meter = pyln.Meter(SR)
HP = Pedalboard([HighpassFilter(28)])
def loud(x):
    """The master-to-be's integrated loudness: high-passed as the master is, with the tail applied."""
    z = HP(x.astype(np.float32), SR)
    return meter.integrated_loudness((apply_tails(z) if tails else z).T)
KW = [([1.53512485958697, -2.69169618940638, 1.19839281085285], [1.0, -1.69065929318241, 0.73248077421585]),
      ([1.0, -2.0, 1.0], [1.0, -1.99004745483398, 0.99007225036621])]   # BS.1770 K-weighting at 48 kHz
def span_lufs(x, s0, s1):
    """Ungated BS.1770 loudness of x (channels x samples) over samples [s0, s1), K-weighted from the start."""
    z = x[:, :s1]
    for b_, a_ in KW: z = lfilter(b_, a_, z, axis=1)
    return float(-0.691 + 10 * np.log10(np.sum(np.mean(z[:, s0:s1] ** 2, axis=1)) + 1e-20))
voice = None
if a.voice:                                                            # the narrated twin: duck, then the voice on top
    vx = load(a.voice)
    if vx.shape[1] != N: sys.exit(f"mix_master: the voice has {vx.shape[1]} samples, the bed {N}")
    nz = np.flatnonzero(np.abs(vx).max(0) > 0)
    if not len(nz): sys.exit("mix_master: the voice stem is silent")
    cut = np.flatnonzero(np.diff(nz) > int(a.voice_merge_ms * SR / 1000))
    spans = list(zip(np.concatenate([[nz[0]], nz[cut + 1]]).tolist(), (np.concatenate([nz[cut], [nz[-1]]]) + 1).tolist()))
    depth = 10 ** (-abs(a.voice_duck_db) / 20); ka, kr = int(a.voice_attack_ms * SR / 1000), int(a.voice_release_ms * SR / 1000)
    lead = ka if a.voice_lead_ms is None else int(a.voice_lead_ms * SR / 1000)
    vduck = np.ones(N)
    for s0, s1 in spans:                                               # down from `lead` before the line, back after it
        d0 = s0 - lead
        env = np.ones(N); env[max(0, d0 + ka):s1] = depth
        ramp(env, d0, d0 + ka, 1.0, depth); ramp(env, s1, s1 + kr, depth, 1.0)
        vduck = np.minimum(vduck, env)
    me = out * vduck                                                   # the music and effects, ducked under the lines
    lines = [span_lufs(vx, s0, s1) for s0, s1 in spans]
    l_me = loud(me); gv = a.voice_lufs - (a.lufs - l_me) - float(np.mean(lines))
    for _ in range(3):                                                 # the voice lifts the programme a little: re-aim
        l_all = loud(me + vx * 10 ** (gv / 20))
        gv = a.voice_lufs - (a.lufs - l_all) - float(np.mean(lines))
    out = me + vx * 10 ** (gv / 20)
    voice = {"file": a.voice, "spans": spans, "gain_db": round(gv, 2), "duck_db": -abs(a.voice_duck_db),
             "attack_ms": a.voice_attack_ms, "lead_ms": round(lead * 1000 / SR, 1), "release_ms": a.voice_release_ms,
             "target_line_lufs": a.voice_lufs,
             "stem_line_lufs": [round(v, 2) for v in lines]}
y = HP(out.astype(np.float32), SR)
l0 = meter.integrated_loudness((apply_tails(y) if tails else y).T)
y = (y * 10 ** ((a.lufs - l0) / 20)).astype(np.float32)
settle = {"gain_db": 0.0, "passes": []}
def limit(ceiling):
    """The true-peak limiter at this ceiling, then the tail (after it, so the zeros stay zeros); written to OUT.
    With --settle the limiter's loudness loss is made up: the master is normalised again and limited again until its
    integrated loudness is within 0.03 LU of --lufs (at most 6 passes, each recorded)."""
    g, passes = 0.0, []
    for _ in range(6 if a.settle else 1):
        z = Pedalboard([BrickwallLimiter(ceiling_db=ceiling, true_peak=True, lookahead_ms=5)])(
            (y * 10 ** (g / 20)).astype(np.float32), SR)
        if tails: z = apply_tails(z).astype(np.float32)
        if not a.settle: break
        lz = float(meter.integrated_loudness(z.T)); passes.append([round(g, 3), round(lz, 3)])
        if abs(a.lufs - lz) <= 0.03 or g >= a.settle_max_db - 1e-9: break
        g = min(a.settle_max_db, g + a.lufs - lz)
    settle.update(gain_db=round(g, 3), passes=passes)
    sf.write(a.out, z.T, SR, subtype='PCM_24')
    return z
def aac_peak(path, rate):
    """The true peak (dBTP) of an AAC encode of `path`, as tools/encode/encode.sh makes it and tools/encode/verify.mjs
    reads it: the largest of ebur128's per-frame lavfi.r128.true_peak, at full precision."""
    with tempfile.TemporaryDirectory() as td:
        m4a = os.path.join(td, 'aac.m4a')
        subprocess.run([a.ffmpeg, '-hide_banner', '-nostdin', '-loglevel', 'error', '-y', '-i', path, '-c:a', 'aac', '-b:a', rate,
                        '-ar', '48000', '-ac', '2', m4a], check=True)
        r = subprocess.run([a.ffmpeg, '-hide_banner', '-nostats', '-nostdin', '-loglevel', 'error', '-i', m4a, '-map', '0:a:0', '-af',
                            'ebur128=peak=true:framelog=quiet:metadata=1,ametadata=mode=print:file=-', '-f', 'null', '-'],
                           capture_output=True, text=True, check=True)
    pk = max((float(v) for v in re.findall(r'^lavfi\.r128\.true_peak=([\d.]+)', r.stdout, re.M)), default=0.0)
    return round(20 * math.log10(pk), 3) if pk > 0 else float('-inf')
ceiling = a.tp
y_out = limit(ceiling)
aac = None
if a.aac:
    rate, gate = a.aac.split(':'); gate = float(gate); tries = []
    while True:
        p = aac_peak(a.out, rate); tries.append([ceiling, p])
        if p <= gate - a.aac_margin: break
        if ceiling - a.tp_step < a.tp_floor - 1e-9:
            sys.exit(f"mix_master: the {rate} AAC encode peaks at {p} dBTP with the ceiling at {ceiling} (gate {gate}, floor {a.tp_floor})")
        ceiling = round(ceiling - a.tp_step, 3)
        y_out = limit(ceiling)
    aac = {"bitrate": rate, "gate_dbtp": gate, "margin_db": a.aac_margin, "true_peak_dbtp": p,
           "tries_ceiling_and_aac_peak": tries}
y = y_out
l1 = meter.integrated_loudness(y.T); tp = 20 * np.log10(np.abs(resample_poly(y, 4, 1, axis=1)).max() + 1e-12)
rep = {"out": a.out, "integrated_lufs": round(float(l1), 2), "true_peak_dbtp_4x": round(float(tp), 2), "duration_s": round(y.shape[1] / SR, 3),
       "samples": int(y.shape[1]), "ceiling_dbtp": ceiling}
if aac: rep["aac"] = aac
if a.drive: rep["drive"] = {"file": a.drive, "gain_db": a.drive_db}
if applied: rep["automation"] = applied
if tails: rep["zeros_from_sample"] = max(0, min(t[1] for t in tails))
if a.settle: rep["settle"] = settle
if voice:                                       # the music and effects alone, as this master plays them; each line
    gm = 10 ** ((a.lufs - l0 + settle["gain_db"]) / 20)                 # against them, at the master's own gain
    zme = Pedalboard([BrickwallLimiter(ceiling_db=ceiling, true_peak=True, lookahead_ms=5)])(
        (HP(me.astype(np.float32), SR) * gm).astype(np.float32), SR)
    if tails: zme = apply_tails(zme).astype(np.float32)
    if a.me_out: sf.write(a.me_out, zme.T, SR, subtype='PCM_24')
    vfin = HP((vx * 10 ** (gv / 20)).astype(np.float32), SR).astype(np.float64) * gm
    rows = []
    for s0, s1 in voice["spans"]:
        lv, lm = span_lufs(vfin, s0, s1), span_lufs(zme.astype(np.float64), s0, s1)
        rows.append({"span_s": [round(s0 / SR, 3), round(s1 / SR, 3)],
                     "frames": [round(s0 * a.fps / SR, 2), round(s1 * a.fps / SR, 2)], "voice_lufs": round(lv, 2),
                     "music_and_effects_lufs": round(lm, 2), "voice_over_music_and_effects_db": round(lv - lm, 1)})
    voice["spans"] = [[round(s0 / SR, 4), round(s1 / SR, 4)] for s0, s1 in voice["spans"]]
    voice.update(lines=rows, me_out=a.me_out, me_integrated_lufs=round(float(meter.integrated_loudness(zme.T)), 2))
    rep["voice"] = voice
print(json.dumps(rep))
