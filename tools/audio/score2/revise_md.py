"""score2 lane: write CUE_SHEET.md for revision 2 by filling the hand-written template's markers with tables and
numbers read from CUE_SHEET.json, BEAT_SHEET.json and the revision's measurement files, so no number is copied by hand.
Pure JSON and text (standard library only): no audio is read or written.

  python3 -I tools/audio/score2/revise_md.py            -> .work/score2/CUE_SHEET.md
  python3 -I tools/audio/score2/revise_md.py facts      -> prints the numbers the prose quotes

Markers in .work/score2/cuesheet/r2/CUE_SHEET.template.md: <!--T:name--> is replaced by table `name`; {{expr}} by a
value (eval over V, our own template and data); @@NAME@@ by the supervisor's prose in r2/g1_decision.json "text"."""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
W = os.environ.get("SCORE2_CUESHEET") or os.path.join(REPO, ".work", "score2", "cuesheet")  # the variable is for tests
S2 = os.path.dirname(W)
R2 = os.path.join(W, "r2")


def load(p):
    with open(p) as fh:
        return json.load(fh)


CS = load(os.path.join(S2, "CUE_SHEET.json"))
BS = load(os.path.join(S2, "BEAT_SHEET.json"))
M = CS["main_film"]
X = CS["cut_40s"]
J = {j["id"]: j for j in M["joins"]}
XJ = {j["id"]: j for j in X["joins"]}
C = {c["id"]: c for c in M["cues"]}
B = {b["label"]: b for b in M["blocks_measured"]}
OLD = load(os.path.join(W, "archive-2026-10-26-2213", "CUE_SHEET.json"))
OJ = {j["id"]: j for j in OLD["main_film"]["joins"]}
OB = {b["label"]: b for b in OLD["main_film"]["blocks_measured"]}
PROBE = load(os.path.join(R2, "probe.json")) if os.path.exists(os.path.join(R2, "probe.json")) else None
TA = load(os.path.join(R2, "title_A.json")) if os.path.exists(os.path.join(R2, "title_A.json")) else None
TB = load(os.path.join(R2, "title_B.json")) if os.path.exists(os.path.join(R2, "title_B.json")) else None
TA2 = load(os.path.join(R2, "title_A_r2.json")) if os.path.exists(os.path.join(R2, "title_A_r2.json")) else None
TB2 = load(os.path.join(R2, "title_B_r2.json")) if os.path.exists(os.path.join(R2, "title_B_r2.json")) else None
XM = load(os.path.join(R2, "x40mask.json")) if os.path.exists(os.path.join(R2, "x40mask.json")) else None
XM2 = load(os.path.join(R2, "x40mask_g2.json")) if os.path.exists(os.path.join(R2, "x40mask_g2.json")) else None
GB = load(os.path.join(R2, "main_g1b.metrics.json")) if os.path.exists(os.path.join(R2, "main_g1b.metrics.json")) else None
DEC = load(os.path.join(R2, "g1_decision.json")) if os.path.exists(os.path.join(R2, "g1_decision.json")) else {}
MET = load(os.path.join(W, "main.metrics.json"))


def f(v, d=2, sign=False):
    if v is None:
        return "n/a"
    if round(v, d) == 0:
        v = 0.0  # never print a minus zero
    s = f"{v:+.{d}f}" if sign else f"{v:.{d}f}"
    return s.replace("-", "−")


def mm(t):
    s = "−" if t < 0 else ""
    t = abs(t)
    return f"{s}{int(t // 60)}:{t % 60:05.2f}"


def keyline(h):
    if not h or "key_before" not in h:
        return "n/a"
    kb, ka = h["key_before"], h["key_after"]
    return (f"{kb['key']} ({kb['camelot']}, r {f(kb['r'])}) to {ka['key']} ({ka['camelot']}, r {f(ka['r'])}): "
            f"{h['camelot_steps']} Camelot step{'' if h['camelot_steps'] == 1 else 's'}{', a mode change' if h.get('mode_change') else ''}")


