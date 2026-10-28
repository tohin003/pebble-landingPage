"""score2 lane, revision 3: the cue sheet's authored spec (sheet_spec.json), built from revision 2's (the archive) with
only what revision 3 changes: M2 in one piece (R-04), M3 in one piece (OVERRIDES §68: bars 50-51 back in), every
film time after Ring 4 moved with the music, the coda's sound after the end card (§65). Pure JSON (standard library
only): no audio is read or written. Every film time below is read from the revision 3 plan, never typed in.

  python3 -I tools/audio/score2/revise3_spec.py [WORK_DIR]   ->  WORK_DIR/sheet_spec.json
"""
import copy
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import revise_plan as rp  # noqa: E402

W = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else rp.CUESHEET
R3 = os.path.join(W, "r3")
OLD = json.load(open(os.path.join(W, "archive-2026-10-28-r2", "sheet_spec.json")))
PLAN = json.load(open(os.path.join(W, "plan_main.json")))
BARS = json.load(open(os.path.join(R3, "bars_decision.json")))
R04 = json.load(open(os.path.join(R3, "r04_decision.json")))
TAP = json.load(open(os.path.join(R3, "coda_tap_decision.json")))
CODA = os.path.join(R3, "planned", "coda_timing.json")  # coda_timing.ts, as read when this spec was written
CODA = json.load(open(CODA)) if os.path.exists(CODA) else None
B2, B4 = rp.B2, rp.B4
assert PLAN.get("revision", {}).get("n") == 3, "plan_main.json is not revision 3: run revise3_plan.py plans first"

EV = {e["label"]: e["t"] for e in PLAN["events"]}
SE = {s["id"]: s for s in PLAN["seams"]}
CU = {c["id"]: c for c in PLAN["cues"]}
SHIFT = PLAN["revision"]["shift_after_enter_frames"] / 60.0


def T(t):
    return rp.mmss(t)


def film_of(cid, src):
    c = CU[cid]
    return c["film_in"] + (src - c["src_in"])


def fr(t):
    return round(t * 60)


def half(k):
    m = rp.tmap(B4)
    i = min(range(len(m["beats_s"])), key=lambda q: abs(m["beats_s"][q] - m["downbeats_s"][k]))
    return float(m["beats_s"][i + 2])


m4_in, j3, j4 = CU["M4"]["film_in"], SE["J3"]["t"], SE["J4"]["t"]
kept, title, r0 = EV["kept card"], PLAN["return"]["R720_film_s"], PLAN["return"]["R0_film_s"]
f4, end = SE["F4"]["t"], PLAN["end_film_s"]
m6b = CU["M6b"]
decay_end = m6b["film_in"] + (m6b["tail"]["until"] - m6b["src_in"])
room_from = decay_end - m6b["tail"]["fade"]
ch = BARS["chosen"]
best_phrase = BARS["named_candidates"]["the best phrase line for Ring 4"]
J2m = R04["clauses"]["1_J2_gates_as_measured"]["measured"]

sp = copy.deepcopy(OLD)
sp["version"] = ("cue sheet revision 3 (28 Oct 2026): two more bars of B4 for Ring 4 and Cascade 4 (bars 50-51 back in), "
                 "M2 in one piece (R-04), the coda's sound after the end card")
sp["previous"] = {"label": "revision 2", "sheet": "archive-2026-10-28-r2/CUE_SHEET.json",
                  "plan": "archive-2026-10-28-r2/plan_main.json"}
