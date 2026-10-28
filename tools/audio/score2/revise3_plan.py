"""score2 lane, revision 3 (OVERRIDES §65, §66 R-04, §67, §68): the decisions and the revised main-film cue plan.

Pure JSON (standard library only): no audio is read or written, so it runs outside heavy.sh during the release
session's held-out run (OVERRIDES §68). Every decision applies .work/score2/cuesheet/r3/decision_rules.json, written
before any candidate was scored (28 Oct 13:45:49).

  python3 -I tools/audio/score2/revise3_plan.py decide
      -> r3/r04_decision.json (M2's clean splice, from revision 2's measured probe) and r3/coda_tap_decision.json (the
         coda's tap tuned to E or not, from the kit's own measurement)
  python3 -I tools/audio/score2/revise3_plan.py plans
      -> cuesheet/archive-2026-10-28-r2/ (revision 2's sheets and plan, copied once) and cuesheet/plan_main.json
         (revision 3): M2 one excerpt (B2 bars 7-23, J2 at bar 24) if r04_decision adopts it; M3 the edit that
         r3/bars_decision.json chose (bars 47-63 whole: bars 50-51 back in); everything from M4 on exactly 232 frames
         later; the coda's span after the end card, its timing read at build time from the coda's plan

Bars are the music map's indices (downbeats_s[k] starts bar k). Film time = film_in + (src - src_in): no stretch.
The 40-s cut (plan_x40.json) and G1's B side (plan_main_g1b.json, revision 2's record) are not touched.
"""
import copy
import hashlib
import json
import os
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import revise_plan as rp  # noqa: E402

B2, B4, A4 = rp.B2, rp.B4, rp.A4
CS = rp.CUESHEET
S2 = rp.SCORE2
R3 = os.path.join(CS, "r3")
ARCH = os.path.join(CS, "archive-2026-10-28-r2")
RULES = os.path.join(R3, "decision_rules.json")
FPS = 60
SHIFT_FRAMES = 232          # everything from M4 on (decision_rules.json BARS "everything_after_Enter")
SHIFT_S = SHIFT_FRAMES / FPS
J2_R2 = 53.9992             # revision 2's J2 (plan_main.json, 27 Oct)
NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]


def load(p):
    with open(p) as fh:
        return json.load(fh)


def write(p, obj):
    with open(p, "w") as fh:
        json.dump(obj, fh, indent=1, ensure_ascii=False)
        fh.write("\n")


def rules():
    raw = open(RULES, "rb").read()
    return json.loads(raw), hashlib.sha256(raw).hexdigest()


