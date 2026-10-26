"""score2 lane: assemble a multi-cue plan in memory and measure it (no audio is written, ever).

A plan (JSON) lists cues: a track from .work/music-audition, its source in and out points, where it starts in the film,
its head and tail (a pre-roll crossfade that ENDS on the incoming downbeat, a fade, or the track's own ring-out) and a
gain envelope in film time. This script decodes each track once (soundfile, the file's own rate, as measure_track.py
does, so times agree with the music map), lays the cues into a film-length bed in memory, and measures:

  - BS.1770 momentary (400 ms) and short-term (3 s) loudness every 100 ms, gated integrated loudness, EBU LRA and the
    sample peak of the bed (music only, before any master);
  - per block: integrated loudness and the short-term range;
  - per seam: the 3 s and 400 ms loudness steps across it, against the incoming source's own step at its in-point; the
    log-spectral distance across it (46 ms windows that skip the crossfade) against the source's own change there; an
    8-16 kHz click detector; the incoming attack against the source's; and where the incoming downbeat lands;
  - log-mel spectrograms (22.05 kHz mono analysis copy) of the bed and of each seam's two sources, for the strips.

Mixkit licence (OVERRIDES §51): the assembled bed exists only in memory while this runs. Nothing here writes a WAV,
an MP3 or any music-only file; the outputs are curves (NPZ) and numbers (JSON). Previews of the score are VIDEO.

  python -I tools/audio/score2/cue_plan.py PLAN.json OUT_PREFIX      (audio venv, through scripts/heavy.sh)
  -> OUT_PREFIX.npz (curves) and OUT_PREFIX.metrics.json
"""
import json
import os
import resource
import sys
import time

import numpy as np
import pyloudnorm as pyln
import scipy.ndimage as ndi
import scipy.signal as ss
import soundfile as sf
import soxr

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
AUD = os.environ.get("SCORE2_AUDITION", os.path.join(REPO, ".work", "music-audition"))
MAPS = os.environ.get("SCORE2_MAPS", os.path.join(REPO, ".work", "score2", "maps"))
LH = 0.1          # loudness hop, s
ASR = 22050       # analysis rate for spectrograms
NFFT, HOP = 2048, 256
NMEL = 128
WIN = 6.0         # seconds of context either side of a seam in the strips
BED_SR = 48000    # the film's rate; 44.1 kHz tracks are resampled (soxr HQ) on decode


def r(v, d=2):
    return None if v is None or not np.isfinite(v) else round(float(v), d)


def lufs_of(ms):
    return -0.691 + 10 * np.log10(np.maximum(ms, 1e-20))


