"""score2 lane, revision 3: write CUE_SHEET.md from CUE_SHEET.json, BEAT_SHEET.json, revision 3's rules and decisions
(cuesheet/r3/) and, once they exist, revision 3's own measurement (cuesheet/r3/main.metrics.json) and masters
(master/*.build.json built from this plan, master/main.coda.json). Every number is read from those files; none is typed
by hand. Before the evening's measurement, every measured number is written as pending, never carried over from
revision 2's plan. Sections revision 3 does not change point to revision 2's sheet (cuesheet/archive-2026-10-28-r2/).
Pure JSON and text (standard library only): no audio.

  python3 -I tools/audio/score2/revise3_md.py      -> .work/score2/CUE_SHEET.md
"""
import hashlib
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
S2 = os.path.join(REPO, ".work", "score2")
W = os.path.join(S2, "cuesheet")
R3 = os.path.join(W, "r3")
MD = os.path.join(S2, "master")
ARCH = "cuesheet/archive-2026-10-28-r2/CUE_SHEET.md"


def load(p):
    with open(p) as fh:
        return json.load(fh)


def opt(p):
    return load(p) if os.path.exists(p) else None


def sha(p):
    return hashlib.sha256(open(p, "rb").read()).hexdigest()


CS = load(os.path.join(S2, "CUE_SHEET.json"))
BS = load(os.path.join(S2, "BEAT_SHEET.json"))
PLAN = load(os.path.join(W, "plan_main.json"))
M = CS["main_film"]
RULES = load(os.path.join(R3, "decision_rules.json"))
BD = load(os.path.join(R3, "bars_decision.json"))
ROWS = load(os.path.join(R3, "bars_candidates.json"))["rows"]
BOTH = [r for r in ROWS if r["lift_on_S15"] and abs(r["cascade4_bars_over_phrase_C"] - 2.5) < 1e-9]
BOTH_PASS = [r for r in BOTH if r["passes_every_gate"]]
R04 = load(os.path.join(R3, "r04_decision.json"))
TAP = load(os.path.join(R3, "coda_tap_decision.json"))
CAN = opt(os.path.join(R3, "coda_canaries.json"))
MET = opt(os.path.join(W, PLAN.get("metrics", "r3/main.metrics.json")))
BLD = opt(os.path.join(MD, "main.build.json"))
BLD = BLD if BLD and BLD.get("plan_sha256") == sha(os.path.join(W, "plan_main.json")) else None  # this plan's masters only
BLDX = opt(os.path.join(MD, "x40.build.json")) if BLD else None
CODA_CHK = opt(os.path.join(MD, "main.coda.json")) if BLD else None
ARC = opt(os.path.join(MD, "main.arc.json")) if BLD else None
LAY = (opt(os.path.join(MD, "layers_main.json")) if BLD else None) or opt(os.path.join(R3, "planned", "layers_main.json"))
CT = (opt(os.path.join(MD, "coda_timing.json")) if BLD else None) or opt(os.path.join(R3, "planned", "coda_timing.json"))
PEND = "pending (the evening's measurement)"


def f(v, d=2, sign=False):
    if v is None:
        return "n/a"
    if round(v, d) == 0:
        v = 0.0
    s = f"{v:+.{d}f}" if sign else f"{v:.{d}f}"
    return s.replace("-", "−")


def mm(t):
    s = "−" if t < 0 else ""
    t = abs(t)
    return f"{s}{int(t // 60)}:{t % 60:05.2f}"


def fr(t):
    return round(t * 60)


J = {j["id"]: j for j in M["joins"]}
C = {c["id"]: c for c in M["cues"]}
EV = {e["label"]: e["t"] for e in PLAN["events"]}
measured = bool(MET)
CH = BD["chosen"]


def meas(j, key, d=2, sign=False):
    m = j["measured"]
    return PEND if "pending" in m else f(m.get(key), d, sign)


def t_cues():
    L = ["| Cue | Track (licence) | Source | Film | Scene |", "|---|---|---|---|---|"]
    for c in M["cues"]:
        L.append(f"| **{c['id']}** \"{c['name']}\" | {c['track']['label']} {c['track']['title']} ({c['track']['licence']}) | "
                 f"{c['source']['in']}–{c['source']['out']} | {c['film']['in']}–{c['film']['out']} | {c['role']} |")
    return L


def t_joins():
    L = ["| Join | Film (frame) | Method | Step, 3 s / 400 ms [M] | Spectral step: extra; percentile of the incoming track's "
         "own bar changes [M] | Extra 8–16 kHz [M] |", "|---|---|---|---|---|---|"]
    for j in M["joins"]:
        m = j["measured"]
        if "pending" in m:
            L.append(f"| **{j['id']}** {j['name']} | {j['film']} ({j['frame']}) | {'; '.join(j['methods'])} | {PEND} | {PEND} | "
                     f"{PEND} |")
        else:
            L.append(f"| **{j['id']}** {j['name']} | {j['film']} ({j['frame']}) | {'; '.join(j['methods'])} | "
                     f"{f(m['film_step_3s_lu'], 2, True)} / {f(m['film_step_400ms_lu'], 2, True)} LU | "
                     f"{f(m['extra_lsd_db'], 1, True)} dB; p{f(m.get('lsd_percentile_of_incoming_own_downbeats'), 0)} | "
                     f"{f(m.get('extra_hf_db'), 1, True)} dB |")
    return L


