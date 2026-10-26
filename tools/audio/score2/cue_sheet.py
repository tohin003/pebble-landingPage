"""score2 lane: build CUE_SHEET.json from the supervisor's spec, the cue plans and their measurements, and check it.

Inputs, all in one work folder (default .work/score2/cuesheet), plus the music map (.work/score2):
  sheet_spec.json        the supervisor's authored content: roles, methods, motivations, layers, shot anchors, the
                         40-s cut's slots, the tour and the shorts, flex rules, credits
  plan_main.json, plan_x40.json            the cue plans (cue_plan.py's input)
  main.metrics.json, x40.metrics.json      cue_plan.py's measurements of the assembled beds
  ../maps/<Track>.map.json, ../MUSIC_MAP.json

Every time in the output is resolved from a source time on a cue (film = cue film_in + (src - src_in)), so the beat
sheet cannot drift from the music. Frames are given at the spec's frame rate. No audio is read or written.

  python3 -I tools/audio/score2/cue_sheet.py [WORK_DIR]  ->  WORK_DIR/../CUE_SHEET.json, prints the checks
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
WORK = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.join(REPO, ".work", "score2", "cuesheet")
SCORE2 = os.path.dirname(WORK)


def load(p):
    with open(p) as fh:
        return json.load(fh)


def mmss(t):
    s = "-" if t < 0 else ""
    t = abs(t)
    return f"{s}{int(t // 60)}:{t % 60:05.2f}"


SPEC = load(os.path.join(WORK, "sheet_spec.json"))
MM = load(os.path.join(SCORE2, "MUSIC_MAP.json"))
FPS = SPEC["frame_rate"]
MAPS = {}


def tmap(track):
    if track not in MAPS:
        MAPS[track] = load(os.path.join(SCORE2, "maps", f"{track}.map.json"))
    return MAPS[track]


def track_meta(track):
    t = MM["tracks"][track]
    mix = "Mixkit" in t["licence"]
    return {"label": t["label"], "title": t["title"], "artist": t["artist"], "licence": t["licence"], "file": t["file"],
            "sha256": t["sha256"], "family": "mixkit" if mix else "cc_by",
            "credit": None if mix else f"'{t['title']}' by Scott Buckley (edited) – CC BY 4.0 – www.scottbuckley.com.au – https://creativecommons.org/licenses/by/4.0/"}


def nearest_db(track, t):
    d = tmap(track)["downbeats_s"]
    k = min(range(len(d)), key=lambda i: abs(d[i] - t))
    return k, d[k], round(1000 * (d[k] - t), 1)


def section_at(track, t):
    for s in MM["tracks"][track]["sections"]:
        if s["start_s"] <= t < s["end_s"]:
            return s
    return None


def film_of(cues, anchor):
    if "film" in anchor:
        return float(anchor["film"])
    c = cues[anchor["cue"]]
    return c["film_in"] + (anchor["src"] - c["src_in"])


def extent(c):
    """Audio extent of a cue in film time, and its source span including pre-roll and tail (as cue_plan.py lays it)."""
    h, tl = c["head"], c["tail"]
    f0 = c["film_in"] - h["len"] if h["mode"] == "preroll" else (h["start"] if h["mode"] == "fade" else c["film_in"])
    fout = c["film_in"] + (c["src_out"] - c["src_in"])
    f1 = {"preroll_out": fout, "ring": c["film_in"] + (tl.get("until", c["src_out"]) - c["src_in"]),
          "fade": tl.get("end", fout)}.get(tl["mode"], fout)
    s0 = c["src_in"] + (f0 - c["film_in"]); s1 = c["src_in"] + (f1 - c["film_in"])
    return f0, f1, fout, s0, s1


GRIDS = {"BornOfTheSky": 0.49994 * 4, "YourBreath": 0.50002 * 4, "TechnoFestVibes": 0.48389 * 4}


def build_film(key):
    sp = SPEC[key]
    plan = load(os.path.join(WORK, sp["plan"]))
    met = load(os.path.join(WORK, sp["metrics"]))
    cues = {c["id"]: c for c in plan["cues"]}
    seams = {s["id"]: s for s in plan["seams"]}
    msm = {s["id"]: s for s in met["seams"]}
    out_cues = []
    for c in plan["cues"]:
        tm = track_meta(c["track"])
        f0, f1, fout, s0, s1 = extent(c)
        a = sp["cues"][c["id"]]
        entry = next((j for j, s in seams.items() if s["to"] == c["id"]), None)
        exit_ = next((j for j, s in seams.items() if s["from"] == c["id"]), None)
        bars = []
        bar = GRIDS.get(c["track"])
        if bar and c["id"] != "M4":
            t = c["src_in"]
            while t <= c["src_out"] + 1e-6:
                k, d, off = nearest_db(c["track"], t)
                ft = c["film_in"] + (t - c["src_in"])
                bars.append({"src_s": round(t, 4), "film_s": round(ft, 4), "frame": round(ft * FPS),
                             "nearest_measured_downbeat": {"index": k, "s": d, "offset_ms": off}})
                t += bar
        ki, di, oi = nearest_db(c["track"], c["src_in"])
        ko, do, oo = nearest_db(c["track"], c["src_out"])
        sec_in = section_at(c["track"], c["src_in"] + 0.01); sec_out = section_at(c["track"], c["src_out"] - 0.01)
        out_cues.append({
            "id": c["id"], "name": c["name"], "track": tm, "role": a["role"], "why": a["why"],
            "source": {"in_s": c["src_in"], "in": mmss(c["src_in"]), "out_s": c["src_out"], "out": mmss(c["src_out"]),
                       "in_nearest_measured_downbeat_ms": oi, "out_nearest_measured_downbeat_ms": oo,
                       "audio_span_s": [round(s0, 4), round(s1, 4)], "audio_span": [mmss(s0), mmss(s1)],
                       "section_at_in": sec_in and sec_in.get("label"), "section_at_out": sec_out and sec_out.get("label")},
            "film": {"in_s": round(c["film_in"], 4), "in": mmss(c["film_in"]), "in_frame": round(c["film_in"] * FPS),
                     "out_s": round(fout, 4), "out": mmss(fout), "out_frame": round(fout * FPS),
                     "audio_extent_s": [round(f0, 4), round(f1, 4)], "length_s": round(fout - c["film_in"], 4)},
            "head": c["head"], "tail": c["tail"], "gain_db_points_film_s": c["gain_db"],
            "entry_join": entry, "exit_join": exit_,
            "tempo_bpm": tmap(c["track"])["tempo"]["bpm"], "bar_s": round(bar, 5) if bar else None,
            "eq": a.get("eq"), "layers": a.get("layers", []),
            "bar_lines": bars,
            "licence_rules": MM["tracks"][c["track"]]["licence_rules"],
            **({"accent_for_name": a["accent_for_name"]} if "accent_for_name" in a else {}),
            **({"entry_note": a["entry"]} if "entry" in a else {}),
        })
    joins = []
    for jid, s in seams.items():
        m = msm[jid]; a = sp["joins"][jid]
        joins.append({"id": jid, "name": a["name"], "film_s": round(s["t"], 4), "film": mmss(s["t"]), "frame": round(s["t"] * FPS),
                      "incoming_starts_film_s": round(s.get("in_film", s["t"]), 4),
                      "from": s["from"], "to": s["to"], "methods": a["methods"], "how": a["how"], "motivation": a["motivation"],
                      "tempo": a["tempo"], "key": a["key"],
                      "measured": {k: m[k] for k in ("xfade_s", "film_lufs_3s_before", "film_lufs_3s_after", "film_step_3s_lu",
                                                     "film_step_400ms_lu", "incoming_source_own_step_3s_lu", "lsd_film_db",
                                                     "lsd_incoming_source_db", "extra_lsd_db", "hf_click_film_db", "extra_hf_db",
                                                     "attack_film_vs_source_db", "gain_db_out", "gain_db_in")}})
    # each cue carries its own entry and exit methods and the measured levels of the blocks it plays under
    jby = {j["id"]: j for j in joins}
    for oc in out_cues:
        a = sp["cues"][oc["id"]]
        for side, jid, note in (("entry", oc["entry_join"], a.get("entry")), ("exit", oc["exit_join"], a.get("exit"))):
            if jid:
                j = jby[jid]
                oc[side] = {"join": jid, "name": j["name"], "film_s": j["film_s"], "film": j["film"], "frame": j["frame"],
                            "methods": j["methods"], "how": j["how"]}
            else:
                oc[side] = {"join": None, "how": note}
        f0, f1 = oc["film"]["in_s"], oc["film"]["out_s"]
        oc["levels"] = {"gain_db_points_film_s": oc["gain_db_points_film_s"],
                        "measured_blocks": [b for b in met["blocks"] if min(f1, b["film"][1]) - max(f0, b["film"][0]) > 0.5]}
    res = {"plan": sp["plan"], "film_length_s": sp["end_film_s"], "film_length": mmss(sp["end_film_s"]),
           "film_length_frames": round(sp["end_film_s"] * FPS), "bed": met["bed"], "blocks_measured": met["blocks"],
           "cues": out_cues, "joins": joins}
    # shots or slots
    rows = sp.get("shots") or sp.get("slots")
    seq = []
    for i, r in enumerate(rows):
        if "shots" in sp:
            sid, block, anc, what = r
        else:
            sid, what, anc = r; block = None
        t0 = film_of(cues, anc)
        seq.append([sid, block, t0, what, anc])
    shots = []
    for i, (sid, block, t0, what, anc) in enumerate(seq):
        t1 = seq[i + 1][2] if i + 1 < len(seq) else sp["end_film_s"]
        cue_here = max((c for c in plan["cues"] if c["film_in"] - 1e-6 <= t0), key=lambda c: c["film_in"], default=None)
        shots.append({"id": sid, **({"block": block} if block else {}), "start_s": round(t0, 4), "start": mmss(t0),
                      "start_frame": round(t0 * FPS), "end_s": round(t1, 4), "end": mmss(t1), "dur_s": round(t1 - t0, 3),
                      "dur_frames": round(t1 * FPS) - round(t0 * FPS), "anchor": anc, "music_under": cue_here and cue_here["id"],
                      "what": what})
    res["shots" if "shots" in sp else "slots"] = shots
    if "sync_points" in sp:
        res["sync_points"] = [{"film_s": round(film_of(cues, a) if isinstance(a, dict) else a, 4),
                               "film": mmss(film_of(cues, a) if isinstance(a, dict) else a),
                               "frame": round((film_of(cues, a) if isinstance(a, dict) else a) * FPS),
                               **({"anchor": a} if isinstance(a, dict) else {"approximate": True}), "what": w}
                              for a, w in sp["sync_points"]]
    # blocks from shots
    if "shots" in sp:
        blocks = []
        for s in shots:
            if not blocks or blocks[-1]["block"] != s["block"]:
                blocks.append({"block": s["block"], "start_s": s["start_s"], "start": s["start"], "shots": [s["id"]]})
            else:
                blocks[-1]["shots"].append(s["id"])
        for i, b in enumerate(blocks):
            b["end_s"] = blocks[i + 1]["start_s"] if i + 1 < len(blocks) else sp["end_film_s"]
            b["end"] = mmss(b["end_s"]); b["dur_s"] = round(b["end_s"] - b["start_s"], 3)
            b["start_pct"] = round(100 * b["start_s"] / sp["end_film_s"], 1)
            b["music"] = sorted({s["music_under"] for s in shots if s["block"] == b["block"]})
        res["blocks"] = blocks
    return res, plan, met


def checks(main, plan, met, x40, xplan, xmet):
    out = []

    def add(name, ok, detail):
        out.append({"check": name, "ok": bool(ok), "detail": detail})

    for film, pl, res in (("main", plan, main), ("x40", xplan, x40)):
        L = res["film_length_s"]
        add(f"{film}: length", L <= SPEC["film_max_s"] if film == "main" else abs(L - 40.0) < 0.5,
            f"{L:.2f} s ({mmss(L)}); cap {SPEC['film_max_s']} s for the main film (X, OVERRIDES §14), 40 s for the cut")
        # Mixkit order and overlaps
        exts = {c["id"]: extent(c) for c in pl["cues"]}
        by_track = {}
        for c in pl["cues"]:
            if track_meta(c["track"])["family"] == "mixkit":
                by_track.setdefault(c["track"], []).append(c)
        for tr, cs in by_track.items():
            cs = sorted(cs, key=lambda c: c["film_in"])
            spans = [(exts[c["id"]][3], exts[c["id"]][4]) for c in cs]
            ordered = all(spans[i][1] <= spans[i + 1][0] + 1e-6 for i in range(len(spans) - 1))
            add(f"{film}: {tr} excerpts in the track's own order, never overlapping",
                ordered, "; ".join(f"{c['id']} {mmss(a)}-{mmss(b)}" for c, (a, b) in zip(cs, spans)))
            for c in cs:
                a0, a1 = exts[c["id"]][0], exts[c["id"]][1]
                worst = 0.0; who = None
                for d in pl["cues"]:
                    if d["id"] == c["id"]:
                        continue
                    b0, b1 = exts[d["id"]][0], exts[d["id"]][1]
                    ov = min(a1, b1) - max(a0, b0)
                    if ov > worst:
                        worst, who = ov, d["id"]
                add(f"{film}: {c['id']} ({tr}) overlaps other music by at most {SPEC['mixkit_max_overlap_s']} s",
                    worst <= SPEC["mixkit_max_overlap_s"] + 1e-6, f"longest overlap {worst:.2f} s{(' with ' + who) if who else ''}")
        rows = res.get("shots") or res.get("slots")
        contiguous = all(abs(rows[i]["end_s"] - rows[i + 1]["start_s"]) < 1e-6 for i in range(len(rows) - 1)) and rows[0]["start_s"] == 0
        add(f"{film}: shots contiguous from 0", contiguous, f"{len(rows)} rows, last ends {rows[-1]['end']}")
        mn = min(r["dur_s"] for r in rows)
        add(f"{film}: every shot at least 1.9 s", mn >= 1.9, f"shortest {mn:.2f} s ({min(rows, key=lambda r: r['dur_s'])['id']})")
        add(f"{film}: no audio written", res["bed"] is not None and "none" in (met if film == "main" else xmet)["audio_written"],
            (met if film == "main" else xmet)["audio_written"])
    b = {x["label"]: x for x in main["blocks_measured"]}
    drop = next(s for s in main["shots"] if s["id"] == "S06")["start_s"]
    add("main: the Drop at 14-20 % of the film", 14 <= 100 * drop / main["film_length_s"] <= 20,
        f"{drop:.2f} s = {100 * drop / main['film_length_s']:.1f} %")
    rings_max = max(b["Rings 1-2"]["st_max"], b["Rings 3-4"]["st_max"])
    add("main: the climax is the loudest, 1.5 LU or more above any ring moment (short-term)",
        b["Climax"]["st_max"] >= rings_max + 1.5, f"climax {b['Climax']['st_max']} against the rings' {rings_max} LUFS short-term")
    rings_med = min(b["Rings 1-2"]["st_median"], b["Rings 3-4"]["st_median"])
    add("main: the quiet passage sits 6 LU or more under the rings (median short-term)",
        b["Dusk"]["st_median"] <= rings_med - 6, f"Dusk {b['Dusk']['st_median']} against the rings' {rings_med}")
    add("main: the Drop is a step of +3 LU or more", main["joins"][0]["measured"]["film_step_3s_lu"] >= 3,
        f"J1 {main['joins'][0]['measured']['film_step_3s_lu']} LU over 3 s, {main['joins'][0]['measured']['film_step_400ms_lu']} LU over 400 ms")
    unint = [j for j in main["joins"] if j["id"] in ("J2", "J5")]
    add("main: unplanned loudness jumps at most 1.5 LU (J2, J5)", all(abs(j["measured"]["film_step_3s_lu"]) <= 1.5 for j in unint),
        "; ".join(f"{j['id']} {j['measured']['film_step_3s_lu']} LU" for j in unint))
    add("main: no click at any seam (extra 8-16 kHz under +3 dB, except where a drop's transient is the seam)",
        all(j["measured"]["extra_hf_db"] is None or j["measured"]["extra_hf_db"] < 3 or j["id"] == "J1" for j in main["joins"]),
        "; ".join(f"{j['id']} {j['measured']['extra_hf_db']}" for j in main["joins"]) + " (J1: B2's drop transient against a quiet pad; no click line on the spectrogram)")
    for act, a0, a1 in SPEC["main"]["acts"]:
        ids = [s["id"] for s in main["shots"]]
        seg = main["shots"][ids.index(a0):ids.index(a1) + 1]
        dur = seg[-1]["end_s"] - seg[0]["start_s"]
        rate = (len(seg) - (0 if a0 == "S01" else 0)) / (dur / 60)
        add(f"main: cut rate in '{act}' at most 18 a minute", rate <= 18, f"{len(seg)} shots in {dur:.1f} s = {rate:.1f} a minute")
    return out


def main():
    m, plan, met = build_film("main")
    x, xplan, xmet = build_film("x40")
    tour = []
    for mv in SPEC["tour"]["movements"]:
        tm = track_meta(mv["track"]); a, b_ = mv["window"]
        ka, da, oa = nearest_db(mv["track"], a); kb, db, ob = nearest_db(mv["track"], b_)
        tour.append({**mv, "track": tm, "window": [a, b_], "window_mmss": [mmss(a), mmss(b_)], "length_s": round(b_ - a, 2),
                     "in_nearest_downbeat_ms": oa, "out_nearest_downbeat_ms": ob})
    shorts = []
    for fam, name, tr, (a, b_), what, ending in SPEC["shorts"]["families"]:
        tm = track_meta(tr)
        shorts.append({"family": fam, "name": name, "track": tm, "window_s": [a, b_], "window": [mmss(a), mmss(b_)],
                       "length_s": round(b_ - a, 2), "what": what, "ending": ending,
                       "in_nearest_downbeat_ms": nearest_db(tr, a)[2], "out_nearest_downbeat_ms": nearest_db(tr, b_)[2]})
    ck = checks(m, plan, met, x, xplan, xmet)
    used = {}
    for film, res in (("main", m), ("x40", x)):
        for c in res["cues"]:
            used.setdefault(c["track"]["title"], set()).add(film)
    for t in tour:
        used.setdefault(t["track"]["title"], set()).add("tour")
    for s in shorts:
        used.setdefault(s["track"]["title"], set()).add("shorts")
    sheet = {
        "title": "Ripples: the cue sheet (music supervisor)",
        "version": SPEC["version"],
        "binding": ["OVERRIDES §48-§52 (§51: the multi-cue score and the Mixkit limits)", "TREATMENT §3.4-3.9, §3.12, §4, §5.5",
                    "MUSIC_RESEARCH §3", "TOOLS_AUDIO / TOOLS_TESTS: pre-roll crossfades that end on the incoming downbeat; no time-stretch"],
        "evidence": "Every number is measured on the nine audition files (MUSIC_MAP) or on the planned bed assembled in memory by "
                    "tools/audio/score2/cue_plan.py; nobody has listened. Every join, window and level is for ears to confirm.",
        "frame_rate": FPS,
        "main_film": m, "cut_40s": x,
        "tour_cut": {"rule": SPEC["tour"]["rule"], "movements": tour},
        "family_shorts": {"rule": SPEC["shorts"]["rule"], "families": shorts},
        "flex": [{"id": a, "what": b_, "how": c} for a, b_, c in SPEC["flex"]],
        "credits": SPEC["credits"],
        "tracks_used": {k: sorted(v) for k, v in sorted(used.items())},
        "checks": ck,
        "files": {"plans": ["cuesheet/plan_main.json", "cuesheet/plan_x40.json"],
                  "measurements": ["cuesheet/main.metrics.json", "cuesheet/x40.metrics.json", "cuesheet/main.npz", "cuesheet/x40.npz"],
                  "pictures": ["cuesheet/main-overview.png", "cuesheet/main-seams.png", "cuesheet/x40-overview.png", "cuesheet/x40-seams.png"]},
    }
    with open(os.path.join(SCORE2, "CUE_SHEET.json"), "w") as fh:
        json.dump(sheet, fh, indent=1, ensure_ascii=False)
    bad = [c for c in ck if not c["ok"]]
    for c in ck:
        print(("ok  " if c["ok"] else "FAIL") + "  " + c["check"] + " :: " + c["detail"])
    print(f"{len(ck) - len(bad)} of {len(ck)} checks pass; wrote {os.path.join(SCORE2, 'CUE_SHEET.json')}")


if __name__ == "__main__":
    main()
