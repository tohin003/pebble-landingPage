"""score2 lane: build the score's masters from a cue plan and a layer sheet, and check every cue change.

The cue plan (cuesheet/plan_main.json or plan_x40.json, the single source of the timings: CUE_SHEET §0) lays each cue's
excerpt at its film time with no time-stretch. A cue's source sample j lands on film sample j + k, where k is one
integer per cue, so every bar line in the plan lands on its own film sample. Heads and tails are the plan's own:
an equal-power pre-roll crossfade that ends on the incoming downbeat, a fade, or the track's own ring-out
(cue_plan.py's envelope, reused unchanged).

The layer sheet (LAYERS.json: this lane's reading of CUE_SHEET §1, §3 and §4) adds what the cue sheet asks for on top:
  - source-time corrections: the music map's beat times lag the audible attacks of the beat-driven tracks by a measured,
    constant amount (beat_offsets.py). Each such cue's source in- and out-points move earlier by it, and its film times
    stay, so the attacks land on the cue sheet's film times and every crossfade ends on a real downbeat;
  - per-cue EQ, run zero-phase (each shelf at half its gain, forwards and backwards), so nothing moves in time; an
    optional ramp blends a cue from its EQ'd to its plain self over film time (a matching shelf at one seam only);
  - the ducks under the composite hits (the music only);
  - the sound-design layers. Each is a take from .work/sfx2/KIT.json, a designed take rebuilt with the kit's own
    recipe, or a reverse swell made from the cue's own track with the kit's preverb. Each is tuned as the sheet says,
    placed on its sync point (the take's peak, start or end) and set by a level rule: an absolute loudest-400 ms
    level, a loop's absolute level, a level relative to the music under it, or a peak relative to the music's peak.
    A group can carry a limiter budget: its gain is lowered until it adds no more than that much gain reduction to
    the social master's limiter (measured with the same limiter on the stretch around it).
Then the masters: one gain and pedalboard's true-peak BrickwallLimiter, iterated until the integrated loudness lands
on the target (web -16 LUFS with a -2.0 dBTP ceiling, social -14 LUFS with -1.5 dBTP). Each is measured again after an
AAC encode with FFmpeg's ebur128; no AAC file is written, because the encoder pipes ADTS straight into the meter.

Checks, written to OUT_DIR/NAME.build.json:
  - the bed against the cue sheet lane's in-memory measurements (without the corrections and the EQ, like for like);
  - per cue change: the loudness step (3 s and 400 ms) and the spectral continuity (log-spectral distance and six
    bands), each against the incoming source's own change at its in-point;
  - the grid: cross-correlation lags in whole samples (bed against source, master against bed), the beat interval
    across the seam, and onsets in the master against the corrected beats;
  - clicks: an 8-16 kHz burst detector and a second-difference detector at every seam, every cue edge (on the music
    alone) and the first and last samples of every layer;
  - the limiter's gain reduction, the mono fold-down, the small-speaker share and Apple's sound classifier (two passes,
    the second shifted by 1.5 s).

Mixkit licence (OVERRIDES §51): the masters contain Mixkit music, so they stay inside .work/score2 as working files for
muxing and are never delivered on their own; the score preview is a VIDEO. The classifier's temporary WAVs are deleted
as soon as they have been read.

  scripts/heavy.sh score2-master /usr/sbin/taskpolicy -c utility env NUMBA_CACHE_DIR=$PWD/.work/score2/numba-cache \
      .work/tools-eval/tools-tests/audio-venv/bin/python -I tools/audio/score2/score_build.py \
      .work/score2/cuesheet/plan_main.json .work/score2/master/layers_main.json .work/score2/master main
"""
import copy
import hashlib
import json
import math
import os
import re
import resource
import subprocess
import sys
import time

import numpy as np
import pyloudnorm as pyln
import scipy.signal as ss
import soundfile as sf
import soxr

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
sys.path.insert(0, HERE)
sys.path.insert(1, os.path.join(REPO, "tools", "audio", "sfx2"))
import cue_plan as cp  # noqa: E402  the plan's semantics (cue_extent, envelope) and the lane's loudness helpers
import audiolib as al  # noqa: E402  the kit's preverb and the classifier's label kinds
from build_kit import sub_glide  # noqa: E402  the kit's designed sub glide
from score_common import apply_corrections  # noqa: E402

SR = 48000
cp.SR = SR
WORK = os.path.join(REPO, ".work")
AUD = os.path.join(WORK, "music-audition")
MAPS = os.path.join(WORK, "score2", "maps")
KITDIR = os.path.join(WORK, "sfx2")
SOUND_TAGS = os.path.join(WORK, "audio", "sound_tags")
FFMPEG = os.environ.get("FFMPEG", "/opt/homebrew/bin/ffmpeg")
NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
BANDS = [(20, 60, "sub"), (60, 250, "low"), (250, 1000, "low-mid"), (1000, 4000, "mid"), (4000, 8000, "presence"),
         (8000, 16000, "air")]
EQ_FREQS = [20.0, 30.0, 45.0, 60.0, 90.0, 120.0, 250.0, 1000.0, 2000.0, 4000.0, 6000.0, 8000.0, 12000.0, 16000.0]


def r(v, d=2):
    return None if v is None or not np.isfinite(v) else round(float(v), d)


def rel(path):
    return os.path.relpath(path, REPO)


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def stereo(y):
    y = np.asarray(y, dtype=np.float32)
    if y.ndim == 1:
        y = y[:, None]
    return np.repeat(y, 2, axis=1) if y.shape[1] == 1 else y[:, :2]


def kw_power(y):
    """K-weighted power, summed over the channels, per sample (BS.1770-4)."""
    meter = pyln.Meter(SR)
    acc = np.zeros(len(y))
    for c in range(y.shape[1]):
        x = y[:, c].astype(np.float64)
        for f in meter._filters.values():
            x = f.apply_filter(x)
        acc += x ** 2
    return acc


def lufs_seg(y, a, b):
    """K-weighted loudness of film seconds [a, b) of y (all channels)."""
    return cp.mean_lufs_mono(y, SR, a, b)


def mmax_lufs(y):
    """The loudest 400 ms (momentary LUFS, 10 ms hop) of a take as it plays in the stereo mix; a take under 0.4 s is
    padded with silence to one 400 ms block, as the kit measured it."""
    st = stereo(y)
    w = int(0.4 * SR)
    if len(st) < w:
        st = np.vstack([st, np.zeros((w - len(st), 2), dtype=np.float32)])
    p = kw_power(st)
    cs = np.concatenate([[0.0], np.cumsum(p)])
    starts = np.arange(0, len(p) - w + 1, int(0.01 * SR))
    return float(cp.lufs_of(((cs[starts + w] - cs[starts]) / w).max()))


def integrated_lufs(y):
    return float(pyln.Meter(SR).integrated_loudness(stereo(y).astype(np.float64)))


def peak_db(y):
    return 20 * math.log10(max(float(np.abs(y).max()), 1e-12))


def true_peak_db(y, chunk_s=5.0):
    """True peak (4x oversampled, polyphase Kaiser FIR as the kit measures it), in chunks to keep memory small."""
    n, step, pad = len(y), int(chunk_s * SR), 64
    tp = float(np.abs(y).max())
    for a in range(0, n, step):
        s0, s1 = max(0, a - pad), min(n, a + step + pad)
        up = ss.resample_poly(y[s0:s1].astype(np.float64), 4, 1, axis=0, window=("kaiser", 9.0))
        lo = (a - s0) * 4
        hi = lo + (min(n, a + step) - a) * 4
        tp = max(tp, float(np.abs(up[lo:hi]).max()))
    return 20 * math.log10(max(tp, 1e-12))


def note_hz(name, octave=4):
    return 440.0 * 2 ** ((NOTES.index(name) + 12 * (octave + 1) - 69) / 12)


def nearest_shift(from_hz, note):
    """Semitones from from_hz to the nearest octave of note (never more than 6), as tune.py does."""
    s = 12 * math.log2(note_hz(note) / from_hz)
    return s - 12 * round(s / 12)


# ------------------------------------------------------------------------------------------------ EQ (zero phase)
def shelf_sos(kind, f0, gain_db, q):
    """RBJ cookbook shelf as one second-order section."""
    A = 10 ** (gain_db / 40.0)
    w0 = 2 * math.pi * f0 / SR
    cw, sw = math.cos(w0), math.sin(w0)
    k = 2 * math.sqrt(A) * sw / (2 * q)
    if kind == "lowshelf":
        b = [A * ((A + 1) - (A - 1) * cw + k), 2 * A * ((A - 1) - (A + 1) * cw), A * ((A + 1) - (A - 1) * cw - k)]
        a = [(A + 1) + (A - 1) * cw + k, -2 * ((A - 1) + (A + 1) * cw), (A + 1) + (A - 1) * cw - k]
    elif kind == "highshelf":
        b = [A * ((A + 1) + (A - 1) * cw + k), -2 * A * ((A - 1) + (A + 1) * cw), A * ((A + 1) + (A - 1) * cw - k)]
        a = [(A + 1) - (A - 1) * cw + k, 2 * ((A - 1) - (A + 1) * cw), (A + 1) - (A - 1) * cw - k]
    else:
        raise ValueError(kind)
    return np.array([[b[0] / a[0], b[1] / a[0], b[2] / a[0], 1.0, a[1] / a[0], a[2] / a[0]]])


