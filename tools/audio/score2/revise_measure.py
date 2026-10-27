"""score2 lane: measure the supervisor's revision for the Return (MONTAGE_DESIGN §5.6), as built.

Every measurement is made on music assembled in memory with the build's measured source-time corrections (B2 -30.0 ms,
B4 -42.2 ms: score_common.apply_corrections, as score_build.py builds the masters). No audio file is written, with one
exception: the classifier (Apple SoundAnalysis through .work/audio/sound_tags) reads a temporary WAV, so `title` writes
short stretches of Born Of The Sky (CC BY 4.0) with the kit's CC0 and designed sounds, never Mixkit music and never a
Mixkit take, each deleted as soon as it has been read. Mixkit music is never in a written file (OVERRIDES §51).

Subcommands (audio venv, through scripts/heavy.sh, one at a time):
  probe CANDIDATES.json OUT_PREFIX LAYERS.json
      every candidate splice for M2 (B2) and M3 (B4), and J2's candidate out-points, as built: loudness steps, spectral
      distance and its percentile among the track's own bar changes, clicks, chroma and key across the seam against the
      track's own continuation, onsets on the beat grid; plus each candidate's curves for the strips
  plan PLAN.json OUT_PREFIX LAYERS.json
      a whole plan: cue_plan.py's metrics and curves, plus per seam chroma and key continuity, onsets on the grid, the
      spectral step's percentile and the second-difference click ratio; onsets against the beats per cue; per film bar
      of the Return its loudness, density and air; the title's arrival; the Return against the climax
  title PLAN.json METRICS.json OUT_PREFIX LAYERS.json
      the title composite (the one-bar swell, the stone tap as its attack, the CC0 hit, sub 3, the duck) at the
      master's gain, and the classifier's reading of every 3 s window from J5 to 5.5 s after the title on a 0.5 s grid,
      for each variant (the music alone, each layer added, the whole composite, and the remedies in VARIANTS.json)
  x40mask PLAN_X40.json OUT_PREFIX LAYERS.json
      the 40-s cut's XJ2 mask (a reverse swell from impact_body_cc0's room tail), measured in memory with and without it
"""
import json
import math
import os
import resource
import sys
import time

import numpy as np
import scipy.ndimage as ndi
import scipy.signal as ss
import soundfile as sf
import soxr

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
sys.path.insert(0, HERE)
sys.path.insert(1, os.path.join(REPO, "tools", "audio", "sfx2"))
import cue_plan as cp  # noqa: E402
import score_build as sb  # noqa: E402  layers, levels, ducks, EQ and the classifier, exactly as the masters are built
import audiolib as al  # noqa: E402

SR = 48000
cp.SR = SR
sb.SR = SR
ASR = 22050
XF = 0.06
AUD = os.path.join(REPO, ".work", "music-audition")
MAPS = os.path.join(REPO, ".work", "score2", "maps")
TRACK_OF = {"B2": "YourBreath", "B4": "TechnoFestVibes", "A4": "BornOfTheSky", "A1": "Starfire"}
_maps, _tracks = {}, {}


def r(v, d=2):
    return None if v is None or not np.isfinite(v) else round(float(v), d)


def tmap(track):
    if track not in _maps:
        with open(os.path.join(MAPS, track + ".map.json")) as fh:
            _maps[track] = json.load(fh)
    return _maps[track]


def load48(track):
    if track not in _tracks:
        y, sr = sf.read(os.path.join(AUD, track + ".mp3"), dtype="float32", always_2d=True)
        if sr != SR:
            y = soxr.resample(y, sr, SR, quality="HQ").astype(np.float32)
        _tracks[track] = np.ascontiguousarray(y[:, :2])
    return _tracks[track]


def lufs(y, a, b):
    return cp.mean_lufs_mono(y, SR, a, b)


def corrections(layers_path):
    with open(layers_path) as fh:
        return json.load(fh).get("source_time_correction_s", {})


# ------------------------------------------------------------------------------------------------ harmony
PROF = {  # as measure_track.py (the maps' keys): three key profiles, averaged
    "krumhansl": ([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88],
                  [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]),
    "temperley": ([0.748, 0.060, 0.488, 0.082, 0.670, 0.460, 0.096, 0.715, 0.104, 0.366, 0.057, 0.400],
                  [0.712, 0.084, 0.474, 0.618, 0.049, 0.460, 0.105, 0.747, 0.404, 0.067, 0.133, 0.330]),
    "albrecht": ([0.238, 0.006, 0.111, 0.006, 0.137, 0.094, 0.016, 0.214, 0.009, 0.080, 0.008, 0.081],
                 [0.220, 0.006, 0.104, 0.123, 0.019, 0.103, 0.012, 0.214, 0.062, 0.022, 0.061, 0.052]),
}
PCN = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"]
CAM_MAJ = {0: "8B", 7: "9B", 2: "10B", 9: "11B", 4: "12B", 11: "1B", 6: "2B", 1: "3B", 8: "4B", 3: "5B", 10: "6B", 5: "7B"}
CAM_MIN = {9: "8A", 4: "9A", 11: "10A", 6: "11A", 1: "12A", 8: "1A", 3: "2A", 10: "3A", 5: "4A", 0: "5A", 7: "6A", 2: "7A"}


def key_of(ch):
    rr = np.zeros(24)
    for maj, mnr in PROF.values():
        for t in range(12):
            rr[t] += np.corrcoef(ch, np.roll(maj, t))[0, 1] / 3
            rr[12 + t] += np.corrcoef(ch, np.roll(mnr, t))[0, 1] / 3
    o = np.argsort(rr)[::-1]
    name = lambda i: f"{PCN[i % 12]} {'major' if i < 12 else 'minor'}"  # noqa: E731
    cam = lambda i: CAM_MAJ[i % 12] if i < 12 else CAM_MIN[i % 12]  # noqa: E731
    return {"key": name(int(o[0])), "camelot": cam(int(o[0])), "r": r(rr[o[0]], 3), "second": name(int(o[1])),
            "margin": r(rr[o[0]] - rr[o[1]], 3)}


