"""score2 lane: apply the revision's pre-registered rules to its measurements (MONTAGE_DESIGN §5.6; OVERRIDES §61).

The person hears only finished work, so every choice the design leaves to ears is made by rules written before the
numbers existed (cuesheet/r2/decision_rules.json, 17:35 on 27 Oct, and g1_rule.json, 14:49), applied here mechanically:
  - M2's splice and J2's out-point (B2), from the splice probe;
  - M3's splice (B4), from the splice probe;
  - G1's music A/B (side A, the design's default, against side B, revision 1's cue), from both plans' measurements and
    both sides' title readings;
  - the title composite (the classifier's 'foghorn' flag around the swell and the title);
  - the 40-s cut's XJ2 mask.
Pure JSON (standard library only): no audio is read or written.

  python3 -I tools/audio/score2/revise_decide.py [WORK_DIR]
      reads WORK_DIR/r2/{decision_rules,g1_rule,probe,title_A,title_B,x40mask,main_g1b.metrics}.json and
      WORK_DIR/main.metrics.json; merges WORK_DIR/r2/texts.json (the supervisor's prose) if it exists;
      writes WORK_DIR/r2/g1_decision.json and prints each decision with its numbers
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
WORK = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.join(REPO, ".work", "score2", "cuesheet")
R2 = os.path.join(WORK, "r2")

TITLE_ORDER = ["composite_cc0", "R_air", "R_lowmid", "R_both", "R_lowmid_deep", "R_lowshelf", "R_tilt",
               "composite_cc0_dip_3.5"]


def load(name, folder=R2):
    p = os.path.join(folder, name)
    if not os.path.exists(p):
        return None
    with open(p) as fh:
        return json.load(fh)


def num(v):
    return v if isinstance(v, (int, float)) else None


# ------------------------------------------------------------------------------------------------ the gates
def gates_splice(c):
    """decision_rules.json 'gates' for a splice inside one track: [(gate, passed, detail)]."""
    out = []
    hf, d2 = num(c.get("extra_hf_db")), num(c.get("d2_ratio_at_seam"))
    out.append(("click", (hf is None or hf < 3.0) and (d2 is None or d2 < 2.0), f"extra 8-16 kHz {hf} dB, d2 {d2}"))
    pc = num(c.get("lsd_percentile_of_incoming_own_downbeats"))
    out.append(("spectral", pc is not None and pc <= 95.0, f"LSD {c.get('lsd_db')} dB, percentile {pc} of the track's own downbeats"))
    st = num(c.get("step_3s_lu"))
    out.append(("loudness", st is not None and abs(st) <= 1.5, f"3-s step {st} LU"))
    he, hi, ho = c.get("harmony_edit") or {}, c.get("harmony_incoming_own") or {}, c.get("harmony_outgoing_own") or {}
    own = [v for v in (num(hi.get("bar_cos")), num(ho.get("bar_cos"))) if v is not None]
    bc = num(he.get("bar_cos"))
    floor = min(own) - 0.02 if own else None
    out.append(("harmony", bc is not None and floor is not None and bc >= floor,
                f"bar chroma across {bc} against the track's own {[hi.get('bar_cos'), ho.get('bar_cos')]} (floor {floor and round(floor, 4)})"))
    bi, bo = num(c.get("beat_interval_across_ms")), num(c.get("beat_interval_outgoing_ms"))
    on = c.get("onsets_around_seam") or {}
    mo = num(on.get("median_offset_ms"))
    ok = bi is not None and bo is not None and abs(bi - bo) <= 10.0 and (mo is None or abs(mo) <= 15.0)
    out.append(("grid", ok, f"beat across {bi} ms against {bo} ms; median onset offset {mo} ms"))
    return out


def gates_join(c):
    """J2 at an out-point: the click and loudness gates (a cue change between tracks may change its spectrum)."""
    hf, d2 = num(c.get("extra_hf_db")), num(c.get("d2_ratio_at_seam"))
    st = num(c.get("step_3s_lu"))
    return [("click", (hf is None or hf < 3.0) and (d2 is None or d2 < 2.0), f"extra 8-16 kHz {hf} dB, d2 {d2}"),
            ("loudness", st is not None and abs(st) <= 1.5, f"3-s step {st} LU")]


def failed(gs):
    return [g for g, ok, _ in gs if not ok]


# ------------------------------------------------------------------------------------------------ M2, J2 and M3
def decide_m2(P):
    rows = []
    j2 = {c["end_bar"]: c for c in P["J2"]}
    for c in P["M2"]:
        if c["out_bar"] != 17:
            continue
        e = c["in_bar"] + 17 - (c["out_bar"] - 7)
        g = gates_splice(c)
        j = j2.get(e)
        gj = gates_join(j) if j else [("measured", False, f"J2 at bar {e} was not probed")]
        br = num(j.get("breath_db")) if j else None
        rows.append({"splice": f"{c['out_bar']}:{c['in_bar']}", "j2_out_bar": e, "label": c["label"],
                     "gates": [{"gate": a, "ok": b, "detail": d} for a, b, d in g],
                     "j2_gates": [{"gate": a, "ok": b, "detail": d} for a, b, d in gj],
                     "j2_breath_db": br, "breath_ok": br is not None and br <= -2.0,
                     "lsd_percentile": c.get("lsd_percentile_of_incoming_own_downbeats"),
                     "failures": failed(g) + [f"J2 {x}" for x in failed(gj)] + ([] if br is not None and br <= -2.0 else ["J2 breath"])})
    ok = [r_ for r_ in rows if not r_["failures"]]
    why = []
    if ok:
        best = min(ok, key=lambda r_: r_["lsd_percentile"])
        prov = next((r_ for r_ in ok if r_["splice"] == "17:19"), None)
        if prov and prov["lsd_percentile"] - best["lsd_percentile"] <= 15.0:
            pick = prov
            why.append(f"17:19 passes every gate and J2 at bar 26 breathes ({prov['j2_breath_db']} dB); its spectral step "
                       f"(percentile {prov['lsd_percentile']}) is within 15 points of the lowest ({best['splice']}, "
                       f"{best['lsd_percentile']}), so the provisional splice stays")
        else:
            pick = best
            why.append(f"{best['splice']} passes every gate, J2 breathes ({best['j2_breath_db']} dB), and its spectral step "
                       f"has the lowest percentile ({best['lsd_percentile']})"
                       + ("" if not prov else f", more than 15 points under 17:19's ({prov['lsd_percentile']})"))
    else:
        pick = min(rows, key=lambda r_: (len(r_["failures"]), r_["lsd_percentile"] or 999))
        why.append(f"no candidate passes every gate; {pick['splice']} has the fewest failures: {pick['failures']}")
    return {"chosen": pick["splice"], "j2_out_bar": pick["j2_out_bar"], "why": why, "candidates": rows}


def decide_m3(P):
    rows = []
    for c in P["M3"]:
        g = gates_splice(c)
        rows.append({"splice": f"{c['out_bar']}:{c['in_bar']}", "label": c["label"],
                     "gates": [{"gate": a, "ok": b, "detail": d} for a, b, d in g],
                     "lsd_percentile": c.get("lsd_percentile_of_incoming_own_downbeats"), "failures": failed(g)})
    prov = next(r_ for r_ in rows if r_["splice"] == "50:52")
    if not prov["failures"]:
        return {"chosen": "50:52", "why": ["50:52 passes every gate: it stays (the only splice on a picture cut, S15 to S16)"],
                "candidates": rows}
    ok = [r_ for r_ in rows if not r_["failures"]]
    if ok:
        pick = min(ok, key=lambda r_: r_["lsd_percentile"])
        return {"chosen": pick["splice"], "why": [f"50:52 fails {prov['failures']}; {pick['splice']} passes every gate with the "
                                                  f"lowest spectral-step percentile ({pick['lsd_percentile']}); S16 moves to its splice"],
                "candidates": rows}
    pick = min(rows, key=lambda r_: (len(r_["failures"]), r_["lsd_percentile"] or 999))
    return {"chosen": pick["splice"], "why": [f"no candidate passes every gate; {pick['splice']} has the fewest failures: "
                                              f"{pick['failures']}"], "candidates": rows}


# ------------------------------------------------------------------------------------------------ the title
def decide_title(T):
    if not T:
        return None
    by = {v["id"]: v for v in T["variants"]}
    tried = []
    for vid in TITLE_ORDER:
        v = by.get(vid)
        if not v:
            continue
        tried.append({"id": vid, "verdict": v["verdict"], "foghorn_max": v["foghorn_max"], "foghorn_max_at": v["foghorn_max_at"],
                      "windows_ge_0.30": v["windows_ge_0.30"], "watched_max": v["watched_max"]})
        if v["verdict"] != "fail":
            return {"chosen": vid, "tried_in_order": tried}
    return {"chosen": None, "tried_in_order": tried}


TITLE_ORDER_R2 = [f"C{k}" for k in range(1, 13)]
NO_EQ_ALL_LAYERS = [f"C{k}" for k in range(1, 8)]  # C1-C7: every layer of the design, A4 not EQ'd


def decide_title_r2(T, t1):
    """Round 2 (r2/title_round2_rule.json, written 04:04 on 28 Oct before its measurement): the first of C1-C12 with no
    fail. When round 1 already chose, round 2 is only recorded. When nothing passes in either round, the sheet carries
    the supervisor's choice (written at about 04:13, after round 2's numbers, and labelled so): among C1-C7, which keep
    every layer and leave A4 un-EQ'd, the lowest worst-window reading, then the fewest windows at 0.30 or more."""
    if not T:
        return None
    by = {v["id"]: v for v in T["variants"]}
    tried, chosen = [], None
    for vid in TITLE_ORDER_R2:
        v = by.get(vid)
        if not v:
            continue
        tried.append({"id": vid, "verdict": v["verdict"], "foghorn_max": v["foghorn_max"], "foghorn_max_at": v["foghorn_max_at"],
                      "windows_ge_0.30": v["windows_ge_0.30"], "watched_max": v["watched_max"]})
        if v["verdict"] != "fail" and chosen is None:
            chosen = vid
    out = {"chosen": chosen, "tried_in_order": tried,
           "diagnostics": {k: {"foghorn_max": v["foghorn_max"], "foghorn_max_at": v["foghorn_max_at"],
                               "windows_ge_0.30": v["windows_ge_0.30"]} for k, v in by.items() if v.get("diagnostic")}}
    if chosen is None and not (t1 or {}).get("chosen"):
        pool = [by[k] for k in NO_EQ_ALL_LAYERS if k in by]
        if pool:
            best = min(pool, key=lambda v: (v["foghorn_max"], v["windows_ge_0.30"]))
            out["carried"] = best["id"]
            out["carried_why"] = (f"nothing passes in either round, so the flag stays open; the sheet carries {best['id']} "
                                  f"[I, the supervisor's choice after round 2's numbers]: of C1-C7, which keep every layer "
                                  f"and leave A4 un-EQ'd, it has the lowest worst window ({best['foghorn_max']} at "
                                  f"{best['foghorn_max_at']} s, {best['windows_ge_0.30']} windows at 0.30 or more)")
    return out