m = sp["main"]
m["metrics"] = "r3/main.metrics.json"   # the evening's measurement of this plan (revise_measure.py plan); pending until then
oc = OLD["main"]["cues"]
c = {"M1": oc["M1"]}
c["M2"] = {
    "role": "the Drop, Ring 1 (your browser) and Ring 2 (your apps): B2 bars 7-23 in one piece (R-04's clean alternative)",
    "why": oc["M2a"]["why"] + [
        "R-04 (OVERRIDES §66): revision 2's splice (bars 17-18 out at Ring 2's arrival) failed two of its own gates, the "
        "spectral step at the 95.7th percentile of B2's bar changes and J2's breath test (+10.9 dB). M2 in one piece has "
        "no splice, and J2 out at bar 24 passes every gate as revision 2 measured it as built (r2/probe.json: extra "
        f"8-16 kHz {J2m['extra_hf_db']:+.2f} dB, second-difference ratio {J2m['d2_ratio_at_seam']:.3f}, a "
        f"{J2m['step_3s_lu']:+.2f} LU step over 3 s, the breath {J2m['breath_db']:+.1f} dB): r3/r04_decision.json",
        f"J2 stays at {T(SE['J2']['t'])} ({R04['clauses']['3_J2_stays']['difference_ms']:+.1f} ms), so nothing from Ring 3 on "
        "moves",
        f"Ring 2 hears bars 17-23 (revision 2: 19-25): its arrival on bar 17 ({T(EV['Ring 2'])}, a 2-bar line), B2's bar-19 "
        f"entrance at {T(EV['B2 bar 19'])}, S13 from bar 21, B2's brighter phrase (bar 23, +1.8 LU) at "
        f"{T(EV['B2 brighter phrase'])} under the waiting Delete card, then bar 23's last three beats breathe (the hats "
        "stop) into J2"],
    "eq": "none",
    "layers": ["the Drop composite on 0:20.00 (the plunk 2 frames ahead, the hit, sub 1)",
               "the Ring 1 sweep 12 frames before Ring 1 (0:27.80)",
               f"the Ring 2 sweep 12 frames before Ring 2 ({T(EV['Ring 2'] - 0.2)}): there is no seam to carry now",
               "tick 2 on the real '=' press (S11)", "tick 3 on the real click (S12)"]}
c["M3"] = {
    "role": "Ring 3 (your files and the terminal), Ring 4 (your project, AgentGuard), Cascade 4 and the ⌘K step into "
            "Stealth: B4 bars 47-63 in one piece, to its own stop (bars 50-51 back in)",
    "why": [oc["M3a"]["why"][0], oc["M3a"]["why"][1],
            "OVERRIDES §68: Ring 4, Cascade 4 and ⌘K need 10 bars from Ring 4's landing to Enter (5.5, 2.5 and 2). Bars "
            "50-51 come back in, in place of revision 2's splice, so B4 plays bars 47-63 whole with no seam, by the rule "
            f"written before the measurement (r3/decision_rules.json BARS): of {BARS['candidates']} edits, "
            f"{BARS['passing_every_gate']} stay within B4's own bar changes on the maps, and this is the only one with no "
            "seam that a measurement has not confirmed, and one of the two that keep both the lift on S15 and Cascade 4 "
            "over phrase C (r3/bars_decision.json)",
            f"Ring 4 leaves on bar 54 ({T(EV['Ring 4'])}, a 2-bar line), not on a phrase line. With B4's real stop on Enter "
            "and 10 bars after the landing, a run of B4's own bars puts the landing there; a phrase line for Ring 4 "
            "needs a splice after the landing, J2 off the riser bar and the lift off Ring 3 (the best such edit, "
            f"{best_phrase['label']}, has {best_phrase['rank_key']['R1_unconfirmed_seams']} unconfirmed seams and keeps "
            f"{best_phrase['rank_key']['R2_needs_kept']} of the two block needs)",
            f"under Ring 4: bar 54 and B4's fill (bar 55, its brightest bar) carry the ring's travel and the dolly in; "
            f"phrase C arrives at {T(EV['B4 phrase C'])} (Ring 4's frame {fr(EV['B4 phrase C']) - fr(EV['Ring 4'])}) while "
            "the act is read, and the music settles 1.4 LU under phrase B; Verified (about four bars in) falls on a beat",
            f"Cascade 4 starts on a half bar ({T(EV['Cascade 4'])}, bar 59.5) over phrase C: the drive thinning toward the "
            "quiet passage (TREATMENT §3.5 S19)",
            f"⌘K on bar 62 ({T(EV['⌘K'])}); B4's real stop (2:03.94) lands on the person's Enter ({T(SE['J3']['t'])})",
            f"its gain eases from -5.0 to -4.4 dB over the first half bar of phrase C ({T(EV['B4 phrase C'])}), which is "
            "about 1 LU quieter (revision 2 eased it at Ring 4's landing, which was phrase C's start)"],
    "eq": oc["M3a"]["eq"],
    "layers": [f"the Ring 3 sweep 12 frames before Ring 3 ({T(SE['J2']['t'] - 0.2)}): it also covers J2",
               f"the Ring 4 sweep 12 frames before Ring 4 ({T(EV['Ring 4'] - 0.2)})",
               f"tick 4 (ui_tap_enter) exactly on the stop, {T(SE['J3']['t'])}, soft: it sits alone in the hush"]}