def eq_zero_phase(y, specs):
    """Each shelf at half its gain, forwards and backwards (sosfiltfilt): the stated gain, and no shift in time."""
    out = []
    for s in specs:
        sos = shelf_sos(s["type"], s["hz"], s["gain_db"] / 2.0, s.get("q", 0.7071))
        y = ss.sosfiltfilt(sos, y, axis=0).astype(np.float32)
        w, h = ss.sosfreqz(sos, worN=EQ_FREQS, fs=SR)
        out.append({**s, "applied": "zero-phase (sosfiltfilt, each pass at half the gain)",
                    "response_db": {f"{f:g} Hz": r(2 * 20 * np.log10(abs(hh)), 2) for f, hh in zip(w, h)}})
    return y, out


def ramp_weight(t, ramp):
    """1 until full_until_film_s, a raised-cosine fall to 0 at zero_at_film_s, then 0."""
    a, b = ramp["full_until_film_s"], ramp["zero_at_film_s"]
    x = np.clip((t - a) / (b - a), 0.0, 1.0)
    return (0.5 + 0.5 * np.cos(np.pi * x)).astype(np.float32)


# ------------------------------------------------------------------------------------------------ the music bed
def decode(track):
    path = os.path.join(AUD, track + ".mp3")
    y, sr = sf.read(path, dtype="float32", always_2d=True)
    y = stereo(y)
    info = {"file": rel(path), "sha256": sha256(path), "sr": sr, "channels": 2, "frames": len(y),
            "duration_s": round(len(y) / sr, 4), "decoder": f"soundfile {sf.__version__} (libsndfile)"}
    if sr != SR:
        y48 = soxr.resample(y, sr, SR, quality="HQ").astype(np.float32)
        info["resampled"] = f"soxr {soxr.__version__} HQ, {sr} -> {SR} Hz (as cue_plan.py and the maps' times)"
        # the resampler must not move anything: compare with scipy's polyphase resampler around the track's loudest
        # second (both are linear phase with their delay removed): the lag must be 0 samples
        K = sr // 10
        cs = np.concatenate([[0.0], np.cumsum(np.abs(y[:, 0]).astype(np.float64))])
        c = int(np.argmax(cs[K:] - cs[:-K])) + K // 2
        g = math.gcd(SR, sr)
        a0 = max(0, c - sr) // (sr // g) * (sr // g)  # a start whose 48 kHz position is a whole sample
        seg = y[a0:a0 + 2 * sr, 0].astype(np.float64)
        pp = ss.resample_poly(seg, SR // g, sr // g, window=("kaiser", 9.0))
        b0 = a0 * (SR // g) // (sr // g)
        so = y48[b0:b0 + len(pp), 0].astype(np.float64)
        m = min(len(pp), len(so)) - 2000
        lags = range(-48, 49)
        cc = [float(np.dot(pp[1000:1000 + m - 100], so[1000 + L:1000 + L + m - 100])) for L in lags]
        info["resampler_lag_vs_polyphase_samples"] = int(list(lags)[int(np.argmax(cc))])
    else:
        y48 = y
    return y48, info


def lay(bed, c, y48, alt=None, ramp=None):
    """Add one cue to the bed: integer sample offset (no stretch), the plan's envelope, film-time gain; with alt and
    ramp, the cue blends from alt (its EQ'd self) to y48 over film time."""
    f0, f1, fout = cp.cue_extent(c)
    i0, i1 = max(0, int(round(f0 * SR))), min(len(bed), int(round(f1 * SR)))
    k = int(round((c["film_in"] - c["src_in"]) * SR))  # film sample = source sample + k
    idx = np.arange(i0, i1)
    si = idx - k
    ok = (si >= 0) & (si < len(y48))
    seg = np.zeros((len(idx), 2), dtype=np.float32)
    seg[ok] = y48[si[ok]]
    if alt is not None:
        segb = np.zeros_like(seg)
        segb[ok] = alt[si[ok]]
        w = ramp_weight(idx / SR, ramp)[:, None]
        seg = seg * (1 - w) + segb * w
    g = cp.envelope(c, idx / SR).astype(np.float32)
    bed[i0:i1] += seg * g[:, None]
    return {"film_samples": [i0, i1], "film_s": [r(i0 / SR, 4), r(i1 / SR, 4)], "offset_samples_film_minus_src": k,
            "src_in_s": c["src_in"], "src_out_s": c["src_out"], "src_in_cue_sheet_s": c["src_in_cue_sheet"],
            "src_out_cue_sheet_s": c["src_out_cue_sheet"], "src_correction_s": c["src_correction_s"],
            "src_in_sample_48k": int(round(c["src_in"] * SR)), "film_in_sample": int(round(c["src_in"] * SR)) + k,
            "film_out_of_src_out_s": r(fout, 4), "silent_samples_outside_source": int((~ok).sum())}


# ------------------------------------------------------------------------------------------------ sound design
def load_kit():
    kit = {t["id"]: t for t in json.load(open(os.path.join(KITDIR, "KIT.json")))["files"]}
    plan = {t["id"]: t for t in json.load(open(os.path.join(KITDIR, "kit_plan.json")))["files"]}
    return kit, plan


def make_take(L, kit, kplan, tracks48):
    """A layer's audio, stereo at 48 kHz, and the record of how it was made."""
    rec = {}
    if "take" in L:
        k = kit[L["take"]]
        path = os.path.join(KITDIR, k["file"])
        y, sr = sf.read(path, dtype="float32", always_2d=True)
        assert sr == SR, (path, sr)
        rec.update(take=L["take"], file=rel(path), sha256=sha256(path), licence=k["licence"], status=k["status"],
                   final_allowed=k["final_allowed"], kit_pitch_hz=k["measure"].get("pitch_hz"),
                   kit_note=f"{k['measure'].get('note')}{k['measure'].get('cents', 0):+d} c" if k["measure"].get("note") else None,
                   source=k["source"].get("source_page") or k["source"].get("provider"))
        pitch_hz = k["measure"].get("pitch_hz")
    elif "designed" in L:
        d = L["designed"]
        base = kplan[d["base"]]["source"]["params"]
        params = {**base, **d.get("params", {})}
        y = sub_glide(params)
        y = y / np.abs(y).max() * 10 ** (-1.0 / 20)
        rec.update(designed=f"{d['base']} recipe (build_kit.sub_glide), retuned", params=params, licence="designed",
                   status="primary", final_allowed=True)
        pitch_hz = None
    elif "swell" in L:
        s = L["swell"]
        length = s["beats"] * 60.0 / s["bpm"]
        y = al.preverb(tracks48[s["track"]], s["at_src"], length, room=s.get("room", 0.92))
        rec.update(swell=f"preverb of {s['track']} at {s['at_src']} s ({s['beats']} beats at {s['bpm']} BPM = "
                         f"{length:.5f} s), reversed", licence="from the cue's own track (CC BY 4.0, edited)",
                   status="primary", final_allowed=True)
        pitch_hz = None
    elif "tail_swell" in L:
        # a reverse swell from a kit take's own room tail (the 40-s cut's XJ2 mask), made exactly as
        # revise_measure.make_mask measured it: from the take's peak + from_peak_s, tuned by varispeed, cut to
        # length_s, reversed, a 30 ms fade-in at its quiet start and a 4 ms fade at its loud end
        s = L["tail_swell"]
        k = kit[s["take"]]
        path = os.path.join(KITDIR, k["file"])
        y, sr = sf.read(path, dtype="float32", always_2d=True)
        assert sr == SR, (path, sr)
        y = stereo(y)
        pk = int(np.argmax(np.abs(y).max(1)))
        a0 = pk + int(s.get("from_peak_s", 0.08) * SR)
        ratio = 2 ** (float(s["tune_semitones"]) / 12)
        tail = ss.resample_poly(y[a0:], 1000, int(round(1000 * ratio)), axis=0, window=("kaiser", 9.0)).astype(np.float32)
        n = int(round(s["length_s"] * SR))
        seg = tail[:n].copy()
        if len(seg) < n:
            seg = np.vstack([seg, np.zeros((n - len(seg), 2), dtype=np.float32)])
        y = seg[::-1].copy()
        fi, fo = int(0.03 * SR), int(0.004 * SR)
        y[:fi] *= (0.5 - 0.5 * np.cos(np.linspace(0, np.pi, fi)))[:, None]
        y[-fo:] *= (0.5 + 0.5 * np.cos(np.linspace(0, np.pi, fo)))[:, None]
        rec.update(take=s["take"], file=rel(path), sha256=sha256(path), licence=k["licence"], status=k["status"],
                   final_allowed=k["final_allowed"], source=k["source"].get("source_page") or k["source"].get("provider"),
                   tail_swell={"tail_from_s": r(a0 / SR, 4), "tuned_semitones": float(s["tune_semitones"]),
                               "length_s": r(n / SR, 4), "how": "the take's own room tail, varispeed (polyphase), "
                                                                "reversed (as revise_measure.make_mask)"})
        pitch_hz = None
    else:
        raise ValueError(L["id"])
    y = stereo(y)
    t = L.get("tune")
    if t:
        semis = t.get("semitones")
        if semis is None:
            semis = nearest_shift(pitch_hz, t["to_note"])
        if t.get("keep_length"):
            import pedalboard  # GPL-3.0: run here, never shipped
            z = pedalboard.time_stretch(np.ascontiguousarray(y.T), SR, stretch_factor=1.0,
                                        pitch_shift_in_semitones=float(semis), high_quality=True).T
            how = "pitch only (Rubber Band R3 through pedalboard.time_stretch, stretch 1.0)"
        else:
            ratio = 2 ** (semis / 12)
            z = ss.resample_poly(y, 1000, int(round(1000 * ratio)), axis=0, window=("kaiser", 9.0))
            how = "varispeed (polyphase resampling: pitch and length together)"
        e0, e1 = np.abs(y).max(1), np.abs(z).max(1)
        rec["tune"] = {"to_note": t.get("to_note"), "semitones": r(semis, 3), "how": how,
                       "len_s": [r(len(y) / SR, 4), r(len(z) / SR, 4)],
                       "peak_s": [r(int(np.argmax(e0)) / SR, 4), r(int(np.argmax(e1)) / SR, 4)]}
        y = np.asarray(z, dtype=np.float32)
    if L.get("trim_before_peak_s") is not None:  # drop a take's own build-up so the music's breath before it stays
        pk = int(np.argmax(np.abs(y).max(1)))
        keep = int(L["trim_before_peak_s"] * SR)
        if pk > keep:
            y = y[pk - keep:].copy()
            nf = max(1, min(keep, int(0.01 * SR)))
            y[:nf] *= (0.5 - 0.5 * np.cos(np.linspace(0, np.pi, nf)))[:, None]
            rec["trim_before_peak"] = {"kept_s": L["trim_before_peak_s"], "removed_s": r((pk - keep) / SR, 3),
                                       "fade_in_s": r(nf / SR, 3)}
    if L.get("highpass_hz"):  # the sub drop carries the sub-bass: the hit and the swell leave room for it and the music
        sos = ss.butter(2, L["highpass_hz"], btype="high", fs=SR, output="sos")
        y = ss.sosfilt(sos, y, axis=0).astype(np.float32)  # causal (no pre-ring before a transient)
        rec["highpass"] = {"hz": L["highpass_hz"], "how": "2nd-order Butterworth, causal (12 dB per octave)"}
    if L.get("prelimit_db"):  # a hit's own transient tamed on the take alone, so the composite needs less headroom
        x = L["prelimit_db"]
        before_pk, before_m = peak_db(y), mmax_lufs(y)
        z = limiter(y, before_pk - x, release_ms=50.0)
        rec["prelimit"] = {"db": x, "how": "pedalboard BrickwallLimiter on the take alone (true-peak sidechain, 5 ms "
                                           "lookahead, 50 ms release), ceiling its own peak minus this",
                           "peak_dbfs": [r(before_pk), r(peak_db(z))], "loudest_400ms_lufs": [r(before_m), r(mmax_lufs(z))]}
        y = z.astype(np.float32)
    if L.get("tail"):  # a hit shortened (CUE_SHEET §4.1 C7): whole to keep_s_after_peak after its peak, then a fade
        y, rec = tail_fade(y, rec, L["tail"])
    if "excerpt" in L:  # a bed: dur_s from from_s, with raised-cosine fades
        ex = L["excerpt"]
        a = int(ex.get("from_s", 0.0) * SR)
        n = int(round(ex["dur_s"] * SR))
        idx = (a + np.arange(n)) % len(y)  # the kit's room tones are seamless loops
        rec["loop_integrated_lufs"] = r(integrated_lufs(y))
        y = y[idx].copy()
        fi, fo = int(ex.get("fade_in_s", 0.0) * SR), int(ex.get("fade_out_s", 0.0) * SR)
        if fi:
            y[:fi] *= (0.5 - 0.5 * np.cos(np.linspace(0, np.pi, fi)))[:, None]
        if fo:
            y[-fo:] *= (0.5 + 0.5 * np.cos(np.linspace(0, np.pi, fo)))[:, None]
        rec["excerpt"] = ex
    pk = float(np.abs(y).max()) + 1e-12
    ms1 = int(0.001 * SR)
    rec["edge_db_re_peak"] = {"first_sample": r(20 * np.log10(np.abs(y[0]).max() / pk + 1e-12)),
                              "last_sample": r(20 * np.log10(np.abs(y[-1]).max() / pk + 1e-12)),
                              "first_ms_rms": r(20 * np.log10(np.sqrt((y[:ms1] ** 2).mean()) / pk + 1e-12)),
                              "last_ms_rms": r(20 * np.log10(np.sqrt((y[-ms1:] ** 2).mean()) / pk + 1e-12))}
    return y.astype(np.float32), rec


def tail_fade(y, rec, spec):
    """Shorten a hit as revise_measure.tail_fade did for the cue sheet's measurements: keep it whole to
    keep_s_after_peak after its peak, then a raised-cosine fade over fade_s, then nothing."""
    pk = int(np.argmax(np.abs(y).max(1)))
    a = pk + int(round(spec["keep_s_after_peak"] * SR))
    n = int(round(spec["fade_s"] * SR))
    if a >= len(y):
        return y, rec
    z = y[:min(len(y), a + n)].copy()
    m = len(z) - a
    z[a:] *= (0.5 + 0.5 * np.cos(np.linspace(0, np.pi, m)))[:, None]
    rec = {**rec, "tail": {"keep_s_after_peak": spec["keep_s_after_peak"], "fade_s": spec["fade_s"],
                           "len_s": [r(len(y) / SR, 4), r(len(z) / SR, 4)], "how": "raised-cosine fade, then cut"}}
    return z.astype(np.float32), rec


def place_index(y, t, align):
    if align == "start":
        return int(round(t * SR))
    if align == "peak":
        return int(round(t * SR)) - int(np.argmax(np.abs(y).max(1)))
    if align == "end":
        return int(round(t * SR)) - len(y)
    raise ValueError(align)


def duck_gain(n, ducks):
    g = np.zeros(n)
    for d in ducks:
        t, a, h, rl = d["t"], d["attack_s"], d["hold_s"], d["release_s"]
        i0, i1 = max(0, int((t - a) * SR)), min(n, int((t + h + rl) * SR) + 1)
        tt = np.arange(i0, i1) / SR
        g[i0:i1] = np.minimum(g[i0:i1], np.interp(tt, [t - a, t, t + h, t + h + rl], [0.0, d["db"], d["db"], 0.0]))
    return (10 ** (g / 20)).astype(np.float32)


# ------------------------------------------------------------------------------------------------ the limiter
def limiter(x, ceiling, release_ms=100.0):
    import pedalboard  # GPL-3.0: run here, never shipped
    lim = pedalboard.BrickwallLimiter(ceiling_db=ceiling, release_ms=release_ms, lookahead_ms=5.0, true_peak=True)
    y = lim(np.ascontiguousarray(x.T.astype(np.float32)), SR).T
    assert y.shape == x.shape, (y.shape, x.shape)
    return y


def gr_series(x_in, y_out):
    """Gain reduction per 10 ms (dB, 0 or below) of a limiter's output against its input."""
    hop = int(0.01 * SR)
    n = len(y_out) // hop
    pin = (x_in[: n * hop].astype(np.float64) ** 2).reshape(n, hop, 2).mean((1, 2))
    pout = (y_out[: n * hop].astype(np.float64) ** 2).reshape(n, hop, 2).mean((1, 2))
    ok = pin > 10 ** (-70 / 10)
    gr = np.zeros(n)
    gr[ok] = 10 * np.log10(np.maximum(pout[ok], 1e-20) / pin[ok])
    return np.minimum(gr, 0.0)


def extra_gr(music, sfx, grp, a, b, gain_db, ceiling):
    """How much more the limiter reduces when this group plays: the worst 10 ms difference over [a, b) samples (grp
    holds the group's audio over that stretch), with 0.6 s of run-up so the limiter's state has settled."""
    g = 10 ** (gain_db / 20)
    x_with = (music[a:b] + sfx[a:b]) * g
    x_without = (music[a:b] + sfx[a:b] - grp) * g
    d = gr_series(x_with, limiter(x_with, ceiling)) - gr_series(x_without, limiter(x_without, ceiling))
    skip = int(0.6 / 0.01)
    return float(d[skip:].min()) if len(d) > skip else 0.0


def master(mix, target, ceiling, release_ms):
    g = target - integrated_lufs(mix)
    log = []
    for _ in range(8):
        y = limiter(mix * 10 ** (g / 20), ceiling, release_ms)
        L = integrated_lufs(y)
        log.append({"gain_db": r(g, 3), "integrated_lufs": r(L, 3)})
        if abs(L - target) < 0.02:
            break
        g += target - L
    # the limiter must not move anything in time (pedalboard compensates its lookahead): checked with a lag search
    a = int(len(mix) * 0.6)
    pre = (mix[a:a + SR, 0] * 10 ** (g / 20)).astype(np.float64)
    lags = range(-480, 481)
    cc = [float(np.dot(pre[1000:-1000], y[a + 1000 + L:a + SR - 1000 + L, 0])) for L in lags]
    lag = int(list(lags)[int(np.argmax(cc))])
    gr = gr_series(mix * 10 ** (g / 20), y)
    order = np.argsort(gr)
    deepest, taken = [], []
    for j in order:
        if len(deepest) >= 6:
            break
        if all(abs(j - k) > 50 for k in taken):
            taken.append(j)
            deepest.append({"film_s": r(j * 0.01, 2), "gr_db": r(gr[j], 2)})
    return y.astype(np.float32), {"gain_db": r(g, 3), "iterations": log, "limiter": {
        "plugin": "pedalboard.BrickwallLimiter", "ceiling_db": ceiling, "true_peak_sidechain": True,
        "lookahead_ms": 5.0, "release_ms": release_ms, "lag_vs_input_samples": lag,
        "gr_min_db": r(gr.min(), 2), "seconds_below_minus1db": r((gr < -1).sum() * 0.01, 2),
        "seconds_below_minus3db": r((gr < -3).sum() * 0.01, 2), "deepest": deepest}}, gr.astype(np.float32)


AAC_ENCODERS = {  # FFmpeg 9's native encoder defaults to the twoloop coder (what tools/encode/encode.sh gets)
    "native_default": ["-c:a", "aac"],
    "native_fast": ["-c:a", "aac", "-aac_coder", "fast"],
    "apple_audiotoolbox_cbr": ["-c:a", "aac_at", "-aac_at_mode", "cbr"],
}


def aac_check(wav, kbps, gate, only=None):
    """Encode to AAC with each encoder and meter the decoded stream with ebur128 (peak=true); the ADTS bytes only ever
    exist in the pipe between the two processes. A master passes on an encoder when the integrated loudness is within
    0.5 LU of its target and the encoded true peak is at or under its gate (TREATMENT §4.8: web -1.5 dBTP, social
    -1.0 dBTP after encoding)."""
    out = {}
    for name, args in AAC_ENCODERS.items():
        if only and name != only:
            continue
        enc = subprocess.Popen([FFMPEG, "-hide_banner", "-nostdin", "-loglevel", "error", "-i", wav] + args +
                               ["-b:a", f"{kbps}k", "-ar", "48000", "-ac", "2", "-f", "adts", "-"], stdout=subprocess.PIPE)
        res = subprocess.run([FFMPEG, "-hide_banner", "-nostdin", "-nostats", "-f", "aac", "-i", "-", "-af",
                              "ebur128=peak=true", "-f", "null", "-"], stdin=enc.stdout, capture_output=True, text=True)
        enc.stdout.close()
        enc.wait()
        s = res.stderr[res.stderr.rfind("Summary:"):]
        get = lambda pat: float(re.search(pat, s, re.S).group(1))  # noqa: E731
        out[name] = {"args": " ".join(args) + f" -b:a {kbps}k", "integrated_lufs": get(r"I:\s+(-?[\d.]+) LUFS"),
                     "lra_lu": get(r"LRA:\s+(-?[\d.]+) LU"),
                     "true_peak_dbtp": get(r"True peak:\s+Peak:\s+(-?[\d.inf]+) dBFS")}
        out[name]["tp_pass"] = out[name]["true_peak_dbtp"] <= gate
    return out


# ------------------------------------------------------------------------------------------------ seam checks
def xcorr_lag(a, b, max_lag):
    """The lag L (samples) that best aligns b[j + L] with a[j] (len(b) = len(a) + 2 max_lag), and its correlation."""
    best, bl = -2.0, 0
    na = np.linalg.norm(a) + 1e-20
    for L in range(-max_lag, max_lag + 1):
        seg = b[max_lag + L:max_lag + L + len(a)]
        c = float(np.dot(a, seg) / (na * (np.linalg.norm(seg) + 1e-20)))
        if c > best:
            best, bl = c, L
    return bl, best


def band_db(x, a, b):
    """Mean power (dB) in the six bands over film seconds [a, b) of a mono signal."""
    i0, i1 = max(0, int(a * SR)), int(b * SR)
    f, p = ss.welch(x[i0:i1].astype(np.float64), fs=SR, nperseg=4096)
    return {lab: 10 * math.log10(max(p[(f >= lo) & (f < hi)].mean(), 1e-30)) for lo, hi, lab in BANDS}


def discontinuity(x, tb, near=0.003, span=0.5):
    """The largest second difference within +-3 ms of tb against the 99.9th percentile of the +-0.5 s around it
    (outside +-3 ms): a step or a click at a boundary stands out as a ratio well above 1."""
    a, b = max(1, int((tb - span) * SR)), min(len(x) - 1, int((tb + span) * SR))
    if b - a < SR // 10:
        return None
    seg = x[a - 1:b + 1].astype(np.float64)
    d2 = np.abs(seg[2:] - 2 * seg[1:-1] + seg[:-2])
    t = (a + np.arange(len(d2))) / SR
    m = np.abs(t - tb) <= near
    if not m.any() or (~m).sum() < 100:
        return None
    ref = np.percentile(d2[~m], 99.9)
    return float(d2[m].max() / (ref + 1e-12))


def onset_env(x):
    """Spectral flux (log magnitude, 60 Hz-16 kHz) with frames centred on their times: 512-sample Hann, 2 ms hop."""
    f, t, Z = ss.stft(x.astype(np.float32), fs=SR, window="hann", nperseg=512, noverlap=512 - 96, boundary="zeros")
    m = (f >= 60) & (f <= 16000)
    L = np.log1p(100 * np.abs(Z[m]))
    fl = np.maximum(np.diff(L, axis=1), 0).sum(0)
    return t[1:] - 0.5 * 96 / SR, fl  # each difference sits between its two frames


def load_map(track):
    return json.load(open(os.path.join(MAPS, track + ".map.json")))


def translation(y):
    mono = y.mean(1)
    li_st = integrated_lufs(y)
    li_mono = integrated_lufs(np.stack([mono, mono], 1))
    f, p = ss.welch(mono.astype(np.float64), fs=SR, nperseg=8192)
    band = (f >= 20) & (f <= 20000)
    return {"mono_fold_down_loss_db": r(li_st - li_mono), "share_above_150hz": r(p[band & (f > 150)].sum() / p[band].sum(), 3),
            "lr_correlation": r(float(np.corrcoef(y[:, 0], y[:, 1])[0, 1]), 3)}


# ------------------------------------------------------------------------------------------------ classifier
def classify_master(y, tmp_dir):
    """Apple SoundAnalysis through the sound_tags helper on the whole master: 3 s windows, then a second pass shifted
    by 1.5 s. Gates (OVERRIDES §36-§37, KIT §2.5): voice or alarm labels at 0.30 or in a window's top 3 fail; phone
    and foghorn fail at 0.30 and warn from 0.25; other watched labels at 0.30 are notes."""
    os.makedirs(tmp_dir, exist_ok=True)
    passes = {}
    for name, lead in (("main", 0.0), ("shift_1.5s", 1.5)):
        z = np.vstack([np.zeros((int(lead * SR), 2), dtype=np.float32), y]) if lead else y
        rows = al.timeline(z, SOUND_TAGS, tmp_dir)  # writes a temporary WAV in tmp_dir and deletes it
        for rw in rows:
            rw["t"] = r(rw["t"] - lead, 2)
        passes[name] = rows
    flags, maxes, explosive = [], {}, []
    for name, rows in passes.items():
        for rw in rows:
            top3 = dict(sorted(rw["labels"].items(), key=lambda kv: -kv[1])[:3])
            for lab, p in rw["labels"].items():
                kind = al.label_kind(lab)
                maxes[lab] = max(maxes.get(lab, 0.0), p)
                if kind in ("voice", "alarm") and (p >= 0.30 or lab in top3):
                    flags.append({"pass": name, "t": rw["t"], "label": lab, "p": r(p, 3), "level": "fail"})
                elif kind in ("phone", "foghorn") and p >= 0.30:
                    flags.append({"pass": name, "t": rw["t"], "label": lab, "p": r(p, 3), "level": "fail"})
                elif kind in ("phone", "foghorn") and p >= 0.25:
                    flags.append({"pass": name, "t": rw["t"], "label": lab, "p": r(p, 3), "level": "warn"})
                if any(s in lab for s in ("explosion", "artillery", "gunshot", "eruption", "boom", "fireworks")) and p >= 0.30:
                    explosive.append({"pass": name, "t": rw["t"], "label": lab, "p": r(p, 3)})
    watched = {lab: r(p, 3) for lab, p in sorted(maxes.items(), key=lambda kv: -kv[1])
               if al.label_kind(lab) in ("voice", "alarm", "phone", "foghorn") and p >= 0.05}
    top = {}
    for rw in passes["main"]:
        for lab in rw["labels"]:
            top[lab] = top.get(lab, 0) + 1
    verdict = "fail" if any(f["level"] == "fail" for f in flags) else "warn" if flags else "ok"
    return {"windows": {k: len(v) for k, v in passes.items()}, "verdict": verdict, "flags": flags,
            "watched_label_max": watched, "explosive_readings_ge_0.30": explosive,
            "most_frequent_labels": dict(sorted(top.items(), key=lambda kv: -kv[1])[:12]),
            "timeline_main": passes["main"]}


def classify_window(y, ws, tmp_dir):
    """The classifier's reading of one 3 s window [ws, ws + 3) of y (film seconds; before 0 is silence, as the shifted
    pass pads it): {label: confidence} for its top 3 and every watched label at 0.1 or more."""
    a = int(round(ws * SR))
    n = 3 * SR
    z = np.zeros((n, 2), dtype=np.float32)
    s0, s1 = max(0, a), min(len(y), a + n)
    if s1 > s0:
        z[s0 - a:s1 - a] = y[s0:s1]
    rows = al.timeline(z, SOUND_TAGS, tmp_dir)
    return rows[0]["labels"] if rows else {}


def attribute_flags(flags, mix_g, music_g, groups_g, tmp_dir):
    """For each flagged window: the reading of the whole mix, of the music alone and of the mix without each sound-design
    group sounding in it (all before the limiter, at the master's gain), for the labels that were flagged."""
    out = []
    seen = set()
    for f in flags:
        ws = f["t"]
        if ws in seen:
            continue
        seen.add(ws)
        labs = sorted({g["label"] for g in flags if g["t"] == ws})
        pick = lambda d: {lab: r(d.get(lab, 0.0), 3) for lab in labs}  # noqa: E731
        row = {"window_s": [ws, r(ws + 3, 2)], "labels": labs, "mix": pick(classify_window(mix_g, ws, tmp_dir)),
               "music_alone": pick(classify_window(music_g, ws, tmp_dir)), "mix_without": {}}
        a, b = int(ws * SR), int((ws + 3) * SR)
        for gid, (ga, gb, gy) in groups_g.items():
            if gb <= a or ga >= b:
                continue
            a0 = max(0, a)
            z = mix_g[a0:max(a0, b)].copy()
            lo, hi = max(ga, a0), min(gb, b)
            z[lo - a0:hi - a0] -= gy[lo - ga:hi - ga]
            if a < 0:  # the shifted pass's first window starts in the silence before the film
                z = np.vstack([np.zeros((-a, 2), dtype=np.float32), z])
            row["mix_without"][gid] = pick(classify_window(z, 0.0, tmp_dir))
        mx = max(row["mix"].values()) if row["mix"] else 0.0
        mu = max(row["music_alone"].values()) if row["music_alone"] else 0.0
        row["verdict"] = ("the music itself" if mu >= 0.25 and mu >= mx - 0.1 else
                          "sound design" if mu < 0.25 <= mx else "both / borderline")
        out.append(row)
    return out


# ------------------------------------------------------------------------------------------------ main
def main():
    plan_path, layers_path, out_dir, name = sys.argv[1:5]
    T0 = time.perf_counter()
    os.makedirs(out_dir, exist_ok=True)
    tmp_dir = os.path.join(out_dir, "tmp")
    plan_cs = json.load(open(plan_path))
    sheet = json.load(open(layers_path))
    plan = apply_corrections(copy.deepcopy(plan_cs), sheet)
    kit, kplan = load_kit()
    cues = {c["id"]: c for c in plan["cues"]}
    end = plan["end_film_s"]
    N = int(round(end * SR))
    bed = np.zeros((N, 2), dtype=np.float32)
    bed_cs = np.zeros((N, 2), dtype=np.float32)  # the cue sheet lane's bed (the corrections, no EQ), like for like
    mel_fb = cp.mel_filterbank()
    corr = sheet.get("source_time_correction_s", {})
    res = {"plan": rel(plan_path), "plan_sha256": sha256(plan_path), "layers": rel(layers_path),
           "layers_sha256": sha256(layers_path), "film": plan["film"], "sr": SR, "samples": N,
           "film_length_s": r(N / SR, 4), "source_time_correction_s": corr,
           "source_time_correction_evidence": sheet.get("source_time_correction_evidence"),
           "tracks": {}, "cues": {}, "eq": {}, "eq_ramps": {}}
    tracks = sorted(set(c["track"] for c in plan["cues"]))
    swell_tracks = {L["swell"]["track"] for L in sheet["layers"] if "swell" in L}
    snips, swells, maps = {}, {}, {}
    for tr in tracks:
        y48, info = decode(tr)
        res["tracks"][tr] = info
        mp = load_map(tr)
        d = corr.get(tr, 0.0)
        for key in ("beats_s", "downbeats_s"):  # the audible beats: the map's, moved by the measured correction
            mp[key] = [float(v) + d for v in mp[key]]
        maps[tr] = mp
        y_eq = {}
        for c in plan["cues"]:
            if c["track"] != tr:
                continue
            specs = sheet.get("eq", {}).get(c["id"], [])
            if specs:
                ye, rec_eq = eq_zero_phase(y48, specs)
                res["eq"][c["id"]] = rec_eq
            else:
                ye = y48
            ramp = sheet.get("eq_ramp", {}).get(c["id"])
            if ramp:
                alt, rec_r = eq_zero_phase(ye, ramp["eq"])
                res["eq_ramps"][c["id"]] = {"eq": rec_r, **{k: v for k, v in ramp.items() if k != "eq"}}
                res["cues"][c["id"]] = lay(bed, c, ye, alt, ramp)
            else:
                res["cues"][c["id"]] = lay(bed, c, ye)
            y_eq[c["id"]] = ye
            # like for like with the cue sheet lane (revision 2 measured as built: the corrections, and no EQ)
            lay(bed_cs, c, y48)
        for s in plan["seams"]:
            for side, cid in (("out", s["from"]), ("in", s["to"])):
                c = cues[cid]
                if c["track"] != tr:
                    continue
                p = c["src_out"] if side == "out" else c["src_in"]
                a, b = max(0, int((p - cp.WIN) * SR)), min(len(y48), int((p + cp.WIN) * SR))
                tf = s["t"] - 0.05 if side == "out" else s.get("in_film", s["t"]) + 0.05
                gdb = float(cp.env_db(c["gain_db"], np.array([tf]))[0])
                snips[(s["id"], side)] = (y_eq[cid][a:b].copy() * 10 ** (gdb / 20), a / SR, p, gdb, a)
        if tr in swell_tracks:
            for L in sheet["layers"]:
                if "swell" in L and L["swell"]["track"] == tr:
                    swells[L["id"]] = make_take(L, kit, kplan, {tr: y48})
        del y48, y_eq
    # ---------------------------------------------------------------- sound design layers on the bed (before ducks)
    sfx = np.zeros((N, 2), dtype=np.float32)
    layers_out, placed = [], {}
    res["omitted_layers"] = [{"id": L["id"], "take": L.get("take"), "why": L["omit"]} for L in sheet["layers"] if L.get("omit")]
    for L in sheet["layers"]:
        if L.get("omit"):
            continue
        y, rec = swells[L["id"]] if L["id"] in swells else make_take(L, kit, kplan, {})
        lv = L["level"]
        ref = None
        if lv["mode"] == "rel":
            ref = lufs_seg(bed, lv["ref"][0], lv["ref"][1])
            target, measure = ref + lv["offset_db"], mmax_lufs(y)
        elif lv["mode"] == "peak_rel":
            i0r, i1r = int(lv["ref"][0] * SR), int(lv["ref"][1] * SR)
            ref = peak_db(bed[i0r:i1r])
            target, measure = ref + lv["offset_db"], peak_db(y)
        elif lv["mode"] == "abs_m":
            target, measure = lv["lufs"], mmax_lufs(y)
        elif lv["mode"] == "abs_i":
            target, measure = lv["lufs"], rec["loop_integrated_lufs"]
        else:
            raise ValueError(lv["mode"])
        gain = target - measure
        i0 = place_index(y, L["t"], L["align"])
        a, b = max(0, i0), min(N, i0 + len(y))
        seg = y[a - i0:b - i0] * 10 ** (gain / 20)
        sfx[a:b] += seg
        placed[L["id"]] = (a, b, seg)
        rec.update(id=L["id"], group=L.get("group"), budget_group=L.get("budget_group", L.get("group")),
                   label=L.get("label"), role=L.get("role"), t=L["t"],
                   align=L["align"], film_samples=[a, b], film_s=[r(a / SR, 4), r(b / SR, 4)], level_rule=lv,
                   bed_ref=r(ref), target=r(target), take_level=r(measure), gain_db_rule=r(gain, 2),
                   provisional=L.get("provisional"), cue_sheet=L.get("cue_sheet"))
        layers_out.append(rec)
    # ---------------------------------------------------------------- ducks; limiter budgets for groups
    dg = duck_gain(N, sheet.get("ducks", []))
    music = bed * dg[:, None]
    social = sheet["masters"]["social"]
    budgets = {}
    g_s = social["lufs"] - integrated_lufs(music + sfx)  # the social master's gain, near enough for the budgets
    bl = sheet.get("limiter_budget_db", {})
    bl = list(bl.items()) if isinstance(bl, dict) else [tuple(x) for x in bl]
    for pss, (grp_id, budget) in [(p_, gb) for p_ in range(int(sheet.get("limiter_budget_passes", 1))) for gb in bl]:
        ids = [L["id"] for L in layers_out if L.get("budget_group", L.get("group")) == grp_id]
        if not ids:
            continue
        a = max(0, min(placed[i][0] for i in ids) - int(0.6 * SR))
        b = min(N, max(placed[i][1] for i in ids) + int(0.3 * SR))
        rec_b = budgets.setdefault(grp_id, {"group": grp_id, "budget_db": budget, "layers": ids, "trim_db": 0.0, "log": []})
        trim, log = rec_b["trim_db"], rec_b["log"]
        for _ in range(10):
            grp = np.zeros((b - a, 2), dtype=np.float32)
            for i in ids:
                pa, pb, seg = placed[i]
                grp[pa - a:pb - a] += seg
            worst = extra_gr(music, sfx, grp, a, b, g_s, social["ceiling_dbtp"])
            log.append({"pass": pss + 1, "trim_db": r(trim, 2), "extra_gr_db": r(worst, 2)})
            if worst >= -budget:
                break
            step = (worst + budget) - 0.2
            trim += step
            f = 10 ** (step / 20)
            for i in ids:
                pa, pb, seg = placed[i]
                sfx[pa:pb] -= seg * (1 - f)
                placed[i] = (pa, pb, seg * f)
        rec_b["trim_db"] = r(trim, 2)
        for L in layers_out:
            if L["id"] in ids:
                L["limiter_trim_db"] = r(trim, 2)
                L["gain_db"] = r(L["gain_db_rule"] + trim, 2)
    budgets = list(budgets.values())
    for rec_b in budgets:  # each group's final cost to the social limiter, everything else in place, and where
        ids = rec_b["layers"]
        a = max(0, min(placed[i][0] for i in ids) - int(0.6 * SR))
        b = min(N, max(placed[i][1] for i in ids) + int(0.3 * SR))
        grp = np.zeros((b - a, 2), dtype=np.float32)
        for i in ids:
            pa, pb, seg = placed[i]
            grp[pa - a:pb - a] += seg
        rec_b["final_extra_gr_db"] = r(extra_gr(music, sfx, grp, a, b, g_s, social["ceiling_dbtp"]), 2)
    for L in layers_out:
        L.setdefault("limiter_trim_db", 0.0)
        L.setdefault("gain_db", L["gain_db_rule"])
        a, b = L["film_samples"]
        L["in_film_loudest_400ms_lufs"] = r(mmax_lufs(placed[L["id"]][2]))
        L["in_film_peak_dbfs"] = r(peak_db(placed[L["id"]][2]))
        L["bed_loudness_under_it_lufs"] = r(lufs_seg(bed, a / SR, max(b / SR, a / SR + 0.4)))
    res["limiter_budgets"] = budgets
    mix = music + sfx
    edge = sheet.get("edges", {"fade_in_s": 0.005, "fade_out_s": 0.02})
    fi, fo = int(edge["fade_in_s"] * SR), int(edge["fade_out_s"] * SR)
    mix[:fi] *= np.linspace(0, 1, fi, dtype=np.float32)[:, None]
    mix[-fo:] *= np.linspace(1, 0, fo, dtype=np.float32)[:, None]
    # the composites: the hit group with the ducked music against the music alone, over the 400 ms from the hit
    comps = []
    for d in sheet.get("ducks", []):
        t = d["t"]
        comps.append({"duck": d["id"], "t": t, "bed_lufs_400ms": r(lufs_seg(bed, t, t + 0.4)),
                      "mix_lufs_400ms": r(lufs_seg(mix, t, t + 0.4)),
                      "composite_over_bed_db": r(lufs_seg(mix, t, t + 0.4) - lufs_seg(bed, t, t + 0.4)),
                      "composite_over_bed_first_100ms_db": r(lufs_seg(mix, t - 0.01, t + 0.1) - lufs_seg(bed, t - 0.01, t + 0.1)),
                      "music_ducked_by_db": d["db"]})
    res["composites"] = comps
    # ---------------------------------------------------------------- the bed, as the cue sheet lane measured it
    ms_bed = cp.kweighted_ms(bed, SR)
    mom_b, st_b = cp.curves(ms_bed)
    ms_cs = cp.kweighted_ms(bed_cs, SR)
    lt = np.arange(len(ms_bed)) * cp.LH + cp.LH / 2
    lane = os.path.join(os.path.dirname(plan_path), plan["film"] + ".metrics.json")
    lane_m = json.load(open(lane)) if os.path.exists(lane) else None
    res["bed"] = {
        "built": {"integrated_lufs": r(cp.integrated(ms_bed, 0, N / SR)), "lra_lu": r(cp.lra(ms_bed, 0, N / SR)),
                  "sample_peak_dbfs": r(peak_db(bed)), "st_max": r(st_b.max())},
        "cue_sheet_as_planned": {"integrated_lufs": r(cp.integrated(ms_cs, 0, N / SR)), "lra_lu": r(cp.lra(ms_cs, 0, N / SR)),
                                 "sample_peak_dbfs": r(peak_db(bed_cs)), "st_max": r(cp.curves(ms_cs)[1].max())},
        "cue_sheet_lane": lane_m["bed"] if lane_m else None,
        "note": "'cue_sheet_as_planned' re-assembles the plan exactly as the cue sheet lane measured revision 2 (with "
                "the source-time corrections, without the EQ) and must match 'cue_sheet_lane'; 'built' adds the EQ and "
                "is what the masters are made from"}
    res["translation_bed"] = translation(bed)
    del bed_cs
    # ---------------------------------------------------------------- masters
    masters, grs = {}, {}
    for mname, spec in sheet["masters"].items():
        # the gate is on the encoded file (TREATMENT §4.8): start from the stated ceiling, encode the whole master with
        # the reference encoder, and lower the ceiling only by what the encoded true peak exceeds its gate
        ceiling, tries = spec["ceiling_dbtp"], []
        gate = spec.get("aac_tp_max_dbtp", spec["ceiling_dbtp"] + 0.5)
        refenc = spec.get("aac_reference_encoder", "apple_audiotoolbox_cbr")
        path = os.path.join(out_dir, f"{name}.{mname}.wav")
        for _ in range(4):
            y, rec, gr = master(mix, spec["lufs"], ceiling, spec.get("release_ms", 100.0))
            sf.write(path, y, SR, subtype="PCM_24")
            ref = aac_check(path, spec["aac_kbps"], gate, only=refenc)[refenc]
            tries.append({"ceiling_dbtp": r(ceiling, 2), "encoded_true_peak_dbtp": ref["true_peak_dbtp"]})
            if ref["true_peak_dbtp"] <= gate:
                break
            ceiling -= (ref["true_peak_dbtp"] - gate) + 0.1
        ms_y = cp.kweighted_ms(y, SR)
        rec.update(file=rel(path), integrated_lufs=r(integrated_lufs(y), 2), lra_lu=r(cp.lra(ms_y, 0, N / SR)),
                   true_peak_dbtp=r(true_peak_db(y), 2), sample_peak_dbfs=r(peak_db(y)), target=spec,
                   ceiling_used_dbtp=r(ceiling, 2), ceiling_tries=tries, aac_gate_dbtp=gate, aac_reference_encoder=refenc)
        rec["aac"] = aac_check(path, spec["aac_kbps"], gate)
        for v in rec["aac"].values():
            v["pass"] = v["tp_pass"] and abs(v["integrated_lufs"] - spec["lufs"]) <= 0.5
        rec["sha256"] = sha256(path)
        masters[mname] = (y, rec)
        grs[mname] = gr
    res["masters"] = {k: v[1] for k, v in masters.items()}
    # what the music alone (ducked, no sound design) costs each master's limiter at that master's gain
    for mname, spec in sheet["masters"].items():
        g_m = 10 ** (res["masters"][mname]["gain_db"] / 20)
        x = music * g_m
        gm = gr_series(x, limiter(x, spec["ceiling_dbtp"], spec.get("release_ms", 100.0)))
        grs[mname + "_music"] = gm.astype(np.float32)
        res["masters"][mname]["limiter"]["music_alone"] = {
            "gr_min_db": r(gm.min(), 2), "seconds_below_minus1db": r((gm < -1).sum() * 0.01, 2),
            "deepest": [{"film_s": r(j * 0.01, 2), "gr_db": r(gm[j], 2)} for j in np.argsort(gm)[:1]]}
    web = masters["web"][0]
    mono = web.mean(1)
    res["translation"] = translation(web)
    # ---------------------------------------------------------------- blocks on the master
    ms_w = cp.kweighted_ms(web, SR)
    mom_w, st_w = cp.curves(ms_w)
    ms_s = cp.kweighted_ms(sfx, SR)
    mom_s, st_s = cp.curves(ms_s)
    res["blocks_web"] = []
    for a, b, lab in plan["blocks"]:
        m = (lt >= a) & (lt < b)
        res["blocks_web"].append({"label": lab, "film": [a, b], "integrated_lufs": r(cp.integrated(ms_w, a, b)),
                                  "st_min": r(st_w[m].min()), "st_median": r(np.median(st_w[m])),
                                  "st_max": r(st_w[m].max())})
    # ---------------------------------------------------------------- seams
    monob = bed.mean(1)
    tt_on, on = onset_env(mono)
    seams = []
    lane_seams = {s["id"]: s for s in lane_m["seams"]} if lane_m else {}
    for s in plan["seams"]:
        ts, tin = s["t"], s.get("in_film", s["t"])
        cin, cout = cues[s["to"]], cues[s["from"]]
        xf = min(cin["head"]["len"] if cin["head"]["mode"] in ("preroll", "fade") else 0.0, 1.0)
        yin, a_in, p_in, g_in, ai_samp = snips[(s["id"], "in")]
        yout, a_out, p_out, g_out, ao_samp = snips[(s["id"], "out")]
        ri, ro = p_in - a_in, p_out - a_out
        out = {"id": s["id"], "label": s["label"], "t_film": ts, "in_film": tin, "xfade_s": xf,
               "frame_60fps": int(round(ts * 60)), "gain_db_out": r(g_out), "gain_db_in": r(g_in)}
        for nm, X in (("master_web", web), ("bed", bed)):
            st_bef, st_aft = lufs_seg(X, ts - 3.0, ts - 0.05), lufs_seg(X, tin + 0.05, tin + 3.0)
            mo_bef, mo_aft = lufs_seg(X, ts - 0.45, ts - 0.05), lufs_seg(X, tin + 0.05, tin + 0.45)
            out[nm] = {"lufs_3s_before": r(st_bef), "lufs_3s_after": r(st_aft), "step_3s_lu": r(st_aft - st_bef),
                       "step_400ms_lu": r(mo_aft - mo_bef)}
        out["incoming_source_own_step_3s_lu"] = r(lufs_seg(yin, ri + 0.05, ri + 3.0) - lufs_seg(yin, ri - 3.0, ri - 0.05))
        w = 2048
        it, ix = int(round(tin * SR)), int(round((tin - xf) * SR))
        ymi = yin.mean(1)
        ii, iix = int(round(ri * SR)), int(round((ri - xf) * SR))
        for nm, X in (("master_web", mono), ("bed", monob)):
            out[nm]["lsd_db"] = r(cp.lsd(X[ix - w:ix], X[it:it + w]))
        out["lsd_incoming_source_db"] = r(cp.lsd(ymi[iix - w:iix], ymi[ii:ii + w])) if iix - w >= 0 else None
        out["extra_lsd_db"] = r(out["bed"]["lsd_db"] - out["lsd_incoming_source_db"]) \
            if out["lsd_incoming_source_db"] is not None else None
        sb, sa = band_db(ymi, ri - xf - 1.0, ri - xf), band_db(ymi, ri, ri + 1.0)
        out["bands_db"] = {}
        for nm, X in (("bed", monob), ("master_web", mono)):  # the music's own continuity, and as heard (with hits)
            bb, ba = band_db(X, ts - xf - 1.0, ts - xf), band_db(X, tin, tin + 1.0)
            out["bands_db"][nm] = {lab: {"film_change": r(ba[lab] - bb[lab]), "source_own_change": r(sa[lab] - sb[lab]),
                                         "extra": r((ba[lab] - bb[lab]) - (sa[lab] - sb[lab]))} for _, _, lab in BANDS}
        tth, e = cp.hf_db(mono, SR, tin - 0.5, tin + 0.5)
        near = np.abs(tth - tin) <= 0.010
        hf = float(e[near].max() - np.median(e)) if near.any() else None
        tt2, e2 = cp.hf_db(ymi, SR, ri - 0.5, ri + 0.5)
        near2 = np.abs(tt2 - ri) <= 0.010
        hfs = float(e2[near2].max() - np.median(e2)) if near2.any() else None
        out["click"] = {"hf_burst_db": r(hf), "hf_burst_source_db": r(hfs),
                        "extra_hf_db": r(hf - hfs) if hf is not None and hfs is not None else None,
                        "d2_ratio_bed_at_seam": r(discontinuity(monob, ts), 3),
                        "d2_ratio_bed_xfade_start": r(discontinuity(monob, ts - xf), 3) if xf else None,
                        "d2_ratio_bed_at_in": r(discontinuity(monob, tin), 3) if tin != ts else None,
                        "d2_ratio_source_at_its_in_point": r(discontinuity(ymi, ri), 3),
                        "d2_ratio_master_at_seam": r(discontinuity(mono, ts), 3)}
        # the grid, in whole samples: half a second of the film after the incoming downbeat against the incoming source
        # at the same place (film sample - k), and half a second before the crossfade against the outgoing source; a
        # lag of 0 means every sample sits where the plan puts it
        ML, n_w = 240, SR // 2

        def lag_at(X, film0, src, src0):
            A = X[film0:film0 + n_w].astype(np.float64)
            B = src[src0 - ML:src0 + n_w + ML].astype(np.float64)
            if src0 - ML < 0 or len(B) < n_w + 2 * ML or len(A) < n_w:
                return None, None
            return xcorr_lag(A, B, ML)
        k_in = res["cues"][cin["id"]]["offset_samples_film_minus_src"]
        k_out = res["cues"][cout["id"]]["offset_samples_film_minus_src"]
        f_in = int(round(tin * SR)) + int(0.02 * SR)
        f_out = int(round(ts * SR)) - int(round((xf + 0.52) * SR))
        lag_in, c_in = lag_at(monob, f_in, ymi, f_in - k_in - ai_samp)
        lag_out, c_out = lag_at(monob, f_out, yout.mean(1), f_out - k_out - ao_samp)
        lag_m, c_m = lag_at(mono, f_in, monob, f_in)
        out["grid"] = {"lag_bed_vs_incoming_source_samples": lag_in, "corr_in": r(c_in, 5),
                       "lag_bed_vs_outgoing_source_samples": lag_out, "corr_out": r(c_out, 5),
                       "lag_master_vs_bed_samples": lag_m, "corr_master_bed": r(c_m, 4),
                       "note": "J3's incoming window also holds B4's ring-out (by design), so its correlation is lower"
                       if s["id"] == "J3" else None}
        # where the audible attacks fall around the seam: the incoming cue's first attack after the seam, and whether an
        # attack of either cue falls inside the crossfade (it should not: the crossfade ends on the incoming downbeat)
        w_on = (tt_on >= tin - xf - 0.07) & (tt_on <= tin + 0.07)
        if w_on.any():
            k_pk = int(np.argmax(on[w_on]))
            out["attack_near_seam"] = {"strongest_attack_film_s": r(float(tt_on[w_on][k_pk]), 4),
                                       "vs_seam_ms": r((float(tt_on[w_on][k_pk]) - tin) * 1000, 1)}
        bo, bi = np.array(maps[cout["track"]]["beats_s"]), np.array(maps[cin["track"]]["beats_s"])
        last_out = bo[bo < cout["src_out"] - 1e-3]
        first_in = bi[bi >= cin["src_in"] - 0.03]
        if len(last_out) and len(first_in):
            tlo = cout["film_in"] + (last_out[-1] - cout["src_in"])
            tfi = cin["film_in"] + (first_in[0] - cin["src_in"])
            per_out, per_in = float(np.median(np.diff(bo))), float(np.median(np.diff(bi)))
            out["beats_across"] = {"last_outgoing_beat_film_s": r(tlo, 4), "first_incoming_beat_film_s": r(tfi, 4),
                                   "interval_ms": r((tfi - tlo) * 1000, 1), "outgoing_beat_ms": r(per_out * 1000, 1),
                                   "incoming_beat_ms": r(per_in * 1000, 1),
                                   "deviation_from_outgoing_beat_ms": r((tfi - tlo - per_out) * 1000, 1),
                                   "first_incoming_beat_vs_seam_ms": r((tfi - tin) * 1000, 1)}
        if s["id"] in lane_seams:
            ls = lane_seams[s["id"]]
            out["cue_sheet_lane"] = {k: ls.get(k) for k in ("film_step_3s_lu", "film_step_400ms_lu", "lsd_film_db",
                                                           "extra_lsd_db", "extra_hf_db")}
        seams.append(out)
    res["seams"] = seams
    # ---------------------------------------------------------------- harmony, key and the grid across every seam
    # the cue sheet lane's own measures (revise_measure.py), on the music bed and on the web master as heard
    import revise_measure as rm  # noqa: E402  imported here: it imports this module for its layers and levels
    own_lsd = {}

    def film_beats(c):
        bt = np.array(maps[c["track"]]["beats_s"])  # already moved by the track's correction
        bt = bt[(bt >= c["src_in"] - 1e-3) & (bt <= c["src_out"] + 1e-3)]
        return bt - c["src_in"] + c["film_in"]
    for out in seams:
        s = next(x for x in plan["seams"] if x["id"] == out["id"])
        ts, tin = s["t"], s.get("in_film", s["t"])
        cin, cout = cues[s["to"]], cues[s["from"]]
        bo, bi = film_beats(cout), film_beats(cin)
        bo, bi = bo[bo < ts - 0.02], bi[bi >= tin - 0.02]
        a0 = max(0.0, ts - 6.0)
        ex = {}
        for nm, X in (("bed", monob), ("master_web", mono)):
            seg = X[int(a0 * SR):int((tin + 6.0) * SR)]
            e = {}
            if cin["head"]["mode"] != "fade" and len(bo) >= 2 and len(bi) >= 2:
                e["harmony"] = rm.harmony_across(seg, a0, ts - a0, list(bo[-9:] - a0), list(bi[:9] - a0))
                e["onsets_around_seam"] = rm.onsets_on_grid(seg, a0, list(bo[-4:]) + list(bi[:4]))
            # fixed windows either side, for every seam (the fade-ins and the stop too, which share no beat grid):
            # the chroma cosine and the key of the 2 s and 4 s before the crossfade against the same after the in-point
            C_, tt_, E_ = rm.harmonic_chroma(seg)
            w = {}
            for L_ in (2.0, 4.0):
                cb = rm.span_chroma(C_, tt_, E_, ts - a0 - out["xfade_s"] - L_, ts - a0 - out["xfade_s"])
                ca = rm.span_chroma(C_, tt_, E_, tin - a0, tin - a0 + L_)
                if cb is not None and ca is not None:
                    kb, ka = rm.key_of(cb), rm.key_of(ca)
                    st_, letter = rm.camelot_steps(kb["camelot"], ka["camelot"])
                    w[f"{L_:g}s"] = {"chroma_cos": rm.cosv(cb, ca), "key_before": kb, "key_after": ka,
                                     "camelot_steps": st_, "mode_change": letter}
            e["windows"] = w
            ex[nm] = e
        if len(bo) and len(bi):
            ex["beat_interval_across_ms"] = r((bi[0] - bo[-1]) * 1000, 1)
        tr_in = cin["track"]
        if tr_in not in own_lsd:
            own_lsd[tr_in] = rm.own_lsd_at_downbeats(tr_in, corr.get(tr_in, 0.0))
        ex["lsd_percentile_of_incoming_own_downbeats"] = rm.pct(own_lsd[tr_in], out["bed"]["lsd_db"])
        ex["incoming_own_downbeat_lsd_p50_p95"] = [r(np.percentile(own_lsd[tr_in], 50)),
                                                   r(np.percentile(own_lsd[tr_in], 95))]
        out["continuity"] = ex
    rm._tracks.clear()
    # ---------------------------------------------------------------- onsets in the master against the audible beats
    grid = {}
    hits = [Ly["t"] for Ly in layers_out if Ly.get("role") in ("hit", "sub", "plunk", "tick", "soft_hit", "tap")]
    for c in plan["cues"]:
        f0, f1, fout = cp.cue_extent(c)
        lo, hi = c["film_in"] + 0.25, min(fout, f1) - 0.25
        beats = np.array(maps[c["track"]]["beats_s"]) - c["src_in"] + c["film_in"]
        beats = beats[(beats >= lo) & (beats <= hi)]
        beats = np.array([b for b in beats if all(abs(b - h) > 0.15 for h in hits)])
        offs = []
        for b in beats:
            m = np.abs(tt_on - b) <= 0.060
            if m.sum() < 3:
                continue
            seg = on[m]
            if seg.max() <= np.median(on[(np.abs(tt_on - b) <= 0.25)]) * 2.0:
                continue  # no clear attack near this beat (a held chord, a pad)
            offs.append(float(tt_on[m][int(np.argmax(seg))] - b))
        offs = np.array(offs) * 1000
        grid[c["id"]] = {"beats_checked": int(len(beats)), "beats_with_clear_attack": int(len(offs)),
                         "median_offset_ms": r(np.median(offs), 1) if len(offs) else None,
                         "iqr_ms": [r(np.percentile(offs, 25), 1), r(np.percentile(offs, 75), 1)] if len(offs) else None,
                         "share_within_8ms": r((np.abs(offs) <= 8.33).mean(), 3) if len(offs) else None}
    res["onsets_vs_beats"] = {"method": "spectral flux of the web master (512-sample Hann, 2 ms hop, frames centred; "
                                        "1-3 ms early on synthetic bursts), the strongest peak within +-60 ms of each "
                                        "audible beat (the map's beat plus the track's correction) in film time; beats "
                                        "within 0.15 s of a designed hit or tick are skipped",
                              "cues": grid}
    # ---------------------------------------------------------------- clicks at every edge
    ed = []
    for c in plan["cues"]:
        f0, f1, fout = cp.cue_extent(c)
        for t_, what in ((f0, "audio starts"), (f1, "audio ends"), (c["film_in"], "in-point"), (fout, "out-point")):
            if 0.01 < t_ < N / SR - 0.01:
                v = discontinuity(monob, t_)
                if v is not None:
                    ed.append({"t": r(t_, 4), "what": f"{c['id']} {what}", "d2_ratio_bed": r(v, 3)})
    res["edges"] = {"cue_edges_on_the_music_alone": ed,
                    "max_d2_ratio_bed": max(e["d2_ratio_bed"] for e in ed) if ed else None,
                    "layer_edges_db_re_peak": {L["id"]: L["edge_db_re_peak"] for L in layers_out},
                    "worst_layer_edge_db": r(max(max(v["first_sample"], v["last_sample"])
                                                 for v in (L["edge_db_re_peak"] for L in layers_out)))}
    res["layers"] = layers_out
    res["ducks"] = sheet.get("ducks", [])
    # ---------------------------------------------------------------- classifier
    res["classifier"] = {k: classify_master(v[0], tmp_dir) for k, v in masters.items()}
    # attribution of the web master's flags: the music itself, or a sound-design group?
    g_w = 10 ** (res["masters"]["web"]["gain_db"] / 20)
    groups_g = {}
    for L in layers_out:  # each layer on its own, and each display group (a layer that shares a group appears twice)
        pa, pb, seg = placed[L["id"]]
        groups_g["layer:" + L["id"]] = (pa, pb, seg * g_w)
    for L in layers_out:
        gid = L.get("group") or L["id"]
        pa, pb, seg = placed[L["id"]]
        if gid in groups_g:
            ga, gb, gy = groups_g[gid]
            na, nb = min(ga, pa), max(gb, pb)
            ny = np.zeros((nb - na, 2), dtype=np.float32)
            ny[ga - na:gb - na] += gy
            ny[pa - na:pb - na] += seg * g_w
            groups_g[gid] = (na, nb, ny)
        else:
            groups_g[gid] = (pa, pb, seg * g_w)
    flags_web = [f for f in res["classifier"]["web"]["flags"]]
    res["classifier"]["web"]["attribution"] = attribute_flags(flags_web, (mix * g_w).astype(np.float32),
                                                              (music * g_w).astype(np.float32), groups_g, tmp_dir)
    # the title's windows on the cue sheet's stricter 0.5-s grid (CUE_SHEET §4.1: every 3 s window from J5 + 2 ms to
    # 5.5 s after the title), on the web master as built and on the music alone at its gain: Born Of The Sky and the
    # kit's CC0 and designed sounds only (B2 ends on J5), so no temporary WAV holds Mixkit music
    if "return" in plan:
        j5 = next(s["t"] for s in plan["seams"] if s["id"] == "J5")
        title = plan["return"]["R720_film_s"]
        tg = {"windows": "every 3 s window starting from J5 + 2 ms to the title + 5.5 s, on a 0.5 s grid",
              "j5_film_s": j5, "title_film_s": title}
        for nm, X in (("web_master", web), ("music_alone_at_web_gain", (music * g_w).astype(np.float32))):
            rows = rm.classify_grid(X, j5 + 0.002, title + 5.5, tmp_dir)
            tg[nm] = {**rm.summarise(rows), "rows": rows}
        res["classifier"]["title_grid"] = tg
    try:
        os.rmdir(tmp_dir)
    except OSError:
        pass
    # ---------------------------------------------------------------- curves and spectrograms for the strips
    mel, mt = cp.mel_db(web, SR, mel_fb)
    npz = {"lt": lt.astype(np.float32), "mom": mom_w.astype(np.float32), "st": st_w.astype(np.float32),
           "mom_bed": mom_b.astype(np.float32), "st_bed": st_b.astype(np.float32), "mom_sfx": mom_s.astype(np.float32),
           "mel": mel, "mel_t": mt, "gr_web": grs["web"], "gr_social": grs["social"],
           "gr_web_music": grs["web_music"], "gr_social_music": grs["social_music"]}
    for c in plan["cues"]:
        f0, f1, fout = cp.cue_extent(c)
        for key in ("beats_s", "downbeats_s"):
            v = np.array(maps[c["track"]][key]) - c["src_in"] + c["film_in"]
            npz[f"{c['id']}_{key}"] = v[(v >= f0) & (v <= f1)].astype(np.float32)
    for (sid, side), (ys, a0, p, gdb, _) in snips.items():
        m2, t2 = cp.mel_db(ys, SR, mel_fb)
        ms2 = cp.kweighted_ms(ys, SR)
        mo2, st2 = cp.curves(ms2)
        npz[f"{sid}_{side}_mel"] = m2
        npz[f"{sid}_{side}_mel_t"] = (t2 + a0).astype(np.float32)
        npz[f"{sid}_{side}_lt"] = (np.arange(len(ms2)) * cp.LH + cp.LH / 2 + a0).astype(np.float32)
        npz[f"{sid}_{side}_mom"] = mo2.astype(np.float32)
        npz[f"{sid}_{side}_st"] = st2.astype(np.float32)
    for s in plan["seams"]:
        for key, t_ in (("seam", s["t"]), ("in", s.get("in_film", s["t"]))):
            a0 = int(round((t_ - 0.025) * SR))
            npz[f"z_{s['id']}_{key}"] = web[a0:a0 + int(0.05 * SR)].astype(np.float32)
            npz[f"z_{s['id']}_{key}_bed"] = bed[a0:a0 + int(0.05 * SR)].astype(np.float32)
            npz[f"z_{s['id']}_{key}_t0"] = np.array([a0 / SR], dtype=np.float64)
    np.savez_compressed(os.path.join(out_dir, f"{name}.npz"), **npz)
    res["audio_written"] = [m[1]["file"] for m in masters.values()]
    res["secs"] = round(time.perf_counter() - T0, 1)
    res["peak_rss_mb"] = round(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1048576, 1)
    res["versions"] = {"numpy": np.__version__, "soundfile": sf.__version__, "soxr": soxr.__version__,
                       "pyloudnorm": getattr(pyln, "__version__", "0.2.0"), "python": sys.version.split()[0]}
    try:
        import pedalboard
        import scipy
        res["versions"].update(pedalboard=pedalboard.__version__, scipy=scipy.__version__)
    except Exception:  # noqa: BLE001
        pass
    json.dump(res, open(os.path.join(out_dir, f"{name}.build.json"), "w"), indent=1, ensure_ascii=False)
    print(json.dumps({"bed": res["bed"]["built"], "bed_as_planned": res["bed"]["cue_sheet_as_planned"],
                      "masters": {k: {kk: v[1][kk] for kk in ("integrated_lufs", "true_peak_dbtp", "lra_lu")}
                                  for k, v in masters.items()},
                      "aac": {k: v[1]["aac"] for k, v in masters.items()}, "budgets": [
                          {k: b[k] for k in ("group", "trim_db")} for b in budgets],
                      "secs": res["secs"], "rss_mb": res["peak_rss_mb"]}))


if __name__ == "__main__":
    main()
