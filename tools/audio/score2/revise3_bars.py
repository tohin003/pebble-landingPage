"""score2 lane, revision 3 (OVERRIDES §68): the two more bars of B4 for Ring 4 and Cascade 4, chosen on the music maps.

Pure JSON (standard library only): no audio is read or written, so it runs outside heavy.sh (OVERRIDES §68 allows
small work on the maps during the release session's held-out run). It applies the rule written before any candidate
was scored (.work/score2/cuesheet/r3/decision_rules.json "BARS", 28 Oct 13:45:49) to every candidate the rule names:
each edit of B4 that enters at J2 on bar s (40 <= s <= 47), ends on B4's own stop (bar 64) and holds 17 bars, with at
most one forward splice of whole bars.

  python3 -I tools/audio/score2/revise3_bars.py [R3_DIR]
      -> R3_DIR/bars_candidates.json (every candidate and its measures), R3_DIR/bars_decision.json (the choice)
  python3 -I tools/audio/score2/revise3_bars.py confirm
      -> r3/confirm.json: the rule's evening confirmation on the plan's own measurement as built (exit 1 on a failure)

Bars are the music map's indices (downbeats_s[k] starts bar k). Film offsets are in B4 bars after J2.
"""
import hashlib
import json
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import revise_plan as rp  # noqa: E402  the maps, the downbeats and the cutter's own cost (t5_cut.py's)

B4 = rp.B4
R3 = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 and sys.argv[1] != "confirm" else os.path.join(rp.CUESHEET, "r3")
RULES = os.path.join(R3, "decision_rules.json")

STOP = 64                       # B4's own stop: bar 64's downbeat (the map's ending: "final_hit_on_downbeat_bar": 64)
TOTAL = 17                      # bars from J2 to the stop (Ring 3 7, Ring 4 5.5, Cascade 4 2.5, ⌘K 2)
PHRASE8 = (40, 48, 56, 64)      # the map's section starts in the ring groove (A', B, C, the ending)
PHRASE4 = (44, 52, 60)
SYNC = {"J2": 0.0, "S15 second ring arrival": 1.0, "S16 cut": 3.0, "Ring 4 landing": 7.0,
        "Ring 4 to Cascade 4": 12.5, "Cascade 4 to ⌘K": 15.0, "Enter on the stop": 17.0}
SCORED = ("J2", "S16 cut", "Ring 4 landing", "Cascade 4 to ⌘K")  # R3's bar-line sync points
BEAT = 0.25                     # one beat, in bars
CONFIRMED_SPLICES = {(50, 52)}  # measured as built in revision 2 (CUE_SHEET.md §2 M3s)


def pct(vals, q):
    v = sorted(vals)
    if not v:
        return None
    k = (len(v) - 1) * q
    f, c = math.floor(k), math.ceil(k)
    return v[f] if f == c else v[f] + (v[c] - v[f]) * (k - f)


def level(bar):
    """An integer bar's place in B4's phrasing: 8-bar line 3, 4-bar line 2, 2-bar line 1, a bar line 0.5."""
    if bar in PHRASE8:
        return 3.0, "an 8-bar phrase line"
    if bar in PHRASE4:
        return 2.0, "a 4-bar line"
    if bar % 2 == 0:
        return 1.0, "a 2-bar line"
    return 0.5, "a bar line"


def make(s, a=None, k=0):
    """The edit [s, a) + [a + k, 64): J2 into bar s, k bars out at bar a (k = 47 - s)."""
    parts = [(s, STOP)] if a is None else [(s, a), (a + k, STOP)]
    return {"in_bar": s, "splice": None if a is None else {"out_bar": a, "in_bar": a + k, "bars_out": k},
            "parts": parts, "bars": sum(b - x for x, b in parts)}


def src_at(c, x):
    """The source bar (a float) under film offset x (bars after J2)."""
    for p0, p1 in c["parts"]:
        n = p1 - p0
        if x < n - 1e-9:
            return p0 + x
        x -= n
    return float(STOP) + x


def candidates():
    out = [make(47)]
    for s in range(46, 39, -1):
        k = 47 - s
        for a in range(s + 1, STOP - k):  # a + k <= 63: the stop keeps at least its last bar before it
            out.append(make(s, a, k))
    for c in out:
        assert c["bars"] == TOTAL, c
    return out


