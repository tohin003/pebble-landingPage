"""Edit a (stock) music track to picture: put the track's drop on the film's reveal, keep the track's natural ending
on the film's last frame (back-timing), and splice in between on matching downbeats with an equal-power crossfade.
Writes the edited WAV + an EDL/beat-map JSON (film-time downbeats = where to put picture cuts).
Usage: python -I fit_music.py IN_AUDIO OUT_WAV TARGET_LEN_S REVEAL_AT_S [--drop TRACK_DROP_S] [--end TRACK_END_S]

Film mode (the film is a whole number of bars at a tempo with a whole number of frames per beat):
  python -I fit_music.py IN.wav OUT.wav --film-bars N --reveal-bar R --bpm TRACK_BPM --drop TRACK_S --final TRACK_S
         [--ring-bars 2] [--fps 30] [--max-stretch 2]
  0. the track's real tempo is measured from its kick attacks (a robust line fit over the whole track);
  1. its speed is changed to the nearest tempo with a whole number of frames per beat, if that is within --max-stretch
     per cent: by default with varispeed (soxr resampling, exact timing; the pitch moves by the same ratio, e.g. -23
     cents for -1.3 %), or --method stretch (Rubber Band, pitch kept, but its onset timing drifts by up to ~0.1 %);
  2. the drop (refined to the kick attack) lands on the downbeat of film bar R, so the film starts R-1 bars before it;
  3. the final chord (--final, refined the same way) is back-timed onto film bar N-ring_bars+1 and rings to the end;
  4. one splice between them, on the bar where head and tail match best (chroma + level), with an equal-power
     crossfade of at most half a beat ending exactly on that downbeat (--button: the splice is the final chord itself,
     for endings that leave the grid, such as a ritardando);
  5. writes OUT.wav (exactly N bars long) and OUT.edl.json for make_beatmap.py --edl."""
import sys, json, argparse, numpy as np, soundfile as sf, librosa
ap = argparse.ArgumentParser(); ap.add_argument('inp'); ap.add_argument('out'); ap.add_argument('target', type=float, nargs='?'); ap.add_argument('reveal', type=float, nargs='?')
ap.add_argument('--drop', type=float); ap.add_argument('--end', type=float); ap.add_argument('--bars-before-drop', type=int, default=0)
ap.add_argument('--film-bars', type=int); ap.add_argument('--reveal-bar', type=int); ap.add_argument('--final', type=float)
ap.add_argument('--ring-bars', type=int, default=2); ap.add_argument('--bpm', type=float); ap.add_argument('--fps', type=int, default=30)
ap.add_argument('--max-stretch', type=float, default=2.0)
ap.add_argument('--method', choices=['varispeed', 'stretch'], default='varispeed', help='film mode: varispeed (resample: exact timing, pitch moves with the tempo) or stretch (Rubber Band: pitch kept, onset timing drifts up to ~0.1 %%)')
ap.add_argument('--button', action='store_true', help='film mode: cut straight into the final chord (for an off-grid ending)')
a = ap.parse_args()