# ------------------------------------------------------------------------------------------------ the decisions
def decide_r04():
    R, sha = rules()
    probe = load(os.path.join(CS, "r2", "probe.json"))
    r2 = load(os.path.join(CS, "r2", "decision_rules.json"))
    j = next(c for c in probe["J2"] if c["end_bar"] == 24)
    j26 = next(c for c in probe["J2"] if c["end_bar"] == 26)
    j2_new = 19.9976 + rp.db(B2, 24) - rp.db(B2, 7)
    c1 = {"click": j["extra_hf_db"] < 3.0 and j["d2_ratio_at_seam"] < 2.0,
          "loudness": abs(j["step_3s_lu"]) <= 1.5, "breath": j["breath_db"] <= -2.0}
    clauses = {
        "1_J2_gates_as_measured": {"pass": all(c1.values()), **c1,
                                   "measured": {k: j[k] for k in ("label", "extra_hf_db", "d2_ratio_at_seam", "step_3s_lu",
                                                                  "step_400ms_lu", "breath_db", "extra_lsd_db",
                                                                  "lsd_percentile_of_incoming_own_downbeats",
                                                                  "beat_interval_across_ms")},
                                   "source": "r2/probe.json 'J2' (measured as built on 28 Oct 03:56, the build's "
                                             "source-time corrections applied)"},
        "2_no_splice": {"pass": True, "why": "M2-0 is B2 bars 7-23 in one excerpt: no splice gate applies"},
        "3_J2_stays": {"pass": abs(j2_new - J2_R2) * FPS < 0.5, "revision_2_s": J2_R2, "m2_0_s": round(j2_new, 4),
                       "difference_ms": round(1000 * (j2_new - J2_R2), 2)},
        "4_shots_keep_lengths": {"pass": True, "lengths_s": {"S11": 4.5, "S12": 3.5, "S13": 6.0},
                                 "why": "the plan keeps Ring 2's film times; only the bars under them change"},
    }
    adopt = all(c["pass"] for c in clauses.values())
    out = {"rule_file": os.path.relpath(RULES, rp.REPO), "rule_sha256": sha, "rule_written_at": R["written_at"],
           "ruling": R["R04"]["ruling"], "rule": R["R04"]["rule"], "revision_2_gates": r2["gates"],
           "clauses": clauses, "adopt_m2_0": adopt,
           "against_revision_2s_splice": {"17:19 at J2 bar 26": {k: j26[k] for k in ("extra_hf_db", "d2_ratio_at_seam",
                                                                                     "step_3s_lu", "breath_db")},
                                          "its_failures": "the spectral gate at the 95.7th percentile (bar 19's own "
                                                          "size) and the breath test (+10.9 dB): CUE_SHEET.md r2 §9.2"},
           "what_moves": "Ring 2's music only: S11 0:40.00 lands on B2 bar 17 (a 2-bar line; revision 2: bar 19), "
                         "B2's bar-19 entrance falls at 0:44.00, half a second before S12's cut (S12 starts on its "
                         "second beat, 0:44.50), S13 starts on bar 21 (0:48.00), B2's brighter phrase (bar 23, +1.8 LU) "
                         "arrives 4 s into S13 (0:52.00) while the Delete card waits, and bar 23's last three beats "
                         "breathe (the hats stop, -16.9 dB) into J2 at 0:54.00. Nothing from Ring 3 on moves.",
           "decision": ("ADOPT M2-0: B2 bars 7-23 whole (0:15.53-0:49.53), J2 out at bar 24" if adopt else
                        "KEEP 17:19 (revision 2's splice): a clause failed")}
    write(os.path.join(R3, "r04_decision.json"), out)
    return out


def decide_tap():
    R, sha = rules()
    kit = {t["id"]: t for t in load(os.path.join(rp.REPO, ".work", "sfx2", "KIT.json"))["files"]}
    k = kit["standin_tap_a"]["measure"]
    hz, conf = k["pitch_hz"], k["pitch_conf_db"]
    # the build's own varispeed to the nearest E (score_build.py nearest_shift: the octave that needs the least shift)
    import math
    e_hz = [440.0 * 2 ** ((12 * o + 4 - 9 - 48) / 12) for o in range(1, 8)]  # E1..E7 (E4 = 329.63 Hz)
    best = min(e_hz, key=lambda f: abs(1200 * math.log2(f / hz)))
    cents = 1200 * math.log2(best / hz)
    pitched = conf >= 20.0
    far = abs(cents) > 50.0
    small = abs(cents) <= 200.0
    tune = pitched and far and small
    b = load(os.path.join(S2, "master", "main.build.json"))
    tt = next(L for L in b["layers"] if L["id"] == "title_tap")
    out = {"rule_file": os.path.relpath(RULES, rp.REPO), "rule_sha256": sha, "rule_written_at": R["written_at"],
           "ruling": R["CODA_TAP"]["ruling"], "rule": R["CODA_TAP"]["rule"],
           "measured": {"take": "standin_tap_a (Kenney impactWood_light_002, CC0)", "kit_pitch_hz": hz,
                        "kit_note": f"{k['note']} {k['cents']:+d} c", "kit_pitch_conf_db": conf,
                        "source": ".work/sfx2/KIT.json measure (26 Oct, the kit's own analysis)",
                        "nearest_e_hz": round(best, 2), "shift_cents": round(cents, 1),
                        "the_title_tap_in_the_masters": {"tune": tt.get("tune"), "record": "master/main.build.json "
                                                                                           "layer title_tap (28 Oct 09:46)"}},
           "clauses": {"pitched (conf >= 20 dB)": pitched, "more than 50 cents from E": far, "within 2 semitones": small},
           "tune_to_E": tune,
           "decision": (f"TUNE to E ({round(cents / 100, 2):+g} semitones by the build's varispeed, as the title's tap): the "
                        "take is clearly pitched and sits 1.27 semitones under E4, so untuned it would be a different, "
                        "flatter tap than the title's; tuned, the coda's tap is the title's own tap at a whisper, on the "
                        "tonic of the film's last chord" if tune else "LEAVE UNTUNED"),
           "confirm_in_the_evening": "score_coda.py: the placed tap's spectral peak within 30 cents of E4 (329.63 Hz)"}
    write(os.path.join(R3, "coda_tap_decision.json"), out)
    return out