def onl(o):
    if not o or not o.get("beats"):
        return "n/a"
    return (f"{o['with_clear_attack']} of {o['beats']} beats with a clear attack, median {f(o['median_offset_ms'], 1)} ms, "
            f"worst {f(o['max_abs_offset_ms'], 1)} ms, {f(100 * (o['share_within_8ms'] or 0), 0)} % within 8 ms")


def t_cues():
    L = ["| Cue | Track (licence) | Source | Film | Scene |", "|---|---|---|---|---|"]
    for c in M["cues"]:
        L.append(f"| **{c['id']}** \"{c['name']}\" | {c['track']['label']} {c['track']['title']} ({c['track']['licence']}) | "
                 f"{c['source']['in']}–{c['source']['out']} | {c['film']['in']}–{c['film']['out']} | {c['role']} |")
    return L


def t_joins():
    L = ["| Join | Film (frame) | Method | Step, 3 s / 400 ms [M] | Spectral step: extra over the incoming source's own, and its percentile among that track's own bar changes [M] | Extra 8–16 kHz [M] |",
         "|---|---|---|---|---|---|"]
    for j in M["joins"]:
        m = j["measured"]
        L.append(f"| **{j['id']}** {j['name']} | {j['film']} ({j['frame']}) | {'; '.join(j['methods'])} | "
                 f"{f(m['film_step_3s_lu'], 2, True)} / {f(m['film_step_400ms_lu'], 2, True)} LU | "
                 f"{f(m['extra_lsd_db'], 1, True)} dB; p{f(m.get('lsd_percentile_of_incoming_own_downbeats'), 0)} | "
                 f"{f(m.get('extra_hf_db'), 1, True)} dB |")
    return L


def t_arc():
    L = ["| Block | Film | Integrated, LUFS | Short-term median / max, LUFS | On 22:13 (as planned) |", "|---|---|---|---|---|"]
    names = {"Rings 1-2": "Rings 1-2", "Rings 3-4": "Rings 3-4", "Climax": "Climax", "Dusk": "Dusk", "Act I": "Act I",
             "Drop": "Drop", "Title": "Title", "End card": "End card"}
    for b in M["blocks_measured"]:
        o = OB.get(names.get(b["label"], ""))
        L.append(f"| {b['label']} | {mm(b['film'][0])}–{mm(b['film'][1])} | {f(b['integrated_lufs'])} | "
                 f"{f(b['st_median'])} / {f(b['st_max'])} | "
                 + (f"{f(o['integrated_lufs'])}; {f(o['st_median'])} / {f(o['st_max'])}" if o else "new") + " |")
    return L


def t_blocks():
    L = ["| Block | Film (frames) | Length, s | % of the film | Music | On 22:13 |", "|---|---|---|---|---|---|"]
    for r in BS["blocks"]:
        L.append(f"| {r['block']} | {r['start']}–{r['end']} ({r['start_frame']}–{r['end_frame']}) | {f(r['dur_s'])} | "
                 f"{f(r['start_pct'], 1)} | {', '.join(r['music'])} | {(r['on_22_13'] or 'new').replace('-', '–')} |")
    L += ["", "Left the film since 22:13:"] + [f"- {g['block']} ({g['on_22_13'].replace('-', '–')}): {g['now']}."
                                                for g in BS.get("left_the_film", [])]
    return L


def t_shots():
    L = ["| Shot | Film (frames) | Length, s | Under | What lands where |", "|---|---|---|---|---|"]
    for s in M["shots"]:
        L.append(f"| {s['id']} | {s['start']}–{s['end']} ({s['start_frame']}–{s['start_frame'] + s['dur_frames']}) | "
                 f"{f(s['dur_s'])} | {s['music_under']} | {s['what']} |")
    return L


def t_rframes():
    L = ["| R | Film | Frame | What |", "|---|---|---|---|"]
    for r in M["return"]["marks"]:
        L.append(f"| R{r['R']} | {r['film']} | {r['frame']} | {r['what']} |")
    return L