def film_mode(a):
    import pedalboard
    from scipy.signal import butter, sosfiltfilt
    y, sr = sf.read(a.inp, always_2d=True); y = y.T.astype(np.float32); mono = y.mean(0).astype(np.float64)
    sos = butter(2, [40, 200], btype='band', fs=sr, output='sos')
    ms = sr // 1000; w2 = 2 * ms
    def attack(x, t_guess, lo=0.08, hi=0.08):
        """kick/bass onset near t_guess, the same definition as validate_bed.py (so the fit and the check agree): 40-200 Hz,
        zero-phase, 2 ms RMS; the steepest rise in [t-lo, t+hi]; the onset is the half-way point from the valley just
        before that rise to the peak 25 ms after it (close to where the hit is heard to start, also on slow 808 kicks)"""
        i0, i1 = int(max(0, t_guess - lo - 0.05) * sr), int(min(len(x) / sr, t_guess + hi + 0.04) * sr)
        bb = sosfiltfilt(sos, x[i0:i1]); env = np.sqrt(np.convolve(bb ** 2, np.ones(w2) / w2, 'same') + 1e-12)
        d = np.gradient(np.convolve(env, np.ones(w2) / w2, 'same'))
        a0, a1 = min(len(env) - 1, int(0.05 * sr)), max(int(0.05 * sr) + 1, len(env) - int(0.04 * sr))
        k = a0 + int(np.argmax(d[a0:a1])); v = max(0, k - 30 * ms) + int(np.argmin(env[max(0, k - 30 * ms):k + 1]))
        post = env[k:k + 25 * ms].max(); half = env[v] + 0.5 * (post - env[v])
        j = v + int(np.argmax(env[v:k + 25 * ms] >= half))
        return (i0 + j) / sr
    if a.bpm is None:
        t0, _ = librosa.beat.beat_track(y=librosa.resample(mono, orig_sr=sr, target_sr=22050), sr=22050)
        a.bpm = float(np.atleast_1d(t0)[0])
    drop0 = attack(mono, a.drop)
    final0 = attack(mono, a.final) if a.final is not None else None
    # 0) the track's true beat period: a robust straight-line fit of kick/bass attacks found near drop + k*P on the
    #    whole track (stock music is produced to a fixed tempo; a 0.03 % error is ~25 ms of drift over a film)
    P0 = 60 / a.bpm; dur0 = len(mono) / sr; ks, ts = [], []
    env_all = np.sqrt(np.convolve(sosfiltfilt(sos, mono) ** 2, np.ones(w2) / w2, 'same'))
    for k in range(-int(drop0 / P0) + 1, int((dur0 - drop0) / P0) - 1):
        tg = drop0 + k * P0; i0, i1 = int((tg - 0.035) * sr), int((tg + 0.035) * sr)
        if i0 < int(0.04 * sr) or i1 > len(env_all): continue
        pre = env_all[i0 - int(0.03 * sr):i0].min(); post = env_all[i0:i1].max()
        if post < 2 * pre or post < 0.05 * env_all.max(): continue  # no clear kick near this beat
        ks.append(k); ts.append(attack(mono, tg, 0.035, 0.035))
    ks, ts = np.array(ks, float), np.array(ts)
    for _ in range(4):                                               # drop outliers (> 12 ms) and refit
        if len(ks) < 8: break
        b1, b0 = np.polyfit(ks, ts, 1); r = ts - (b0 + b1 * ks); keep = np.abs(r) < 0.012
        if keep.all(): break
        ks, ts = ks[keep], ts[keep]
    if len(ks) >= 8:
        b1, b0 = np.polyfit(ks, ts, 1)
        print(f'tempo from {len(ks)} kick attacks: {60 / b1:.4f} BPM (given {a.bpm}), residual {np.std(ts - (b0 + b1 * ks)) * 1000:.1f} ms', file=sys.stderr)
        a.bpm = 60 / b1; drop0 = float(b0)                            # the drop on the fitted grid
    # 1) the nearest tempo with a whole number of frames per beat, within the stretch limit
    n0 = round(a.fps * 60 / a.bpm)
    cands = sorted((abs(a.fps * 60 / n / a.bpm - 1), n) for n in (n0 - 1, n0, n0 + 1) if n > 0)
    dev, fpb = cands[0]
    if dev * 100 > a.max_stretch:
        raise SystemExit(f'{a.bpm} BPM needs a {dev * 100:.2f} % stretch to reach a whole number of frames per beat (limit {a.max_stretch} %)')
    bpm1 = a.fps * 60 / fpb; s = bpm1 / a.bpm                      # s > 1 speeds the track up
    if abs(s - 1) <= 1e-6:
        ys = y
    elif a.method == 'stretch':
        ys = pedalboard.time_stretch(y, sr, stretch_factor=s, high_quality=True)
    else:                                                            # varispeed: exact, linear timing
        import soxr
        ys = soxr.resample(y.T.astype(np.float64), sr * s, sr, quality='VHQ').T
    ys = ys.astype(np.float64); mono_s = ys.mean(0); dur1 = ys.shape[1] / sr
    bar = 4 * 60 / bpm1; beat = bar / 4
    drop1 = drop0 / s if a.method == 'varispeed' else attack(mono_s, drop0 / s, 0.05, 0.05)  # varispeed scales time exactly
    final1 = attack(mono_s, final0 / s, 0.05, 0.05) if final0 is not None else None
    if final1 is not None and not a.button:                         # keep the tail on the drop's bar grid
        k = round((final1 - drop1) / (4 * 60 / bpm1)); on_grid = drop1 + k * 4 * 60 / bpm1
        if abs(final1 - on_grid) < 0.08:
            print(f'final snapped to the bar grid: {(on_grid - final1) * 1000:+.1f} ms', file=sys.stderr); final1 = on_grid
    N, R = a.film_bars, a.reveal_bar
    start = drop1 - (R - 1) * bar
    if start < -0.002:
        raise SystemExit(f'the intro is too short for reveal bar {R}: use --reveal-bar {int(drop1 // bar) + 1} or lower')
    start = max(0.0, start)
    B_final = N - a.ring_bars + 1
    if final1 is None:
        raise SystemExit('film mode needs --final (track seconds of the final-chord downbeat)')
    # 2) the splice: film bars 1..S-1 from the head, S..N from the tail, chosen by chroma + level match
    y22 = librosa.resample(mono_s, orig_sr=sr, target_sr=22050)
    chroma = librosa.feature.chroma_cqt(y=y22, sr=22050, hop_length=512)
    rms = librosa.feature.rms(y=y22, hop_length=512)[0]; rt = librosa.times_like(rms, sr=22050, hop_length=512)
    def bar_feat(t):
        m = (rt >= t) & (rt < t + bar)
        if not m.any(): return np.zeros(12), -120.0
        return chroma[:, m[:chroma.shape[1]]].mean(1), 20 * np.log10(rms[m].mean() + 1e-9)
    best = None
    for S in ([B_final] if a.button else range(R + 2, B_final)):
        h = start + (S - 1) * bar                                    # head's out point (track time, stretched)
        T_in = final1 - (B_final - S) * bar                          # tail's in point
        if not a.button and (T_in < drop1 + bar or T_in > dur1 - bar):
            continue
        (c1, e1), (c2, e2) = bar_feat(h - bar), bar_feat(T_in - bar)
        (c3, e3), (c4, e4) = bar_feat(h), bar_feat(T_in)
        score = np.linalg.norm(c1 - c2) + np.linalg.norm(c3 - c4) + 0.15 * abs(e3 - e4) + (0.3 if T_in < h - bar else 0)
        if best is None or score < best[0]:
            best = (score, S, h, T_in)
    if best is None:
        raise SystemExit('no splice point fits: change --film-bars, --reveal-bar or --ring-bars')
    score, S, h, T_in = best
    L = int(round(N * bar * sr)); xf = int(min(beat / 2, 0.12) * sr)
    seg = lambda t1, t2: ys[:, int(round(t1 * sr)):int(round(t2 * sr))]
    A_ = seg(start, h); B_ = seg(T_in - xf / sr, dur1)
    w = np.linspace(0, np.pi / 2, xf)
    out = np.concatenate([A_[:, :-xf], A_[:, -xf:] * np.cos(w) + B_[:, :xf] * np.sin(w), B_[:, xf:]], axis=1)
    fi = int(0.005 * sr); out[:, :fi] *= np.linspace(0, 1, fi)    # 5 ms in: the film enters on a downbeat
    out = out[:, :L] if out.shape[1] >= L else np.pad(out, ((0, 0), (0, L - out.shape[1])))
    fo = int(0.6 * sr); out[:, -fo:] *= np.linspace(1, 0, fo) ** 2
    peak = np.abs(out).max()
    if peak > 0.999: out *= 0.999 / peak
    sf.write(a.out, out.T, sr, subtype='PCM_24')
    secs = [('intro', 1, R - 1), ('reveal', R, R), ('body', R + 1, S - 1), ('tail', S, B_final - 1), ('final', B_final, N)]
    edl = dict(source=a.inp, track_bpm=round(a.bpm, 4), bpm=round(bpm1, 6), stretch_pct=round((s - 1) * 100, 4), method=a.method,
               pitch_shift_cents=round(1200 * np.log2(s), 2) if a.method == 'varispeed' else 0.0,
               note='stretch_pct is the speed change; track times below are in the original (unstretched) track',
               bar_s=round(bar, 6), film_bars=N, film_first_downbeat_s=0.0, film_reveal_bar=R, film_final_chord_bar=B_final,
               track_drop_s=round(drop0, 4), track_final_s=round(final0, 4), ringout_s=round(dur1 - final1, 2),
               splice_bar=S, splice_score=round(float(score), 3),
               edit=[{'film_in': 0.0, 'src_in': round(start * s, 4), 'src_out': round(h * s, 4)},
                     {'film_in': round((S - 1) * bar, 4), 'src_in': round(T_in * s, 4), 'src_out': round(min(dur1, T_in + (N - S + 1) * bar) * s, 4),
                      'xfade_s': round(xf / sr, 4)}],
               sections=[{'name': n, 'first_bar': b0, 'last_bar': b1} for n, b0, b1 in secs if b1 >= b0],
               film_downbeats_s=[round(k * bar, 6) for k in range(N)], target_s=round(N * bar, 6))
    json.dump(edl, open(a.out.rsplit('.', 1)[0] + '.edl.json', 'w'), indent=1)
    print(json.dumps({k: v for k, v in edl.items() if k not in ('film_downbeats_s',)}, indent=1))


