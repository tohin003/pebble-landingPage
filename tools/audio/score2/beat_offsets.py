"""score2 lane: where each track's audible attacks sit against the music map's beat times (no audio is written).

The music map (maps/<Name>.map.json) fitted each track's grid to an onset-strength envelope. Looking at the waveforms
around the cue sheet's cut points showed that for the beat-driven tracks the audible attack comes before the map's beat
time. This script measures it on every mapped beat inside the cues the plans use: the strongest spectral-flux peak
within +-60 ms of the beat (score_build.onset_env: 512-sample Hann at 48 kHz, 2 ms hop, frames centred; on synthetic
bursts it reads 1-3 ms early), and the steepest rise of the 5 kHz-and-up envelope (2 ms RMS). Beats with no clear
attack (a peak under twice the median of the 0.5 s around it) are skipped.

A track gets a correction only when the evidence is tight: at least 16 beats with a clear attack and an interquartile
range of 6 ms or less. The correction is the median flux offset (so a crossfade that ends on the corrected downbeat ends
1-3 ms before the attack's first sample, never inside it).

  scripts/heavy.sh score2-beat-offsets /usr/sbin/taskpolicy -c utility .work/tools-eval/tools-tests/audio-venv/bin/python \
      -I tools/audio/score2/beat_offsets.py .work/score2/cuesheet/plan_main.json .work/score2/cuesheet/plan_x40.json \
      .work/score2/master/beat_offsets.json
"""
import json
import os
import sys
import time

import numpy as np
import scipy.signal as ss

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import score_build as sb  # noqa: E402

SR = sb.SR


def main():
    *plans, out = sys.argv[1:]
    T0 = time.perf_counter()
    spans = {}
    for p in plans:
        for c in json.load(open(p))["cues"]:
            spans.setdefault(c["track"], []).append((c["id"], c["src_in"], c["src_out"]))
    res = {"method": __doc__.split("\n\n")[1].replace("\n", " "), "tracks": {}}
    sos_hf = ss.butter(4, 5000, btype="high", fs=SR, output="sos")
    for tr, cs in sorted(spans.items()):
        y48, info = sb.decode(tr)
        mono = y48.mean(1).astype(np.float64)
        beats = np.array(sb.load_map(tr)["beats_s"])
        rows = []
        for cid, a, b in cs:
            sel = beats[(beats >= a - 0.25) & (beats <= b + 0.25)]
            if not len(sel):
                continue
            i0, i1 = max(0, int((a - 1.5) * SR)), min(len(mono), int((b + 1.5) * SR))
            seg = mono[i0:i1]
            tt, on = sb.onset_env(seg.astype(np.float32))
            tt = tt + i0 / SR
            hf = ss.sosfiltfilt(sos_hf, seg)
            env = np.sqrt(np.convolve(hf ** 2, np.ones(96) / 96, mode="same"))
            de = np.diff(env)
            te = (i0 + np.arange(len(de)) + 0.5) / SR
            for bt in sel:
                w = np.abs(tt - bt) <= 0.060
                ctx = np.abs(tt - bt) <= 0.25
                if w.sum() < 5 or on[w].max() < 2 * np.median(on[ctx]):
                    continue
                w2 = np.abs(te - bt) <= 0.060
                rows.append({"cue": cid, "beat_s": round(float(bt), 4),
                             "flux_ms": round(float(tt[w][np.argmax(on[w])] - bt) * 1000, 1),
                             "hf_rise_ms": round(float(te[w2][np.argmax(de[w2])] - bt) * 1000, 1)})
        f = np.array([r_["flux_ms"] for r_ in rows]) if rows else np.array([])
        h = np.array([r_["hf_rise_ms"] for r_ in rows]) if rows else np.array([])
        summ = {"beats_with_clear_attack": int(len(f)), "cues": sorted({r_["cue"] for r_ in rows})}
        if len(f):
            q1, med, q3 = np.percentile(f, [25, 50, 75])
            summ.update(flux_median_ms=round(float(med), 1), flux_iqr_ms=[round(float(q1), 1), round(float(q3), 1)],
                        hf_rise_median_ms=round(float(np.median(h)), 1))
            tight = len(f) >= 16 and (q3 - q1) <= 6.0
            summ["correction_s"] = round(float(med) / 1000, 4) if tight else 0.0
            summ["applied"] = bool(tight and abs(med) >= 5.0)
            summ["why"] = ("tight: the map's beat times lag the audible attacks" if summ["applied"] else
                           "not applied: " + ("under 5 ms" if tight else "the attacks are not tight enough to correct"))
        res["tracks"][tr] = {"summary": summ, "file": info["file"], "sha256": info["sha256"], "beats": rows}
    res["secs"] = round(time.perf_counter() - T0, 1)
    json.dump(res, open(out, "w"), indent=1)
    print(json.dumps({k: v["summary"] for k, v in res["tracks"].items()}, indent=1))


if __name__ == "__main__":
    main()