LABEL = {"YourBreath": "B2", "BornOfTheSky": "A4", "TechnoFestVibes": "B4", "Starfire": "A1"}


def ordinal(v):
    if v is None:
        return "n/a"
    n = int(round(v))
    suf = "th" if 10 <= n % 100 <= 20 else {1: "st", 2: "nd", 3: "rd"}.get(n % 10, "th")
    return f"{n}{suf}"


def t_returnbars(G=None):
    rows = (G or MET)["extras"]["return_bars"]
    L = ["| Film | R | Cue, bar | Bed, LUFS | Air share (>5 kHz) | Onsets a beat (map) | Novelty (map) |",
         "|---|---|---|---|---|---|---|"]
    for b in rows:
        L.append(f"| {mm(b['film_s'])} | {str(b['R']).replace('-', '−')} | {b['cue']}, {LABEL.get(b['track'], b['track'])} bar {b['bar']} | "
                 f"{f(b['bed_lufs'])} | {f(b['bed_air_share'], 4)} | {b['map_onsets_per_beat']} | {b['map_novelty']} |")
    return L


def t_g1():
    a, b = CS["g1_music_ab"]["A"], CS["g1_music_ab"]["B"]

    def row(name, fa, fb):
        return f"| {name} | {fa} | {fb} |"
    L = ["| Measured [M] | A: design revision 2 (B2 runs on, J5 onto A4 bar 80, the dip) | B: revision 1 (J5 onto A4 bar 76 at R0, flat) |",
         "|---|---|---|"]
    L.append(row("J5", f"{mm(a['J5_film_s'])}, B2 1:44.53 into A4 2:40.52 (bar 80)", f"{mm(b['J5_film_s'])}, B2 1:36.53 into A4 2:32.53 (bar 76)"))
    L.append(row("J5 step, 3 s / 400 ms", f"{f(a['J5_step_3s_lu'], 2, True)} / {f(a['J5_step_400ms_lu'], 2, True)} LU",
                 f"{f(b['J5_step_3s_lu'], 2, True)} / {f(b['J5_step_400ms_lu'], 2, True)} LU"))
    L.append(row("J5 spectral step: extra dB; percentile of A4's own bar changes",
                 f"{f(a['J5_extra_lsd_db'], 1, True)} dB; p{f(a['J5_lsd_percentile_of_A4_downbeats'], 0)}",
                 f"{f(b['J5_extra_lsd_db'], 1, True)} dB; p{f(b['J5_lsd_percentile_of_A4_downbeats'], 0)}"))
    L.append(row("J5 click: extra 8–16 kHz; second-difference ratio", f"{f(a['J5_extra_hf_db'], 1, True)} dB; {f(a['J5_d2_ratio'], 2)}",
                 f"{f(b['J5_extra_hf_db'], 1, True)} dB; {f(b['J5_d2_ratio'], 2)}"))
    for lab, k in (("J5 chroma, last beat to first beat (cosine)", "beat_cos"), ("J5 chroma, bar to bar", "bar_cos"),
                   ("J5 chroma, 2 bars to 2 bars", "two_bar_cos")):
        L.append(row(lab, f"{f((a['J5_harmony'] or {}).get(k), 3)} (A4's own at its in-point {f((a['J5_harmony_A4_own'] or {}).get(k), 3)}; B2's own continuation {f((a['J5_harmony_B2_own'] or {}).get(k), 3)})",
                     f"{f((b['J5_harmony'] or {}).get(k), 3)} (A4's own {f((b['J5_harmony_A4_own'] or {}).get(k), 3)}; B2's own {f((b['J5_harmony_B2_own'] or {}).get(k), 3)})"))
    L.append(row("J5 key, 2 bars each side", keyline(a["J5_harmony"]), keyline(b["J5_harmony"])))
    L.append(row("J5 onsets on the grid, 4 beats each side", onl(a["J5_onsets"]), onl(b["J5_onsets"])))
    L.append(row("J5 beat interval across the seam", f"{f(a['J5_beat_interval_across_ms'], 1)} ms", f"{f(b['J5_beat_interval_across_ms'], 1)} ms"))
    for blk in ("Return: lead-in and release", "Return: gather", "Return: rush", "Return: merge"):
        x, y = a["return_blocks"].get(blk, {}), b["return_blocks"].get(blk, {})
        L.append(row(f"{blk}: integrated; short-term max", f"{f(x.get('integrated_lufs'))}; {f(x.get('st_max'))} LUFS",
                     f"{f(y.get('integrated_lufs'))}; {f(y.get('st_max'))} LUFS"))
    L.append(row("the merge against the rush (integrated)", f"{f(a['merge_vs_rush_lu'], 2, True)} LU", f"{f(b['merge_vs_rush_lu'], 2, True)} LU"))
    L.append(row("the Return's short-term max against the climax's", f"{f(a['return_st_max'])} against {f(a['climax_st_max'])}",
                 f"{f(b['return_st_max'])} against {f(b['climax_st_max'])}"))
    ta, tb = a["title_arrival"], b["title_arrival"]
    L.append(row("the title's arrival: 1 s after against 1 s before; 400 ms", f"{f(ta['step_1s_lu'], 2, True)} LU; {f(ta['step_400ms_lu'], 2, True)} LU",
                 f"{f(tb['step_1s_lu'], 2, True)} LU; {f(tb['step_400ms_lu'], 2, True)} LU"))

    def dens(side, lo, hi):
        rows = [r for r in side["per_bar"] if lo <= r["R"] < hi and r["map_onsets_per_beat"] is not None]
        if not rows:
            return "n/a"
        v = [r["map_onsets_per_beat"] for r in rows]
        a_ = [r["bed_air_share"] for r in rows if r["bed_air_share"] is not None]
        return f"{min(v)}–{max(v)} onsets a beat; air {f(min(a_), 4)}–{f(max(a_), 4)}"
    L.append(row("gather and rush (R120–R480): density and air, per bar", dens(a, 115, 475), dens(b, 115, 475)))
    L.append(row("merge (R480–R720): density and air, per bar", dens(a, 475, 715), dens(b, 475, 715)))
    if TA and TB:
        all_a = TA["variants"] + (TA2 or {}).get("variants", [])
        all_b = TB["variants"] + (TB2 or {}).get("variants", [])
        va = next((v for v in all_a if v["id"] == DEC.get("title_variant")), None)
        vb = next((v for v in all_b if v["id"] == DEC.get("title_variant_b", DEC.get("title_variant"))), None)
        if va and vb:
            L.append(row(f"the classifier, swell and title windows, each side's carried composite ({va['id']} on A, "
                         f"{vb['id']} on B): foghorn max (windows at 0.30 or more)",
                         f"{f(va['foghorn_max'], 3)} ({va['windows_ge_0.30']} of {va['windows']})",
                         f"{f(vb['foghorn_max'], 3)} ({vb['windows_ge_0.30']} of {vb['windows']})"))
    return L