if a.film_bars:
    film_mode(a)
    sys.exit(0)
if a.target is None or a.reveal is None:
    ap.error('TARGET_LEN_S and REVEAL_AT_S are required unless --film-bars is given')
y, sr = sf.read(a.inp, always_2d=True); y = y.T.astype(np.float32); mono = y.mean(0)
y22 = librosa.resample(mono, orig_sr=sr, target_sr=22050)
tempo0, beats = librosa.beat.beat_track(y=y22, sr=22050, units='time', trim=False)
dur = len(mono) / sr
lowon = librosa.onset.onset_strength(y=y22, sr=22050, hop_length=128, fmax=150); lt = librosa.times_like(lowon, sr=22050, hop_length=128)
P = float(np.median(np.diff(beats)))                                     # provisional beat period for the drop search
# 2) phase anchor: the drop = first moment the low band (kick/bass) jumps >= 25 dB above the previous 2 bars;
#    anchor = attack start (half-way crossing), which is where a picture cut should land
Sx = np.abs(librosa.stft(y22, n_fft=1024, hop_length=128)); fx_ = librosa.fft_frequencies(sr=22050, n_fft=1024)
le = 20 * np.log10(Sx[(fx_ > 35) & (fx_ < 120)].sum(0) + 1e-9); let = librosa.times_like(le, sr=22050, hop_length=128)
hop_s = let[1] - let[0]; drop0 = None
for i in range(int(2 * 4 * P / hop_s), len(le) - int(0.25 / hop_s)):
    pre = np.median(le[i - int(2 * 4 * P / hop_s): i - int(0.05 / hop_s)]); post = np.median(le[i: i + int(0.25 / hop_s)])
    if post - pre > 25:
        j = i - int(0.1 / hop_s) + np.argmax(le[i - int(0.1 / hop_s): i + int(0.1 / hop_s)] > pre + 0.5 * (post - pre))
        drop0 = float(let[j]); break