# ------------------------------------------------------------------------------------------------ the plan
def shifted(c, d):
    """A copy of a revision 2 cue moved by d seconds of film time (its source points never change)."""
    c = copy.deepcopy(c)
    c["film_in"] = rp.r4(c["film_in"] + d)
    for part in ("head", "tail"):
        h = c[part]
        for key in ("start", "end"):
            if key in h:
                h[key] = rp.r4(h[key] + d)
    c["gain_db"] = [[rp.r4(t + d) if t > 0 else t, g] for t, g in c["gain_db"]]
    return c


def half_bar(track, k):
    """The beat two beats after bar k's downbeat (the half bar), from the map's own beat grid."""
    m = rp.tmap(track)
    bt = m["beats_s"]
    d = m["downbeats_s"][k]
    i = min(range(len(bt)), key=lambda q: abs(bt[q] - d))
    return float(bt[i + 2])


def plan_r3():
    old = load(os.path.join(ARCH, "plan_main.json"))
    oc = {c["id"]: c for c in old["cues"]}
    os_ = {s["id"]: s for s in old["seams"]}
    oe = {e["label"]: e["t"] for e in old["events"]}
    r04 = load(os.path.join(R3, "r04_decision.json"))
    bars = load(os.path.join(R3, "bars_decision.json"))
    ch = bars["chosen"]
    assert ch["splice"] is None and ch["in_bar"] == 47, "this plan writes the edit the rule chose: B4 bars 47-63 whole"
    assert r04["adopt_m2_0"], "this plan writes M2-0; with 17:19 kept, revise_plan.py's revision 2 M2 stands"
    pre, pre_out = rp.pre, rp.pre_out
    cues, seams = [], []
    m1 = copy.deepcopy(oc["M1"])
    cues.append(m1)
    j1 = m1["film_in"] + m1["src_out"] - m1["src_in"]
    # M2: B2 bars 7-23 whole (R-04: M2-0), J2 out at bar 24 after bar 23's three-beat hat breath
    m2 = rp.cue("M2", "Allow", B2, rp.db(B2, 7), rp.db(B2, 24), j1, pre(), pre_out(), [[0.0, -5.5]])
    cues.append(m2)
    seams.append({"id": "J1", "t": rp.r4(j1), "from": "M1", "to": "M2", "label": os_["J1"]["label"]})
    j2 = m2["film_in"] + m2["src_out"] - m2["src_in"]
    # M3: B4 bars 47-63 whole to its own stop (§68: bars 50-51 back in, in place of M3s's splice)
    t_of = lambda k: j2 + rp.db(B4, k) - rp.db(B4, 47)  # noqa: E731
    phrase_c = t_of(56)
    m3 = rp.cue("M3", "Every Ring", B4, rp.db(B4, 47), rp.db(B4, 64), j2, pre(),
                {"mode": "ring", "until": 127.0, "fade": 1.0},
                [[0.0, -5.0], [rp.r4(phrase_c), -5.0], [rp.r4(phrase_c + 0.98), -4.4]])
    cues.append(m3)
    seams.append({"id": "J2", "t": rp.r4(j2), "from": "M2", "to": "M3",
                  "label": "Ring 3: B2 after its hat breath (bar 23's last three beats) into B4's riser bar"})
    j3 = m3["film_in"] + m3["src_out"] - m3["src_in"]
    # M4 onward: revision 2's cues, exactly 232 frames later (their source points unchanged)
    for cid in ("M4", "M5", "M6a", "M6b"):
        cues.append(shifted(oc[cid], SHIFT_S))
    m4 = cues[3]
    seams.append({"id": "J3", "t": rp.r4(j3), "from": "M3", "to": "M4", "label": os_["J3"]["label"],
                  "in_film": m4["film_in"]})
    for sid in ("J4", "J5", "F4"):
        s = copy.deepcopy(os_[sid])
        s["t"] = rp.r4(s["t"] + SHIFT_S)
        seams.append(s)
    end = rp.r4(old["end_film_s"] + SHIFT_S)
    sh = lambda lab: rp.r4(oe[lab] + SHIFT_S)  # noqa: E731
    events = [{"t": 4.0, "label": "name"}, {"t": 8.0, "label": "A4 lift"},
              {"t": rp.r4(j1 + rp.db(B2, 17) - rp.db(B2, 7)), "label": "Ring 2"},
              {"t": rp.r4(j1 + rp.db(B2, 19) - rp.db(B2, 7)), "label": "B2 bar 19"},
              {"t": rp.r4(j1 + rp.db(B2, 23) - rp.db(B2, 7)), "label": "B2 brighter phrase"},
              {"t": rp.r4(t_of(48)), "label": "B4 phrase B"}, {"t": rp.r4(t_of(50)), "label": "S16"},
              {"t": rp.r4(t_of(54)), "label": "Ring 4"}, {"t": rp.r4(phrase_c), "label": "B4 phrase C"},
              {"t": rp.r4(j2 + half_bar(B4, 59) - rp.db(B4, 47)), "label": "Cascade 4"},
              {"t": rp.r4(t_of(62)), "label": "⌘K"}, {"t": rp.r4(j3), "label": "Enter"},
              {"t": sh("kept card"), "label": "kept card"}, {"t": sh("R0"), "label": "R0"},
              {"t": sh("R480"), "label": "R480"}, {"t": sh("TITLE"), "label": "TITLE"},
              {"t": sh("end card"), "label": "end card"}, {"t": sh("page 2"), "label": "page 2"}]
    ob = {lab: (a, b) for a, b, lab in old["blocks"]}
    blocks = [[0.0, rp.r4(j1), "Act I"], [rp.r4(j1), rp.r4(ob["Drop"][1]), "Drop"],
              [rp.r4(ob["Rings 1-2"][0]), rp.r4(j2), "Rings 1-2"], [rp.r4(j2), rp.r4(j3), "Rings 3-4"],
              [rp.r4(j3), rp.r4(ob["Dusk"][1] + SHIFT_S), "Dusk"]]
    for lab in ("Climax", "Return: lead-in and release", "Return: gather", "Return: rush", "Return: merge", "Title",
                "End card"):
        a, b = ob[lab]
        blocks.append([rp.r4(a + SHIFT_S), rp.r4(b + SHIFT_S), lab])
    ret = old["return"]
    r0, r480, r720 = (rp.r4(ret[k] + SHIFT_S) for k in ("R0_film_s", "R480_film_s", "R720_film_s"))
    plan = {"film": "main",
            "title": "Ripples, main film with the Return: cue plan (revision 3, 28 Oct): two more bars of B4 for Ring 4 "
                     "and Cascade 4 (bars 50-51 back in), M2 in one piece (R-04), the coda's sound after the end card",
            "revision": {"n": 3, "date": "2026-10-28", "from": "cuesheet/archive-2026-10-28-r2/plan_main.json",
                         "rules": "cuesheet/r3/decision_rules.json", "bars": "cuesheet/r3/bars_decision.json",
                         "r04": "cuesheet/r3/r04_decision.json", "shift_after_enter_frames": SHIFT_FRAMES,
                         "enter_moves_s": rp.r4(j3 - os_["J3"]["t"])},
            "metrics": "r3/main.metrics.json",
            "end_film_s": end, "cues": cues, "seams": seams, "events": events, "blocks": blocks,
            "return": {"R0_film_s": r0, "R480_film_s": r480, "R720_film_s": r720, "frame_rate": FPS,
                       "R0_frame": round(r0 * FPS), "title_frame": round(r720 * FPS), "note": ret["note"]},
            "coda": {"L0_film_s": end, "L0_frame": round(end * FPS),
                     "what": "the post-credit scene (D157, OVERRIDES §62, §65) after the end card's true ending: no "
                             "music; room_tone_b carried on without a restart to the coda's last frame (about -52 "
                             "LUFS) and one stone tap (standin_tap_a, Kenney CC0, about -30 LUFS) peaking on L-C2's "
                             "landing, tuned as r3/coda_tap_decision.json decides",
                     "timing": "read at build time from the coda's plan (video/src/film2/setpieces/coda.ts, its "
                               "extra.timing and extra.coda.sound) by tools/audio/score2/coda_timing.ts, never typed "
                               "in (OVERRIDES §65)",
                     "x_version": "the main master cut at L0 (the end card's last frame is the X version's last): "
                                  "X's 2:20 cap leaves no room for the coda"}}
    return plan