def kweighted_ms(y, sr):
    """Mean-square of the K-weighted signal, summed over channels, in 100 ms sub-blocks starting at 0."""
    meter = pyln.Meter(sr)
    hop = int(round(sr * LH)); n = (len(y) // hop)
    acc = np.zeros(n)
    for c in range(y.shape[1]):
        x = y[:, c].astype(np.float64)
        for f in meter._filters.values():
            x = f.apply_filter(x)
        acc += (x[: n * hop] ** 2).reshape(n, hop).mean(1)
    return acc


def curves(ms_sub):
    mom = lufs_of(ndi.uniform_filter1d(ms_sub, 4, mode="nearest"))
    st = lufs_of(ndi.uniform_filter1d(ms_sub, 30, mode="nearest"))
    return mom, st


def integrated(ms_sub, a, b):
    blk = np.convolve(ms_sub, np.ones(4) / 4, mode="valid")
    j0 = max(0, int(np.ceil(a / LH - 1e-9))); j1 = int(np.floor(b / LH + 1e-9)) - 4 + 1
    if j1 <= j0:
        return None
    z = blk[j0:j1]; lj = lufs_of(z); g1 = lj >= -70
    if not g1.any():
        return -70.0
    gr = lufs_of(z[g1].mean()) - 10; g2 = g1 & (lj > gr)
    return float(lufs_of(z[g2].mean() if g2.any() else z[g1].mean()))


def lra(ms_sub, a, b):
    stb = np.convolve(ms_sub, np.ones(30) / 30, mode="valid")
    j0 = max(0, int(np.ceil(a / LH))); j1 = int(np.floor(b / LH)) - 30 + 1
    if j1 - j0 < 10:
        return None
    z = stb[j0:j1]; lj = lufs_of(z); g = lj >= -70
    if g.sum() < 10:
        return None
    rel = lufs_of(z[g].mean()) - 20; v = lj[g & (lj >= rel)]
    return float(np.percentile(v, 95) - np.percentile(v, 10))


def mel_db(y, sr, mel_fb):
    """Log-mel spectrogram (power, dB re 1.0) of a mono or stereo signal, analysed at ASR."""
    m = y.mean(1) if y.ndim == 2 else y
    a = soxr.resample(m.astype(np.float32), sr, ASR, quality="HQ") if sr != ASR else m.astype(np.float32)
    f, t, Z = ss.stft(a, fs=ASR, window="hann", nperseg=NFFT, noverlap=NFFT - HOP, boundary=None, padded=False)
    P = (np.abs(Z) ** 2).astype(np.float32)
    M = mel_fb @ P
    return (10 * np.log10(np.maximum(M, 1e-12))).astype(np.float32), (t).astype(np.float32)


def mel_filterbank():
    import librosa  # filters only (no numba-heavy paths)
    return librosa.filters.mel(sr=ASR, n_fft=NFFT, n_mels=NMEL, fmax=ASR / 2).astype(np.float32)


def env_db(points, t):
    """Piecewise-linear gain in dB over film time t (constant outside the points)."""
    if len(points) == 1:
        return np.full_like(t, points[0][1], dtype=np.float64)
    xs = np.array([p[0] for p in points], float); ys = np.array([p[1] for p in points], float)
    return np.interp(t, xs, ys)


def cue_extent(c):
    """Film-time start and end of a cue's audio, and the film time of its source out-point."""
    fin, sin, sout = c["film_in"], c["src_in"], c["src_out"]
    h, tl = c["head"], c["tail"]
    if h["mode"] == "preroll":
        f0 = fin - h["len"]
    elif h["mode"] == "fade":
        f0 = h["start"]
    else:  # cut
        f0 = fin
    fout = fin + (sout - sin)
    if tl["mode"] == "preroll_out":
        f1 = fout
    elif tl["mode"] == "ring":
        f1 = fin + (tl["until"] - sin)
    elif tl["mode"] == "fade":
        f1 = tl["end"]
    else:
        f1 = fout
    return f0, f1, fout


def envelope(c, tf):
    """Amplitude envelope of a cue over film times tf (head and tail shapes, then the gain)."""
    f0, f1, fout = cue_extent(c)
    g = np.ones_like(tf)
    h, tl = c["head"], c["tail"]
    if h["mode"] == "preroll":  # equal-power fade-in that reaches 1 exactly on the incoming downbeat
        x = np.clip((tf - f0) / h["len"], 0, 1); g *= np.sin(0.5 * np.pi * x)
    elif h["mode"] == "fade":
        x = np.clip((tf - h["start"]) / h["len"], 0, 1); g *= np.sin(0.5 * np.pi * x)
    else:
        x = np.clip((tf - f0) / 0.002, 0, 1); g *= x
    if tl["mode"] == "preroll_out":  # equal-power fade-out over the incoming cue's pre-roll, ending on the downbeat
        x = np.clip((f1 - tf) / tl["len"], 0, 1); g *= np.sin(0.5 * np.pi * x)
    elif tl["mode"] in ("ring", "fade"):
        L = tl.get("fade", tl.get("len", 0.01))
        x = np.clip((f1 - tf) / L, 0, 1); g *= np.sin(0.5 * np.pi * x)
    g *= 10 ** (env_db(c["gain_db"], tf) / 20)
    g[(tf < f0) | (tf >= f1)] = 0
    return g


def lsd(a, b):
    """Log-spectral distance (dB RMS, 50 Hz-16 kHz) between two equal-length mono windows."""
    w = np.hanning(len(a))
    A = np.abs(np.fft.rfft(a * w)) ** 2 + 1e-12; B = np.abs(np.fft.rfft(b * w)) ** 2 + 1e-12
    f = np.fft.rfftfreq(len(a), 1 / SR)
    m = (f >= 50) & (f <= 16000)
    return float(np.sqrt(np.mean((10 * np.log10(A[m]) - 10 * np.log10(B[m])) ** 2)))


def hf_db(mono, sr, t0, t1):
    """8-16 kHz energy in 5 ms frames between t0 and t1 (dB)."""
    sos = ss.butter(6, [8000, min(16000, sr / 2 * 0.98)], btype="band", fs=sr, output="sos")
    a = max(0, int((t0 - 0.05) * sr)); b = min(len(mono), int((t1 + 0.05) * sr))
    x = ss.sosfiltfilt(sos, mono[a:b].astype(np.float64))
    fr = int(0.005 * sr); n = len(x) // fr
    e = 10 * np.log10(np.maximum((x[: n * fr] ** 2).reshape(n, fr).mean(1), 1e-20))
    tt = (a + (np.arange(n) + 0.5) * fr) / sr
    return tt, e


def mean_lufs_mono(y, sr, t0, t1):
    a = max(0, int(t0 * sr)); b = min(len(y), int(t1 * sr))
    if b - a < int(0.05 * sr):
        return None
    ms = kweighted_ms(y[a:b], sr)
    return float(lufs_of(ms.mean())) if len(ms) else None


def main():
    plan_path, out = sys.argv[1], sys.argv[2]
    T0 = time.perf_counter()
    plan = json.load(open(plan_path))
    cues = {c["id"]: c for c in plan["cues"]}
    global SR
    SR = None
    end = plan["end_film_s"]
    mel_fb = mel_filterbank()
    bed = None
    src_snips = {}   # (seam id, side) -> (array, sr, t0_in_source)
    seam_src = {}
    for s in plan["seams"]:
        seam_src[(s["id"], "out")] = cues[s["from"]]
        seam_src[(s["id"], "in")] = cues[s["to"]]
    tracks = sorted(set(c["track"] for c in plan["cues"]))
    track_info = {}
    for tr in tracks:
        path = os.path.join(AUD, tr + ".mp3")
        y, sr = sf.read(path, dtype="float32", always_2d=True)
        if SR is None:
            SR = BED_SR
            bed = np.zeros((int(np.ceil(end * SR)) + 1, 2), dtype=np.float32)
        track_info[tr] = {"file": os.path.basename(path), "sr": sr, "duration_s": round(len(y) / sr, 3),
                          "resampled_to": SR if sr != SR else None}
        if sr != SR:  # one rate for the bed (the film's 48 kHz); times in seconds are unchanged
            y = soxr.resample(y, sr, SR, quality="HQ").astype(np.float32)
        for c in plan["cues"]:
            if c["track"] != tr:
                continue
            f0, f1, fout = cue_extent(c)
            i0 = max(0, int(round(f0 * SR))); i1 = min(len(bed), int(round(f1 * SR)))
            tf = np.arange(i0, i1) / SR
            src_t = c["src_in"] + (tf - c["film_in"])
            si = np.round(src_t * SR).astype(np.int64)
            ok = (si >= 0) & (si < len(y))
            seg = np.zeros((len(tf), 2), dtype=np.float32)
            seg[ok] = y[si[ok], :2]
            g = envelope(c, tf).astype(np.float32)
            bed[i0:i1] += seg * g[:, None]
            c["_film_extent"] = [round(f0, 4), round(f1, 4), round(fout, 4)]
        for (sid, side), c in seam_src.items():
            if c["track"] != tr:
                continue
            seam = next(s for s in plan["seams"] if s["id"] == sid)
            # the source around the point it is cut at: the out-point for the outgoing cue, the in-point for the incoming
            p = (c["src_out"] if side == "out" else c["src_in"])
            a = max(0, int((p - WIN) * SR)); b = min(len(y), int((p + WIN) * SR))
            gdb = float(env_db(c["gain_db"], np.array([seam["t"] - 0.05 if side == "out" else seam.get("in_film", seam["t"]) + 0.05]))[0])
            src_snips[(sid, side)] = (y[a:b, :2].copy() * 10 ** (gdb / 20), a / SR, p, gdb)
        del y
    n = len(bed)
    film_t_end = n / SR
    # ---------------------------------------------------------------- loudness of the bed
    ms_sub = kweighted_ms(bed, SR)
    mom, st = curves(ms_sub)
    lt = np.arange(len(ms_sub)) * LH + LH / 2
    integ = integrated(ms_sub, 0, film_t_end)
    LRA = lra(ms_sub, 0, film_t_end)
    peak = float(np.max(np.abs(bed)))
    blocks = []
    for a, b, lab in plan["blocks"]:
        m = (lt >= a) & (lt < b)
        blocks.append({"label": lab, "film": [a, b], "integrated_lufs": r(integrated(ms_sub, a, b)),
                       "st_min": r(np.min(st[m])) if m.any() else None, "st_max": r(np.max(st[m])) if m.any() else None,
                       "st_median": r(np.median(st[m])) if m.any() else None})
    mono = bed.mean(1)
    # ---------------------------------------------------------------- seams
    seams = []
    win = 2048
    for s in plan["seams"]:
        ts = s["t"]; tin = s.get("in_film", ts)
        cin, cout = cues[s["to"]], cues[s["from"]]
        xf = cin["head"]["len"] if cin["head"]["mode"] in ("preroll", "fade") else 0.0
        xf = min(xf, 1.0)
        # loudness steps in the film
        st_before = mean_lufs_mono(bed, SR, ts - 3.0, ts - 0.05)
        st_after = mean_lufs_mono(bed, SR, tin + 0.05, tin + 3.0)
        mo_before = mean_lufs_mono(bed, SR, ts - 0.45, ts - 0.05)
        mo_after = mean_lufs_mono(bed, SR, tin + 0.05, tin + 0.45)
        # the incoming source's own step at its in-point (gain applied), and the outgoing source's own continuation
        yin, a_in, p_in, g_in = src_snips[(s["id"], "in")]
        yout, a_out, p_out, g_out = src_snips[(s["id"], "out")]
        rel_in = p_in - a_in; rel_out = p_out - a_out
        src_in_before = mean_lufs_mono(yin, SR, rel_in - 3.0, rel_in - 0.05)
        src_in_after = mean_lufs_mono(yin, SR, rel_in + 0.05, rel_in + 3.0)
        src_out_before = mean_lufs_mono(yout, SR, rel_out - 3.0, rel_out - 0.05)
        src_out_after = mean_lufs_mono(yout, SR, rel_out + 0.05, rel_out + 3.0)
        # spectral distance across the seam (skipping the crossfade), against the incoming source's own change
        i_t = int(round(tin * SR)); i_x = int(round((tin - xf) * SR))
        lsd_film = lsd(mono[i_x - win:i_x], mono[i_t:i_t + win]) if i_x - win >= 0 else None
        ymi = yin.mean(1); ii = int(round(rel_in * SR)); ix = int(round((rel_in - xf) * SR))
        lsd_src_in = lsd(ymi[ix - win:ix], ymi[ii:ii + win]) if ix - win >= 0 and ii + win <= len(ymi) else None
        ymo = yout.mean(1); io = int(round(rel_out * SR)); ixo = int(round((rel_out - xf) * SR))
        lsd_src_out = lsd(ymo[ixo - win:ixo], ymo[io:io + win]) if ixo - win >= 0 and io + win <= len(ymo) else None
        # click detector, 8-16 kHz, at the seam (and at the in-point for a delayed entry)
        tt, e = hf_db(mono, SR, tin - 0.5, tin + 0.5)
        near = np.abs(tt - tin) <= 0.010
        hf_peak = float(e[near].max() - np.median(e)) if near.any() else None
        tt2, e2 = hf_db(ymi, SR, rel_in - 0.5, rel_in + 0.5)
        near2 = np.abs(tt2 - rel_in) <= 0.010
        hf_src = float(e2[near2].max() - np.median(e2)) if near2.any() else None
        # attack: energy in the first 30 ms after the incoming downbeat, film against source (gain applied in both)
        att_film = float(10 * np.log10(np.mean(mono[i_t:i_t + int(0.03 * SR)] ** 2) + 1e-20))
        att_src = float(10 * np.log10(np.mean(ymi[ii:ii + int(0.03 * SR)] ** 2) + 1e-20))
        seams.append({
            "id": s["id"], "t_film": ts, "in_film": tin, "label": s["label"], "from": s["from"], "to": s["to"],
            "xfade_s": xf,
            "film_lufs_3s_before": r(st_before), "film_lufs_3s_after": r(st_after),
            "film_step_3s_lu": r(st_after - st_before) if st_before is not None and st_after is not None else None,
            "film_step_400ms_lu": r(mo_after - mo_before) if mo_before is not None and mo_after is not None else None,
            "incoming_source_own_step_3s_lu": r(src_in_after - src_in_before) if src_in_before is not None and src_in_after is not None else None,
            "outgoing_source_own_step_3s_lu": r(src_out_after - src_out_before) if src_out_before is not None and src_out_after is not None else None,
            "lsd_film_db": r(lsd_film), "lsd_incoming_source_db": r(lsd_src_in), "lsd_outgoing_continuation_db": r(lsd_src_out),
            "extra_lsd_db": r(lsd_film - lsd_src_in) if lsd_film is not None and lsd_src_in is not None else None,
            "hf_click_film_db": r(hf_peak), "hf_click_source_db": r(hf_src),
            "extra_hf_db": r(hf_peak - hf_src) if hf_peak is not None and hf_src is not None else None,
            "attack_film_vs_source_db": r(att_film - att_src),
            "gain_db_out": r(g_out), "gain_db_in": r(g_in),
        })
    # ---------------------------------------------------------------- spectrograms
    mel, mt = mel_db(bed, SR, mel_fb)
    npz = {"lt": lt.astype(np.float32), "mom": mom.astype(np.float32), "st": st.astype(np.float32),
           "mel": mel, "mel_t": mt}
    for (sid, side), (ys, a0, p, gdb) in src_snips.items():
        m2, t2 = mel_db(ys, SR, mel_fb)
        ms2 = kweighted_ms(ys, SR)
        mo2, st2 = curves(ms2)
        npz[f"{sid}_{side}_mel"] = m2; npz[f"{sid}_{side}_mel_t"] = (t2 + a0).astype(np.float32)
        npz[f"{sid}_{side}_lt"] = (np.arange(len(ms2)) * LH + LH / 2 + a0).astype(np.float32)
        npz[f"{sid}_{side}_mom"] = mo2.astype(np.float32); npz[f"{sid}_{side}_st"] = st2.astype(np.float32)
    np.savez_compressed(out + ".npz", **npz)
    for c in plan["cues"]:
        c.pop("_tmp", None)
    res = {
        "plan": os.path.basename(plan_path), "film": plan["film"], "sr": SR, "film_length_s": round(film_t_end, 3),
        "tracks": track_info,
        "cue_extents_film_s": {c["id"]: c.get("_film_extent") for c in plan["cues"]},
        "bed": {"integrated_lufs": r(integ), "lra_lu": r(LRA), "sample_peak_dbfs": r(20 * np.log10(peak + 1e-12)),
                "st_max": r(np.max(st)), "st_min_above_-70": r(np.min(st[st > -70])) if (st > -70).any() else None},
        "blocks": blocks, "seams": seams,
        "audio_written": "none (the bed was assembled in memory only)",
        "secs": round(time.perf_counter() - T0, 1),
        "peak_rss_mb": round(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1048576, 1),
    }
    json.dump(res, open(out + ".metrics.json", "w"), indent=1)
    print(json.dumps({"bed": res["bed"], "secs": res["secs"], "rss_mb": res["peak_rss_mb"]}))


if __name__ == "__main__":
    main()
