"""Analyse the kit's audition reel: loudness (BS.1770 in Python, and FFmpeg's ebur128 on an AAC encode), spectrum by
octave and by section, Apple's sound classifier (two passes, the film's alarm/siren/phone gates), and each event's
loudest moment. Also writes the arrays the contact sheets are drawn from (sheet.py draws them).

Run through scripts/heavy.sh:
  scripts/heavy.sh sfx2-analyse /usr/sbin/taskpolicy -c utility .work/audio/.venv/bin/python -I \
      tools/audio/sfx2/analyse.py --work .work/sfx2 --reel .work/sfx2/audition/reel --kit-sheet
Writes <reel>.analysis.json, <reel>.m4a (AAC 192 kb/s, for listening), <reel>.sheet.npz and, with --kit-sheet,
<work>/audition/kit.sheet.npz.
"""
import argparse
import json
import math
import os
import re
import subprocess
import sys
import tempfile

import numpy as np
import soundfile as sf

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import audiolib as al  # noqa: E402

here = os.path.dirname(os.path.abspath(__file__))
repo = os.path.abspath(os.path.join(here, "..", "..", ".."))
OCTAVES = [31.5, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]


def octave_levels(y):
    m = al.mono(y).astype(np.float64)
    spec = np.abs(np.fft.rfft(m * np.hanning(len(m)))) ** 2 if len(m) else np.zeros(1)
    f = np.fft.rfftfreq(len(m), 1 / al.SR)
    tot = spec.sum() or 1e-30
    out = {}
    for fc in OCTAVES:
        lo, hi = fc / math.sqrt(2), fc * math.sqrt(2)
        e = spec[(f >= lo) & (f < hi)].sum()
        out[f"{fc:g}"] = {"share": round(float(e / tot), 4), "db_rel": round(10 * math.log10(max(e / tot, 1e-12)), 1)}
    return out


def spectrogram(y, rows=256, fmin=30.0, fmax=20000.0, n_fft=4096, hop=1024):
    m = al.mono(y).astype(np.float64)
    if len(m) < n_fft:
        m = np.concatenate([m, np.zeros(n_fft - len(m))])
    win = np.hanning(n_fft)
    frames = 1 + (len(m) - n_fft) // hop
    idx = np.arange(n_fft)[None, :] + hop * np.arange(frames)[:, None]
    S = np.abs(np.fft.rfft(m[idx] * win, axis=1)) ** 2
    f = np.fft.rfftfreq(n_fft, 1 / al.SR)
    edges = np.geomspace(fmin, fmax, rows + 1)
    out = np.zeros((rows, frames))
    for r in range(rows):
        sel = (f >= edges[r]) & (f < edges[r + 1])
        if not sel.any():
            sel = np.array([int(np.argmin(np.abs(f - math.sqrt(edges[r] * edges[r + 1]))))])
            out[r] = S[:, sel].mean(axis=1)
        else:
            out[r] = S[:, sel].mean(axis=1)
    return (10 * np.log10(out + 1e-14)).astype(np.float32), edges, hop / al.SR