def camelot_steps(a, b):
    """Steps around the Camelot wheel between two keys (0 = the same key; a relative major/minor is 0 steps and a
    letter change), and whether the letter (major/minor) differs."""
    na, la = int(a[:-1]), a[-1]
    nb, lb = int(b[:-1]), b[-1]
    d = abs(na - nb) % 12
    return min(d, 12 - d), la != lb


def harmonic_chroma(mono48):
    """Harmonic CQT chroma of a 48 kHz mono excerpt, analysed at 22.05 kHz as the maps were (HPSS 17 x 17, 36 bins an
    octave): chroma (12, n), frame times from the excerpt's start, and frame energy."""
    import librosa
    y = soxr.resample(mono48.astype(np.float32), SR, ASR, quality="HQ").astype(np.float32)
    D = librosa.stft(y, n_fft=2048, hop_length=512)
    S = np.abs(D)
    H = ndi.median_filter(S, size=(1, 17), mode="nearest")
    P = ndi.median_filter(S, size=(17, 1), mode="nearest")
    Mh = H ** 2 / (H ** 2 + P ** 2 + 1e-12)
    yh = librosa.istft(D * Mh, hop_length=512, length=len(y)).astype(np.float32)
    tuning = float(librosa.estimate_tuning(S=S, sr=ASR, n_fft=2048))
    C = librosa.feature.chroma_cqt(y=yh, sr=ASR, hop_length=512, bins_per_octave=36, tuning=tuning * 3)
    E = (S ** 2).sum(0)[:C.shape[1]]
    t = librosa.times_like(C, sr=ASR, hop_length=512)
    return C, t, E


def span_chroma(C, t, E, a, b):
    m = (t >= a) & (t < b)
    if m.sum() < 2:
        return None
    c = (C[:, m] * E[m]).sum(1) / (E[m].sum() + 1e-12)
    return c / (np.linalg.norm(c) + 1e-12)


def cosv(a, b):
    return None if a is None or b is None else r(float(np.dot(a, b)), 4)


def harmony_across(mono48, t0, seam, beats_before, beats_after):
    """Chroma and key across a point at `seam` seconds into the excerpt (which starts at t0 in its own clock): the
    last beat against the first beat after it, the bar before against the bar after, and the key of the 2 bars on each
    side. Beats are in the excerpt's clock; beats_before end at the seam, beats_after start there."""
    C, t, E = harmonic_chroma(mono48)
    bb, ba = beats_before, beats_after
    out = {}
    if len(bb) >= 2 and len(ba) >= 2:
        out["beat_cos"] = cosv(span_chroma(C, t, E, bb[-1], seam), span_chroma(C, t, E, ba[0], ba[1]))
    if len(bb) >= 5 and len(ba) >= 5:
        out["bar_cos"] = cosv(span_chroma(C, t, E, bb[-4], seam), span_chroma(C, t, E, ba[0], ba[4]))
    if len(bb) >= 9 and len(ba) >= 9:
        kb = key_of(span_chroma(C, t, E, bb[-8], seam))
        ka = key_of(span_chroma(C, t, E, ba[0], ba[8]))
        st, letter = camelot_steps(kb["camelot"], ka["camelot"])
        out.update(key_before=kb, key_after=ka, camelot_steps=st, mode_change=letter)
        cb = span_chroma(C, t, E, bb[-8], seam)
        ca = span_chroma(C, t, E, ba[0], ba[8])
        top = lambda c: [PCN[i] for i in np.argsort(-c)[:4]]  # noqa: E731
        out["top_pitch_classes_before"], out["top_pitch_classes_after"] = top(cb), top(ca)
        out["two_bar_cos"] = cosv(cb, ca)
    return out


# ------------------------------------------------------------------------------------------------ onsets and grid
def onsets_on_grid(mono48, t0, beats, tol=0.060, env=None):
    """For each beat (seconds in the film), the strongest spectral-flux onset within +-60 ms (score_build.onset_env);
    a beat counts when that onset stands clear of its +-250 ms neighbourhood (x2 its median). Offsets in ms. env:
    the onset envelope (times in the film, flux) when it is already computed."""
    if env is None:
        tt, fl = sb.onset_env(mono48)
        tt = tt + t0
    else:
        tt, fl = env
    offs = []
    for b in beats:
        m = np.abs(tt - b) <= tol
        if m.sum() < 3:
            continue
        nb = np.abs(tt - b) <= 0.25
        if fl[m].max() <= np.median(fl[nb]) * 2.0:
            continue
        offs.append(float(tt[m][int(np.argmax(fl[m]))] - b) * 1000)
    offs = np.array(offs)
    return {"beats": int(len(beats)), "with_clear_attack": int(len(offs)),
            "median_offset_ms": r(np.median(offs), 1) if len(offs) else None,
            "max_abs_offset_ms": r(np.max(np.abs(offs)), 1) if len(offs) else None,
            "share_within_8ms": r((np.abs(offs) <= 8.33).mean(), 3) if len(offs) else None}


def own_lsd_at_downbeats(track, corr, xf=XF, win=2048):
    """The track's own spectral change at each of its measured downbeats (as built), with the seam's geometry: the
    46 ms ending xf before the downbeat against the 46 ms starting on it."""
    y = load48(track).mean(1)
    vals = []
    for d in tmap(track)["downbeats_s"]:
        i = int(round((d + corr) * SR))
        ix = int(round((d + corr - xf) * SR))
        if ix - win >= 0 and i + win <= len(y):
            seg = y[i:i + win]
            if np.sqrt(np.mean(seg ** 2)) > 1e-4:
                vals.append(cp.lsd(y[ix - win:ix], seg))
    return np.array(vals)


def pct(vals, v):
    return None if v is None or not len(vals) else r(100.0 * float(np.mean(vals <= v)), 1)


def hf_burst(mono, t, sr=SR):
    tt, e = cp.hf_db(mono, sr, t - 0.5, t + 0.5)
    near = np.abs(tt - t) <= 0.010
    return float(e[near].max() - np.median(e)) if near.any() else None


