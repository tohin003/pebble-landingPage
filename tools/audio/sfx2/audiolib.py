"""Shared audio helpers for the sound-effect kit (tools/audio/sfx2): load, resample, measure, trim, fade, normalise,
write, and Apple's on-device sound classifier.

Conventions
- Everything is processed and written at 48 kHz, 24-bit PCM (the film's AAC is 48 kHz).
- Loudness is ITU-R BS.1770-4 (K-weighted). A mono file is measured as it plays in the stereo mix: on both channels
  (dual mono), so its numbers include the +3.01 dB a centred mono source gets.
- True peak: 4x oversampled (polyphase FIR), the BS.1770-4 method; reported in dBTP.
- Never colour a file: no EQ, compression or saturation. Edits are trim, fades, DC removal, resampling and one gain.
"""
import json
import math
import os
import subprocess
import tempfile

import numpy as np
import pyloudnorm as pyln
import soundfile as sf
from scipy.signal import lfilter, resample_poly, welch

SR = 48000
SUBTYPE = "PCM_24"
# BS.1770-4 K-weighting at 48 kHz: stage 1 (high shelf), stage 2 (RLB high-pass)
K1_B = [1.53512485958697, -2.69169618940638, 1.19839281085285]
K1_A = [1.0, -1.69065929318241, 0.73248077421585]
K2_B = [1.0, -2.0, 1.0]
K2_A = [1.0, -1.99004745483398, 0.99007225036621]
NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]


def db(x, floor=-200.0):
    x = float(x)
    return floor if x <= 0 else 20.0 * math.log10(x)


