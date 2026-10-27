"""score2 lane: the supervisor's revision for the Return (MONTAGE_DESIGN §5.6; OVERRIDES §51, §56, §61).

Pure JSON (standard library only): no audio is read or written, so it runs outside heavy.sh.

  python3 -I tools/audio/score2/revise_plan.py candidates [OUT.json]
      score every forward splice that re-fits M2 (B2) and M3 (B4) with Cascades 1-3 out, with the bar-grid cutter's own
      cost (tools-tests t5_cut.py: chroma and MFCC of the bars before and after the cut, loudness, a phrase penalty),
      on the music map's bar tables; prints the ranking and writes the candidates for splice_probe.py
  python3 -I tools/audio/score2/revise_plan.py plans --m2 OUT_BAR:IN_BAR --m3 OUT_BAR:IN_BAR [--dir CUESHEET_DIR]
      write the revised cue plans: plan_main.json (the Return, design revision 2: M5 runs on to B2 1:44.53, J5 onto A4
      bar 80 at R480, the 2.5-dB dip, F4 on), plan_main_g1b.json (G1's B side: revision 1's cue, M6 from A4 bar 76 with
      J5 at R0) and plan_x40.json (the music unchanged; XJ2's mask recorded on its seam)
  python3 -I tools/audio/score2/revise_plan.py cues CUES.json [DECISION.json]
      retire the wall and the convergence from every track's cue windows in cues.json and add the Return's windows

Bars are the music map's bar indices (downbeats_s[k] starts bar k). A splice OUT:IN cuts out at the downbeat of bar OUT
(the first bar removed) and in at the downbeat of bar IN, forward and at bar lines, with the cutter's pre-roll: a 60 ms
equal-power crossfade that ends on the incoming downbeat. Nothing is ever time-stretched; every film time is a source
time on a cue (film = film_in + (src - src_in)).
"""
import json
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
SCORE2 = os.path.join(REPO, ".work", "score2")
MAPS = os.path.join(SCORE2, "maps")
CUESHEET = os.path.join(SCORE2, "cuesheet")

B2, B4, A4, A1 = "YourBreath", "TechnoFestVibes", "BornOfTheSky", "Starfire"
XF = 0.06          # the cutter's pre-roll crossfade, s
F4_XF = 0.2        # F4's crossfade inside A4's held IV chord (CUE_SHEET §5.4)
DIP_DB = -2.5      # the Return's merge dip on A4 bars 80-81 (MONTAGE_DESIGN §2.10)
M6_DB = -0.3       # M6's gain (CUE_SHEET §1 M6)

_maps = {}


def tmap(track):
    if track not in _maps:
        with open(os.path.join(MAPS, track + ".map.json")) as fh:
            _maps[track] = json.load(fh)
    return _maps[track]


def db(track, k):
    """The measured downbeat that starts bar k of a track (the map's own index)."""
    return float(tmap(track)["downbeats_s"][k])


def r4(x):
    return round(float(x), 4)


def mmss(t):
    return f"{int(t // 60)}:{t % 60:05.2f}"


# ------------------------------------------------------------------------------------------- the cutter's own cost
def _zcols(rows):
    n, m = len(rows), len(rows[0])
    mu = [sum(r[j] for r in rows) / n for j in range(m)]
    sd = [math.sqrt(sum((r[j] - mu[j]) ** 2 for r in rows) / n) + 1e-9 for j in range(m)]
    return [[(r[j] - mu[j]) / sd[j] for j in range(m)] for r in rows]


def _dot(a, b):
    return sum(x * y for x, y in zip(a, b))


def _norm(a):
    return math.sqrt(sum(x * x for x in a))


def bar_features(track):
    bt = tmap(track)["bar_table"]
    C = [b["chroma"] for b in bt]
    Fz = _zcols([b["mfcc"] for b in bt])
    L = [b["rms_db"] for b in bt]
    return C, Fz, L