def t_title(T, side="A"):
    L = ["| Variant | What | Foghorn max (at, s) | Windows ≥ 0.30 / ≥ 0.25 of all | Other watched labels (max) | Verdict |",
         "|---|---|---|---|---|---|"]
    for v in T["variants"]:
        w = ", ".join(f"{k} {f(x, 3)}" for k, x in v["watched_max"].items() if k != "foghorn") or "none"
        what = v["what"] if side == "A" else v["what"].replace("(the dip as planned)", "(no dip on this side: M6 flat)")
        L.append(f"| `{v['id']}` | {what} | {f(v['foghorn_max'], 3)} ({f(v['foghorn_max_at'], 2)}) | "
                 f"{v['windows_ge_0.30']} / {v['windows_ge_0.25']} of {v['windows']} | {w} | {v['verdict']} |")
    return L


def t_probe():
    L = ["| Candidate | Map cost | Step, 3 s / 400 ms | Spectral step: extra; percentile of own bar changes | Extra 8–16 kHz; d2 | Chroma beat / bar (own) | Onsets |",
         "|---|---|---|---|---|---|---|"]
    for key in ("M2", "M3"):
        for c in PROBE[key]:
            he, hi = c.get("harmony_edit", {}), c.get("harmony_incoming_own", {})
            L.append(f"| {key}: {c['label']} | {f(c['map_cost'], 3)} | {f(c['step_3s_lu'], 2, True)} / {f(c['step_400ms_lu'], 2, True)} | "
                     f"{f(c['extra_lsd_db'], 1, True)} dB; p{f(c['lsd_percentile_of_incoming_own_downbeats'], 0)} | "
                     f"{f(c['extra_hf_db'], 1, True)} dB; {f(c['d2_ratio_at_seam'], 2)} | "
                     f"{f(he.get('beat_cos'), 3)} / {f(he.get('bar_cos'), 3)} ({f(hi.get('beat_cos'), 3)} / {f(hi.get('bar_cos'), 3)}) | "
                     f"{onl(c.get('onsets_around_seam'))} |")
    return L