def load(path):
    """Read any libsndfile format (WAV, OGG, FLAC, MP3) as float32 (frames, channels), resampled to 48 kHz."""
    y, sr = sf.read(path, dtype="float32", always_2d=True)
    info = sf.info(path)
    src = {"sample_rate": sr, "channels": y.shape[1], "frames": y.shape[0], "format": info.format,
           "subtype": info.subtype, "duration_s": round(y.shape[0] / sr, 4), "clip_runs": clip_runs(y)}
    if sr != SR:
        g = math.gcd(SR, sr)
        y = resample_poly(y, SR // g, sr // g, axis=0, window=("kaiser", 9.0)).astype(np.float32)
    return y, src


def clip_runs(y, level=0.999, run=3):
    """Runs of `run` or more consecutive samples at full scale in any channel: baked-in clipping in a source."""
    n = 0
    for c in range(y.shape[1]):
        hot = np.abs(y[:, c]) >= level
        if not hot.any():
            continue
        d = np.diff(np.concatenate([[0], hot.astype(np.int8), [0]]))
        starts, ends = np.where(d == 1)[0], np.where(d == -1)[0]
        n += int(np.sum((ends - starts) >= run))
    return n


def as_stereo(y):
    return np.repeat(y, 2, axis=1) if y.shape[1] == 1 else y


def mono(y):
    return y.mean(axis=1)


def true_peak(y):
    up = resample_poly(y, 4, 1, axis=0, window=("kaiser", 9.0))
    return max(float(np.max(np.abs(up))), float(np.max(np.abs(y))))


def k_weight(y):
    return lfilter(K2_B, K2_A, lfilter(K1_B, K1_A, y, axis=0), axis=0)


def windowed_loudness(y, win_s, hop_s=0.1):
    """Ungated BS.1770 loudness of sliding windows (400 ms momentary, 3 s short-term). Returns (times, LUFS)."""
    z = k_weight(as_stereo(y)) ** 2
    s = z.sum(axis=1)
    n, h = int(win_s * SR), int(hop_s * SR)
    if len(s) < n:
        s = np.concatenate([s, np.zeros(n - len(s))])
    c = np.concatenate([[0.0], np.cumsum(s)])
    starts = np.arange(0, len(s) - n + 1, h)
    ms = (c[starts + n] - c[starts]) / n
    with np.errstate(divide="ignore"):
        lufs = -0.691 + 10.0 * np.log10(np.maximum(ms, 1e-20))
    return (starts + n) / SR, lufs


def integrated(y):
    """Gated integrated loudness (pyloudnorm, BS.1770-4); a file under 0.4 s is padded with silence to one block."""
    st = as_stereo(y).astype(np.float64)
    padded = False
    if st.shape[0] < int(0.4 * SR):
        st = np.vstack([st, np.zeros((int(0.4 * SR) - st.shape[0], 2))])
        padded = True
    v = pyln.Meter(SR).integrated_loudness(st)
    return (None if not np.isfinite(v) else round(float(v), 2)), padded


def loudness_range(y):
    """EBU Tech 3342 LRA from 3 s short-term values (abs gate -70 LUFS, relative gate -20 LU, 10th-95th percentile)."""
    if y.shape[0] < 3 * SR:
        return None
    _, st = windowed_loudness(y, 3.0, 0.1)
    st = st[st > -70.0]
    if not len(st):
        return None
    rel = 10 * np.log10(np.mean(10 ** (st / 10))) - 20.0
    st = st[st > rel]
    return round(float(np.percentile(st, 95) - np.percentile(st, 10)), 2) if len(st) else None


def spectrum(y):
    m = mono(y).astype(np.float64)
    nper = min(8192, max(256, 2 ** int(math.log2(max(256, len(m))))))
    f, p = welch(m, SR, nperseg=nper)
    tot = float(p.sum()) or 1e-30

    def band(lo, hi):
        return round(float(p[(f >= lo) & (f < hi)].sum() / tot), 4)

    sel = (f >= 100) & (f <= 10000) & (p > 0)
    flat = float(np.exp(np.mean(np.log(p[sel]))) / np.mean(p[sel])) if sel.any() else None
    return {
        "centroid_hz": round(float((f * p).sum() / tot), 1),
        "bands": {"sub_lt60": band(0, 60), "low_60_150": band(60, 150), "lowmid_150_500": band(150, 500),
                  "mid_500_2k": band(500, 2000), "presence_2k_5k": band(2000, 5000), "high_5k_10k": band(5000, 10000),
                  "air_gt10k": band(10000, SR / 2 + 1)},
        "share_above_150hz": round(float(p[f >= 150].sum() / tot), 4),
        "flatness_100_10k": None if flat is None else round(flat, 4),
    }


def note_name(hz):
    if not hz or hz <= 0:
        return None, None
    midi = 69 + 12 * math.log2(hz / 440.0)
    n = int(round(midi))
    return f"{NOTES[n % 12]}{n // 12 - 1}", int(round((midi - n) * 100))


def pitch(y):
    """Strongest spectral peak (40 Hz-5 kHz) in the loudest 250 ms, with a crude confidence (peak-to-median, dB).
    Meant for tuning tonal effects to the chosen track's key; noisy sounds read low confidence."""
    m = mono(y).astype(np.float64)
    n = int(0.25 * SR)
    if len(m) < n:
        m = np.concatenate([m, np.zeros(n - len(m))])
    c = np.concatenate([[0.0], np.cumsum(m ** 2)])
    i = int(np.argmax(c[n:] - c[:-n]))
    seg = m[i:i + n] * np.hanning(n)
    spec = np.abs(np.fft.rfft(seg, 8 * n))
    f = np.fft.rfftfreq(8 * n, 1 / SR)
    sel = (f >= 40) & (f <= 5000)
    if not sel.any() or spec[sel].max() <= 0:
        return {"pitch_hz": None, "note": None, "cents": None, "pitch_conf_db": None}
    idx = np.where(sel)[0]
    k = idx[int(np.argmax(spec[sel]))]
    if 0 < k < len(spec) - 1:  # parabolic interpolation on the log magnitude
        a, b, c = np.log(spec[k - 1] + 1e-30), np.log(spec[k] + 1e-30), np.log(spec[k + 1] + 1e-30)
        d = 0.5 * (a - c) / (a - 2 * b + c) if (a - 2 * b + c) != 0 else 0.0
        hz = float(f[k] + d * (f[1] - f[0]))
    else:
        hz = float(f[k])
    conf = db(spec[k] / (np.median(spec[sel]) + 1e-30))
    name, cents = note_name(hz)
    return {"pitch_hz": round(hz, 2), "note": name, "cents": cents, "pitch_conf_db": round(conf, 1)}


def envelope(y, win_s=0.01, hop_s=0.005):
    m = np.max(np.abs(y), axis=1).astype(np.float64)
    n, h = max(1, int(win_s * SR)), max(1, int(hop_s * SR))
    sq = np.concatenate([[0.0], np.cumsum(mono(y).astype(np.float64) ** 2)])
    starts = np.arange(0, max(1, len(m) - n + 1), h)
    rms = np.sqrt(np.maximum((sq[np.minimum(starts + n, len(m))] - sq[starts]) / n, 0))
    return m, starts, rms


def shape(y):
    """Timing facts the mix needs: where the peak and the loudest 10 ms are, attack and decay times."""
    m, starts, rms = envelope(y)
    pk = int(np.argmax(m))
    r = int(np.argmax(rms))
    rmax = float(rms[r]) or 1e-12
    above = np.where(rms >= rmax * 10 ** (-20 / 20))[0]
    att = None
    if len(above):
        first = above[0]
        att = round((starts[r] - starts[first]) / SR, 3)
    out = {"peak_time_s": round(pk / SR, 4), "rms_max_time_s": round(starts[r] / SR, 4), "attack_s": att}
    for dd in (20, 40):
        after = np.where(rms[r:] < rmax * 10 ** (-dd / 20))[0]
        out[f"decay_{dd}db_s"] = round(after[0] * (starts[1] - starts[0] if len(starts) > 1 else 1) / SR, 3) \
            if len(after) else None
    return out


def measure(y):
    tp = true_peak(y)
    lufs_i, padded = integrated(y)
    _, mom = windowed_loudness(y, 0.4, 0.01)
    _, st = windowed_loudness(y, 3.0, 0.1) if y.shape[0] >= 3 * SR else (None, None)
    rms = float(np.sqrt(np.mean(as_stereo(y).astype(np.float64) ** 2)))
    out = {
        "duration_s": round(y.shape[0] / SR, 4),
        "channels": int(y.shape[1]),
        "sample_peak_dbfs": round(db(np.max(np.abs(y))), 2),
        "true_peak_dbtp": round(db(tp), 2),
        "lufs_i": lufs_i,
        "lufs_i_padded_to_400ms": padded,
        "lufs_m_max": round(float(np.max(mom)), 2),
        "lufs_s_max": None if st is None else round(float(np.max(st)), 2),
        "lra_lu": loudness_range(y),
        "rms_dbfs": round(db(rms), 2),
        "crest_db": round(db(tp) - db(rms), 2),
        "dc_offset": round(float(np.max(np.abs(y.mean(axis=0)))), 6),
    }
    out.update(spectrum(y))
    out.update(pitch(y))
    out.update(shape(y))
    return out


# ---------------------------------------------------------------- edits
def raised_cos(n):
    return 0.5 - 0.5 * np.cos(np.linspace(0, math.pi, n)) if n > 0 else np.zeros(0)


def trim_points(y, start_db=-50.0, end_db=-60.0, preroll_s=0.005):
    """Start: preroll before the first sample within start_db of the peak. End: the last 10 ms RMS frame within
    end_db of the loudest frame (so a reverb tail is kept down to that level)."""
    a = np.max(np.abs(y), axis=1)
    pk = float(a.max()) or 1e-12
    s = int(np.argmax(a >= pk * 10 ** (start_db / 20)))
    s = max(0, s - int(preroll_s * SR))
    _, starts, rms = envelope(y)
    rmax = float(rms.max()) or 1e-12
    keep = np.where(rms >= rmax * 10 ** (end_db / 20))[0]
    e = y.shape[0] if not len(keep) else min(y.shape[0], int(starts[keep[-1]] + 0.01 * SR))
    return s, max(e, s + int(0.01 * SR))


def apply_fades(y, fade_in_s, fade_out_s):
    y = y.copy()
    ni, no = min(int(fade_in_s * SR), y.shape[0] // 2), min(int(fade_out_s * SR), y.shape[0] // 2)
    if ni > 0:
        y[:ni] *= raised_cos(ni)[:, None]
    if no > 0:
        y[-no:] *= raised_cos(no)[::-1][:, None]
    return y


def normalise_tp(y, target_dbtp):
    g_db = target_dbtp - db(true_peak(y))
    return (y * 10 ** (g_db / 20)).astype(np.float32), round(g_db, 3)


def remove_dc(y):
    mu = y.mean(axis=0)
    return (y - mu).astype(np.float32) if np.max(np.abs(mu)) > 1e-4 else y


def write(path, y):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    sf.write(path, np.clip(y, -1.0, 1.0), SR, subtype=SUBTYPE)


def preverb(y, at_s, len_s, room=0.92, damping=0.35, curve=1.6):
    """A reverse swell made from the audio itself (pre-verb): the len_s that starts at at_s is smeared with a long
    reverb (wet only), reversed and given a swell curve, so it rises for len_s and stops exactly where at_s begins.
    Place it with its END on the downbeat that at_s marks. pedalboard's Reverb (GPL-3.0): run here, never shipped."""
    import pedalboard
    st = as_stereo(y)
    i, n = int(at_s * SR), int(len_s * SR)
    sl = st[i:i + n]
    if sl.shape[0] < n:
        sl = np.vstack([sl, np.zeros((n - sl.shape[0], 2), dtype=np.float32)])
    padded = np.vstack([sl, np.zeros((n, 2), dtype=np.float32)])
    rv = pedalboard.Reverb(room_size=room, damping=damping, wet_level=1.0, dry_level=0.0, width=1.0)
    wet = pedalboard.Pedalboard([rv])(padded.T, SR).T
    sw = wet[::-1][-n:].copy()
    sw *= (np.linspace(0.0, 1.0, n) ** curve)[:, None]
    return apply_fades(sw.astype(np.float32), 0.0, 0.004)


# ---------------------------------------------------------------- classifier (OVERRIDES §36-§37 gates)
VOICE = ["speech", "speak", "talk", "conversation", "narration", "whisper", "sing", "choir", "chant", "yodel", "rap",
         "humming", "whistling", "shout", "yell", "scream", "laugh", "giggl", "snicker", "chuckle", "cry", "sigh",
         "baby", "vocal"]
NOT_VOICE = {"singing_bowl", "bird_vocalization", "whale_vocalization", "train_whistle"}
ALARM = ["siren", "alarm", "smoke", "civil", "buzzer", "beep"]
PHONE = ["telephone", "ringtone"]
LIMIT, PHONE_TARGET = 0.30, 0.25


def label_kind(lab):
    words = lab.split("_")
    has = lambda stems: any(w.startswith(s) for w in words for s in stems)  # noqa: E731
    if has(PHONE):
        return "phone"
    if lab not in NOT_VOICE and has(VOICE):
        return "voice"
    if has(ALARM):
        return "alarm"
    if lab == "foghorn":
        return "foghorn"
    return "other_watch"


def timeline(y, sound_tags, tmp_dir):
    """The classifier's 3 s windows over a file as it is (no pad): [{"t": start s, "labels": {label: confidence}}],
    each window's top 3 plus every watched label at 0.1 or more."""
    fd, path = tempfile.mkstemp(suffix=".wav", dir=tmp_dir)
    os.close(fd)
    try:
        sf.write(path, y, SR, subtype="PCM_24")
        out = json.loads(subprocess.run([sound_tags, path], capture_output=True, text=True, check=True).stdout)
    finally:
        os.remove(path)
    rows = []
    for t in out["timeline"]:
        labs = {e["label"]: float(e["p"]) for e in t["top"]}
        for lab, hits in out.get("watch_windows", {}).items():
            for ws, c in hits:
                if abs(ws - t["t"]) < 0.05:
                    labs[lab] = max(labs.get(lab, 0.0), float(c))
        rows.append({"t": t["t"], "labels": labs})
    return rows


def classify(y, sound_tags, tmp_dir, lead_s=0.5, shift=True):
    """Apple SoundAnalysis (3 s windows) through the sound_tags helper. The sound starts lead_s into a silent pad that
    is a whole number of windows long; with shift, a second pass delays it by 1.5 s so a sound that straddles a window
    boundary is heard whole. Returns the strongest readings and a verdict against the film's gates."""
    passes = [lead_s] + ([lead_s + 1.5] if shift else [])
    best, top3, windows, tags = {}, {}, 0, None
    for lead in passes:
        n = int(lead * SR) + y.shape[0]
        total = int(math.ceil(n / (3 * SR)) * 3 * SR)
        pad = np.zeros((total, y.shape[1]), dtype=np.float32)
        pad[int(lead * SR): int(lead * SR) + y.shape[0]] = y
        fd, path = tempfile.mkstemp(suffix=".wav", dir=tmp_dir)
        os.close(fd)
        try:
            sf.write(path, pad, SR, subtype="PCM_24")
            out = json.loads(subprocess.run([sound_tags, path], capture_output=True, text=True, check=True).stdout)
        finally:
            os.remove(path)
        windows += out["windows"]
        for w in out.get("watch", []):
            best[w["label"]] = max(best.get(w["label"], 0.0), float(w["max"]))
        for t in out.get("timeline", []):
            for e in t["top"]:
                if e["label"] != "silence":
                    top3[e["label"]] = max(top3.get(e["label"], 0.0), float(e["p"]))
        if tags is None:  # the unshifted pass names the file's main labels
            tags = [t for t in out.get("tags", []) if t["label"] != "silence"]
    # labels the helper does not watch (e.g. 'sigh') still count when they reach a window's top 3
    for lab, v in top3.items():
        if lab not in best and label_kind(lab) in ("voice", "alarm", "phone", "foghorn"):
            best[lab] = v
    flags = []
    for lab, v in sorted(best.items(), key=lambda kv: -kv[1]):
        k = label_kind(lab)
        if k in ("voice", "alarm") and (v >= LIMIT or lab in top3):
            flags.append({"label": lab, "kind": k, "max": round(v, 3), "level": "fail"})
        elif k in ("phone", "foghorn") and v >= LIMIT:
            flags.append({"label": lab, "kind": k, "max": round(v, 3), "level": "fail"})
        elif k in ("phone", "foghorn") and v >= PHONE_TARGET:
            flags.append({"label": lab, "kind": k, "max": round(v, 3), "level": "warn"})
        elif k == "other_watch" and v >= LIMIT:
            flags.append({"label": lab, "kind": k, "max": round(v, 3), "level": "note"})
    verdict = "fail" if any(f["level"] == "fail" for f in flags) else "warn" if any(
        f["level"] == "warn" for f in flags) else "ok"
    watch = {k: round(v, 3) for k, v in sorted(best.items(), key=lambda kv: -kv[1]) if v >= 0.05}
    return {"windows": windows, "top": [t["label"] for t in tags[:5]], "watch_max": watch, "flags": flags,
            "verdict": verdict}