def label(c):
    if c["splice"] is None:
        return f"B4 bars {c['in_bar']}-63 whole, the stop at bar 64" + (" (bars 50-51 back in)" if c["in_bar"] == 47 else "")
    sp = c["splice"]
    span = lambda x, y: f"{x}-{y}" if y > x else f"{x}"  # noqa: E731
    return (f"B4 bars {span(c['in_bar'], sp['out_bar'] - 1)} + {span(sp['in_bar'], 63)}, the stop at bar 64 "
            f"({sp['bars_out']} bar{'s' if sp['bars_out'] > 1 else ''} out at bar {sp['out_bar']})")


def family(c):
    if c["splice"] is None and c["in_bar"] == 47:
        return "bars 50-51 back in, in place of M3s's splice (OVERRIDES §68, first)"
    if c["in_bar"] == 45 and c["splice"] and (c["splice"]["out_bar"], c["splice"]["in_bar"]) == (50, 52):
        return "M3 entering two bars earlier with revision 2's 50:52 splice, F2 doubled (OVERRIDES §68, second)"
    if c["in_bar"] < 47:
        return "M3 entering earlier, with another splice of B4's own bars in its order (OVERRIDES §68, second and third)"
    return "another splice"


def measure(c, scale):
    m = rp.tmap(B4)
    nov, lstep, bt = m["novelty_by_bar"], m["loudness_step_by_bar"], m["bar_table"]
    pts = {}
    for name, x in SYNC.items():
        b = src_at(c, x)
        whole = abs(b - round(b)) < 1e-9
        e = {"film_bars_after_J2": x, "source_bar": round(b, 2)}
        if whole:
            lv, what = level(int(round(b)))
            e.update(level=lv, what=what)
            if c["splice"] and int(round(b)) == c["splice"]["in_bar"] and x > 0:
                e["note"] = "the first bar after the splice"
        else:
            e.update(level=0.25, what="a half bar")
        pts[name] = e
    # B4's 8-bar phrase lines inside the edit: on a sync point (within a beat), or inside a held read
    lines = []
    x = 0.0
    for p0, p1 in c["parts"]:
        for bar in range(p0, p1 + (1 if p1 == STOP else 0)):
            if bar in PHRASE8 and p0 <= bar <= p1:
                fx = x + (bar - p0)
                near = [n for n, sx in SYNC.items() if abs(sx - fx) <= BEAT + 1e-9]
                lines.append({"bar": bar, "film_bars_after_J2": fx, "on": near or None})
        x += p1 - p0
    lines = [ln for ln in lines if ln["bar"] != STOP or ln["film_bars_after_J2"] == TOTAL]
    orphans = [ln for ln in lines if not ln["on"]]
    lift = abs(src_at(c, SYNC["S15 second ring arrival"]) - 48) < 1e-9
    q = [src_at(c, 12.5 + i * BEAT) for i in range(10)]  # Cascade 4's quarter bars
    thin = sum(1 for b in q if 56 <= b < 64) * BEAT
    seams = []
    if c["in_bar"] != 47:
        s = c["in_bar"]
        seams.append({"seam": "J2", "confirmed": False, "into_bar": s,
                      "why_unconfirmed": "J2 is measured as built only into B4 bar 47 (r2/probe.json 'J2')",
                      "b4_own_novelty_at_in": nov[s], "b4_own_loudness_step_at_in_lu": lstep[s],
                      "b4_bar_lufs_raw": bt[s]["lufs"],
                      "riser_cause_kept": False})
    total_cost = 0.0
    if c["splice"]:
        a, b = c["splice"]["out_bar"], c["splice"]["in_bar"]
        pc = rp.pair_cost(B4, a, b)
        total_cost += pc["cost"]
        conf = (a, b) in CONFIRMED_SPLICES
        g4 = (pc["cost"] <= scale["one_bar_jump_cost_p90"] and pc["chroma_cos_before"] >= scale["consecutive_chroma_cos_p10"]
              and pc["chroma_cos_after"] >= scale["consecutive_chroma_cos_p10"])
        seams.append({"seam": f"splice {a}:{b}", "confirmed": conf, "out_bar": a, "in_bar": b, **pc,
                      "loudness_step_across_lu_raw": round(bt[b]["lufs"] - bt[a - 1]["lufs"], 2),
                      "b4_own_step_at_in_lu": lstep[b], "b4_own_novelty_at_in": nov[b],
                      "film_bars_after_J2": a - c["in_bar"],
                      "on_a_picture_cut": [n for n, sx in SYNC.items() if abs(sx - (a - c["in_bar"])) < 1e-9] or None,
                      "G4_within_B4s_own_bar_changes": g4})
    unconfirmed = sum(1 for s_ in seams if not s_["confirmed"])
    splices = 1 if c["splice"] else 0
    needs = int(lift) + int(abs(thin - 2.5) < 1e-9)
    score = sum(pts[n]["level"] for n in SCORED) - len(orphans)
    gates = {"G1": src_at(c, SYNC["Enter on the stop"]) == STOP, "G2": c["bars"] == TOTAL,
             "G3": splices <= 1 and all(p1 > p0 for p0, p1 in c["parts"]),
             "G4": all(s_.get("G4_within_B4s_own_bar_changes", True) for s_ in seams if s_["seam"] != "J2")}
    return {"label": label(c), "family": family(c), **c, "sync_points": pts, "phrase_lines": lines,
            "phrase_lines_off_every_sync_point": [ln["bar"] for ln in orphans], "lift_on_S15": lift,
            "cascade4_bars_over_phrase_C": thin, "seams": seams, "gates": gates,
            "passes_every_gate": all(gates.values()),
            "rank_key": {"R1_unconfirmed_seams": unconfirmed, "R1_splices": splices, "R2_needs_kept": needs,
                         "R3_sync_score": round(score, 2), "R4_cutter_cost": round(total_cost, 4)}}