def t_j2():
    L = ["| J2 out-point | B2's 8–16 kHz attacks over its last 8 beats, dB | Breath (last 2 beats against the 4 before) | Step, 3 s / 400 ms | Spectral step: extra; percentile of B4's own | Chroma bar (B4's own) |",
         "|---|---|---|---|---|---|"]
    for c in PROBE["J2"]:
        he, hi = c.get("harmony_edit", {}), c.get("harmony_incoming_own", {})
        L.append(f"| bar {c['end_bar']} | {', '.join(f(v, 1) for v in c['hf_attack_db_last_8_beats'])} | {f(c['breath_db'], 1, True)} dB | "
                 f"{f(c['step_3s_lu'], 2, True)} / {f(c['step_400ms_lu'], 2, True)} LU | {f(c['extra_lsd_db'], 1, True)} dB; "
                 f"p{f(c['lsd_percentile_of_incoming_own_downbeats'], 0)} | {f(he.get('bar_cos'), 3)} ({f(hi.get('bar_cos'), 3)}) |")
    return L


def t_checks():
    ck = CS["checks"]
    n_ok = sum(1 for c in ck if c["ok"])
    L = [f"**{n_ok} of {len(ck)} checks pass** (`tools/audio/score2/cue_sheet.py`) [M]:", ""]
    for c in ck:
        L.append(f"- {'pass' if c['ok'] else '**FAIL**'}: {c['check']}: {c['detail']}")
    return L