def hf_flux_by_beat(mono48, t0, beats):
    """The 8-16 kHz attack strength per beat: the largest 5-ms rise of that band within the beat (dB). The hats' and
    shakers' presence; a low value is a breath in them."""
    tt, e = cp.hf_db(mono48, SR, 0.06, len(mono48) / SR - 0.06)
    tt = tt + t0
    rise = np.r_[0, np.maximum(np.diff(e), 0)]
    out = []
    for a, b in zip(beats[:-1], beats[1:]):
        m = (tt >= a) & (tt < b)
        out.append(float(rise[m].max()) if m.any() else None)
    return out


# ------------------------------------------------------------------------------------------------ probe
def splice_edit(y, out_s, in_s, half=6.0, y_in=None, g_out=0.0, g_in=0.0, xf=XF):
    """[out_s - half, out_s) of y, then [in_s, in_s + half) of y_in (y when None), with the cutter's pre-roll: an
    equal-power crossfade over the xf before the seam that ends on the incoming downbeat. The seam sits at `half`."""
    y_in = y if y_in is None else y_in
    n, nx = int(round(half * SR)), int(round(xf * SR))
    io, ii = int(round(out_s * SR)), int(round(in_s * SR))
    a = y[io - n:io].copy() * 10 ** (g_out / 20)
    b = y_in[ii - nx:ii + n].copy() * 10 ** (g_in / 20)
    w = np.linspace(0, np.pi / 2, nx, dtype=np.float32)[:, None]
    a[-nx:] = a[-nx:] * np.cos(w) + b[:nx] * np.sin(w)
    return np.vstack([a, b[nx:]])


def beats_near(track, s, corr, n=9):
    """The track's measured beats (as built) within n beats before and after source time s (the seam), as offsets."""
    bt = np.array(tmap(track)["beats_s"]) + corr
    before = bt[(bt < s - 0.02)][-n:] - s
    after = bt[(bt >= s - 0.02)][:n] - s
    return before, after


def seam_metrics(edit, half, y_out, out_s, y_in, in_s, tr_out, tr_in, c_out, c_in, own_lsd, xf=XF):
    """Measure one assembled seam (the edit, with the seam at `half`) against both sources at their cut points."""
    mono = edit.mean(1)
    res = {}
    res["step_3s_lu"] = r(lufs(edit, half + 0.05, half + 3.0) - lufs(edit, half - 3.0, half - 0.05))
    res["step_400ms_lu"] = r(lufs(edit, half + 0.05, half + 0.45) - lufs(edit, half - 0.45, half - 0.05))
    res["incoming_own_step_3s_lu"] = r(lufs(y_in, in_s + 0.05, in_s + 3.0) - lufs(y_in, in_s - 3.0, in_s - 0.05))
    res["outgoing_own_step_3s_lu"] = r(lufs(y_out, out_s + 0.05, out_s + 3.0) - lufs(y_out, out_s - 3.0, out_s - 0.05))
    win = 2048
    i, ix = int(round(half * SR)), int(round((half - xf) * SR))
    lsd_e = cp.lsd(mono[ix - win:ix], mono[i:i + win])
    yi = y_in.mean(1)
    ii, iix = int(round(in_s * SR)), int(round((in_s - xf) * SR))
    lsd_s = cp.lsd(yi[iix - win:iix], yi[ii:ii + win])
    res.update(lsd_db=r(lsd_e), lsd_incoming_own_db=r(lsd_s), extra_lsd_db=r(lsd_e - lsd_s),
               lsd_percentile_of_incoming_own_downbeats=pct(own_lsd, lsd_e),
               own_downbeat_lsd_p50_p95=[r(np.percentile(own_lsd, 50)), r(np.percentile(own_lsd, 95))])
    hf_e = hf_burst(mono, half)
    hf_s = hf_burst(yi, in_s)
    res.update(hf_click_db=r(hf_e), extra_hf_db=r(hf_e - hf_s) if hf_e is not None and hf_s is not None else None,
               d2_ratio_at_seam=r(sb.discontinuity(mono, half), 3),
               d2_ratio_at_crossfade_start=r(sb.discontinuity(mono, half - xf), 3))
    # chroma and key: the edit across the seam, against each source's own continuation at its cut point
    bo, _ = beats_near(tr_out, out_s, c_out)
    _, ai = beats_near(tr_in, in_s, c_in)
    res["harmony_edit"] = harmony_across(mono, 0.0, half, list(bo + half), list(ai + half))
    ob, oa = beats_near(tr_in, in_s, c_in)
    a0 = max(0.0, in_s - half)
    res["harmony_incoming_own"] = harmony_across(yi[int(a0 * SR):int((in_s + half) * SR)], 0.0, in_s - a0,
                                                 list(ob + in_s - a0), list(oa + in_s - a0))
    yo = y_out.mean(1)
    pb, pa = beats_near(tr_out, out_s, c_out)
    a1 = max(0.0, out_s - half)
    res["harmony_outgoing_own"] = harmony_across(yo[int(a1 * SR):int((out_s + half) * SR)], 0.0, out_s - a1,
                                                 list(pb + out_s - a1), list(pa + out_s - a1))
    # onsets on the grid: the beats either side of the seam, on the edit
    grid = list(bo[-4:] + half) + list(ai[:4] + half)
    res["onsets_around_seam"] = onsets_on_grid(mono, 0.0, grid)
    if len(bo) and len(ai):
        per_o = float(np.median(np.diff(np.array(tmap(tr_out)["beats_s"]))))
        res["beat_interval_across_ms"] = r((ai[0] - bo[-1]) * 1000, 1)
        res["beat_interval_outgoing_ms"] = r(per_o * 1000, 1)
    return res


def mel_curves(y, t0, mel_fb):
    m, mt = cp.mel_db(y, SR, mel_fb)
    ms = cp.kweighted_ms(y, SR)
    mo, st = cp.curves(ms)
    return {"mel": m, "mel_t": (mt + t0).astype(np.float32), "lt": (np.arange(len(ms)) * cp.LH + cp.LH / 2 + t0).astype(np.float32),
            "mom": mo.astype(np.float32), "st": st.astype(np.float32)}