def main():
    raw = open(RULES, "rb").read()
    rules = json.loads(raw)
    m = rp.tmap(B4)
    C = [bb["chroma"] for bb in m["bar_table"]]
    cons = [rp._dot(C[k], C[k + 1]) for k in range(40, 63)]
    jumps = [rp.pair_cost(B4, a, a + 1)["cost"] for a in range(41, 63)]
    scale = {"one_bar_jump_cost_p50": round(pct(jumps, 0.5), 4), "one_bar_jump_cost_p90": round(pct(jumps, 0.9), 4),
             "consecutive_chroma_cos_p10": round(pct(cons, 0.1), 4), "consecutive_chroma_cos_p50": round(pct(cons, 0.5), 4),
             "bars": "B4 bars 40-63 (one-bar jumps: a bar out at each bar line 41-62; consecutive bars 40-63)"}
    rows = [measure(c, scale) for c in candidates()]
    passing = [r for r in rows if r["passes_every_gate"]]
    key = lambda r: (r["rank_key"]["R1_unconfirmed_seams"], r["rank_key"]["R1_splices"],  # noqa: E731
                     -r["rank_key"]["R2_needs_kept"], -r["rank_key"]["R3_sync_score"], r["rank_key"]["R4_cutter_cost"])
    passing.sort(key=key)
    best_phrase = max(rows, key=lambda r: (r["sync_points"]["Ring 4 landing"]["level"], r["rank_key"]["R3_sync_score"],
                                           -r["rank_key"]["R1_unconfirmed_seams"]))
    named = {"bars 50-51 back in": next(r for r in rows if r["in_bar"] == 47),
             "F2 doubled (50:52 kept)": next(r for r in rows if r["in_bar"] == 45 and r["splice"]
                                             and (r["splice"]["out_bar"], r["splice"]["in_bar"]) == (50, 52)),
             "the best phrase line for Ring 4": best_phrase}
    out = {"rule_file": os.path.relpath(RULES, rp.REPO), "rule_sha256": hashlib.sha256(raw).hexdigest(),
           "rule_written_at": rules["written_at"], "scale": scale, "candidates": len(rows), "passing": len(passing),
           "rows": rows}
    with open(os.path.join(R3, "bars_candidates.json"), "w") as fh:
        json.dump(out, fh, indent=1, ensure_ascii=False)
        fh.write("\n")
    chosen = passing[0]
    runners = passing[1:6]
    dec = {"rule_file": out["rule_file"], "rule_sha256": out["rule_sha256"], "rule_written_at": rules["written_at"],
           "decided_by": "revise3_bars.py, the rule applied mechanically (no choice made after the numbers)",
           "scale": scale, "candidates": len(rows), "passing_every_gate": len(passing),
           "failing": [{"label": r["label"], "gates": {k: v for k, v in r["gates"].items() if not v}}
                       for r in rows if not r["passes_every_gate"]],
           "chosen": chosen, "next_by_the_rule": runners, "named_candidates": named,
           "ranking_order": rules["BARS"]["ranking"]}
    with open(os.path.join(R3, "bars_decision.json"), "w") as fh:
        json.dump(dec, fh, indent=1, ensure_ascii=False)
        fh.write("\n")
    print(f"{len(rows)} candidates, {len(passing)} pass every gate; scale {json.dumps(scale)}")
    print("chosen:", chosen["label"], json.dumps(chosen["rank_key"]))
    for r in runners:
        print("  next:", r["label"], json.dumps(r["rank_key"]))
    for n, r in named.items():
        print(f"  [{n}] {r['label']}: {json.dumps(r['rank_key'])}; Ring 4 on bar {r['sync_points']['Ring 4 landing']['source_bar']} "
              f"({r['sync_points']['Ring 4 landing']['what']}); off-sync phrase lines {r['phrase_lines_off_every_sync_point']}; "
              f"lift {r['lift_on_S15']}; Cascade 4 over phrase C {r['cascade4_bars_over_phrase_C']} bars; gates {r['gates']}")