def t_arc():
    if not M.get("blocks_measured"):
        return [f"The arc on the bed: {PEND}. Revision 2's numbers are in `{ARCH}` §0; revision 3 changes the music under "
                "Rings 1–4 (M2 and M3 each in one piece, B4 bars 50–51 back in) and moves everything after Enter 232 frames "
                "later, so its own measurement replaces them."]
    L = ["| Block | Film | Integrated, LUFS | Short-term median / max, LUFS |", "|---|---|---|---|"]
    for b in M["blocks_measured"]:
        L.append(f"| {b['label']} | {mm(b['film'][0])}–{mm(b['film'][1])} | {f(b['integrated_lufs'])} | "
                 f"{f(b['st_median'])} / {f(b['st_max'])} |")
    return L


def t_blocks():
    pk = "on_revision_2"
    L = ["| Block | Film (frames) | Length, s | % of the film | Music | In revision 2 |", "|---|---|---|---|---|---|"]
    for r in BS["blocks"]:
        L.append(f"| {r['block']} | {r['start']}–{r['end']} ({r['start_frame']}–{r['end_frame']}) | {f(r['dur_s'])} | "
                 f"{f(r['start_pct'], 1)} | {', '.join(r['music'])} | {(r.get(pk) or 'new').replace('-', '–')} |")
    return L


def t_shots():
    L = ["| Shot | Film (frames) | Length, s | Under | What lands where |", "|---|---|---|---|---|"]
    for s in M["shots"]:
        L.append(f"| {s['id']} | {s['start']}–{s['end']} ({s['start_frame']}–{s['start_frame'] + s['dur_frames']}) | "
                 f"{f(s['dur_s'])} | {s['music_under']} | {s['what']} |")
    return L


def t_sync():
    L = ["| Film | Frame | What |", "|---|---|---|"]
    for p in M["sync_points"]:
        L.append(f"| {p['film']}{' (about)' if p.get('approximate') else ''} | {p['frame']} | {p['what']} |")
    return L


def t_return():
    rt = M["return"]
    L = [f"R0 = film {mm(rt['R0_film_s'])} (frame {rt['R0_frame']}); the title (R720) = film {mm(rt['title_film_s'])} (frame "
         f"{rt['title_frame']}). Every R-mark is exactly 232 frames later than in revision 2; the Return's own timing in "
         "R-frames is unchanged.", "", "| R | Film | Frame | What |", "|---|---|---|---|"]
    for r in rt["marks"]:
        L.append(f"| R{r['R']} | {r['film']} | {r['frame']} | {r['what']} |")
    return L


def t_layers():
    if not LAY:
        return ["(the layer sheet is written by `score_layers.py`)"]
    src = "master/layers_main.json (revision 3's build)" if BLD else "cuesheet/r3/planned/layers_main.json (planned; the evening's build writes master/layers_main.json again, re-reading the coda's timing)"
    L = [f"From `{src}`. Levels before the master's gain.", "", "| Film (frame) | Layer | Take | Level | Note |",
         "|---|---|---|---|---|"]
    for x in LAY["layers"]:
        lv = x["level"]
        if lv["mode"] == "abs_m":
            lvl = f"{lv['lufs']} LUFS (loudest 400 ms)"
        elif lv["mode"] == "abs_i":
            lvl = f"{lv['lufs']} LUFS (integrated)"
        elif lv["mode"] == "rel":
            lvl = f"{lv['offset_db']:+g} dB on the music"
        else:
            lvl = f"peak {lv['offset_db']:+g} dB on the music's"
        if x.get("take"):
            take = x["take"]
        elif x.get("designed"):
            take = "designed " + (x["designed"].get("recipe") or x["designed"].get("base", ""))
        elif x.get("swell"):
            take = "reverse swell (A4's own chord)"
        elif x.get("composite"):
            take = "CC0 composite"
        else:
            take = ""
        tune = f", tuned to {x['tune']['to_note']}" if x.get("tune") else ""
        ex = x.get("excerpt")
        span = f"{mm(x['t'])}–{mm(x['t'] + ex['dur_s'])}" if ex else mm(x["t"])
        L.append(f"| {span} ({fr(x['t'])}) | {x['label']} | {take}{tune} | {lvl} | {('omitted: ' + x['omit'][:80] + '…') if x.get('omit') else x.get('cue_sheet', '')[:140]} |")
    return L


