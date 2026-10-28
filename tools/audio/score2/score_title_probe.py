"""score2 lane: why the title's 'foghorn' reading moved, and what moves it back (no audio is kept).

Builds the music alone from J5 to the title + 5.5 s (Born Of The Sky's M6a, as the masters place it) for several
variants of M6a's dip and source correction, at the web master's gain, and reads Apple's classifier on the cue sheet's
0.5-s grid of 3 s windows (revise_measure.classify_grid: temporary WAVs, each deleted as soon as it is read). Born Of
The Sky only (CC BY), so no temporary file holds Mixkit music.

  scripts/heavy.sh score2-title-probe /usr/sbin/taskpolicy -c utility env NUMBA_CACHE_DIR=... \
      .work/tools-eval/tools-tests/audio-venv/bin/python -I tools/audio/score2/score_title_probe.py \
      .work/score2/cuesheet/plan_main.json .work/score2/master/main.build.json VARIANTS.json OUT.json
VARIANTS.json: [{"id": ..., "dip_db": -2.8, "corr_s": 0.0, "dip_until_s": null}, ...]
"""
import copy
import json
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import score_build as sb  # noqa: E402
import revise_measure as rm  # noqa: E402
import cue_plan as cp  # noqa: E402


def main():
    plan_path, build_path, var_path, out = sys.argv[1:5]
    plan = json.load(open(plan_path))
    b = json.load(open(build_path))
    g_w = 10 ** (b["masters"]["web"]["gain_db"] / 20)
    y48, _ = sb.decode("BornOfTheSky")
    j5 = next(s["t"] for s in plan["seams"] if s["id"] == "J5")
    title = plan["return"]["R720_film_s"]
    N = int(round((title + 9.0) * sb.SR))
    tmp = out + "-tmp"
    os.makedirs(tmp, exist_ok=True)
    res = {"j5": j5, "title": title, "web_gain_db": b["masters"]["web"]["gain_db"], "variants": []}
    duck = next((d for d in b.get("ducks", []) if d["id"] == "title"), None)
    for v in json.load(open(var_path)):
        c = copy.deepcopy(next(x for x in plan["cues"] if x["id"] == "M6a"))
        d = float(v.get("corr_s", 0.0))
        c["src_in_cue_sheet"], c["src_out_cue_sheet"], c["src_correction_s"] = c["src_in"], c["src_out"], d
        c["src_in"], c["src_out"] = c["src_in"] + d, c["src_out"] + d
        g = c["gain_db"]
        dip = float(v["dip_db"])
        c["gain_db"] = [[g[0][0], dip], [g[1][0], dip], list(g[2])]
        bed = np.zeros((N, 2), dtype=np.float32)
        sb.lay(bed, c, y48)
        if v.get("duck", True) and duck:
            bed = bed * sb.duck_gain(N, [duck])[:, None]
        off = float(v.get("grid_offset_s", 0.0))  # move the windows instead of the audio: is the reading the sound's?
        rows = rm.classify_grid((bed * g_w).astype(np.float32), j5 + 0.002 + off, title + 5.5 + off, tmp)
        s = rm.summarise(rows)
        res["variants"].append({**v, "summary": s, "foghorn": [(rw["t"], round(rw["labels"].get("foghorn", 0.0), 3))
                                                              for rw in rows]})
        print(v["id"], s["foghorn_max"], s["foghorn_max_at"], s["verdict"],
              [p for _, p in res["variants"][-1]["foghorn"]][:12], flush=True)
    try:
        os.rmdir(tmp)
    except OSError:
        pass
    json.dump(res, open(out, "w"), indent=1)


if __name__ == "__main__":
    main()
