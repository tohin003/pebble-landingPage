"""score2 lane: the score's arc measured independently of the build (FFmpeg's ebur128, not pyloudnorm), as the score
review measured it (28 Oct): each block's short-term (3 s) and momentary (400 ms) maxima and medians, where the film's
loudest 3 s and 400 ms end, the steps into every sync point, and the review's targets for the Return (R-02).

Reads a master WAV (never writes audio) and the cue plan; ebur128's framelog gives M and S every 100 ms, each for the
window that ENDS at that time. Writes OUT.json.

  scripts/heavy.sh score2-arc /usr/sbin/taskpolicy -c utility python3 -I tools/audio/score2/score_arc.py \
      .work/score2/master/main.web.wav .work/score2/cuesheet/plan_main.json OUT.json
"""
import json
import re
import statistics
import subprocess
import sys

FFMPEG = "/opt/homebrew/bin/ffmpeg"


def framelog(wav):
    p = subprocess.run([FFMPEG, "-hide_banner", "-nostdin", "-nostats", "-i", wav, "-af",
                        "ebur128=peak=true:framelog=info", "-f", "null", "-"], capture_output=True, text=True)
    rows = []
    pat = re.compile(r"t:\s*([\d.]+)\s+TARGET:\S+\s+LUFS\s+M:\s*(-?[\d.inf]+)\s+S:\s*(-?[\d.inf]+)")
    for ln in p.stderr.splitlines():
        m = pat.search(ln)
        if m:
            t, M, S = (float(x) if x not in ("-inf", "inf") else -120.0 for x in m.groups())
            rows.append((t, M, S))
    s = p.stderr[p.stderr.rfind("Summary:"):]
    get = lambda pat_: float(re.search(pat_, s, re.S).group(1))  # noqa: E731
    summ = {"integrated_lufs": get(r"I:\s+(-?[\d.]+) LUFS"), "lra_lu": get(r"LRA:\s+(-?[\d.]+) LU"),
            "lra_low": get(r"LRA low:\s+(-?[\d.]+) LUFS"), "lra_high": get(r"LRA high:\s+(-?[\d.]+) LUFS"),
            "true_peak_dbtp": get(r"True peak:\s+Peak:\s+(-?[\d.inf]+) dBFS")}
    return rows, summ


def main():
    wav, plan_path, out = sys.argv[1:4]
    plan = json.load(open(plan_path))
    rows, summ = framelog(wav)
    T = [r_[0] for r_ in rows]

    def win(a, b, k):  # values whose window ENDS in [a, b) (S: k=2, M: k=1); S only once a full 3 s fits in the block
        lo = a + (3.0 if k == 2 else 0.4)
        return [r_[k] for r_ in rows if lo - 1e-6 <= r_[0] < b + 1e-6]

    blocks = []
    for a, b, lab in plan["blocks"]:
        S, M = win(a, b, 2), win(a, b, 1)
        Sx = [r_[2] for r_ in rows if a - 1e-6 <= r_[0] < b + 1e-6]  # every window ENDING in the block (the review's
        Mx = [r_[1] for r_ in rows if a - 1e-6 <= r_[0] < b + 1e-6]  # way): the first ones reach back into the block before
        blocks.append({"block": lab, "from": a, "to": b,
                       "S_max": round(max(S), 1) if S else None, "S_median": round(statistics.median(S), 1) if S else None,
                       "M_max": round(max(M), 1) if M else None,
                       "S_max_ending_in_block": round(max(Sx), 1) if Sx else None,
                       "M_max_ending_in_block": round(max(Mx), 1) if Mx else None})
    iS = max(range(len(rows)), key=lambda i: rows[i][2])
    iM = max(range(len(rows)), key=lambda i: rows[i][1])

    def at(t, k):
        i = min(range(len(T)), key=lambda j: abs(T[j] - t))
        return rows[i][k]
    pts = {s["id"]: s.get("in_film", s["t"]) for s in plan["seams"]}
    for e in plan["events"]:
        if e["label"] in ("name", "kept card", "TITLE", "TITLE (stop)", "DROP"):
            pts[e["label"]] = e["t"]
    steps = {k: {"t": round(t, 3), "S_step": round(at(t + 3.0, 2) - at(t, 2), 1),
                 "M_step": round(at(t + 0.4, 1) - at(t, 1), 1), "S_before": round(at(t, 2), 1),
                 "S_after": round(at(t + 3.0, 2), 1), "M_before": round(at(t, 1), 1), "M_after": round(at(t + 0.4, 1), 1)}
             for k, t in sorted(pts.items(), key=lambda kv: kv[1])}
    res = {"wav": wav, "meter": "FFmpeg ebur128 framelog (M 400 ms and S 3 s, each window ending at t; 100 ms steps)",
           "summary": summ, "blocks": blocks,
           "loudest": {"S": {"lufs": rows[iS][2], "window_ends_s": rows[iS][0]},
                       "M": {"lufs": rows[iM][1], "window_ends_s": rows[iM][0]}},
           "steps": steps}
    if "return" in plan:
        B = {b["block"]: b for b in blocks}
        ret = [b for k, b in B.items() if k.startswith("Return")]
        cl = B["Climax"]
        res["return_vs_climax"] = {"climax_S_max": cl["S_max"], "return_S_max": max(b["S_max"] for b in ret if b["S_max"] is not None),
                                   "climax_M_max": cl["M_max"], "return_M_max": max(b["M_max"] for b in ret if b["M_max"] is not None)}
        rv = res["return_vs_climax"]
        rv["return_S_under_climax_lu"] = round(rv["climax_S_max"] - rv["return_S_max"], 1)
        rv["return_M_under_climax_lu"] = round(rv["climax_M_max"] - rv["return_M_max"], 1)
        # the review's way: windows ending in each block, so the Return's first windows still hold the climax's end
        rv["ending_in_block"] = {
            "climax_S_max": cl["S_max_ending_in_block"], "climax_M_max": cl["M_max_ending_in_block"],
            "return_S_max": max(b["S_max_ending_in_block"] for b in ret), "return_M_max": max(b["M_max_ending_in_block"] for b in ret),
            "return_proper_from_R0_S_max": max(r_[2] for r_ in rows if plan["return"]["R0_film_s"] + 3.0 - 1e-6 <= r_[0]
                                               < next(s["t"] for s in plan["seams"] if s["id"] == "J5") + 1e-6)}
        e = rv["ending_in_block"]
        e["return_S_under_climax_lu"] = round(e["climax_S_max"] - e["return_S_max"], 1)
        e["return_proper_S_under_climax_lu"] = round(e["climax_S_max"] - e["return_proper_from_R0_S_max"], 1)
        blk = lambda t: next((b["block"] for b in blocks if b["from"] <= t < b["to"]), None)  # noqa: E731
        res["loudest"]["S"]["block_of_window_end"] = blk(rows[iS][0])
        res["loudest"]["M"]["block_of_window_end"] = blk(rows[iM][0])
    json.dump(res, open(out, "w"), indent=1)
    print(json.dumps({k: res[k] for k in ("summary", "loudest")} | ({"return_vs_climax": res["return_vs_climax"]}
                                                                     if "return_vs_climax" in res else {})))


if __name__ == "__main__":
    main()