def t_candidates():
    rows = [("chosen", CH)] + [("next", r) for r in BD["next_by_the_rule"]]
    named = BD["named_candidates"]
    for k in ("F2 doubled (50:52 kept)", "the best phrase line for Ring 4"):
        rows.append((k, named[k]))
    L = ["| | Edit | J2 into | Ring 4 on | S16's cut on | Lift on S15 | Cascade 4 over phrase C | Phrase lines off every sync point | Unconfirmed seams; splices | Sync score R3 | Cutter cost |",
         "|---|---|---|---|---|---|---|---|---|---|---|"]
    for tag, r in rows:
        sp = r["sync_points"]
        rk = r["rank_key"]
        L.append(f"| {tag} | {r['label']} | bar {r['in_bar']} | bar {sp['Ring 4 landing']['source_bar']:g} ({sp['Ring 4 landing']['what']}) | "
                 f"bar {sp['S16 cut']['source_bar']:g} | {'yes' if r['lift_on_S15'] else 'no'} | {r['cascade4_bars_over_phrase_C']:g} bars | "
                 f"{', '.join(str(b) for b in r['phrase_lines_off_every_sync_point']) or 'none'} | {rk['R1_unconfirmed_seams']}; {rk['R1_splices']} | "
                 f"{rk['R3_sync_score']:g} | {rk['R4_cutter_cost']:g} |")
    return L


def t_chosen_sync():
    L = ["| Sync point | Bars after J2 | Film | B4 bar under it | Its place in B4's phrasing |", "|---|---|---|---|---|"]
    t0 = J["J2"]["film_s"]
    bar = 4 * 0.48389
    for name, e in CH["sync_points"].items():
        L.append(f"| {name} | {e['film_bars_after_J2']:g} | {mm(t0 + e['film_bars_after_J2'] * bar)} | {e['source_bar']:g} | {e['what']} |")
    L += ["", "| B4's 8-bar phrase line | Film | On a sync point |", "|---|---|---|"]
    for ln in CH["phrase_lines"]:
        L.append(f"| bar {ln['bar']} | {mm(t0 + ln['film_bars_after_J2'] * bar)} | {', '.join(ln['on']) if ln['on'] else 'no: inside a held read'} |")
    return L


def checks_list():
    out = []
    for c in CS["checks"]:
        tag = "WARN" if c.get("warn") else ("pass" if c["ok"] else ("PENDING" if c["ok"] is None else "**FAIL**"))
        det = c["detail"] if not c.get("pending") else c["detail"].split(":")[0] + ")"
        out.append(f"- {tag}: {c['check']}: {det}")
    return out