c["M4"] = copy.deepcopy(oc["M4"])
c["M4"]["layers"] = [f"glass_shimmer_a from {T(j3)} with the dusk sweep, about -27 LUFS momentary (left out of the "
                     "masters since the 26 Oct 23:45 build: over B4's ring-out it lifted the classifier's 'foghorn' from "
                     "0.33 to 0.46)",
                     f"room tone under the hush ({T(j3)}-{T(j3 + 2.1)}) at -52 LUFS"]
c["M5"] = copy.deepcopy(oc["M5"])
c["M5"]["why"] = [w.replace("after M2 (which left B2 at 0:53.53)", "after M2 (which left B2 at 0:49.53, bar 24)")
                  for w in oc["M5"]["why"]]
c["M5"]["why"][-1] += " (revision 2's measurement: the same audio, 232 frames later)"
c["M5"]["layers"] = [f"the climax composite on {T(kept)} (hit, sub 2); the music ducks for 250 ms",
                     oc["M5"]["layers"][1]]
c["M6a"] = copy.deepcopy(oc["M6a"])
c["M6a"]["why"][1] += " (revision 2's measurement: the same audio, 232 frames later)"
c["M6a"]["layers"] = [
    oc["M6a"]["layers"][0].replace("1:56.03-1:58.03", f"{T(title - 2.0)}-{T(title)}").replace("(7082)", f"({fr(title)})"),
    f"nothing on the blink (R646, {T(r0 + 646 / 60)}): a sound would claim a reaction",
    oc["M6a"]["layers"][2].replace("on 1:58.03", f"on {T(title)}")]
assert "1:58.03" not in json.dumps(c["M6a"]["layers"]) and "7082" not in json.dumps(c["M6a"]["layers"])
c["M6b"] = copy.deepcopy(oc["M6b"])
c["M6b"]["role"] = (f"after F4: the I chord ({T(f4)}), page 2 over the composed diminuendo, room tone, and the room tone "
                    "carried on through the post-credit scene")
c["M6b"]["layers"] = [f"room tone after the decay ({T(room_from)}-{T(end)}), carried on without a restart to the coda's "
                      "last frame at about -52 LUFS, with the coda's one stone tap (OVERRIDES §65)"]
c["M6b"]["exit"] = (f"the track's own composed ending: vi, IV, I and a diminuendo that falls below -45 LUFS momentary at "
                    f"about {T(134.41 + SHIFT)}; room tone to the end card's last frame ({T(end)}) and on through the coda; "
                    "never a fade")