if a.drop is not None: drop0 = a.drop
# refine to the kick's attack with 1 ms resolution: 40-120 Hz band, 2 ms RMS, 50 % crossing before the local peak
from scipy.signal import butter, sosfiltfilt
_sos = butter(4, [40, 120], btype='band', fs=sr, output='sos')
def attack_time(t_guess, lo=0.10, hi=0.25):
    i0, i1 = int(max(0, t_guess - lo) * sr), int(min(dur, t_guess + hi) * sr)
    bb = sosfiltfilt(_sos, mono[i0:i1]); w2 = max(1, int(0.002 * sr))
    env = np.sqrt(np.convolve(bb ** 2, np.ones(w2) / w2, 'same')); pk = int(np.argmax(env))
    j = pk - np.argmax(env[:pk + 1][::-1] < 0.5 * env[pk]) if pk > 0 else 0
    return (i0 + j) / sr
if drop0 is not None: drop0 = attack_time(drop0)
if drop0 is None: drop0 = float(beats[np.argmax(np.interp(beats, lt, lowon))])     # fallback: strongest beat
# 1) tempo, anchored on the drop: stock music is produced at a fixed BPM; maximise onset strength (max within +-12 ms)
#    on the grid drop + k*P over the drums section (a wrong tempo drifts off the beats within a few bars)
P_est = np.median(np.diff(beats))
end_guess = dur - 1.0
W = int(0.012 / (lt[1] - lt[0]))
def align(Pc, off):
    g = np.arange(drop0 + off, end_guess, Pc); idx = np.searchsorted(lt, g); idx = idx[idx < len(lowon)]
    return np.mean([lowon[max(0, i - W): i + W + 1].max() for i in idx])
