"""Analyze a music file for edit planning: tempo, beat grid, downbeat guess, energy curve, sections, loudness. Writes a PNG the agent can look at."""
import sys, json, numpy as np, soundfile as sf, librosa, pyloudnorm as pyln
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
path, out_png, out_json = sys.argv[1], sys.argv[2], sys.argv[3]
y, sr = sf.read(path, always_2d=True)          # libsndfile >=1.1 decodes MP3 natively (no ffmpeg needed)
y = y.astype(np.float32); mono = y.mean(axis=1)
dur = len(mono)/sr
meter = pyln.Meter(sr)                          # ITU-R BS.1770-4
lufs = meter.integrated_loudness(y)
true_peak_approx = 20*np.log10(np.max(np.abs(librosa.resample(mono, orig_sr=sr, target_sr=sr*4))) + 1e-12)
y22 = librosa.resample(mono, orig_sr=sr, target_sr=22050); sr22 = 22050
tempo, beats = librosa.beat.beat_track(y=y22, sr=sr22, units='time', trim=False)
tempo = float(np.atleast_1d(tempo)[0])
# downbeat guess: the beat phase (0..3) whose beats carry the most low-frequency onset energy
onset = librosa.onset.onset_strength(y=y22, sr=sr22, aggregate=np.median, fmax=200)
ot = librosa.times_like(onset, sr=sr22)
bstr = np.interp(beats, ot, onset)
phase = int(np.argmax([bstr[p::4].mean() for p in range(4)])) if len(beats) > 8 else 0
downbeats = beats[phase::4]
# energy (RMS dB per 0.5 s) and novelty-based section boundaries
hop = 512; rms = librosa.feature.rms(y=y22, hop_length=hop)[0]; rt = librosa.times_like(rms, sr=sr22, hop_length=hop)
rms_db = 20*np.log10(rms + 1e-6)
chroma = librosa.feature.chroma_cqt(y=y22, sr=sr22, hop_length=hop)
mfcc = librosa.feature.mfcc(y=y22, sr=sr22, hop_length=hop, n_mfcc=13)
feat = librosa.util.normalize(np.vstack([chroma, mfcc]), axis=1)
bounds = librosa.segment.agglomerative(feat, k=7)
bound_t = librosa.frames_to_time(bounds, sr=sr22, hop_length=hop)
# snap section boundaries to nearest downbeat (edit points)
snap = [float(downbeats[np.argmin(np.abs(downbeats - t))]) for t in bound_t] if len(downbeats) else list(bound_t)
cent = librosa.feature.spectral_centroid(y=y22, sr=sr22, hop_length=hop)[0]
res = dict(file=path, duration_s=round(dur,2), sample_rate=sr, channels=y.shape[1], integrated_lufs=round(lufs,2),
           true_peak_dbtp_approx=round(float(true_peak_approx),2), tempo_bpm=round(tempo,2), n_beats=len(beats),
           bar_s=round(4*60/tempo,4), first_beats=[round(float(b),3) for b in beats[:8]],
           downbeat_phase=phase, downbeats=[round(float(b),3) for b in downbeats],
           section_bounds_s=[round(float(b),2) for b in bound_t], section_bounds_on_downbeats=[round(b,2) for b in snap],
           energy_db_per_2s=[round(float(np.mean(rms_db[(rt>=t)&(rt<t+2)])),1) for t in np.arange(0, dur, 2)])
json.dump(res, open(out_json,'w'), indent=1)
fig, ax = plt.subplots(3, 1, figsize=(14, 8), sharex=True)
S = librosa.amplitude_to_db(np.abs(librosa.stft(y22, n_fft=2048, hop_length=hop)), ref=np.max)
librosa.display.specshow(S, sr=sr22, hop_length=hop, x_axis='time', y_axis='log', ax=ax[0]); ax[0].set_title('log spectrogram')
ax[1].plot(rt, rms_db, lw=0.8); ax[1].set_ylabel('RMS dB'); ax[1].set_title(f'energy  |  {tempo:.1f} BPM  |  {lufs:.1f} LUFS')
for b in downbeats: ax[1].axvline(b, color='0.85', lw=0.5)
for b in snap: ax[1].axvline(b, color='r', lw=1.2)
ax[2].plot(rt, cent, lw=0.8, color='g'); ax[2].set_ylabel('centroid Hz'); ax[2].set_title('brightness (spectral centroid); red = section boundaries snapped to downbeats')
plt.tight_layout(); plt.savefig(out_png, dpi=80)
print(json.dumps({k: v for k, v in res.items() if k not in ('downbeats', 'energy_db_per_2s')}, indent=1))