m["cues"] = c
oj = OLD["main"]["joins"]
j = {"J1": oj["J1"]}
j["J2"] = copy.deepcopy(oj["J2"])
j["J2"]["how"] = (f"B2's hi-hats stop for the last three beats of bar 23 ({J2m['breath_db']:+.1f} dB against the four beats "
                  "before: the breath revision 2's rule asks for), and the cut lands on B4's bar 47, its own riser bar, "
                  f"at {T(SE['J2']['t'])}, with Ring 3's sweep pre-lapped 12 frames. B4's riser and its own 3.4 LU breath "
                  f"lift into its phrase B at {T(EV['B4 phrase B'])}, the second ring arrival. 60 ms pre-roll; no beat "
                  "overlap.")
j["J3"] = copy.deepcopy(oj["J3"])
j["J3"]["how"] = ("B4's beat stops on its downbeat (2:03.94 in the track) exactly as the person presses Enter on 'Turn "
                  f"Stealth Lockdown on' ({T(j3)}); the Enter tick sits alone in the hush. B4's chord rings 1.5 s and its "
                  "reverb decays (-22 LU in 2 s); the tail is trimmed at 2:07.0 in the track (-35 LUFS) with a 1 s fade. "
                  f"M4 fades in from {T(m4_in)} over 2.0 s (overlap with the tail 1.6 s).")
j["J4"] = copy.deepcopy(oj["J4"])
j["J4"]["how"] = ("A 1.0 s equal-power crossfade: B2 enters from 1:23.53 in the track and reaches full on its 1:24.53 bar "
                  f"line as S23 cuts in at {T(j4)} (a J-cut: sound leads picture by 1.0 s). The breakdown then rises 4 dB "
                  "over 3.5 s, takes B2's own one-beat stop (1:28.03 in the track, -22 LUFS momentary) and lands the "
                  f"kept card on the lift at {T(kept)}.")
j["J5"] = oj["J5"]
j["F4"] = copy.deepcopy(oj["F4"])
j["F4"]["motivation"] = (f"F4 on (§61): with it the film runs {T(end)}, {140.0 - end:.2f} s under X's 2:20 cap; without "
                         f"it {T(end + 2.0)}, over the cap; page 2 keeps 7.0 s (it needs 6.2)")
m["joins"] = j
old_shots = {s[0]: s for s in OLD["main"]["shots"]}


def keep(sid, what=None):
    s = copy.deepcopy(old_shots[sid])
    if s[2].get("cue") == "M2a":
        s[2]["cue"] = "M2"
    if what:
        s[3] = what
    return s


src_b2 = lambda film: CU["M2"]["src_in"] + (film - CU["M2"]["film_in"])  # noqa: E731
shots = [keep("S01"), keep("S02"), keep("S03"), keep("S04"), keep("S05"), keep("S06"), keep("S07"), keep("S08"), keep("S09"),
         ["S11", "Ring 2", {"cue": "M2", "src": rp.r4(rp.db(B2, 17))},
          "ring-led arrival on B2 bar 17 (a 2-bar line; M2 runs whole, no splice); Calculator '=' at 1x, best on bar 18's "
          "downbeat (0:42.00) so its Activity row is read before the cut (tick 2); L11"],
         ["S12", "Ring 2", {"cue": "M2", "src": rp.r4(src_b2(44.4986))},
          "a click by picture after the first-action card (tick 3); its momentum cut peaks on B2's bar-19 entrance "
          "(0:44.00) and its first readable frame lands on the next beat"],
         ["S13", "Ring 2", {"cue": "M2", "src": rp.r4(rp.db(B2, 21))},
          f"the Delete card waits; L12; from bar 21; B2's brighter phrase (bar 23) arrives at {T(EV['B2 brighter phrase'])} "
          "under the waiting card, then bar 23's three-beat hat breath into J2"],
         keep("S15"),
         ["S16", "Ring 3", {"cue": "M3", "src": rp.r4(rp.db(B4, 50))},
          "the flyer, on B4 bar 50 (bars 50-51 back in: no splice): the folder card, Allow, 'Wrote ...', the push to Undo"],
         ["S18", "Ring 4", {"cue": "M3", "src": rp.r4(rp.db(B4, 54))},
          "studio-bookings: Running to Done to Verified at 1x; L17, L18; the ring leaves on B4 bar 54 (a 2-bar line) over "
          f"B4's fill (bar 55); phrase C arrives at {T(EV['B4 phrase C'])} under the act's read; Verified lands on a beat"],
         ["S19", "Cascade 4", {"cue": "M3", "src": rp.r4(half(59))},
          "'Bigger tasks' (4 items), from a half bar (bar 59.5) over phrase C: the drive thinning toward the quiet passage"],
         ["S20", "Quiet passage", {"cue": "M3", "src": rp.r4(rp.db(B4, 62))},
          "⌘K on B4 bar 62, 'stealth', the row lights; Enter lands on B4's stop; the light starts to cool"],
         ["S21", "Quiet passage", {"cue": "M3", "src": rp.r4(rp.db(B4, 64))}, old_shots["S21"][3]],
         ["S22", "Quiet passage", {"film": rp.r4(old_shots["S22"][2]["film"] + SHIFT)}, old_shots["S22"][3]],
         keep("S23"),
         keep("S24", f"Kiln, one 1x take; the kept card lands on B2's lift at +1.0 s ({T(kept)}); L25"),
         keep("S25"), keep("S26"),
         keep("S27", f"page 1, the facts, on IV; the I chord arrives 2 s in ({T(f4)}, after F4)"),
         keep("S28", "page 2, the small print, over the composed diminuendo; room tone for the last 0.22 s, carried on into "
                     "the post-credit scene (§65)")]