offs_ = np.arange(-0.08, 0.081, 0.004)
cands = 60 / np.arange(60 / P_est * 0.97, 60 / P_est * 1.03, 0.01)
coarse = max(((align(Pc, o), Pc, o) for Pc in cands[::5] for o in offs_[::3]))           # coarse joint tempo/phase search
fine = max(((align(Pc, o), Pc, o) for Pc in cands if abs(Pc - coarse[1]) < 0.004 for o in offs_))
_, P, off = fine; drop0 = attack_time(drop0 + off, lo=0.06, hi=0.06)   # re-snap to the attack after the joint search
bpm_half = round(120 / P) / 2
if abs(60 / bpm_half - P) / P < 0.0015: P = 60 / bpm_half             # snap to x.0 / x.5 BPM when within 0.15 %
phase_ref = drop0; bar = 4 * P
down = phase_ref + bar * np.arange(-int(phase_ref / bar), int((dur - phase_ref) / bar) + 1); down = down[down >= 0]
grid = phase_ref + P * np.arange(-int(phase_ref / P), int((dur - phase_ref) / P) + 1)
# 3) frame-accuracy check: measure the low-band attack next to grid beats in the drums section (should be ~0 ms)
gb = grid[(grid > drop0) & (grid < dur - 6)]; gb = gb[np.linspace(0, len(gb) - 1, min(48, len(gb))).astype(int)] if len(gb) else gb
offs = np.array([attack_time(g, lo=0.05, hi=0.05) - g for g in gb]) if len(gb) else np.array([0.0])
print(f"grid: {60 / P:.3f} BPM, anchor {drop0:.3f}s, attack-to-grid median {np.median(offs) * 1000:.1f} ms, "
      f"|offset|<17ms (1 frame @60fps) at {np.mean(abs(offs) < 0.017) * 100:.0f}% of {len(offs)} sampled beats")
rms = librosa.feature.rms(y=y22, hop_length=512)[0]; rt = librosa.times_like(rms, sr=22050, hop_length=512)
def bar_db(t):
    m = (rt >= t) & (rt < t + bar)
    return 20 * np.log10(rms[m].mean() + 1e-9) if m.any() else -120.0