def t_seamdetail(jid):
    j = J[jid]
    m = j["measured"]
    h = m.get("harmony") or {}
    hi = m.get("harmony_incoming_own") or {}
    ho = m.get("harmony_outgoing_own") or {}
    L = [f"- **Measured** [M]:",
         f"  - steps {f(m['film_step_3s_lu'], 2, True)} LU over 3 s ({f(m['film_lufs_3s_before'])} to {f(m['film_lufs_3s_after'])} LUFS) "
         f"and {f(m['film_step_400ms_lu'], 2, True)} LU over 400 ms; the incoming source's own step at its in-point "
         f"{f(m['incoming_source_own_step_3s_lu'], 2, True)} LU;",
         f"  - spectral distance {f(m['lsd_film_db'], 1)} dB against {f(m['lsd_incoming_source_db'], 1)} dB for the incoming "
         f"source's own change there ({f(m['extra_lsd_db'], 1, True)} dB), at the {ordinal(m.get('lsd_percentile_of_incoming_own_downbeats'))} "
         f"percentile of that track's own bar changes (its p50 and p95: {', '.join(f(v, 1) for v in m.get('incoming_own_downbeat_lsd_p50_p95') or [])} dB);",
         f"  - clicks: 8–16 kHz {f(m.get('extra_hf_db'), 1, True)} dB over the source's own; second-difference ratio "
         f"{f(m.get('d2_ratio_at_seam'), 2)} at the seam;"]
    if h:
        L.append(f"  - harmony (harmonic CQT chroma, as the maps): last beat to first beat {f(h.get('beat_cos'), 3)}, bar to bar "
                 f"{f(h.get('bar_cos'), 3)}, 2 bars to 2 bars {f(h.get('two_bar_cos'), 3)}; the incoming track's own change at "
                 f"its in-point {f(hi.get('beat_cos'), 3)} / {f(hi.get('bar_cos'), 3)} / {f(hi.get('two_bar_cos'), 3)}; the "
                 f"outgoing track's own continuation {f(ho.get('beat_cos'), 3)} / {f(ho.get('bar_cos'), 3)} / {f(ho.get('two_bar_cos'), 3)};")
        L.append(f"  - key, 2 bars each side: {keyline(h)}; the strongest pitch classes "
                 f"{', '.join(h.get('top_pitch_classes_before', []))} before, {', '.join(h.get('top_pitch_classes_after', []))} after;")
    if m.get("onsets_around_seam"):
        L.append(f"  - onsets on the grid, 4 beats each side: {onl(m['onsets_around_seam'])}; the beat interval across the "
                 f"seam {f(m.get('beat_interval_across_ms'), 1)} ms.")
    return L


TABLES = {"cues": t_cues, "joins": t_joins, "arc": t_arc, "blocks": t_blocks, "shots": t_shots, "rframes": t_rframes,
          "returnbars": t_returnbars, "g1": t_g1, "probe": t_probe, "j2": t_j2, "checks": t_checks,
          "title_A": lambda: t_title(TA), "title_B": lambda: t_title(TB, "B"),
          "title_A_r2": lambda: t_title(TA2), "title_B_r2": lambda: t_title(TB2, "B"),
          "returnbars_B": lambda: t_returnbars(GB)}
for jid in J:
    TABLES[f"seam_{jid}"] = (lambda jid_: (lambda: t_seamdetail(jid_)))(jid)
V = {"CS": CS, "M": M, "X": X, "J": J, "XJ": XJ, "C": C, "B": B, "OJ": OJ, "OB": OB, "PROBE": PROBE, "TA": TA, "TB": TB,
     "TA2": TA2, "TB2": TB2, "XM2": XM2,
     "XM": XM, "GB": GB, "DEC": DEC, "MET": MET, "f": f, "mm": mm, "keyline": keyline, "onl": onl, "BS": BS,
     "ordinal": ordinal}


def fill(text):
    def tab(mo):
        return "\n".join(TABLES[mo.group(1)]())
    text = re.sub(r"<!--T:([A-Za-z0-9_]+)-->", tab, text)

    def val(mo):
        return str(eval(mo.group(1), {}, V))  # noqa: S307  our own template, our own data
    return re.sub(r"\{\{(.+?)\}\}", val, text)


def main():
    if len(sys.argv) > 1 and sys.argv[1] == "facts":
        for jid, j in J.items():
            print(jid, json.dumps(j["measured"])[:1500])
        return
    with open(os.path.join(R2, "CUE_SHEET.template.md")) as fh:
        tpl = fh.read()
    for k, v in (DEC.get("text") or {}).items():
        tpl = tpl.replace(f"@@{k}@@", v)
    out = fill(tpl)
    left = re.findall(r"<!--T:|\{\{|@@[A-Z0-9_]+@@", out)
    assert not left, f"unfilled markers: {sorted(set(left))}"
    with open(os.path.join(S2, "CUE_SHEET.md"), "w") as fh:
        fh.write(out)
    print("wrote", os.path.join(S2, "CUE_SHEET.md"), len(out.splitlines()), "lines")


if __name__ == "__main__":
    main()