def confirm():
    """The evening's confirmation on audio (the rule's 'confirm_in_the_evening', and R-04's last sentence): revision 2's
    gates on the chosen edit's seams in the plan's own measurement as built (cuesheet/r3/main.metrics.json). With no
    splice in M3, that is J2 (the click and loudness gates: J2 is a cue change, so the spectral, harmony and grid gates of
    a splice inside one track do not apply, as in revision 2) and J3 (the click gate: its step is the planned stop).
    Exit 1 when a gate fails: the chain stops before any master is built, and the lead is told."""
    plan = json.load(open(os.path.join(rp.CUESHEET, "plan_main.json")))
    met = json.load(open(os.path.join(rp.CUESHEET, plan["metrics"])))
    ex = met.get("extras", {}).get("seams", {})
    seams = {x["id"]: x for x in met["seams"]}
    rows = {}
    for sid, gates in (("J2", ("click", "loudness")), ("J3", ("click",))):
        m, e = seams[sid], ex.get(sid, {})
        g = {}
        if "click" in gates:
            g["click"] = (m.get("extra_hf_db") is None or m["extra_hf_db"] < 3.0) and (e.get("d2_ratio_at_seam") or 0.0) < 2.0
        if "loudness" in gates:
            g["loudness"] = abs(m["film_step_3s_lu"]) <= 1.5
        rows[sid] = {"gates": g, "pass": all(g.values()),
                     "measured": {"extra_hf_db": m.get("extra_hf_db"), "d2_ratio_at_seam": e.get("d2_ratio_at_seam"),
                                  "film_step_3s_lu": m["film_step_3s_lu"], "film_step_400ms_lu": m["film_step_400ms_lu"],
                                  "extra_lsd_db": m.get("extra_lsd_db"),
                                  "lsd_percentile_of_incoming_own_downbeats": e.get("lsd_percentile_of_incoming_own_downbeats")}}
    splices = [x for x in plan["seams"] if next(c for c in plan["cues"] if c["id"] == x["from"])["track"]
               == next(c for c in plan["cues"] if c["id"] == x["to"])["track"] and x["id"] != "F4"]
    out = {"what": "revision 3's audio confirmation (decision_rules.json BARS confirm_in_the_evening; R04)",
           "measurement": plan["metrics"], "seams": rows, "new_splices_in_M2_or_M3": [x["id"] for x in splices],
           "pass": all(r_["pass"] for r_ in rows.values()) and not splices}
    with open(os.path.join(R3, "confirm.json"), "w") as fh:
        json.dump(out, fh, indent=1)
        fh.write("\n")
    print("confirm:", "PASS" if out["pass"] else "FAIL", json.dumps({k: v["gates"] for k, v in rows.items()}))
    sys.exit(0 if out["pass"] else 1)


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "confirm":
        confirm()
    else:
        main()