def archive():
    """Revision 2's sheets and plan, copied once before revision 3 overwrites them (the measurements stay in place:
    revision 3 writes its own under cuesheet/r3/)."""
    os.makedirs(ARCH, exist_ok=True)
    done = []
    for src in ("CUE_SHEET.json", "CUE_SHEET.md", "BEAT_SHEET.json", "BEAT_SHEET.md", "cuesheet/plan_main.json",
                "cuesheet/sheet_spec.json"):
        p = os.path.join(S2, src)
        q = os.path.join(ARCH, os.path.basename(src))
        if os.path.exists(q):
            continue
        shutil.copy2(p, q)
        done.append(os.path.basename(src))
    why = os.path.join(ARCH, "WHY.txt")
    if not os.path.exists(why):
        open(why, "w").write(
            "Revision 2 of the cue sheet (the Return; the master revision of 28 Oct 09:45-10:00 built from it), copied "
            "here on 28 Oct by the score lane's revision 3 (OVERRIDES §68: two more bars of B4; §66 R-04; §65 the "
            "coda's sound) before it overwrote these files. Revision 2's measurements stay where they were "
            "(cuesheet/main.metrics.json, main.npz, r2/): revision 3 measures into cuesheet/r3/.\n")
    return done


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd == "decide":
        r = decide_r04()
        t = decide_tap()
        print("R-04:", r["decision"], json.dumps({k: v["pass"] for k, v in r["clauses"].items()}),
              f"J2 {r['clauses']['3_J2_stays']['difference_ms']:+.2f} ms")
        print("tap:", t["decision"][:60], json.dumps(t["clauses"]), t["measured"]["shift_cents"], "cents")
        return
    if cmd == "plans":
        print("archived:", archive() or "already")
        p = plan_r3()
        write(os.path.join(CS, "plan_main.json"), p)
        print("plan_main.json (revision 3): end", p["end_film_s"], rp.mmss(p["end_film_s"]), "frames",
              round(p["end_film_s"] * FPS))
        for c in p["cues"]:
            print(f"   {c['id']:4s} {c['track']:16s} src {c['src_in']:9.4f}-{c['src_out']:9.4f}  film {c['film_in']:9.4f}")
        for e in p["events"]:
            print(f"   {e['label']:20s} {e['t']:9.4f}  {rp.mmss(e['t'])}  frame {round(e['t'] * FPS)}")
        return
    raise SystemExit(__doc__)


if __name__ == "__main__":
    main()