def pair_cost(track, a, b):
    """t5_cut.py's score for cutting out at bar a and in at bar b (a < b): the bars before the cut (a-1 against b-1)
    and after it (a against b) in chroma (cosine of unit vectors) and MFCC (z-scored), their loudness, and a phrase
    penalty when the removed length is not a whole number of 4-bar groups. Lower is better; 0 is a seamless loop."""
    C, Fz, L = bar_features(track)
    ctx_c = 1 - _dot(C[a - 1], C[b - 1])
    nxt_c = 1 - _dot(C[a], C[b])
    ctx_m = 0.05 * _norm([x - y for x, y in zip(Fz[a - 1], Fz[b - 1])]) / math.sqrt(13)
    nxt_m = 0.05 * _norm([x - y for x, y in zip(Fz[a], Fz[b])]) / math.sqrt(13)
    loud = 0.04 * abs(L[a - 1] - L[b - 1]) + 0.04 * abs(L[a] - L[b])
    phrase = 0.0 if (b - a) % 4 == 0 else 0.15
    return {"cost": round(ctx_c + ctx_m + nxt_c + nxt_m + loud + phrase, 4),
            "chroma_cos_before": round(1 - ctx_c, 4), "chroma_cos_after": round(1 - nxt_c, 4),
            "mfcc_term": round(ctx_m + nxt_m, 4), "loudness_term": round(loud, 4), "phrase_penalty": phrase,
            "rms_db_bars": {"out_before": L[a - 1], "in_before": L[b - 1], "out_after": L[a], "in_after": L[b]}}