def probe(cand_path, out, layers_path):
    T0 = time.perf_counter()
    corr = corrections(layers_path)
    cands = json.load(open(cand_path))
    mel_fb = cp.mel_filterbank()
    res = {"what": "every candidate splice and J2 out-point, assembled in memory as built (the build's source-time "
                   "corrections applied); nothing written but numbers and curves", "corrections_s": corr,
           "M2": [], "M3": [], "J2": []}
    npz = {}
    b2, b4 = TRACK_OF["B2"], TRACK_OF["B4"]
    yb2, yb4 = load48(b2), load48(b4)
    own = {b2: own_lsd_at_downbeats(b2, corr.get(b2, 0.0)), b4: own_lsd_at_downbeats(b4, corr.get(b4, 0.0))}
    res["own_downbeat_lsd"] = {k: {"n": int(len(v)), "p50": r(np.percentile(v, 50)), "p90": r(np.percentile(v, 90)),
                                   "p95": r(np.percentile(v, 95))} for k, v in own.items()}
    half = 6.0
    want_m2 = [c for c in cands["M2"] if c["out_bar"] is not None][:8]
    for extra in ((17, 19), (17, 21), (17, 23), (22, 26)):  # the three splices on Ring 2's arrival, and the cheapest
        if not any(c["out_bar"] == extra[0] and c["in_bar"] == extra[1] for c in want_m2):
            want_m2 += [c for c in cands["M2"] if c["out_bar"] == extra[0] and c["in_bar"] == extra[1]]
    for key, track, y, lst in (("M2", b2, yb2, want_m2), ("M3", b4, yb4, cands["M3"])):
        d = corr.get(track, 0.0)
        dbs = tmap(track)["downbeats_s"]
        for c in lst:
            o_s, i_s = dbs[c["out_bar"]] + d, dbs[c["in_bar"]] + d
            ed = splice_edit(y, o_s, i_s, half)
            m = seam_metrics(ed, half, y, o_s, y, i_s, track, track, d, d, own[track])
            m.update(label=c["label"], out_bar=c["out_bar"], in_bar=c["in_bar"], map_cost=c["cost"],
                     source_out_s=r(o_s, 4), source_in_s=r(i_s, 4))
            res[key].append(m)
            tag = f"{key}_{c['out_bar']}_{c['in_bar']}"
            for k_, v_ in mel_curves(ed, -half, mel_fb).items():
                npz[f"{tag}_edit_{k_}"] = v_
            print(key, c["label"], json.dumps({k: m[k] for k in ("step_3s_lu", "step_400ms_lu", "extra_lsd_db",
                                                                    "lsd_percentile_of_incoming_own_downbeats",
                                                                    "extra_hf_db")}), flush=True)
    # J2's out-points: B2 at the end of bar e-1 (gain -5.5) into B4's riser bar 47 (gain -5.0)
    d2, d4 = corr.get(b2, 0.0), corr.get(b4, 0.0)
    in_s = tmap(b4)["downbeats_s"][47] + d4
    for e in (24, 26, 28, 30):  # the out-points of 17:19, 17:21 and 17:23, and the no-splice exit
        o_s = tmap(b2)["downbeats_s"][e] + d2
        ed = splice_edit(yb2, o_s, in_s, half, y_in=yb4, g_out=-5.5, g_in=-5.0)
        m = seam_metrics(ed, half, yb2, o_s, yb4, in_s, b2, b4, d2, d4, own[b4])  # steps and distances: gain-free
        # the breath before the cut: the 8-16 kHz attacks of the last 8 beats of B2 before its out-point
        bo, _ = beats_near(b2, o_s, d2, n=9)
        a0 = o_s - 5.0
        seg = yb2[int(a0 * SR):int((o_s + 0.05) * SR)].mean(1)
        fl = hf_flux_by_beat(seg, a0, list(bo + o_s) + [o_s])
        m.update(label=f"J2: B2 out at bar {e} ({o_s:.3f} s) into B4 bar 47", end_bar=e,
                 hf_attack_db_last_8_beats=[r(v, 1) for v in fl[-8:]],
                 breath_db=r(np.mean([v for v in fl[-2:] if v is not None]) - np.mean([v for v in fl[-6:-2] if v is not None]), 1))
        res["J2"].append(m)
        for k_, v_ in mel_curves(ed, -half, mel_fb).items():
            npz[f"J2_{e}_edit_{k_}"] = v_
        print("J2", e, json.dumps({k: m.get(k) for k in ("step_3s_lu", "breath_db", "extra_lsd_db")}), flush=True)
    res["secs"] = round(time.perf_counter() - T0, 1)
    res["peak_rss_mb"] = round(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1048576, 1)
    res["audio_written"] = "none"
    np.savez_compressed(out + ".npz", **npz)
    json.dump(res, open(out + ".json", "w"), indent=1)
    print(json.dumps({"secs": res["secs"], "rss_mb": res["peak_rss_mb"]}))


# ------------------------------------------------------------------------------------------------ plan
def film_beats(c, key="beats_s"):
    """A cue's measured beats (as built: the plan's src times are already corrected, so the map's beats are moved by
    the same correction) in film time, inside the cue's in- and out-points."""
    d = c.get("src_correction_s", 0.0) or 0.0
    bt = np.array(tmap(c["track"])[key]) + d
    bt = bt[(bt >= c["src_in"] - 1e-3) & (bt <= c["src_out"] + 1e-3)]
    return bt - c["src_in"] + c["film_in"]