# ------------------------------------------------------------------------------------------------ G1
def side(M):
    s = next(x for x in M["seams"] if x["id"] == "J5")
    e = M["extras"]["seams"]["J5"]
    rv = M["extras"]["return_vs_climax"]
    return {"extra_hf_db": s["extra_hf_db"], "d2": e.get("d2_ratio_at_seam"), "extra_lsd_db": s["extra_lsd_db"],
            "lsd_pct": e.get("lsd_percentile_of_incoming_own_downbeats"),
            "two_bar_cos": (e.get("harmony") or {}).get("two_bar_cos"),
            "median_onset_ms": (e.get("onsets_around_seam") or {}).get("median_offset_ms"),
            "return_st_max": rv["return_st_max"], "climax_st_max": rv["climax_st_max"]}


def hard_fails(s):
    out = []
    if (s["extra_hf_db"] is not None and s["extra_hf_db"] >= 3.0) or (s["d2"] is not None and s["d2"] >= 2.0):
        out.append("click at J5")
    if s["lsd_pct"] is not None and s["lsd_pct"] > 95.0:
        out.append("J5's spectral step above the 95th percentile of A4's own bar changes")
    if s["return_st_max"] > s["climax_st_max"] + 0.5:
        out.append("a new peak in the Return")
    return out