bdb = np.array([bar_db(t) for t in down])
drop = float(phase_ref)
end_t = a.end if a.end is not None else float(down[np.where(bdb > bdb.max() - 12)[0].max()] + bar)  # last loud bar end
tail = len(mono) / sr - end_t                                                           # natural ring-out after last bar
# 1) head: start a whole number of bars before the drop so the drop lands on (or just before) the reveal
nb = a.bars_before_drop or max(1, int(np.floor(a.reveal / bar + 1e-6)))
head_start = drop - nb * bar; film_drop = nb * bar
if head_start < 0: raise SystemExit('reveal too late for this track intro; use fewer bars')
pre_roll = a.reveal - film_drop                                                         # >=0: silence/fade-in before music
# 2) tail block back-timed: track [tail_start, end] must end at target (incl. ring-out)
avail_after_drop = a.target - pre_roll - film_drop - tail                               # film seconds between drop and last bar end
n_bars_body = int(round(avail_after_drop / bar))
# choose the splice: body bars from drop (bars i) + ending bars (n_bars_body - i) taken from the end; pick i with best chroma match
chroma = librosa.feature.chroma_cqt(y=y22, sr=22050, hop_length=512)
def bar_chroma(t): m = (rt >= t) & (rt < t + bar); return chroma[:, m[:chroma.shape[1]]].mean(1)
best = None
for i in range(2, n_bars_body - 1):
    cut_out = drop + i * bar                                     # leave body here
    cut_in = end_t - (n_bars_body - i) * bar                     # enter ending block here
    if cut_in <= cut_out: continue
    d = np.linalg.norm(bar_chroma(cut_out - bar) - bar_chroma(cut_in - bar)) + np.linalg.norm(bar_chroma(cut_out) - bar_chroma(cut_in))
    e = abs(bar_db(cut_out) - bar_db(cut_in))
    score = d + 0.15 * e
    if best is None or score < best[0]: best = (score, i, cut_out, cut_in)
if best is None:   # track already short enough: no splice
    best = (0, n_bars_body, drop + n_bars_body * bar, drop + n_bars_body * bar)
_, i, cut_out, cut_in = best
xf = int(min(P / 2, 0.12) * sr)                                  # crossfade: <= half a beat, ending exactly on the downbeat
def seg(t1, t2): return y[:, int(round(t1 * sr)):int(round(t2 * sr))]
A_ = seg(head_start, cut_out); B_ = seg(cut_in - xf / sr, len(mono) / sr)
w = np.linspace(0, np.pi / 2, xf)
out = np.concatenate([A_[:, :-xf], A_[:, -xf:] * np.cos(w) + B_[:, :xf] * np.sin(w), B_[:, xf:]], axis=1)
fi = int(0.25 * sr); out[:, :fi] *= np.linspace(0, 1, fi) ** 2 if head_start > 0.05 else 1   # short fade-in if we start mid-track
fo = int(0.04 * sr); out[:, -fo:] *= np.linspace(1, 0, fo)                     # 40 ms fade at the very end (encoder padding / end clicks)
out = np.concatenate([np.zeros((2, int(round(max(pre_roll, 0) * sr)))), out], axis=1)
L = int(round(a.target * sr))
if out.shape[1] > L: f = int(0.8 * sr); out = out[:, :L]; out[:, -f:] *= np.linspace(1, 0, f) ** 2
else: out = np.pad(out, ((0, 0), (0, L - out.shape[1])))
sf.write(a.out, out.T, sr, subtype='PCM_24')
film_down = [round(pre_roll + (t - head_start), 3) for t in down if head_start <= t < cut_out] + \
            [round(pre_roll + (cut_out - head_start) + (t - cut_in), 3) for t in down if cut_in <= t <= end_t]
edl = dict(source=a.inp, bpm=round(60 / P, 3), bar_s=round(bar, 4), track_drop_s=round(drop, 3), track_end_s=round(end_t, 3), ringout_s=round(tail, 2),
           edit=[{"film_in": round(pre_roll, 3), "src_in": round(head_start, 3), "src_out": round(cut_out, 3)},
                 {"film_in": round(pre_roll + cut_out - head_start, 3), "src_in": round(cut_in, 3), "src_out": round(len(mono) / sr, 3), "xfade_s": round(xf / sr, 3)}],
           film_reveal_s=round(pre_roll + film_drop, 3), film_downbeats_s=film_down, target_s=a.target)
json.dump(edl, open(a.out.rsplit('.', 1)[0] + '.edl.json', 'w'), indent=1)
print(json.dumps({k: v for k, v in edl.items() if k != 'film_downbeats_s'}, indent=1)); print('first film downbeats:', film_down[:10])