def plan_measure(plan_path, out, layers_path):
    T0 = time.perf_counter()
    plan, corr = cp.load_plan(plan_path, layers_path)
    mel_fb = cp.mel_filterbank()
    bed, snips, info, tracks = cp.assemble(plan, keep_tracks=True)
    _tracks.update({k: np.ascontiguousarray(v[:, :2]) for k, v in tracks.items()})  # decode each track once
    res, npz = cp.measure(plan, bed, snips, mel_fb)
    cues = {c["id"]: c for c in plan["cues"]}
    mono = bed.mean(1)
    own = {}
    ex = {"seams": {}, "onsets_vs_beats": {}}
    for s in plan["seams"]:
        cin, cout = cues[s["to"]], cues[s["from"]]
        ts, tin = s["t"], s.get("in_film", s["t"])
        tr_in = cin["track"]
        if tr_in not in own:
            own[tr_in] = own_lsd_at_downbeats(tr_in, corr.get(tr_in, 0.0) if corr else 0.0)
        sm = next(x for x in res["seams"] if x["id"] == s["id"])
        e = {"lsd_percentile_of_incoming_own_downbeats": pct(own[tr_in], sm["lsd_film_db"]),
             "incoming_own_downbeat_lsd_p50_p95": [r(np.percentile(own[tr_in], 50)), r(np.percentile(own[tr_in], 95))],
             "d2_ratio_at_seam": r(sb.discontinuity(mono, ts), 3),
             "d2_ratio_at_in": r(sb.discontinuity(mono, tin), 3) if tin != ts else None}
        bo = film_beats(cout)
        bi = film_beats(cin)
        bo, bi = bo[bo < ts - 0.02], bi[bi >= tin - 0.02]
        a0 = max(0.0, ts - 6.0)
        seg = mono[int(a0 * SR):int((tin + 6.0) * SR)]
        if cin["head"]["mode"] != "fade" and len(bo) and len(bi):
            e["harmony"] = harmony_across(seg, a0, ts - a0, list(bo[-9:] - a0), list(bi[:9] - a0))
            e["onsets_around_seam"] = onsets_on_grid(seg, a0, list(bo[-4:]) + list(bi[:4]))
            e["beat_interval_across_ms"] = r((bi[0] - bo[-1]) * 1000, 1)
        # each source's own harmony at its cut point (the track's natural continuation there)
        for side, c_, p in (("incoming_own", cin, cin["src_in"]), ("outgoing_own", cout, cout["src_out"])):
            y = tracks[c_["track"]].mean(1)
            d = c_.get("src_correction_s", 0.0) or 0.0
            bt = np.array(tmap(c_["track"])["beats_s"]) + d
            b_, a_ = bt[bt < p - 0.02][-9:], bt[bt >= p - 0.02][:9]
            q0 = max(0.0, p - 6.0)
            if len(b_) >= 2 and len(a_) >= 2:
                e["harmony_" + side] = harmony_across(y[int(q0 * SR):int((p + 6.0) * SR)], q0, p - q0,
                                                      list(b_ - q0), list(a_ - q0))
        ex["seams"][s["id"]] = e
    env = sb.onset_env(mono)
    for c in plan["cues"]:
        f0, f1, fout = cp.cue_extent(c)
        bts = film_beats(c)
        bts = bts[(bts >= c["film_in"] + 0.25) & (bts <= min(fout, f1) - 0.25)]
        if len(bts) >= 4:
            ex["onsets_vs_beats"][c["id"]] = onsets_on_grid(mono, 0.0, list(bts), env=env)
    # the Return, per film bar: the bed's loudness and air, and the source bar's density from the map
    if "return" in plan:
        R0, title = plan["return"]["R0_film_s"], plan["return"]["R720_film_s"]
        rows = []
        f, tt, Z = ss.stft(mono[int((R0 - 13.0) * SR):int((title + 6.5) * SR)], fs=SR, nperseg=2048, noverlap=2048 - 512)
        P = np.abs(Z) ** 2
        air = P[f >= 5000].sum(0) / (P.sum(0) + 1e-20)
        en = P.sum(0)
        tt = tt + (R0 - 13.0)
        for c in plan["cues"]:
            if c["track"] not in (TRACK_OF["B2"], TRACK_OF["A4"]):
                continue
            dbs = film_beats(c, "downbeats_s")
            raw = np.array(tmap(c["track"])["downbeats_s"]) + (c.get("src_correction_s", 0.0) or 0.0)
            for k, fb in enumerate(dbs[:-1]):
                fe = dbs[k + 1]
                if fe <= R0 - 12.1 or fb >= title + 6.1:
                    continue
                src = fb - c["film_in"] + c["src_in"]
                bi = int(np.argmin(np.abs(raw - src)))
                bt = tmap(c["track"])["bar_table"][bi] if bi < len(tmap(c["track"])["bar_table"]) else {}
                m = (tt >= fb) & (tt < fe)
                rows.append({"cue": c["id"], "track": c["track"], "bar": bi, "film_s": r(fb, 4), "R": round((fb - R0) * 60),
                             "bed_lufs": r(lufs(bed, fb, fe)), "bed_air_share": r((air[m] * en[m]).sum() / (en[m].sum() + 1e-20), 4),
                             "map_onsets_per_beat": bt.get("perc_onsets_per_beat"), "map_air": bt.get("air"),
                             "map_lufs_raw": bt.get("lufs"), "map_novelty": tmap(c["track"])["novelty_by_bar"][bi]})
        rows.sort(key=lambda x: x["film_s"])
        ex["return_bars"] = rows
        st = {b["label"]: b for b in res["blocks"]}
        ex["title_arrival"] = {
            "title_film_s": title,
            "lufs_1s_before": r(lufs(bed, title - 1.0, title)), "lufs_1s_after": r(lufs(bed, title, title + 1.0)),
            "step_1s_lu": r(lufs(bed, title, title + 1.0) - lufs(bed, title - 1.0, title)),
            "step_400ms_lu": r(lufs(bed, title + 0.0, title + 0.4) - lufs(bed, title - 0.4, title)),
            "bar_before_lufs": r(lufs(bed, title - 2.0, title)), "bar_after_lufs": r(lufs(bed, title, title + 2.0))}
        ret = [b for k_, b in st.items() if k_.startswith("Return")]
        ex["return_vs_climax"] = {
            "climax_st_max": st["Climax"]["st_max"], "return_st_max": max(b["st_max"] for b in ret),
            "return_blocks": {b["label"]: {k: b[k] for k in ("integrated_lufs", "st_min", "st_median", "st_max")} for b in ret},
            "merge_vs_rush_lu": r(st["Return: merge"]["integrated_lufs"] - st["Return: rush"]["integrated_lufs"])}
        npz["return_air_t"] = tt.astype(np.float32)
        npz["return_air"] = air.astype(np.float32)
    res["extras"] = ex
    res = {"plan": os.path.basename(plan_path), **res, "tracks": info, "source_time_correction_s": corr,
           "secs": round(time.perf_counter() - T0, 1),
           "peak_rss_mb": round(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1048576, 1)}
    np.savez_compressed(out + ".npz", **npz)
    json.dump(res, open(out + ".metrics.json", "w"), indent=1)
    print(json.dumps({"bed": res["bed"], "secs": res["secs"], "rss_mb": res["peak_rss_mb"]}))