def clears(*ts):
    """Whether any tested composite cleared the title on a side, over its rounds (None when no round ran)."""
    ran = [t for t in ts if t is not None]
    return None if not ran else any(t.get("chosen") for t in ran)


def decide_g1(MA, MB, ta, tb, ta2=None, tb2=None):
    a, b = side(MA), side(MB)
    fa, fb = hard_fails(a), hard_fails(b)
    ca, cb = clears(ta, ta2), clears(tb, tb2)
    flag = "the classifier: no tested composite clears the title"  # one label, so clause (1) counts it only when B clears
    if ca is False:
        fa.append(flag)
    if cb is False:
        fb.append(flag)
    why = []
    one = [f for f in fa if f not in fb]
    if one:
        return {"side": "B", "clause": 1, "why": [f"A fails a hard gate that B passes: {one}"], "A": a, "B": b,
                "A_fails": fa, "B_fails": fb}
    d_lsd = (a["extra_lsd_db"] - b["extra_lsd_db"]) if None not in (a["extra_lsd_db"], b["extra_lsd_db"]) else None
    d_cos = (b["two_bar_cos"] - a["two_bar_cos"]) if None not in (a["two_bar_cos"], b["two_bar_cos"]) else None
    d_on = (abs(a["median_onset_ms"]) - abs(b["median_onset_ms"])) if None not in (a["median_onset_ms"], b["median_onset_ms"]) else None
    smoother = d_lsd is not None and d_cos is not None and d_on is not None and d_lsd >= 2.0 and d_cos >= 0.10 and d_on >= 5.0
    if smoother:
        return {"side": "B", "clause": 2, "why": [f"B's J5 is smoother on all three: {d_lsd:.2f} dB less extra spectral step, "
                                                  f"2-bar chroma {d_cos:+.3f}, onsets {d_on:.1f} ms closer"], "A": a, "B": b,
                "A_fails": fa, "B_fails": fb}
    why.append("A has no hard failure that B passes" + (f" (both: {sorted(set(fa) & set(fb))})" if set(fa) & set(fb) else ""))
    why.append(f"B's J5 is not smoother on all three seam measures at once: extra spectral step {d_lsd if d_lsd is None else round(d_lsd, 2)} "
               f"dB less (needs 2), 2-bar chroma {d_cos if d_cos is None else round(d_cos, 3)} higher (needs 0.10), onsets "
               f"{d_on if d_on is None else round(d_on, 1)} ms closer (needs 5)")
    return {"side": "A", "clause": "otherwise", "why": why, "A": a, "B": b, "A_fails": fa, "B_fails": fb}