def own_cost_distribution(track, lo, hi):
    """The same cost for the track's own continuation at each bar line (a against a: always 0), and for every one-bar
    jump inside [lo, hi): the scale a splice's cost is read against."""
    vals = sorted(pair_cost(track, a, a + 1)["cost"] for a in range(lo + 1, hi - 1))
    return {"one_bar_jumps_p10": vals[len(vals) // 10], "p50": vals[len(vals) // 2], "p90": vals[9 * len(vals) // 10]}


# ------------------------------------------------------------------------------------------- the candidates
# M2 keeps B2 bars 7-16 whole (the Drop and Ring 1, film 0:20.00-0:40.00) and needs 7 more bars for Ring 2
# (0:40.00-0:54.00), ending before J2. Phrase lines of B2 every 8 bars from bar 7 (map phrase_grid offset 3 mod 4).
# M3 keeps B4's riser bar 47 and phrase B's arrival (bar 48), lands Ring 4 on the phrase line at bar 56, and ends on the
# track's own stop (bar 64): 15 bars with 2 removed inside phrase B (bars 48-55).
def candidates():
    out = {"rule": "t5_cut.py pair_cost on the music map's bar tables (lower is better); every splice is forward and on "
                   "measured downbeats; the 60-ms pre-roll crossfade ends on the incoming downbeat", "M2": [], "M3": []}
    # M2: [7, a) + [b, e) with (a - 7) + (e - b) = 17, a >= 17, b > a; or no splice: [7, 24)
    out["M2"].append({"label": "no splice: B2 bars 7-23 in one piece, J2 out at bar 24", "out_bar": None, "in_bar": None,
                      "end_bar": 24, "removed_bars": 0, "cost": 0.0, "splice_film_s": None,
                      "src": [db(B2, 7), db(B2, 24)]})
    for a in range(17, 24):
        for b in range(a + 1, 31):
            e = b + 17 - (a - 7)
            if e > 39:  # bar 39 starts the breakdown (-3.1 LU): M2 must leave before it
                continue
            pc = pair_cost(B2, a, b)
            out["M2"].append({"label": f"B2 bars 7-{a - 1} + {b}-{e - 1}, J2 out at bar {e}", "out_bar": a, "in_bar": b,
                              "end_bar": e, "removed_bars": b - a, **pc,
                              "splice_film_s": r4(19.9976 + db(B2, a) - db(B2, 7)),
                              "src": [db(B2, 7), db(B2, a), db(B2, b), db(B2, e)]})
    for a in range(49, 55):
        b = a + 2
        pc = pair_cost(B4, a, b)
        out["M3"].append({"label": f"B4 bars 47-{a - 1} + {b}-63, the stop at bar 64", "out_bar": a, "in_bar": b,
                          "removed_bars": 2, **pc, "src": [db(B4, 47), db(B4, a), db(B4, b), db(B4, 64)]})
    out["M2"].sort(key=lambda c: c["cost"])
    out["M3"].sort(key=lambda c: c["cost"])
    out["scale"] = {"B2 one-bar jumps, bars 7-38": own_cost_distribution(B2, 7, 39),
                    "B4 one-bar jumps, bars 47-63": own_cost_distribution(B4, 47, 64)}
    return out


# ------------------------------------------------------------------------------------------- the plans
def cue(cid, name, track, s_in, s_out, film_in, head, tail, gain):
    return {"id": cid, "name": name, "track": track, "src_in": r4(s_in), "src_out": r4(s_out), "film_in": r4(film_in),
            "head": head, "tail": tail, "gain_db": gain}


def pre(n=XF):
    return {"mode": "preroll", "len": n}


def pre_out(n=XF):
    return {"mode": "preroll_out", "len": n}


def main_plan(m2, m3, side="A"):
    """The main film with the Return. side 'A' is design revision 2 (the default); 'B' is G1's B side, revision 1's
    cue (M5 ends at B2 1:36.53 as in the 22:13 sheet and J5 cuts onto A4 bar 76 at R0, M6 flat at -0.3 dB)."""
    a2, b2 = m2
    a3, b3 = m3
    cues, seams = [], []
    # M1, unchanged (CUE_SHEET §1 M1; §61: no ident)
    t = 0.0
    m1 = cue("M1", "Still Water", A4, 12.5427, 32.5403, 0.0, {"mode": "fade", "start": 0.0, "len": 0.25}, pre_out(),
             [[0.0, 12.0], [6.0, 12.0], [7.6, 8.5], [17.0, 8.5], [18.0, 8.0]])
    cues.append(m1)
    t = m1["film_in"] + m1["src_out"] - m1["src_in"]
    j1 = t
    # M2: the Drop and Ring 1 whole (B2 bars 7-16), then Ring 2 after one forward splice at Ring 2's arrival
    if a2 is None:
        e2 = 24
        m2a = cue("M2", "Allow", B2, db(B2, 7), db(B2, e2), t, pre(), pre_out(), [[0.0, -5.5]])
        cues.append(m2a)
        t = m2a["film_in"] + m2a["src_out"] - m2a["src_in"]
        seams.append({"id": "J1", "t": r4(j1), "from": "M1", "to": "M2", "label": "the Drop: A4 crescendo cut into B2's drop"})
        last2 = "M2"
    else:
        e2 = b2 + 17 - (a2 - 7)
        m2a = cue("M2a", "Allow", B2, db(B2, 7), db(B2, a2), t, pre(), pre_out(), [[0.0, -5.5]])
        cues.append(m2a)
        t = m2a["film_in"] + m2a["src_out"] - m2a["src_in"]
        m2b = cue("M2b", "Allow (after the splice)", B2, db(B2, b2), db(B2, e2), t, pre(), pre_out(), [[0.0, -5.5]])
        cues.append(m2b)
        seams.append({"id": "J1", "t": r4(j1), "from": "M1", "to": "M2a", "label": "the Drop: A4 crescendo cut into B2's drop"})
        seams.append({"id": "M2s", "t": r4(t), "from": "M2a", "to": "M2b",
                      "label": f"M2's forward splice at Ring 2's arrival: B2 bar {a2} out, bar {b2} in (Cascade 1 out)"})
        t = m2b["film_in"] + m2b["src_out"] - m2b["src_in"]
        last2 = "M2b"
    j2 = t
    # M3: B4's riser bar 47 and phrase B, one forward splice of 2 bars inside phrase B, Ring 4 on bar 56, its own stop
    m3a = cue("M3a", "Every Ring", B4, db(B4, 47), db(B4, a3), t, pre(), pre_out(), [[0.0, -5.0]])
    cues.append(m3a)
    seams.append({"id": "J2", "t": r4(j2), "from": last2, "to": "M3a",
                  "label": f"Ring 3: B2 after its hat breath (bar {e2 - 1}) into B4's riser bar"})
    t = m3a["film_in"] + m3a["src_out"] - m3a["src_in"]
    ring4 = t + db(B4, 56) - db(B4, b3)
    m3b = cue("M3b", "Every Ring (after the splice)", B4, db(B4, b3), db(B4, 64), t, pre(),
              {"mode": "ring", "until": 127.0, "fade": 1.0}, [[0.0, -5.0], [r4(ring4), -5.0], [r4(ring4 + 0.98), -4.4]])
    cues.append(m3b)
    seams.append({"id": "M3s", "t": r4(t), "from": "M3a", "to": "M3b",
                  "label": f"M3's forward splice inside phrase B: B4 bar {a3} out, bar {b3} in (Cascade 3 out)"})
    t = m3b["film_in"] + m3b["src_out"] - m3b["src_in"]
    j3 = t
    # M4, unchanged in source, moved with the cut: it fades in 1.4958 s after B4's stop, as in the 22:13 sheet
    m4_in = j3 + (96.4 - 94.9042)
    m4 = cue("M4", "Dusk", A1, 12.9683, 22.4725, m4_in, {"mode": "fade", "start": r4(m4_in), "len": 2.0},
             {"mode": "fade", "end": r4(m4_in + 22.4725 - 12.9683), "len": 1.0}, [[0.0, 2.0]])
    cues.append(m4)
    seams.append({"id": "J3", "t": r4(j3), "from": "M3b", "to": "M4",
                  "label": "Stealth: B4's own stop on Enter, ring-out, then the Dusk pad", "in_film": r4(m4_in)})
    j4 = m4_in + 22.4725 - 12.9683
    # M5: the climax, and under side A the Return's release, gather and rush: B2 runs on in its own order
    m5_out = db(B2, 52) if side == "A" else db(B2, 48)   # 1:44.53 (R480), or 1:36.53 (R0) on side B
    m5 = cue("M5", "Its Own Tools" if side == "B" else "Its Own Tools, the Return", B2, 84.53, m5_out, j4,
             {"mode": "fade", "start": r4(j4 - 1.0), "len": 1.0}, pre_out(),
             [[r4(j4 - 1.0), -7.8], [r4(j4), -7.8], [r4(j4 + 109.4 - 105.9042), -3.8]])
    cues.append(m5)
    seams.append({"id": "J4", "t": r4(j4), "from": "M4", "to": "M5",
                  "label": "evening: pad crossfades into B2's breakdown (1 s pre-roll)"})
    j5 = m5["film_in"] + m5["src_out"] - m5["src_in"]
    kept = j4 + db(B2, 44) - 84.53
    r0 = j4 + db(B2, 48) - 84.53
    # M6: A4 to its composed ending, with F4's splice inside the held IV chord (bar 85 out)
    a4_in = db(A4, 80) if side == "A" else db(A4, 76)
    title = j5 + db(A4, 82) - a4_in
    if side == "A":
        g6 = [[r4(j5 - 1.0), M6_DB + DIP_DB], [r4(title - 0.05), M6_DB + DIP_DB], [r4(title), M6_DB]]
    else:
        g6 = [[0.0, M6_DB]]
    m6a = cue("M6a", "Ripples (End Title)", A4, a4_in, db(A4, 85), j5, pre(), pre_out(F4_XF), g6)
    cues.append(m6a)
    seams.append({"id": "J5", "t": r4(j5), "from": "M5", "to": "M6a",
                  "label": ("the Return's merge: B2 1:44.53 beat-cut into A4 bar 80 (V), 120 into 120 BPM" if side == "A"
                            else "G1 B side: B2 1:36.53 beat-cut into A4 bar 76, 120 into 120 BPM")})
    t = m6a["film_in"] + m6a["src_out"] - m6a["src_in"]
    m6b = cue("M6b", "Ripples (End Title), after F4", A4, db(A4, 86), 183.0, t, pre(F4_XF),
              {"mode": "ring", "until": 183.3, "fade": 0.3}, [[0.0, M6_DB]])
    cues.append(m6b)
    seams.append({"id": "F4", "t": r4(t), "from": "M6a", "to": "M6b",
                  "label": "F4: A4 bar 85 out inside the held IV chord, a 200 ms crossfade onto bar 86 (I)"})
    m6_end = m6b["film_in"] + 183.3 - m6b["src_in"]
    end = math.ceil((m6_end + 0.22) * 60) / 60  # the decay, then about 0.22 s of room tone (as on 22:13); whole frames
    endcard = j5 + db(A4, 84) - a4_in
    page2 = t + db(A4, 88) - db(A4, 86)
    events = [{"t": 4.0, "label": "name"}, {"t": 8.0, "label": "A4 lift"},
              {"t": r4(j2 + db(B4, 48) - db(B4, 47)), "label": "B4 phrase B"}, {"t": r4(ring4), "label": "Ring 4"},
              {"t": r4(kept), "label": "kept card"}, {"t": r4(r0), "label": "R0"},
              {"t": r4(j5 if side == "A" else r0 + 8.0), "label": "R480"}, {"t": r4(title), "label": "TITLE"},
              {"t": r4(endcard), "label": "end card"}, {"t": r4(page2), "label": "page 2"}]
    climax0 = j4
    ret0 = r0 - 1.0
    blocks = [[0.0, r4(j1), "Act I"], [r4(j1), r4(j1 + 8.0004), "Drop"], [r4(j1 + 8.0004), r4(j2), "Rings 1-2"],
              [r4(j2), r4(j3), "Rings 3-4"], [r4(j3), r4(j4), "Dusk"], [r4(climax0), r4(ret0), "Climax"],
              [r4(ret0), r4(r0 + 2.0), "Return: lead-in and release"], [r4(r0 + 2.0), r4(r0 + 6.0), "Return: gather"],
              [r4(r0 + 6.0), r4(r0 + 8.0), "Return: rush"], [r4(r0 + 8.0), r4(title), "Return: merge"],
              [r4(title), r4(endcard), "Title"], [r4(endcard), r4(end), "End card"]]
    plan = {"film": "main" if side == "A" else "main_g1b",
            "title": ("Ripples, main film with the Return: cue plan (revision 2, 27 Oct)" if side == "A" else
                      "Ripples, main film with the Return: G1's B side (revision 1's cue: M6 from A4 bar 76)"),
            "end_film_s": round(end, 4), "cues": cues, "seams": seams, "events": events, "blocks": blocks,
            "return": {"R0_film_s": r4(r0), "R480_film_s": r4(r0 + 8.0 if side == "B" else j5), "R720_film_s": r4(title),
                       "frame_rate": 60, "R0_frame": round(r0 * 60), "title_frame": round(title * 60),
                       "note": "R-frames at 60 fps from R0 = B2 1:36.53 (MONTAGE_DESIGN §2.3); one bar is 120.006 frames "
                               "at B2's tempo and 119.99 at A4's: place events on the bar lines in CUE_SHEET.json"}}
    return plan


def x40_plan(path):
    """The 40-s cut: X1-X3 unchanged (MONTAGE_DESIGN §5.6 item 9); XJ2's mask recorded on its seam (§5.5)."""
    with open(path) as fh:
        p = json.load(fh)
    p["title"] = "Ripples, 40-second cut: cue plan (music unchanged; XJ2 masked by a CC0 reverse swell, 27 Oct)"
    for s in p["seams"]:
        if s["id"] == "XJ2":
            s["label"] = "the 40-s Return: B2 lift cut into B4's last bar (120 to 124 BPM), under a CC0 reverse swell"
            s["mask"] = {
                "what": "a reverse swell made from the room tail of impact_body_cc0 (Kenney impactSoft_heavy_002 with a "
                        "room; CC0, in the kit), rising into XJ2's downbeat; it replaces the Mixkit ring sweep that "
                        "covered XJ2 on 22:13, which stays out (CR-13)",
                "take": "impact_body_cc0", "licence": "CC0 (Kenney); the reverb that made the room is pedalboard's "
                                                      "(GPL-3.0), run here and never shipped",
                "made": "the take's own tail after its direct sound (from its peak + 0.08 s), tuned +1 semitone to G "
                        "(B2's lift and B4's last bar are both G-centred) by varispeed, then cut to half a bar of B2 "
                        "(1.0001 s), reversed, a 30-ms fade-in at its quiet start and a 4-ms fade at its loud end",
                "align": "end", "t": s["t"], "length_s": 1.0001, "beats": 2, "bpm": 119.994,
                "level": {"mode": "rel", "ref": [round(s["t"] - 1.0, 4), round(s["t"], 4)], "offset_db": -3.0,
                          "rule": "its loudest 400 ms 3 dB under the music over its own second, as the title's swell"},
                "alternative": "the person's own recording of a pebble rolled on wood, if they record one with P9",
                "source": "MONTAGE_DESIGN §5.5 (the 40-s Return in x8); OVERRIDES §55 CR-13, §60"}
    for b in p["blocks"]:
        if b[2] == "conv.":
            b[2] = "Return"
    return p


def bar_rows(track, lo, hi):
    """The music map's own measurements of bars lo..hi-1 of a track (the source, before any gain)."""
    bt = tmap(track)["bar_table"]
    nov = tmap(track)["novelty_by_bar"]
    return [{"bar": k, "start_s": r4(bt[k]["start"]), "lufs_raw": bt[k]["lufs"], "onsets_per_beat": bt[k]["perc_onsets_per_beat"],
             "air_share": bt[k]["air"], "novelty": nov[k]} for k in range(lo, hi)]


def revise_cues(path, decision=None):
    """cues.json (the music map's scored cue windows per scene): the wall and the convergence are retired everywhere
    (§61: the Return replaces them), and the Return's two windows are added for B2 and A4, with G1's B side beside them."""
    with open(path) as fh:
        cj = json.load(fh)
    removed = {"the_wall": 0, "convergence": 0}
    for name, t in cj["tracks"].items():
        for sc in list(removed):
            if sc in t.get("cue_windows", {}):
                removed[sc] += len(t["cue_windows"].pop(sc))
    chosen = (decision or {}).get("g1_side", "A")
    cj["tracks"][B2]["cue_windows"]["the_return"] = [{
        "scene": "the_return", "part": "the release, the gather and the rush (R0-R480): M5 runs on in B2's own order",
        "side": "A", "chosen": chosen == "A", "start_s": r4(db(B2, 48)), "end_s": r4(db(B2, 52)), "start_bar": 48,
        "end_bar": 52, "bars": 4, "length_s": r4(db(B2, 52) - db(B2, 48)), "bars_measured": bar_rows(B2, 48, 52),
        "why": "the gather and the rush are the film's most feature-heavy 6 s (§51 gives them to B2 and B4); 2.75-3.5 "
               "onsets a beat and an air share of 0.011-0.015 hold the climax's density and level (MONTAGE_DESIGN "
               "§2.10); as built, the run-on's short-term maximum is level with the climax's, inside the 0.5 LU that "
               "g1_rule.json allows (CUE_SHEET.md §0, §10)"}]
    cj["tracks"][A4]["cue_windows"]["the_return"] = [
        {"scene": "the_return", "part": "the merge (R480-R720), on V, dipped 2.5 dB, into the title on bar 82", "side": "A",
         "chosen": chosen == "A", "start_s": r4(db(A4, 80)), "end_s": r4(db(A4, 82)), "start_bar": 80, "end_bar": 82,
         "bars": 2, "length_s": r4(db(A4, 82) - db(A4, 80)), "bars_measured": bar_rows(A4, 80, 83),
         "why": "the pulse thins (1.25-1.5 onsets a beat) as the cells drain into the stone; the dip makes the title an arrival"},
        {"scene": "the_return", "part": "G1's B side (revision 1): the release to the merge on A4 bars 76-81 (iii-I-IV-IV-V-V), "
                                        "flat at -0.3 dB, into the title on bar 82", "side": "B", "chosen": chosen == "B",
         "start_s": r4(db(A4, 76)), "end_s": r4(db(A4, 82)), "start_bar": 76, "end_bar": 82, "bars": 6,
         "length_s": r4(db(A4, 82) - db(A4, 76)), "bars_measured": bar_rows(A4, 76, 83),
         "why": "a cadence, not a crescendo: bar levels -10.7 to -12.5 LUFS raw while the harmony moves to V and resolves "
                "to vi on the title (R4 §0.6)"}]
    prev = (cj.get("revision") or {}).get("retired_scenes", {})
    for sc in removed:  # run again, the file has nothing left to remove: keep the first run's counts
        if not removed[sc] and prev.get(sc):
            removed[sc] = int(str(prev[sc]).split()[0])
    keep = ("g1_side", "title_variant", "title_variant_b", "title_variant_for_the_chosen_side")
    cj["revision"] = {
        "date": "2026-10-28", "by": "score2, the supervisor's revision for the Return (MONTAGE_DESIGN §5.6)",
        "retired_scenes": {"the_wall": f"{removed['the_wall']} windows removed", "convergence": f"{removed['convergence']} windows removed",
                           "why": "the person chose the montage at the end only (OVERRIDES §61): the Return replaces the "
                                  "wall and the convergence; 22:13's copy of this file is in cuesheet/archive-2026-10-26-2213/"},
        "added": "the_return: B2 bars 48-51 (side A, R0-R480) and A4 bars 80-81 (side A, R480-R720); A4 bars 76-81 (G1's B side)",
        "decision": {**{k: (decision or {}).get(k) for k in keep},
                     "m2_splice": ((decision or {}).get("m2") or {}).get("chosen"),
                     "m3_splice": ((decision or {}).get("m3") or {}).get("chosen"),
                     "record": "cuesheet/r2/g1_decision.json"},
        "note": "the ring_groove windows' 'fits' notes describe 22:13's block lengths (cascades 1-4 in); the cue sheet's "
                "plans are the timing source"}
    with open(path, "w") as fh:
        json.dump(cj, fh, indent=1)  # as cue_windows.py writes it
    return removed


def write(path, obj):
    with open(path, "w") as fh:
        json.dump(obj, fh, indent=1, ensure_ascii=False)
        fh.write("\n")


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else "candidates"
    if cmd == "candidates":
        c = candidates()
        for k in ("M2", "M3"):
            print(f"# {k}: {len(c[k])} candidates, best first")
            for x in c[k][:12]:
                print(f"  {x['cost']:7.4f}  {x['label']}  chroma before/after "
                      f"{x.get('chroma_cos_before', '-')}/{x.get('chroma_cos_after', '-')}")
        print("# scale:", json.dumps(c["scale"]))
        if len(sys.argv) > 2:
            write(sys.argv[2], c)
        return
    if cmd == "plans":
        args = dict(zip(sys.argv[2::2], sys.argv[3::2]))
        d = args.get("--dir", CUESHEET)

        def pair(s):
            if s in ("none", "-"):
                return (None, None)
            a, b = s.split(":")
            return (int(a), int(b))
        m2, m3 = pair(args["--m2"]), pair(args["--m3"])
        A = main_plan(m2, m3, "A")
        B = main_plan(m2, m3, "B")
        write(os.path.join(d, "plan_main.json"), A)
        write(os.path.join(d, "plan_main_g1b.json"), B)
        xp = os.path.join(d, "plan_x40.json")
        write(xp, x40_plan(xp))
        for p in (A, B):
            print(p["film"], "end", p["end_film_s"], mmss(p["end_film_s"]), "R0", p["return"]["R0_film_s"],
                  "title", p["return"]["R720_film_s"], mmss(p["return"]["R720_film_s"]))
            for c_ in p["cues"]:
                print(f"   {c_['id']:4s} {c_['track']:16s} src {c_['src_in']:9.4f}-{c_['src_out']:9.4f}  film {c_['film_in']:9.4f}")
        return
    if cmd == "cues":
        dec = None
        if len(sys.argv) > 3 and os.path.exists(sys.argv[3]):
            with open(sys.argv[3]) as fh:
                dec = json.load(fh)
        print("removed", revise_cues(sys.argv[2], dec))
        return
    raise SystemExit(__doc__)


if __name__ == "__main__":
    main()