# ------------------------------------------------------------------------------------------------ title (classifier)
SOUND_TAGS = sb.SOUND_TAGS


def peaking_sos(f0, gain_db, q):
    """RBJ cookbook peaking EQ as one second-order section."""
    A = 10 ** (gain_db / 40.0)
    w0 = 2 * math.pi * f0 / SR
    al_ = math.sin(w0) / (2 * q)
    b = [1 + al_ * A, -2 * math.cos(w0), 1 - al_ * A]
    a = [1 + al_ / A, -2 * math.cos(w0), 1 - al_ / A]
    return np.array([[b[0] / a[0], b[1] / a[0], b[2] / a[0], 1.0, a[1] / a[0], a[2] / a[0]]])


def eq_any(y, specs):
    """Zero-phase EQ (each section at half its gain, forwards and backwards): shelves as score_build.py, plus peaking."""
    for s in specs:
        if s["type"] == "peaking":
            sos = peaking_sos(s["hz"], s["gain_db"] / 2.0, s.get("q", 0.9))
            y = ss.sosfiltfilt(sos, y, axis=0).astype(np.float32)
        else:
            y, _ = sb.eq_zero_phase(y, [s])
    return y


def classify_grid(mix_g, t_first, t_last, tmp_dir):
    """The classifier on every 3 s window starting at t_first + 0.5 k up to t_last: six phase-shifted files of 3 s
    windows (SoundAnalysis, no overlap), each a temporary WAV deleted as soon as it is read."""
    rows = []
    n_win = int(math.ceil((t_last - t_first) / 3.0)) + 1
    for p in range(6):
        s0 = t_first + 0.5 * p
        a, b = int(round(s0 * SR)), int(round((s0 + 3.0 * n_win) * SR))
        z = np.zeros((b - a, 2), dtype=np.float32)
        z[:max(0, min(b, len(mix_g)) - a)] = mix_g[a:min(b, len(mix_g))]
        for rw in al.timeline(z, SOUND_TAGS, tmp_dir):
            t = s0 + rw["t"]
            if rw["t"] + 3.0 <= 3.0 * n_win + 1e-6 and t <= t_last + 1e-6:
                rows.append({"t": r(t, 3), "labels": rw["labels"]})
    rows.sort(key=lambda x: x["t"])
    return rows


def summarise(rows, label="foghorn"):
    """The build's gates (score_build.classify_master): a voice or alarm label fails at 0.30 or in a window's top 3;
    a phone or foghorn label fails at 0.30 and warns from 0.25."""
    ps = [(rw["t"], rw["labels"].get(label, 0.0)) for rw in rows]
    mx = max(ps, key=lambda x: x[1]) if ps else (None, 0.0)
    watched, top3_hits = {}, []
    for rw in rows:
        top3 = [k for k, _ in sorted(rw["labels"].items(), key=lambda kv: -kv[1])[:3]]
        for lab, p in rw["labels"].items():
            kind = al.label_kind(lab)
            if kind in ("voice", "alarm", "phone", "foghorn"):
                watched[lab] = max(watched.get(lab, 0.0), p)
            if kind in ("voice", "alarm") and lab in top3:
                top3_hits.append({"t": rw["t"], "label": lab, "p": r(p, 3)})
    fail = any(p >= 0.30 for _, p in ps) or any(v >= 0.30 for v in watched.values()) or bool(top3_hits)
    warn = any(p >= 0.25 for _, p in ps) or any(v >= 0.25 for v in watched.values())
    return {f"{label}_max": r(mx[1], 3), f"{label}_max_at": mx[0], "windows": len(rows),
            "windows_ge_0.30": sum(1 for _, p in ps if p >= 0.30), "windows_ge_0.25": sum(1 for _, p in ps if p >= 0.25),
            "watched_max": {k: r(v, 3) for k, v in sorted(watched.items(), key=lambda kv: -kv[1])},
            "voice_or_alarm_in_top3": top3_hits,
            "verdict": "fail" if fail else ("warn" if warn else "ok")}