# ------------------------------------------------------------------------------------------------ the x40 mask
def decide_mask(X):
    if not X:
        return None
    m, wo, wi = X["mask"], X["music_alone"], X["with_mask"]
    g = [("no click at its start or the seam", (wi["d2_ratio_at_mask_start"] or 0) < 2.0 and (wi["d2_ratio_at_seam"] or 0) < 2.0,
          f"d2 {wi['d2_ratio_at_mask_start']} at its start, {wi['d2_ratio_at_seam']} at the seam"),
         ("rises 6 LU or more into the downbeat", (m.get("rise_lu") or 0) >= 6.0, f"{m.get('rise_lu')} LU"),
         ("under the music", m["loudest_400ms_lufs"] < m["bed_lufs_over_its_second"],
          f"{m['loudest_400ms_lufs']} against {m['bed_lufs_over_its_second']} LUFS"),
         ("the step across XJ2 no more than 0.5 LU larger", abs(wi["step_3s_lu"]) - abs(wo["step_3s_lu"]) <= 0.5,
          f"{wo['step_3s_lu']} LU alone, {wi['step_3s_lu']} LU with it")]
    return {"accepted": all(ok for _, ok, _ in g), "gates": [{"gate": a, "ok": b, "detail": d} for a, b, d in g]}