for s in shots:
    if s[2].get("cue") in ("M3a", "M3b", "M2b"):
        s[2]["cue"] = "M3" if s[2]["cue"].startswith("M3") else "M2"
assert shots[[s[0] for s in shots].index("S15")][2] == {"cue": "M3", "src": 91.0326}
m["shots"] = shots
m["end_film_s"] = PLAN["end_film_s"]
m["swell"] = {**OLD["main"]["swell"], "end_film_s": rp.r4(title)}
osp = OLD["main"]["sync_points"]
later = [p for p in osp if isinstance(p[0], dict) and p[0]["cue"] in ("M4", "M5", "M6a", "M6b")]
later = [[a, w.replace("1:38.03", T(kept))] for a, w in later]
sync = [osp[0], osp[1], osp[2],
        [{"cue": "M2", "src": 15.5267}, osp[3][1]],
        [{"cue": "M2", "src": 23.5271}, "Ring 1 arrival"],
        [{"cue": "M2", "src": 31.5275}, "B2 phrase line (inside S09)"],
        [{"cue": "M2", "src": rp.r4(rp.db(B2, 17))}, "Ring 2 arrival on B2 bar 17 (no splice: M2 runs whole), under its sweep"],
        [{"cue": "M2", "src": rp.r4(rp.db(B2, 19))}, "B2's bar-19 entrance: S12's momentum cut peaks here; its first "
                                                     "readable frame on the next beat"],
        [{"cue": "M2", "src": rp.r4(rp.db(B2, 23))}, "B2's brighter phrase (bar 23) under the waiting Delete card (S13)"],
        [{"cue": "M2", "src": rp.r4(rp.db(B2, 23) + 0.5)}, "B2's hats stop for bar 23's last three beats: J2's breath"],
        [{"cue": "M3", "src": rp.r4(rp.db(B4, 47))}, "J2: Ring 3's first ring-led move; the cut to B4's riser bar"],
        [{"cue": "M3", "src": rp.r4(rp.db(B4, 48))}, "Ring 3's second arrival on B4's phrase B: the lift"],
        [{"cue": "M3", "src": rp.r4(rp.db(B4, 50))}, "S16 on B4 bar 50"],
        [{"cue": "M3", "src": rp.r4(rp.db(B4, 54))}, "Ring 4: the ring leaves the stone on B4 bar 54 (a 2-bar line)"],
        [{"cue": "M3", "src": rp.r4(rp.db(B4, 55))}, "B4's fill (bar 55) under Ring 4's travel and dolly"],
        [{"cue": "M3", "src": rp.r4(rp.db(B4, 56))}, "B4's phrase C under Ring 4's act read, 1.4 LU under phrase B"],
        [{"cue": "M3", "src": rp.r4(half(59))}, "Cascade 4 from the half bar (bar 59.5), over phrase C"],
        [{"cue": "M3", "src": rp.r4(rp.db(B4, 62))}, "⌘K on B4 bar 62"],
        [{"cue": "M3", "src": rp.r4(rp.db(B4, 64))}, "ENTER = B4's stop (tick 4 alone in the hush); the Veil"]] + later
