"""Edit a (stock) music track to picture: put the track's drop on the film's reveal, keep the track's natural ending
on the film's last frame (back-timing), and splice in between on matching downbeats with an equal-power crossfade.
Writes the edited WAV + an EDL/beat-map JSON (film-time downbeats = where to put picture cuts).
Usage: python -I fit_music.py IN_AUDIO OUT_WAV TARGET_LEN_S REVEAL_AT_S [--drop TRACK_DROP_S] [--end TRACK_END_S]"""
import sys, json, argparse, numpy as np, soundfile as sf, librosa
ap = argparse.ArgumentParser(); ap.add_argument('inp'); ap.add_argument('out'); ap.add_argument('target', type=float); ap.add_argument('reveal', type=float)
ap.add_argument('--drop', type=float); ap.add_argument('--end', type=float); ap.add_argument('--bars-before-drop', type=int, default=0)
a = ap.parse_args()
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