def main():
    rules, g1r = load("decision_rules.json"), load("g1_rule.json")
    P, TA, TB, X = load("probe.json"), load("title_A.json"), load("title_B.json"), load("x40mask.json")
    MA, MB = load("main.metrics.json", WORK), load("main_g1b.metrics.json")
    dec = {"written_by": "tools/audio/score2/revise_decide.py, applying r2/decision_rules.json and r2/g1_rule.json",
           "rules_written_at": [rules and rules.get("written_at"), g1r and g1r.get("written_at")]}
    if P:
        dec["m2"] = decide_m2(P)
        dec["m3"] = decide_m3(P)
    ta, tb = decide_title(TA), decide_title(TB)
    dec["title_A"], dec["title_B"] = ta, tb
    TA2, TB2, r2r = load("title_A_r2.json"), load("title_B_r2.json"), load("title_round2_rule.json")
    ta2, tb2 = decide_title_r2(TA2, ta), decide_title_r2(TB2, tb)
    if ta2 or tb2:
        dec["rules_written_at"].append(r2r and r2r.get("written_at"))
        dec["title_A_r2"], dec["title_B_r2"] = ta2, tb2
    if MA and MB and "extras" in MA and "extras" in MB:
        dec["g1"] = decide_g1(MA, MB, ta, tb, ta2, tb2)
        dec["g1_side"] = dec["g1"]["side"]

    def pick(t1, t2):
        return (t1 or {}).get("chosen") or (t2 or {}).get("chosen") or (t2 or {}).get("carried")

    dec["title_variant"] = pick(ta, ta2)
    dec["title_variant_b"] = pick(tb, tb2)
    dec["title_variant_for_the_chosen_side"] = dec["title_variant_b"] if dec.get("g1_side") == "B" else dec["title_variant"]
    dec["title_flag_cleared"] = {"A": bool(clears(ta, ta2)), "B": bool(clears(tb, tb2))}
    dec["x40_mask"] = decide_mask(X)
    old = load("g1_decision.json") or {}
    texts = load("texts.json")
    if texts is not None:
        dec["text"] = texts
    elif "text" in old:
        dec["text"] = old["text"]
    with open(os.path.join(R2, "g1_decision.json"), "w") as fh:
        json.dump(dec, fh, indent=1, ensure_ascii=False)
    for k in ("m2", "m3"):
        if k in dec:
            print(k, dec[k]["chosen"], "|", "; ".join(dec[k]["why"]))
            for c in dec[k]["candidates"]:
                print("   ", c["splice"], "fails", c["failures"], "pct", c["lsd_percentile"])
    if "g1" in dec:
        print("g1", dec["g1"]["side"], dec["g1"]["clause"], "|", "; ".join(dec["g1"]["why"]))
    print("title A", ta and ta["chosen"], "| title B", tb and tb["chosen"])
    for nm, t in (("title A r2", ta2), ("title B r2", tb2)):
        if t:
            print(nm, t["chosen"], "| carried", t.get("carried"), "|", t.get("carried_why", ""))
    print("title variant carried:", dec["title_variant_for_the_chosen_side"], "| flag cleared", dec["title_flag_cleared"])
    print("x40 mask", dec["x40_mask"] and dec["x40_mask"]["accepted"])


if __name__ == "__main__":
    main()