def env_minmax(y, cols):
    m = al.mono(y)
    n = max(1, len(m) // cols)
    m = m[:n * cols].reshape(cols, n) if len(m) >= cols else np.pad(m, (0, cols - len(m))).reshape(cols, 1)
    return m.min(axis=1).astype(np.float32), m.max(axis=1).astype(np.float32)


def ffmpeg_ebur128(ffmpeg, path):
    p = subprocess.run([ffmpeg, "-hide_banner", "-nostats", "-i", path, "-map", "0:a", "-af", "ebur128=peak=true",
                        "-f", "null", "-"], capture_output=True, text=True)
    txt = p.stderr[p.stderr.rfind("Summary:"):]
    g = lambda k: float(re.search(k + r":\s+(-?[\d.]+)", txt).group(1))  # noqa: E731
    return {"lufs_i": g("I"), "lra_lu": g("LRA"), "true_peak_dbtp": g("Peak")}


def classify_windows(y, sound_tags, tmp, shift_s):
    pad = np.vstack([np.zeros((int(shift_s * al.SR), y.shape[1]), dtype=np.float32), y]) if shift_s else y
    fd, path = tempfile.mkstemp(suffix=".wav", dir=tmp)
    os.close(fd)
    try:
        sf.write(path, pad, al.SR, subtype="PCM_24")
        out = json.loads(subprocess.run([sound_tags, path], capture_output=True, text=True, check=True).stdout)
    finally:
        os.remove(path)
    wins = []
    for t in out["timeline"]:
        start = round(t["t"] - shift_s, 2)
        hits = {lab: c for lab, rows in out.get("watch_windows", {}).items() for (ws, c) in rows
                if abs(ws - t["t"]) < 0.05}
        for e in t["top"]:  # labels the helper does not watch (e.g. 'sigh') count when they reach the top 3
            if e["label"] not in hits and al.label_kind(e["label"]) in ("voice", "alarm", "phone", "foghorn"):
                hits[e["label"]] = float(e["p"])
        flags = []
        for lab, c in hits.items():
            k = al.label_kind(lab)
            top = any(e["label"] == lab for e in t["top"])
            if k in ("voice", "alarm") and (c >= al.LIMIT or top):
                flags.append(("fail", lab, c))
            elif k in ("phone", "foghorn") and c >= al.LIMIT:
                flags.append(("fail", lab, c))
            elif k in ("phone", "foghorn") and c >= al.PHONE_TARGET:
                flags.append(("warn", lab, c))
            elif k == "other_watch" and c >= al.LIMIT:
                flags.append(("note", lab, c))
        lvl = "fail" if any(f[0] == "fail" for f in flags) else "warn" if any(f[0] == "warn" for f in flags) \
            else "note" if flags else "ok"
        wins.append({"start_s": start, "top": [(e["label"], e["p"]) for e in t["top"]],
                     "watch": {k: round(v, 3) for k, v in sorted(hits.items(), key=lambda kv: -kv[1])},
                     "flags": [{"level": f[0], "label": f[1], "conf": round(f[2], 3)} for f in flags], "level": lvl})
    return {"tags": out["tags"][:10], "watch": out["watch"], "windows": wins}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--work", default=os.path.join(repo, ".work", "sfx2"))
    ap.add_argument("--reel", required=True, help="the reel's path without extension")
    ap.add_argument("--sound-tags", default=os.path.join(repo, ".work", "audio", "sound_tags"))
    ap.add_argument("--ffmpeg", default="/opt/homebrew/bin/ffmpeg")
    ap.add_argument("--kit-sheet", action="store_true")
    a = ap.parse_args()
    y, _ = al.load(a.reel + ".wav")
    cues = json.load(open(a.reel + ".cues.json", encoding="utf-8"))
    tmp = os.path.join(a.work, "tmp")
    os.makedirs(tmp, exist_ok=True)
    res = {"reel": os.path.relpath(a.reel + ".wav", repo)}
    res["loudness"] = {"lufs_i": al.integrated(y)[0], "lra_lu": al.loudness_range(y),
                       "true_peak_dbtp": round(al.db(al.true_peak(y)), 2),
                       "sample_peak_dbfs": round(al.db(np.max(np.abs(y))), 2)}
    tm, mom = al.windowed_loudness(y, 0.4, 0.05)
    ts, st = al.windowed_loudness(y, 3.0, 0.1)
    res["loudness"]["lufs_m_max"] = round(float(mom.max()), 2)
    res["loudness"]["lufs_s_max"] = round(float(st.max()), 2)
    res["loudness"]["lufs_s_min"] = round(float(st.min()), 2)
    m4a = a.reel + ".m4a"
    subprocess.run([a.ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-i", a.reel + ".wav", "-c:a", "aac",
                    "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", m4a], check=True)
    res["aac_192k"] = ffmpeg_ebur128(a.ffmpeg, m4a)
    res["ffmpeg_wav"] = ffmpeg_ebur128(a.ffmpeg, a.reel + ".wav")
    # mono fold-down and small-speaker share (the film's gates: <= 3 dB lost; >= 0.30 above 150 Hz)
    st2 = al.as_stereo(y)
    mono2 = np.repeat(st2.mean(axis=1, keepdims=True), 2, axis=1)
    li, lm = al.integrated(st2)[0], al.integrated(mono2.astype(np.float32))[0]
    res["mono_fold_loss_db"] = round(li - lm, 2)
    res["lr_correlation"] = round(float(np.corrcoef(st2[:, 0], st2[:, 1])[0, 1]), 3) if st2.shape[1] == 2 else 1.0
    sp = al.spectrum(y)
    res["spectrum"] = {"octaves": octave_levels(y), "centroid_hz": sp["centroid_hz"],
                       "share_above_150hz": sp["share_above_150hz"], "bands": sp["bands"]}
    secs = sorted(cues.get("sections", []), key=lambda s: s["t"])
    res["sections"] = []
    for i, s in enumerate(secs):
        t0, t1 = s["t"], secs[i + 1]["t"] if i + 1 < len(secs) else len(y) / al.SR
        seg = y[int(t0 * al.SR):int(t1 * al.SR)]
        if len(seg) < int(0.1 * al.SR):
            continue
        ss = al.spectrum(seg)
        res["sections"].append({"label": s["label"], "t0": t0, "t1": round(t1, 2),
                                "lufs_m_max": round(float(al.windowed_loudness(seg, 0.4, 0.05)[1].max()), 2),
                                "true_peak_dbtp": round(al.db(al.true_peak(seg)), 2),
                                "centroid_hz": ss["centroid_hz"], "bands": ss["bands"]})
    res["events"] = []
    for c in cues["cues"]:
        if c.get("label") == "bed" or c["role"] == "room_tone":
            continue
        t0, t1 = c["span_s"]
        sel = (tm >= t0 + 0.05) & (tm <= t1 + 0.4)
        res["events"].append({"id": c["id"], "role": c["role"], "label": c["label"], "t": c["t"],
                              "span_s": c["span_s"],
                              "lufs_m_max": round(float(mom[sel].max()), 2) if sel.any() else None})
    res["classifier"] = {"pass_0": classify_windows(y, a.sound_tags, tmp, 0.0),
                         "pass_shift_1.5s": classify_windows(y, a.sound_tags, tmp, 1.5)}
    lv = [w["level"] for p in res["classifier"].values() for w in p["windows"]]
    res["classifier"]["verdict"] = "fail" if "fail" in lv else "warn" if "warn" in lv else "ok"
    S, edges, dt = spectrogram(y)
    lo, hi = env_minmax(y, 1600)
    np.savez_compressed(a.reel + ".sheet.npz", spec=S, edges=edges, dt=dt, env_lo=lo, env_hi=hi, mom_t=tm,
                        mom=mom.astype(np.float32), st_t=ts, st=st.astype(np.float32),
                        dur=len(y) / al.SR)
    json.dump(res, open(a.reel + ".analysis.json", "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    print(json.dumps({k: res[k] for k in ("loudness", "aac_192k", "mono_fold_loss_db")}, indent=1))
    print("classifier:", res["classifier"]["verdict"])
    if a.kit_sheet:
        kit = json.load(open(os.path.join(a.work, "KIT.json"), encoding="utf-8"))
        arr = {}
        meta = []
        for i, f in enumerate(kit["files"]):
            yk, _ = al.load(os.path.join(a.work, f["file"]))
            S, edges, dt = spectrogram(yk, rows=96, n_fft=2048, hop=256)
            lo, hi = env_minmax(yk, 600)
            arr[f"spec_{i}"], arr[f"lo_{i}"], arr[f"hi_{i}"] = S, lo, hi
            meta.append({"i": i, "id": f["id"], "role": f["role"], "status": f.get("status"),
                         "dur": f["measure"]["duration_s"], "tp": f["measure"]["true_peak_dbtp"],
                         "m": f["measure"]["lufs_m_max"], "i_lufs": f["measure"]["lufs_i"],
                         "verdict": f.get("classifier", {}).get("verdict"), "dt": dt})
        np.savez_compressed(os.path.join(a.work, "audition", "kit.sheet.npz"), edges=edges, **arr)
        json.dump(meta, open(os.path.join(a.work, "audition", "kit.sheet.json"), "w"), indent=1)
    if os.path.isdir(tmp) and not os.listdir(tmp):
        os.rmdir(tmp)


if __name__ == "__main__":
    main()