def title_check(plan_path, metrics_path, out, layers_path, variants_path=None):
    T0 = time.perf_counter()
    plan, corr = cp.load_plan(plan_path, layers_path)
    M = json.load(open(metrics_path))
    kit, kplan = sb.load_kit()
    j5 = next(s["t"] for s in plan["seams"] if s["id"] == "J5")
    title = plan["return"]["R720_film_s"]
    N = int(np.ceil(plan["end_film_s"] * SR)) + 1
    a4 = load48(TRACK_OF["A4"])
    a4cues = [c for c in plan["cues"] if c["track"] == TRACK_OF["A4"] and c["film_in"] > 60.0]
    g_master = -16.0 - (M["bed"]["integrated_lufs"] + 0.05)  # the layers added +0.05 LU on 22:13's build
    tmp_dir = os.path.join(os.path.dirname(out), "tmp-classifier")
    os.makedirs(tmp_dir, exist_ok=True)
    duck = {"id": "title", "t": title, "db": -1.5, "attack_s": 0.01, "hold_s": 0.25, "release_s": 0.4}
    L = {
        "swell": {"id": "title_swell", "swell": {"track": TRACK_OF["A4"], "at_src": 164.5244, "beats": 4, "bpm": 120.014},
                  "t": title, "align": "end", "level": {"mode": "rel", "ref": [title - 1.0, title], "offset_db": -3.0},
                  "highpass_hz": 150.0},
        "tap": {"id": "title_tap", "take": "standin_tap_a", "t": title, "align": "peak", "tune": {"to_note": "E"},
                "level": {"mode": "rel", "ref": [title, title + 3.0], "offset_db": -3.0}},
        "hit_cc0": {"id": "title_hit", "take": "impact_body_cc0", "t": title, "align": "peak", "tune": {"to_note": "G#"},
                    "level": {"mode": "rel", "ref": [title, title + 3.0], "offset_db": 3.0}, "prelimit_db": 4.0, "highpass_hz": 70.0},
        "sub": {"id": "title_sub", "designed": {"base": "sub_drop_b", "params": {"f0": 69.3, "f1": 34.65}}, "t": title,
                "align": "start", "level": {"mode": "rel", "ref": [title, title + 3.0], "offset_db": -4.0}},
    }
    variants = [
        {"id": "music", "layers": [], "what": "the music alone, ducked as built (the dip as planned)"},
        {"id": "music_swell", "layers": ["swell"], "what": "+ the one-bar reverse swell"},
        {"id": "music_swell_tap", "layers": ["swell", "tap"], "what": "+ the stone tap (standin_tap_a, CC0, tuned to E)"},
        {"id": "music_swell_tap_sub", "layers": ["swell", "tap", "sub"], "what": "+ sub 3 (69.3 -> 34.65 Hz)"},
        {"id": "composite_cc0", "layers": ["swell", "tap", "hit_cc0", "sub"],
         "what": "the whole title composite with the CC0 hit (impact_body_cc0, tuned to G#2, the title chord's fifth)"},
    ]  # no variant uses a script-fetched Mixkit take (OVERRIDES §55 CR-13): the CC0 hit stands in for the Sonniss boom
    if variants_path:
        variants += json.load(open(variants_path))
    tracks48 = {TRACK_OF["A4"]: a4}
    takes = {}
    res = {"plan": os.path.basename(plan_path), "j5_film_s": j5, "title_film_s": title,
           "master_gain_db": r(g_master, 3), "duck": duck, "layers": {}, "variants": [],
           "windows": "every 3 s window starting from J5 + 2 ms to title + 5.5 s on a 0.5 s grid (the master's grids, "
                      "main from 0 and shifted 1.5 s, are both on it, 34 ms later at J5): Born Of The Sky and kit sounds only"}
    for v in variants:
        bed = np.zeros((N, 2), dtype=np.float32)
        for c in a4cues:
            c2 = dict(c)
            if v.get("dip") is False and c["id"] == "M6a":
                c2["gain_db"] = [[0.0, -0.3]]
            if v.get("dip_db") is not None and c["id"] == "M6a":
                d_ = v["dip_db"]
                c2["gain_db"] = [[j5 - 1.0, -0.3 + d_], [title - 0.05, -0.3 + d_], [title, -0.3]]
            y_src = a4
            if v.get("eq"):
                alt = eq_any(a4, v["eq"]["specs"])
                q = v["eq"]
                ramp = {"full_until_film_s": q.get("full_until_film_s", title + q.get("full_until_title_plus_s", 0.0)),
                        "zero_at_film_s": q.get("zero_at_film_s", title + q.get("zero_at_title_plus_s", 2.0))}
                sb.lay(bed, c2, y_src, alt, ramp)  # the EQ'd A4 in full from J5, easing to the plain A4 over the ramp
            else:
                sb.lay(bed, c2, y_src)
        dg = sb.duck_gain(N, [duck])
        music = bed * dg[:, None]
        sfx = np.zeros_like(bed)
        recs = []
        for key in v["layers"]:
            Ly = dict(L[key])
            if key not in takes:
                takes[key] = sb.make_take(Ly, kit, kplan, tracks48)
            y, rec = takes[key]
            lv = Ly["level"]
            ref = lufs(bed, lv["ref"][0], lv["ref"][1])
            gain = ref + lv["offset_db"] - sb.mmax_lufs(y)
            i0 = sb.place_index(y, Ly["t"], Ly["align"])
            a, b = max(0, i0), min(N, i0 + len(y))
            sfx[a:b] += y[a - i0:b - i0] * 10 ** (gain / 20)
            recs.append({"layer": key, "id": Ly["id"], "gain_db": r(gain), "film_s": [r(a / SR, 4), r(b / SR, 4)],
                         "loudest_400ms_lufs_in_film": r(sb.mmax_lufs(y * 10 ** (gain / 20))), "bed_ref_lufs": r(ref)})
            res["layers"][key] = {k: rec.get(k) for k in ("take", "licence", "status", "final_allowed", "designed", "swell",
                                                         "tune", "prelimit", "highpass")}
        mix_g = (music + sfx) * 10 ** (g_master / 20)
        rows = classify_grid(mix_g, j5 + 0.002, title + 5.5, tmp_dir)
        sm = summarise(rows)
        res["variants"].append({"id": v["id"], "what": v["what"], **{k: v[k] for k in ("dip", "dip_db", "eq") if k in v},
                                "placed": recs, **sm, "rows": rows})
        print(v["id"], json.dumps({k: sm[k] for k in ("foghorn_max", "foghorn_max_at", "windows_ge_0.30",
                                                     "windows_ge_0.25", "verdict")}), flush=True)
        del bed, music, sfx, mix_g
    try:
        os.rmdir(tmp_dir)
    except OSError:
        pass
    res["secs"] = round(time.perf_counter() - T0, 1)
    res["peak_rss_mb"] = round(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1048576, 1)
    res["audio_written"] = ("temporary WAVs of Born Of The Sky (CC BY 4.0) with the kit's CC0 and designed sounds only "
                            "(no Mixkit music, no Mixkit take), each deleted as soon as the classifier read it")
    json.dump(res, open(out + ".json", "w"), indent=1)
    print(json.dumps({"secs": res["secs"], "rss_mb": res["peak_rss_mb"]}))