sync.append([{"film": end}, "L0: the end card's true ending; the post-credit scene begins, its room tone carried on "
                            "without a restart (§65)"])
if CODA:
    sync.append([{"film": rp.r4(CODA["tap_film_s"])},
                 f"the coda's one stone tap on L-C2's landing (L{CODA['line2']}, as planned when this sheet was written; "
                 "the build reads it again from the coda's plan)"])
    sync.append([{"film": rp.r4(CODA["end_film_s"])}, f"the coda's end: its last frame is L{CODA['end'] - 1}, and the room "
                                                       "tone runs to the end of it"])
m["sync_points"] = sync
m["coda"] = {"L0_film_s": PLAN["coda"]["L0_film_s"], "L0_frame": PLAN["coda"]["L0_frame"],
             "what": PLAN["coda"]["what"], "timing": PLAN["coda"]["timing"], "x_version": PLAN["coda"]["x_version"],
             "tap_tuning": TAP["decision"], "planned": CODA}
sp["flex"] = [
    ["F1", "-2.0 s: the 10-s Return",
     "if G1's viewers name the Return as the big one (MONTAGE_DESIGN §1.4, §2.2): M5 ends at B2 1:42.53 (bar 51) and J5 "
     f"cuts onto A4 bar 80 at R360; the title at R600 ({T(title - 2.0)}); the film {T(end - 2.0)}. That J5 (B2 bar 51's "
     "downbeat) is not measured yet: measure it as this J5 was before use"],
    ["F2", "spent",
     "revision 3 gave Rings 3-4 their two more bars by putting B4 bars 50-51 back in (OVERRIDES §68); one more bar here "
     f"would run the film {T(end + 1.94)}, over X's 2:20 cap"],
    ["F3", "the quiet passage",
     "M4 is a pulse-free pad: S21+S22 may run 10.0-14.5 s without touching any downbeat (M5's in-point moves with it), "
     f"within the {140.0 - end:.2f} s left under X's cap. This is where L23's optional 2 s would go, if 2.0.0 ships the "
     "focus fix; then something else must give (the lead's call)"],
    ["F4", "ON (-2.0 s at the end), and needed",
     "a CC BY splice inside A4's held IV chord: bar 85 out (2:50.52-2:52.52; chroma cosine 0.995 and MFCC cosine 0.996 "
     "with bar 84, -17.1 against -18.2 LUFS), 200 ms crossfade ending on bar 86's downbeat; page 1 hears IV for one "
     f"bar before I. Off again: +2.0 s, the film {T(end + 2.0)}, over X's cap"],
    ["F5", "superseded",
     "OVERRIDES §68: Cascade 4 keeps its four features in 2.5 bars and Ring 4 its 5.5 bars; the person chose 35 readable "
     "features (§61), so Cascade 4 never leaves"]]
with open(os.path.join(W, "sheet_spec.json"), "w") as fh:
    json.dump(sp, fh, indent=1, ensure_ascii=False)
print("wrote", os.path.join(W, "sheet_spec.json"), "| shots", len(shots), "| sync points", len(sync),
      "| coda timing", "read" if CODA else "not read yet")