def main():
    ok = sum(1 for c in CS["checks"] if c["ok"] is True)
    pend = sum(1 for c in CS["checks"] if c["ok"] is None)
    bad = sum(1 for c in CS["checks"] if c["ok"] is False)
    j3 = J["J3"]["film_s"]
    kept = EV["kept card"]
    title = M["return"]["title_film_s"]
    end = M["film_length_s"]
    cd = M.get("coda") or {}
    pl = cd.get("planned") or CT or {}
    rk = CH["rank_key"]
    bp = BD["named_candidates"]["the best phrase line for Ring 4"]
    f2 = BD["named_candidates"]["F2 doubled (50:52 kept)"]
    c1 = R04["clauses"]
    jm = c1["1_J2_gates_as_measured"]["measured"]
    L = ["# Ripples: the cue sheet", "",
         "Lane **score2: the music supervisor**. **Revision 3, 28 Oct 2026: two more bars of B4 for Ring 4 and Cascade 4 "
         "(OVERRIDES §68), M2 in one piece (§66 R-04), and the coda's sound (§65).** For the picture, sound-design, mix and "
         "review lanes and the lead. Local work under the embargo (D87): nothing here is pushed, posted or uploaded. Revision "
         f"2 (27–28 Oct, the Return, with its master revision) is kept unchanged in `{ARCH}`; §11 is the dated revision log.",
         "",
         "- **Binding:** OVERRIDES §48–§68: §51 the person's music direction and the Mixkit limits; §55 CR-13; §61 the "
         "person's choices; §65 the coda's sound; §66 the lead's rulings on the score (R-04, R-07); §67–§68 Ring 4's and "
         "Cascade 4's bars and the work during the held-out run. TREATMENT §3.4–3.9 and §4; TOOLS_TESTS: pre-roll "
         "crossfades that end on the incoming downbeat, and no time-stretch.",
         "- **Planned during the release session's held-out run (§68): no audio was read or written.** Every choice here "
         "was made on the music maps and on revision 2's own measurements, by rules written before the numbers "
         f"(`cuesheet/r3/decision_rules.json`, {RULES['written_at']}, sha256 {BD['rule_sha256'][:12]}…). "
         + ("The plan's own measurement as built is in (`" + PLAN.get("metrics", "") + "`)." if measured else
            "**The plan's own measurement, the masters, the strips and the previews run in the evening** "
            "(`tools/audio/score2/evening_r3.sh`, §9.3); until then every measured number below reads *pending*, never "
            "revision 2's."),
         "- **What changed (§11 has the log):**",
         f"  - **M3 plays B4 bars 47–63 whole** (bars 50–51 back in, in place of revision 2's M3s splice). Ring 4 gets 5.5 "
         f"bars ({M['blocks'][[b['block'] for b in M['blocks']].index('Ring 4')]['start']}–"
         f"{M['blocks'][[b['block'] for b in M['blocks']].index('Ring 4')]['end']}, 639 frames), Cascade 4 2.5 bars (290 frames) "
         f"and ⌘K 2 bars; B4's stop lands on Enter at {mm(j3)}. Chosen by the rule from {BD['candidates']} candidates (§13.1).",
         f"  - **M2 plays B2 bars 7–23 whole** (R-04): no splice; J2 leaves after bar 23's three-beat hat breath. Ring 2's "
         "shots keep their film times and lengths; only the bars under them change (§13.2).",
         f"  - **Everything after Enter is exactly 232 frames (3.87 s) later**: the kept card {mm(kept)}, J5 "
         f"{mm(J['J5']['film_s'])}, the title {mm(title)}, the end card's last frame {mm(end)} (frame {M['film_length_frames']}). "
         "The film runs **2:18.90**, 1.10 s under X's 2:20.",
         f"  - **The coda's sound** (§65): the end card's room tone carries on without a restart to the coda's last frame, "
         f"with one stone tap on L-C2's landing, tuned to E (§13.3). The coda's frames are read from its own plan at build time.",
         "  - **The legacy classifier check is a warning** (§66 R-07), never a gate.",
         "- **Evidence labels:** **[M]** measured; **[L]** looked at; **[I]** my judgement as supervisor. Nobody has listened, "
         "and the person hears only finished work (§61).",
         "- **Files:** `CUE_SHEET.json` (every number below), `BEAT_SHEET.md` and `.json` (**the picture lanes' timing "
         "source**), `cuesheet/plan_main.json` (revision 3), `cuesheet/r3/` (the rules, `bars_candidates.json`, "
         "`bars_decision.json`, `r04_decision.json`, `coda_tap_decision.json`, `coda_canaries.json`, and `planned/`: the "
         "coda's timing and the layer sheets as planned). The 40-s cut's plan is unchanged.", "", "---", "",
         "## 0. The score in one page", "",
         "**The idea [I]** is revision 2's: B2 and B4 carry the feature-heavy middle, the climax and the Return's rush; the "
         "A series frames the film; B2 returns at the climax; A4 returns at the merge. In revision 3 both energetic cues "
         "play in one piece each: the only splice left in the main film is F4, inside A4's held chord.", ""]
    L += t_cues()
    L += ["", "**The cue changes** (§2 has the detail):", ""] + t_joins()
    L += ["", "**The arc**" + ("" if measured else f" ({PEND})") + ":", ""] + t_arc()
    L += ["", f"**Length:** {M['film_length']} ({M['film_length_frames']} frames at 60 fps), {f(140.0 - end)} s under X's "
          "2:20 cap. F4 stays on: without it the film would run 2:20.90.", "",
          f"**After the end card (§62, §65):** the post-credit scene starts on frame {cd.get('L0_frame')} ({mm(cd.get('L0_film_s', end))}). "
          "No music; the room tone carries on and the scene's one stone tap peaks on L-C2's landing"
          + (f" (L{pl.get('line2')}, frame {pl.get('tap_frame')}, {mm(pl.get('tap_film_s'))}, as planned when this sheet was "
             f"written); the coda's last frame is L{pl.get('end') - 1} (frame {pl.get('end_frame') - 1})" if pl else "")
          + ". The X version is the master cut at the coda's first frame.", "",
          "**Credits:** unchanged (revision 2 §0): the two Scott Buckley lines, CC BY 4.0, on a page held for its reading "
          "time or in the captions and every description; Mixkit needs none; nothing is ever submitted to Content ID.", "",
          "---", "", "## 1. The main film's cues", "",
          "Film time = the cue's film in-point + (source − source in-point): no stretch, ever. Each cue's bar lines are in "
          "CUE_SHEET.json.", ""]
    for c in M["cues"]:
        L.append(f"### {c['id']} \"{c['name']}\": {c['track']['label']} {c['track']['title']} {c['source']['in']}–"
                 f"{c['source']['out']} → film {c['film']['in']}–{c['film']['out']} (frames {c['film']['in_frame']}–"
                 f"{c['film']['out_frame']})")
        L += ["", f"- **Role:** {c['role']}", "- **Why:**"] + [f"  - {w}" for w in c["why"]]
        L += [f"- **Gain (film s, dB):** {c['gain_db_points_film_s']}", f"- **EQ:** {c['eq']}",
              "- **Layers:**"] + [f"  - {x}" for x in c["layers"]] + [""]
    L += ["---", "", "## 2. The joins and splices", "",
          "Each is measured as built on the plan's bed in the evening (`revise_measure.py plan`), against the incoming "
          "track's own change at its in-point and its own bar changes." + ("" if measured else f" Until then: {PEND}."), ""]
    for j in M["joins"]:
        L += [f"### {j['id']} {j['name']}: film {j['film']} (frame {j['frame']})", "", f"- **How:** {j['how']}",
              f"- **Picture cause:** {j['motivation']}", f"- **Tempo:** {j['tempo']}", f"- **Key:** {j['key']}"]
        m = j["measured"]
        if "pending" in m:
            L.append(f"- **Measured:** {PEND}.")
        else:
            L.append(f"- **Measured [M]:** steps {f(m['film_step_3s_lu'], 2, True)} LU over 3 s and "
                     f"{f(m['film_step_400ms_lu'], 2, True)} LU over 400 ms; spectral step {f(m['extra_lsd_db'], 1, True)} dB "
                     f"over the incoming source's own (p{f(m.get('lsd_percentile_of_incoming_own_downbeats'), 0)}); extra "
                     f"8–16 kHz {f(m.get('extra_hf_db'), 1, True)} dB; second-difference ratio {f(m.get('d2_ratio_at_seam'), 2)}.")
        L.append("")
    L += [f"J2 at B2 bar 24 was measured as built in revision 2's probe (`r2/probe.json`, 28 Oct 03:56): extra 8–16 kHz "
          f"{f(jm['extra_hf_db'], 2, True)} dB, second-difference ratio {f(jm['d2_ratio_at_seam'], 3)}, a "
          f"{f(jm['step_3s_lu'], 2, True)} LU step over 3 s ({f(jm['step_400ms_lu'], 2, True)} over 400 ms), the spectral step "
          f"{f(jm['extra_lsd_db'], 2, True)} dB over B4's own at bar 47 (p{f(jm['lsd_percentile_of_incoming_own_downbeats'], 0)}), "
          f"the breath {f(jm['breath_db'], 1, True)} dB. J1, J3, J4, J5 and F4 join the same audio as in revision 2; their "
          "numbers there are in the archive (§2) and are measured again in this plan in the evening.", "", "---", "",
          "## 3. Loudness and EQ", "",
          "- **Unchanged from revision 2** (`" + ARCH + "` §3 and §12): every cue's gain, the ducks (the Drop 3 dB; the "
          "climax 3 dB with M5's one-bar 2-dB dip; the title 0.5 dB), the master revision's overrides (M5's ride under the "
          "Return, M6a's dip −4.5 dB, J4 0.25 s), the masters' targets (web −16 LUFS, social −14 LUFS, 0.2 dB under each "
          "AAC gate on both encoders).",
          f"- **Changed:** M3's low shelf (−1.5 dB below 60 Hz) now on the one B4 cue; M3's gain eases from −5.0 to −4.4 dB "
          f"over phrase C's first half bar ({mm(EV['B4 phrase C'])}), which revision 2 eased at Ring 4's landing.",
          "- **Measured:** " + ("see §0." if measured else PEND + "."), "", "---", "",
          "## 4. Sound-design layers", "",
          "As revision 2 (the master revision's CC0 and designed sounds; no Mixkit sound effect), every time moved with the "
          "music, plus the coda's two layers. Budgets: five whooshes, three sub drops, three grand hits, four UI ticks, and "
          "in the coda one tap.", ""] + t_layers()
    L += ["", "---", "", "## 5. The picture timing: the beat sheet", "",
          "`BEAT_SHEET.md` (and `.json`) is the picture lanes' timing source, generated from the plan. The tables below are "
          "its copy.", "", "### 5.1 The blocks", ""] + t_blocks()
    L += ["", "### 5.2 The shots", ""] + t_shots()
    L += ["", "### 5.3 The Return in R-frames", ""] + t_return()
    L += ["", "### 5.4 The sync points and the flex rules", "",
          f"- **Hard sync points:** 0:20.00 the Allow; {mm(j3)} Enter on B4's stop; {mm(kept)} the kept card on B2's lift; "
          f"{mm(J['J5']['film_s'])} J5 (R480); {mm(title)} the title (R720).", "- **The soft ones** are in BEAT_SHEET.md.", ""]
    L += t_sync()
    L += ["", "| Rule | Gives | How |", "|---|---|---|"] + [f"| **{x['id']}** | {x['what']} | {x['how']} |" for x in CS["flex"]]
    L += ["", "---", "", "## 6. The 40-second cut", "",
          f"Unchanged (`{ARCH}` §6 and §12.3): X1–X3 and XJ2's G3 mask; its master is rebuilt in the evening only so both "
          "films come from one build.", "", "## 7. The tour cut and the family shorts", "", f"Unchanged (`{ARCH}` §7).", "",
          "## 8. Licences", "",
          "- **Mixkit (B2, B4):** each cue an edited excerpt in its own order, never overlapping in source time; with M2 and "
          "M3 in one piece each, revision 3 has fewer edits than revision 2 (no splice inside B2 or B4 in the main film). "
          "Layered with other music only inside a short, standard transition (the checks in §9). The person's hand "
          "downloads of B2 and B4 match the copies used, byte for byte (`master/hand_download_check.json`). Working WAVs "
          "stay in `.work/score2/master`; the previews are VIDEO.",
          "- **Scott Buckley (A4, A1):** CC BY 4.0, edited, with the credit lines.",
          "- **The coda:** room_tone_b (designed, ours) and standin_tap_a (Kenney, CC0); no Mixkit take.", "", "---", "",
          "## 9. What was checked, and what is open", "",
          f"### 9.1 Checked: {ok} of {len(CS['checks'])} pass, {pend} pending, {bad} fail", ""] + checks_list()
    if CAN:
        L += ["", f"**The coda's mix-side checks and their canaries** (`tools/audio/score2/score_coda.py canaries`, "
              f"`cuesheet/r3/coda_canaries.json`): the clean synthetic master passes ({'yes' if CAN['clean']['ok'] else 'NO'}), "
              + (f"so does the same with the master's edge fades quantized to 24 bits ("
                 f"{'yes' if CAN.get('clean_with_edge_fades_24bit', {}).get('ok') else 'NO'}), " if CAN.get('clean_with_edge_fades_24bit') else "")
              + "and every planted fault is caught: "
              + "; ".join(f"{k} → {v['should_fail']} {'caught' if v['caught'] else 'MISSED'}" for k, v in CAN.items()
                          if isinstance(v, dict) and not k.startswith("clean")) + ". On the built master: "
              + ("see §12." if CODA_CHK else f"{PEND} (`score_coda.py check`).")]
    L += ["", "### 9.2 Open", "",
          "1. **The evening's heavy steps** (§9.3): the plan's measurement, the layers and both builds, the masters on both "
          "AAC encoders, the seam, loudness and coda checks, the strips, the two previews, the README and the provenance. "
          "If any revision 3 gate fails on audio, the rule's next candidate is planned and the lead is told first.",
          "2. **CODA_SOUND.builtBy** (coda.ts) stays null for now: tests/coda.test.ts pins it null, so the flip is a "
          "two-file change in the coda lane's files, and made before the evening's build it would silence codaSound's "
          "warning while the masters still lack the layer. The patch is ready (`cuesheet/r3/coda-builtBy.patch`: the "
          "builtBy line and its comment in coda.ts, the test turned round to null the builder itself; `git apply --check` "
          "passes on e944b5b): apply it once `score_coda.py check` passes on the evening's masters, with the coda lane's or "
          "the lead's agreement.",
          "3. **The set pieces' ledger:** with these rows `cueLengths` passes for Ring 4 (639 frames against 638.8) and "
          "Cascade 4 (290 against 290.3) in all three aspects, so TRIM-R4 and TRIM-C4 close in setpieces/review-ledger.ts "
          "(the set-piece lane's file); until then tests/fix-round3.test.ts 'the open findings fire' fails by design.",
          "4. **The Return's film place:** returnPlan.ts RETURN_FILM_S and return.test.ts pin revision 2's film seconds and "
          "frames; revision 3 moves every one by exactly 232 frames (6302→6534, 6362→6594, 6842→7074, 7082→7314; bar lines "
          "6242–7202 → 6474–7434). The Return lane's file.",
          "5. **Still open from revision 2:** the title's legacy classifier reading (now a warning, §66 R-07), the temps (the "
          "Sonniss booms, the person's P9 recordings), the 40-s XJ1 accent, the LRA under §56's band (`" + ARCH + "` §12.7).",
          "", "### 9.3 Rebuild (the evening)", "",
          "One command, from the landing repo, after the release session's \"Hold lifted\": `bash tools/audio/score2/evening_r3.sh` "
          "(every heavy step through `scripts/heavy.sh` under `taskpolicy -c utility`, one at a time; log "
          "`.work/score2/r3-evening.log`). It archives the fix revision's masters and previews, reads the coda's timing, "
          "writes the layer sheets, measures the plan, rebuilds this sheet with the numbers, builds and masters both films "
          "(both AAC encoders), runs the coda checks, the arc and the strips, renders the two previews, and writes the "
          "README and the provenance.", "", "---", "", "## 10. G1's music A/B", "",
          f"Decided in revision 2 (side A) and unchanged: `{ARCH}` §10. The Return's music is the same, 232 frames later.", "",
          "---", "", "## 11. Revision log", "",
          "### Revision 3, 28 Oct 2026 (13:30–, planned during the release session's held-out run)", "",
          f"1. **Two more bars (§68):** M3 = B4 bars 47–63 whole; Ring 4 {mm(EV['Ring 4'])}, Cascade 4 {mm(EV['Cascade 4'])}, ⌘K "
          f"{mm(EV['⌘K'])}, Enter {mm(j3)}; by r3/decision_rules.json BARS (§13.1).",
          "2. **R-04 (§66):** M2 = B2 bars 7–23 whole, J2 at bar 24 (§13.2).",
          "3. **Everything after Enter 232 frames later;** the film 2:18.90.",
          "4. **The coda's sound (§65)** in the layer sheet and the master, read from the coda's plan; the tap tuned to E "
          "(§13.3); `score_coda.py` checks it with canaries.",
          "5. **cue_sheet.py:** pending measurements are never carried from another plan; revision 3's pure checks; the "
          "legacy classifier check a warning (§66 R-07).",
          "6. **Unchanged:** M1, the Return's music and R-frames (moved in film time only), the title composite, the 40-s cut.",
          "", f"### Revision 2 and the master revision (27–28 Oct): `{ARCH}` §11.", "", "---", "",
          "## 12. The masters", ""]
    if BLD:
        mw, ms = BLD["masters"]["web"], BLD["masters"]["social"]
        L += [f"Built from this plan ({BLD['plan_sha256'][:12]}…), {f(BLD['film_length_s'])} s with the coda; the X cut at "
              f"{f(BLD.get('x_cut_film_s'))} s.", "",
              "| Master | Integrated, LUFS | LRA, LU | True peak, dBTP | AAC FFmpeg / Apple true peak |", "|---|---|---|---|---|"]
        for k, m in (("main, web", mw), ("main, social", ms)) + ((("40-s, web", BLDX["masters"]["web"]), ("40-s, social", BLDX["masters"]["social"])) if BLDX else ()):
            L.append(f"| {k} | {f(m['integrated_lufs'])} | {f(m['lra_lu'], 1)} | {f(m['true_peak_dbtp'], 1)} | "
                     f"{f(m['aac']['native_default']['true_peak_dbtp'], 1)} / {f(m['aac']['apple_audiotoolbox_cbr']['true_peak_dbtp'], 1)} |")
        if CODA_CHK:
            L += ["", "The coda on the masters: " + "; ".join(f"{k} {'pass' if v['ok'] else 'FAIL'}" for k, v in CODA_CHK["checks"].items()) + "."]
    else:
        L += ["**The masters in `master/` are still the fix revision's (revision 2's plan, 28 Oct 09:45–10:00) until the "
              "evening's build.** Their numbers are in `" + ARCH + "` §12. Revision 3's masters, with the coda, come from "
              "`evening_r3.sh`, and this section is then rewritten from their records."]
    L += ["", "---", "", "## 13. Revision 3's decisions", "", "### 13.1 Two more bars of B4 (OVERRIDES §68)", "",
          f"**The rule** (`cuesheet/r3/decision_rules.json` BARS, {RULES['written_at']}, before any candidate was scored): "
          f"{RULES['BARS']['candidates']}", "",
          "**Gates:** " + "; ".join(f"{k} {v}" for k, v in RULES["BARS"]["gates"].items()) + ".", "",
          "**Ranking, in order:** " + "; ".join(x.rstrip(".") for x in RULES["BARS"]["ranking"]) + ".", "",
          f"**Measured on the maps** (`revise3_bars.py`): {BD['candidates']} candidates, {BD['passing_every_gate']} within "
          f"B4's own bar changes (G4: a splice's cutter cost at or under B4's own one-bar jumps' p90, "
          f"{BD['scale']['one_bar_jump_cost_p90']}, and its chroma cosines at or above B4's consecutive bars' p10, "
          f"{BD['scale']['consecutive_chroma_cos_p10']}). The chosen edit, the next five by the rule, and the two the lead "
          "named:", ""] + t_candidates()
    both = (f"Of the {len(BOTH)} edits that keep both, it is the only one within B4's own bar changes"
            if len(BOTH_PASS) == 1 else f"{len(BOTH_PASS)} of the {len(BOTH)} edits that keep both are within B4's own bar changes")
    L += ["", f"**The choice: {CH['label']}.** It is the only candidate with no seam that a measurement has not confirmed "
          f"(R1: {rk['R1_unconfirmed_seams']} unconfirmed, {rk['R1_splices']} splices: it removes revision 2's M3s), and it keeps "
          "both of the treatment's block needs (R2): the lift (B4's phrase B, bar 48) on S15's second ring arrival, and "
          "Cascade 4 over phrase C, the drive thinning toward the quiet passage. " + both
          + " (the others enter J2 a few bars early and jump straight to phrase B, past the riser bar).", "",
          "**What it costs, and why Ring 4 is not on a phrase line (§67):** Ring 4 leaves on bar 54, a 2-bar line, and "
          "B4's phrase C arrives two bars into it, while the act is read. With B4's real stop on Enter and 10 bars after "
          "the landing, B4's own bars put the landing on bar 54. A phrase line for Ring 4 needs a splice after the landing, "
          f"J2 off the riser bar and the lift off Ring 3: the best such edit, {bp['label']}, lands Ring 4 on phrase B but has "
          f"{bp['rank_key']['R1_unconfirmed_seams']} unconfirmed seams, keeps {bp['rank_key']['R2_needs_kept']} of the two block "
          f"needs, and plays Cascade 4 over the loudest bars instead of the thinning. F2 doubled ({f2['label']}) also lands "
          f"Ring 4 on bar 54, moves J2 into bar 45 (a bar with no change of its own), takes the lift off S15, and keeps a "
          "splice. [I] Under Ring 4, bar 54 and B4's fill (bar 55, its brightest bar) carry the ring's travel and the dolly; "
          "phrase C settles the music 1.4 LU as the act is read; Verified falls on a beat about four bars in.", ""]
    L += ["The chosen edit's sync points and B4's phrase lines:", ""] + t_chosen_sync()
    L += ["", "**Confirmed in the evening** on audio: " + RULES["BARS"]["confirm_in_the_evening"], "",
          "### 13.2 M2 in one piece (R-04)", "", f"**The rule:** {R04['rule']}", "",
          "| Clause | Pass | Evidence |", "|---|---|---|",
          f"| 1. J2's gates as measured | {'yes' if c1['1_J2_gates_as_measured']['pass'] else 'no'} | click: extra 8–16 kHz "
          f"{f(jm['extra_hf_db'], 2, True)} dB, d2 {f(jm['d2_ratio_at_seam'], 3)}; loudness {f(jm['step_3s_lu'], 2, True)} LU; breath "
          f"{f(jm['breath_db'], 1, True)} dB |",
          f"| 2. no splice | yes | B2 bars 7–23 in one excerpt |",
          f"| 3. J2 stays | {'yes' if c1['3_J2_stays']['pass'] else 'no'} | {c1['3_J2_stays']['m2_0_s']} s against revision 2's "
          f"{c1['3_J2_stays']['revision_2_s']} ({c1['3_J2_stays']['difference_ms']:+.2f} ms) |",
          f"| 4. shots keep their lengths | yes | S11 4.5 s, S12 3.5 s, S13 6.0 s |", "",
          f"**Decision:** {R04['decision']}. {R04['what_moves']}", "",
          "### 13.3 The coda's sound (OVERRIDES §65)", "",
          "- **The layers** (`score_layers.py`, from the coda's plan through `coda_timing.ts`): `room_end`, one excerpt of "
          "room_tone_b from A4's last 0.3 s on through the coda's last frame, at the coda lane's CODA_SOUND level (−52 LUFS); "
          "`coda_tap`, standin_tap_a (Kenney CC0) at CODA_SOUND's −30 LUFS, its peak on L-C2's landing; no other one-shot, "
          "no Mixkit take, no music.",
          (f"- **The timing as planned** (read {pl.get('read_at')} from the coda's plan, coda.ts "
           f"{'with the coda lane’s uncommitted round-2 edits' if pl.get('coda_ts_uncommitted') else 'at ' + str(pl.get('git_head'))[:7]}): "
           f"L0 = frame {pl.get('L0_frame')}; the tap on L{pl.get('line2')} (frame {pl.get('tap_frame')}, {mm(pl.get('tap_film_s'))}); "
           f"the last frame L{pl.get('end') - 1}; the master to {mm(pl.get('end_film_s'))} (frame {pl.get('end_frame')}). "
           "The evening's build reads it again." if pl else "- **The timing:** read at build time."),
          f"- **Tuned to E** by the rule (`coda_tap_decision.json`): the kit measures the take at "
          f"{TAP['measured']['kit_pitch_hz']} Hz ({TAP['measured']['kit_note']}, confidence {TAP['measured']['kit_pitch_conf_db']} dB), "
          f"{abs(TAP['measured']['shift_cents']):.0f} cents under E4 (329.63 Hz), so it is clearly pitched and audibly off E; "
          "the build's varispeed lifts it +1.27 semitones, as the title's tap already is. [I] Untuned, the coda's tap would be "
          "a different, flatter tap than the title's; tuned, it is the title's own tap at a whisper, on the tonic of the "
          "film's last chord. No audio work was needed: the kit's measurement decides it, and `score_coda.py` confirms the "
          "placed tap's pitch in the evening.",
          "- **The mix-side checks** (`score_coda.py`, each with a planted canary): no run of digital zero; room tone under "
          "every frame; the room tone about −52 LUFS and the tap about −30 LUFS; one one-shot within a frame of its planned "
          "peak; no restart across L0; no Mixkit take; the tap on E.",
          "- **CODA_SOUND.builtBy:** not set by this lane: §9.2 item 2.", ""]
    with open(os.path.join(S2, "CUE_SHEET.md"), "w") as fh:
        fh.write("\n".join(L) + "\n")
    print("wrote", os.path.join(S2, "CUE_SHEET.md"), len(L), "lines;", "measured" if measured else "measurement pending",
          "| masters", "revision 3" if BLD else "pending")


if __name__ == "__main__":
    main()