# ------------------------------------------------------------------------------------------------ the x40 mask
def make_mask(spec, kit):
    """A reverse swell from impact_body_cc0's own room tail: from its peak + 0.08 s, tuned by varispeed, cut to the
    mask's length, reversed, with a fade-in at its quiet start and a 4 ms fade at its loud end."""
    k = kit[spec["take"]]
    y, sr = sf.read(os.path.join(sb.KITDIR, k["file"]), dtype="float32", always_2d=True)
    y = sb.stereo(y)
    pk = int(np.argmax(np.abs(y).max(1)))
    tail = y[pk + int(0.08 * SR):]
    semis = 1.0
    ratio = 2 ** (semis / 12)
    tail = ss.resample_poly(tail, 1000, int(round(1000 * ratio)), axis=0, window=("kaiser", 9.0)).astype(np.float32)
    n = int(round(spec["length_s"] * SR))
    seg = tail[:n].copy()
    if len(seg) < n:
        seg = np.vstack([seg, np.zeros((n - len(seg), 2), dtype=np.float32)])
    sw = seg[::-1].copy()
    fi, fo = int(0.03 * SR), int(0.004 * SR)
    sw[:fi] *= (0.5 - 0.5 * np.cos(np.linspace(0, np.pi, fi)))[:, None]
    sw[-fo:] *= (0.5 + 0.5 * np.cos(np.linspace(0, np.pi, fo)))[:, None]
    return sw.astype(np.float32), {"tail_from_s": r((pk + int(0.08 * SR)) / SR, 4), "tuned_semitones": semis,
                                   "length_s": r(n / SR, 4), "how": "varispeed (polyphase), reversed"}


def x40_mask(plan_path, out, layers_path):
    T0 = time.perf_counter()
    plan, corr = cp.load_plan(plan_path, layers_path)
    kit, _ = sb.load_kit()
    bed, snips, info, _ = cp.assemble(plan)
    xj2 = next(s for s in plan["seams"] if s["id"] == "XJ2")
    spec = xj2["mask"]
    t = xj2["t"]
    sw, how = make_mask(spec, kit)
    ref = lufs(bed, spec["level"]["ref"][0], spec["level"]["ref"][1])
    gain = ref + spec["level"]["offset_db"] - sb.mmax_lufs(sw)
    swg = sw * 10 ** (gain / 20)
    i0 = int(round(t * SR)) - len(swg)
    mix = bed.copy()
    mix[i0:i0 + len(swg)] += swg
    res = {"plan": os.path.basename(plan_path), "xj2_film_s": t, "mask": {**how, "gain_db": r(gain),
                                                                         "film_s": [r(i0 / SR, 4), r(t, 4)]}}
    rise_a = sb.lufs_seg(swg, 0.0, 0.2) if len(swg) > 0.2 * SR else None
    rise_b = sb.lufs_seg(swg, len(swg) / SR - 0.2, len(swg) / SR)
    f, p = ss.welch(swg.mean(1).astype(np.float64), fs=SR, nperseg=4096)
    res["mask"].update(rise_lu=r(rise_b - rise_a) if rise_a is not None else None,
                       loudest_400ms_lufs=r(sb.mmax_lufs(swg)), bed_lufs_over_its_second=r(ref),
                       share_above_150hz=r(p[f > 150].sum() / p[(f >= 20)].sum(), 4),
                       last_sample_db_re_peak=r(20 * np.log10(np.abs(swg[-1]).max() / (np.abs(swg).max() + 1e-12) + 1e-12)))
    for nm, y in (("music_alone", bed), ("with_mask", mix)):
        mono = y.mean(1)
        win, i, ix = 2048, int(round(t * SR)), int(round((t - XF) * SR))
        res[nm] = {"step_3s_lu": r(lufs(y, t + 0.05, t + 3.0) - lufs(y, t - 3.0, t - 0.05)),
                   "step_400ms_lu": r(lufs(y, t + 0.05, t + 0.45) - lufs(y, t - 0.45, t - 0.05)),
                   "lufs_1s_before": r(lufs(y, t - 1.0, t)), "lsd_db": r(cp.lsd(mono[ix - win:ix], mono[i:i + win])),
                   "hf_click_db": r(hf_burst(mono, t)), "d2_ratio_at_seam": r(sb.discontinuity(mono, t), 3),
                   "d2_ratio_at_mask_start": r(sb.discontinuity(mono, i0 / SR), 3)}
    mel_fb = cp.mel_filterbank()
    npz = {}
    for nm, y in (("music_alone", bed), ("with_mask", mix)):
        a0 = max(0.0, t - 6.0)
        for k_, v_ in mel_curves(y[int(a0 * SR):int((t + 6.0) * SR)], a0, mel_fb).items():
            npz[f"{nm}_{k_}"] = v_
    np.savez_compressed(out + ".npz", **npz)
    res["secs"] = round(time.perf_counter() - T0, 1)
    res["peak_rss_mb"] = round(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1048576, 1)
    res["audio_written"] = "none (the 40-s cut's music and the mask were assembled in memory only)"
    json.dump(res, open(out + ".json", "w"), indent=1)
    print(json.dumps({k: res[k] for k in ("mask", "music_alone", "with_mask", "secs", "peak_rss_mb")}))


def main():
    cmd = sys.argv[1]
    a = sys.argv[2:]
    if cmd == "probe":
        probe(a[0], a[1], a[2])
    elif cmd == "plan":
        plan_measure(a[0], a[1], a[2])
    elif cmd == "title":
        title_check(a[0], a[1], a[2], a[3], a[4] if len(a) > 4 else None)
    elif cmd == "x40mask":
        x40_mask(a[0], a[1], a[2])
    else:
        raise SystemExit(__doc__)


if __name__ == "__main__":
    main()
