"""score2 lane: assemble MUSIC_MAP.json and MUSIC_MAP.md from the per-track maps (measure_track.py), the cue windows and
compatibility (cue_windows.py -> cues.json) and the person-reviewed notes (review.json: labels corrected after looking
at the strips, and prose). No audio. Usage: python -I assemble.py WORK_DIR
"""
import datetime
import json
import os
import sys

import numpy as np

W = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", ".work", "score2")
CUES = json.load(open(f"{W}/cues.json"))
REV = json.load(open(f"{W}/review.json")) if os.path.exists(f"{W}/review.json") else {}
ORDER = ["Starfire", "Convergence", "Aphelion", "BornOfTheSky", "Wildflowers", "MaskingTheMasters", "YourBreath",
         "AtomsInPeace", "TechnoFestVibes"]
SCENES = ["intimate_open", "tension_build", "drop_entrance", "ring_groove", "the_wall", "quiet_dusk", "climax_peak",
          "convergence", "title", "end_decay"]
SCENE_NAMES = {"intimate_open": "Intimate open (Act I)", "tension_build": "Tension build", "drop_entrance": "The Drop's entrance",
               "ring_groove": "Ring groove and cascades", "the_wall": "The wall", "quiet_dusk": "Quiet dusk (Stealth)",
               "climax_peak": "Climax peak (kept card)", "convergence": "Convergence", "title": "Title",
               "end_decay": "End card's decay"}


def mmss(t):
    if t is None:
        return "-"
    return f"{int(t // 60)}:{t % 60:05.2f}"


def r(v, d=2):
    return None if v is None or (isinstance(v, float) and not np.isfinite(v)) else round(float(v), d)


def conf_key(k):
    if k["r"] >= 0.75 and k["margin"] >= 0.08 and k["profiles_agree"] == "3/3":
        return "high"
    if k["r"] >= 0.6 and (k["profiles_agree"] in ("2/3", "3/3")) and k["margin"] >= 0.03:
        return "medium"
    return "low"


def steadiness(t):
    loc = t["local_phase_check"]
    clear = [w for w in loc if w["clarity"] >= 1.8]
    on = [w for w in clear if abs(w["delta_ms"]) <= 25]
    mx = max([abs(w["delta_ms"]) for w in on] or [0])
    sync = t.get("syncopated_windows", [])
    fr = sorted(set(w["offset_beats"] for w in sync if w["offset_beats"] is not None))
    un = [w for w in sync if w["offset_beats"] is None]
    s = (f"{t['grid_mode']} grid: {len(on)} of {len(clear)} clear 8-bar windows sit on it (largest offset {mx:.0f} ms)")
    if fr:
        s += f"; {len(sync) - len(un)} windows read a syncopated low end at {', '.join(f'{x:+g}' for x in fr)} beat"
    if un:
        s += f"; {len(un)} window(s) off the grid by no simple fraction ({', '.join(str(w['t0']) for w in un)} s)"
    return s


tracks = {}
for n in ORDER:
    if not os.path.exists(f"{W}/maps/{n}.map.json"):
        continue
    m = json.load(open(f"{W}/maps/{n}.map.json"))
    cu = CUES["tracks"][n]
    rv = REV.get(n, {})
    secs = []
    for s in m["sections"]:
        lab = rv.get("labels", {}).get(f"{s['start_s']:.2f}", s["label_rule"])
        secs.append({"start_s": s["start_s"], "end_s": s["end_s"], "bar_start": s["bar_start"], "bar_end": s["bar_end"],
                     "bars": s["bars"], "label": lab, "label_rule": s["label_rule"], "lufs": s["lufs"], "st_min": s["st_min"],
                     "st_max": s["st_max"], "step_in_lu": s["step_in_lu"], "slope_lu_per_bar": s["slope_lu_per_bar"],
                     "perc_share": s["perc"], "perc_onsets_per_beat": s["perc_onsets_per_beat"], "low_share": s["low"],
                     "sub_share": s["sub"], "air_share": s["air"], "centroid_hz": s["centroid"], "width_db": s["width_db"],
                     "key": s.get("key"), "camelot": s.get("camelot"), "downbeat_margin": s.get("downbeat_margin"),
                     "beat_salience": s.get("beat_salience")})
    t = m["tempo"]
    k = m["key"]
    drive_bars = [b for b in m["bar_table"] if b["lufs"] and b["lufs"] > m["loudness"]["drive_level_lufs"] - 3]
    timbre = {"drive_bars": len(drive_bars),
              "low_share_drive": r(np.mean([b["low"] for b in drive_bars]), 3) if drive_bars else None,
              "sub_share_drive": r(np.mean([b["sub"] for b in drive_bars]), 3) if drive_bars else None,
              "air_share_drive": r(np.mean([b["air"] for b in drive_bars]), 4) if drive_bars else None,
              "centroid_drive_hz": r(np.mean([b["centroid"] for b in drive_bars]), 0) if drive_bars else None,
              "perc_share_drive": r(np.mean([b["perc"] for b in drive_bars]), 3) if drive_bars else None,
              "perc_onsets_per_beat_drive": r(np.mean([b["perc_onsets_per_beat"] for b in drive_bars]), 2) if drive_bars else None,
              "width_db_drive": r(np.mean([b["width_db"] for b in drive_bars]), 1) if drive_bars else None,
              "notes": rv.get("timbre", "")}
    tracks[n] = {
        "label": cu["label"], "title": cu["title"], "artist": cu["artist"], "source": cu["source"], "licence": cu["licence"],
        "licence_rules": cu["licence_rules"], "file": f".work/music-audition/{n}.mp3", "sha256": m["sha256"],
        "duration_s": m["duration_s"], "sample_rate": m["sr"], "channels": m["channels"],
        "loudness": m["loudness"],
        "loudness_10s_st_median": [[w["t0"], w["st_lufs"]] for w in t["local_10s"]],
        "tempo": {"bpm": t["bpm"], "beat_period_s": t["grid_period_s"], "grid_phase_s": t["grid_phase_s"], "grid_mode": t["grid_mode"],
                  "steadiness": steadiness(t), "share_clear_windows_on_grid": t.get("share_clear_windows_on_grid_25ms"),
                  "local_phase_check": t["local_phase_check"], "syncopated_windows": t.get("syncopated_windows", []),
                  "grid_to_onset_ms_median_abs": t["grid_to_onset_ms_median_abs"], "grid_to_onset_ms_p90_abs": t["grid_to_onset_ms_p90_abs"],
                  "tracker_check": t["tracker"], "tempogram_candidates_bpm": t["tempogram_candidates_bpm"],
                  "local_10s": t["local_10s"], "notes": rv.get("tempo", "")},
        "downbeats": {"first_downbeat_s": m["downbeats"]["first_downbeat_s"], "bar_s": m["bar_s_median"], "bars": m["downbeats"]["bars"],
                      "odd_bars": m["downbeats"]["odd_bars"], "method": m["downbeats"]["method"],
                      "analysed_span_s": m["downbeats"]["analysed_span_s"], "global_phase_margin": m["downbeats"]["global_phase_margin"],
                      "bar_phase_agreement": m["bar_phase_agreement"], "phrase_grid": m["phrase_grid"], "notes": rv.get("downbeats", "")},
        "key": {"key": k["key"], "camelot": k["camelot"], "confidence": conf_key(k), "r": k["r"], "margin": k["margin"],
                "runner_up": f"{k['second']} ({k['second_camelot']})", "profiles_agree": k["profiles_agree"],
                "per_profile": k["per_profile"], "windows_agree": k["share_windows_agree"], "windows_30s": k["windows_30s"],
                "tuning_cents": k["tuning_cents"], "chroma_profile_C_to_B": k["chroma_profile"], "notes": rv.get("key", "")},
        "sections": secs, "timbre": timbre,
        "ending": dict(m["ending"], notes=rv.get("ending", "")),
        "change_points": m["change_points"],
        "cue_windows": cu["cue_windows"], "transition_points": cu["transition_points"],
        "beats_s": m["beats_s"], "downbeats_s": m["downbeats_s"],
        "bar_table": [{k_: b[k_] for k_ in ("start", "end", "lufs", "st_max", "mom_min", "perc", "low", "sub", "air", "centroid",
                                             "width_db", "perc_onsets_per_beat")} for b in m["bar_table"]],
        "summary": rv.get("summary", ""), "strips": rv.get("strips", ""),
        "full_map": f".work/score2/maps/{n}.map.json (bar chroma and MFCC for tools-tests t5_cut.py)"}

# cross-track ranking per scene
ranking = {}
for s in SCENES:
    allw = []
    for n, tr in tracks.items():
        for w in tr["cue_windows"].get(s, []):
            allw.append(dict(w, track=n, label=tr["label"]))
    allw.sort(key=lambda w: -w["score"])
    ranking[s] = [{k_: w[k_] for k_ in ("track", "label", "start_s", "end_s", "length_s", "lufs", "score")} for w in allw[:6]]

pairs = CUES["compatibility"]
OUT = {
    "lane": "score2: MEASURE ALL NINE TRACKS (the music map for the multi-cue score, OVERRIDES §51)",
    "made": datetime.datetime.now().isoformat(timespec="minutes"),
    "binding": ["OVERRIDES §48-§51", "TREATMENT §3.4, §3.5, §3.8-3.9, §3.12, §4, §5.5", "MUSIC_RESEARCH §3",
                "TOOLS_AUDIO, TOOLS_TESTS (pre-roll crossfades ending on the incoming downbeat; no time-stretch)"],
    "method": {
        "loudness": "ITU-R BS.1770 K-weighting (pyloudnorm 0.2.0's filters) at the file's own rate, both channels: momentary 400 ms and short-term 3 s every 100 ms (centred), gated integrated loudness, EBU 3342 LRA, sample and 4x true peak",
        "analysis_copy": "22.05 kHz mono (soxr HQ) for every librosa feature",
        "beat_grid": "librosa 0.11's tracker seeds the period; a comb search fits a constant grid (period and phase) to a kick-weighted onset envelope (low band < 200 Hz + 0.5 x all bands) at the tracker's metrical level and its simple relatives between 60 and 150 BPM; the level whose grid most clear 16-beat windows (hop 8) sit on wins (at most 10 % unexplained; ties to the level nearest 120 BPM); the grid is constant when its on-grid windows span the track and at most 10 % of clear windows sit off it by no simple subdivision (1/4, 1/3, 1/2, 2/3, 3/4), else a tight DP track (Starfire)",
        "downbeats": "semi-Markov DP over the grid's beats; evidence = beat-level mel texture change (peaks), harmonic change, timbre novelty, loudness rise, low-band onset, minus backbeat band; bar lengths 4 free, 2/6 cost 10, 3/5 cost 14; drop-class arrivals (+5 LU with a strong texture change) anchored as downbeats and carried 8 bars; checked on onset-strength strips and a drum-pattern shift test",
        "sections": "multi-scale checkerboard novelty (2, 4, 8 bars) on bar features (chroma, MFCC, loudness, percussive share, low-end, centroid, onset density) plus 3-LU loudness steps; boundaries one bar off a clear 4-bar phrase grid moved onto it; a boundary forced at the final hit; rule labels reviewed by looking",
        "key": "CQT chroma of the median-filter HPSS harmonic part, weighted by loudness and harmonic share, against Krumhansl-Kessler, Temperley and Albrecht-Shanahan profiles; confidence from r, margin and agreement",
        "timbre": "per bar: percussive energy share (HPSS 17x17), strong percussive onsets per beat, low < 120 Hz and sub < 60 Hz energy shares, air > 5 kHz share, spectral centroid, side/mid width and L/R correlation",
        "cue_windows": "scored scans over downbeats and change points against the treatment's block needs; heuristics [I] with every number shown",
        "tools": "librosa 0.11.0 (ISC), numpy, scipy, soundfile, soxr, pyloudnorm 0.2.0 (MIT) in .work/tools-eval/tools-tests/audio-venv; Pillow 13.0.0 for strips; every job through scripts/heavy.sh under taskpolicy -c utility",
        "limits": "nobody listened: every label and window is a measurement for a person's ears to confirm; bar phase (which beat is 1) can be ambiguous by half a bar where the evidence disagrees (flagged per track); keys of modal or static-harmony tracks are low confidence"},
    "licences": {"scott_buckley": "CC BY 4.0: edits allowed with credit '<Title>' by Scott Buckley (edited) - CC BY 4.0 - www.scottbuckley.com.au",
                 "mixkit": "Mixkit Stock Music Free License: edited excerpts in their own order (trim, fade, shorten at bar lines); never reorder sections, never layer with other music beyond a short standard cue transition, never export a music-only file (previews are video)"},
    "tracks": tracks, "scene_ranking": ranking, "compatibility": pairs,
    "notes": REV.get("_global", {})}
json.dump(OUT, open(f"{W}/MUSIC_MAP.json", "w"), indent=1)
print("MUSIC_MAP.json", os.path.getsize(f"{W}/MUSIC_MAP.json"), "bytes;", len(tracks), "tracks")


# ------------------------------------------------------------------------------------------------------------ the MD
def md_table(head, rows):
    out = ["| " + " | ".join(head) + " |", "|" + "|".join("---" for _ in head) + "|"]
    for row in rows:
        out.append("| " + " | ".join("" if v is None else str(v) for v in row) + " |")
    return "\n".join(out)


G = REV.get("_global", {})
L = []
L.append("# The music map: nine audition tracks, measured for a multi-cue score")
L.append("")
L.append(G.get("intro", ""))
L.append("")
L.append("## 0. Summary")
L.append("")
L.append(G.get("summary", ""))
L.append("")
rows = []
for n, tr in tracks.items():
    t, k, lo, e = tr["tempo"], tr["key"], tr["loudness"], tr["ending"]
    rows.append([tr["label"], f"{tr['title']} ({tr['artist']})", "CC BY 4.0" if tr["source"] != "Mixkit" else "Mixkit free",
                 mmss(tr["duration_s"]), f"{t['bpm']:.2f} ({t['grid_mode'].split(' ')[0]})",
                 f"{k['key']} {k['camelot']} ({k['confidence']}, r {k['r']})", f"{lo['integrated_lufs']} / {lo['lra_lu']} LU",
                 f"{lo['drive_level_lufs']} / {lo['peak_level_lufs']}", (e.get("type") or "").split(":")[0],
                 REV.get(n, {}).get("roles", "")])
L.append(md_table(["#", "Track", "Licence", "Length", "Tempo, BPM", "Key (confidence)", "Integrated / LRA", "Drive / peak LUFS",
                   "Ending", "Where it serves the film [I]"], rows))
L.append("")
L.append("## 1. How it was measured, and what to trust")
L.append("")
for k_, v in OUT["method"].items():
    L.append(f"- **{k_.replace('_', ' ')}:** {v}.")
L.append("")
L.append(G.get("method_notes", ""))
L.append("")
L.append("## 2. The tracks")
L.append("")
for n, tr in tracks.items():
    t, k, lo, e, d = tr["tempo"], tr["key"], tr["loudness"], tr["ending"], tr["downbeats"]
    rv = REV.get(n, {})
    L.append(f"### {tr['label']} {tr['title']} ({tr['artist']}, {tr['source']}), {mmss(tr['duration_s'])}")
    L.append("")
    if tr["summary"]:
        L.append(tr["summary"])
        L.append("")
    L.append(f"- **Licence:** {tr['licence']}. Rules: " + "; ".join(tr["licence_rules"]) + ".")
    L.append(f"- **Tempo:** {t['bpm']:.3f} BPM, beat {t['beat_period_s']:.5f} s, bar {d['bar_s']:.3f} s; {t['steadiness']}; "
             f"grid to nearest onset {t['grid_to_onset_ms_median_abs']} ms median, {t['grid_to_onset_ms_p90_abs']} ms p90. "
             f"librosa's own tracker read {t['tracker_check']['librosa_bpm']} BPM"
             + (f" and slipped half a beat at {', '.join(str(x) for x in t['tracker_check']['half_beat_slips_s'])} s" if t['tracker_check']['half_beat_slips_s'] else "")
             + f". Tempogram peaks: {', '.join(str(c[0]) for c in t['tempogram_candidates_bpm'][:3])} BPM. {t['notes']}")
    ag = d["bar_phase_agreement"]
    L.append(f"- **Downbeats:** first at {d['first_downbeat_s']} s; {d['bars']} bars; "
             + (f"odd bars: {', '.join(f'{o['beats']} beats at {o['bar_start_s']} s' for o in d['odd_bars'])}; " if d["odd_bars"] else "no odd bars; ")
             + f"of the {ag['big_changes']} biggest change points, {ag['on_downbeat']} fall on a measured downbeat, {ag['on_half_bar']} on beat 3, "
             f"{ag['on_odd_beats']} on beats 2 or 4. {d['notes']}")
    L.append(f"- **Key:** {k['key']} ({k['camelot']}), confidence {k['confidence']}: r {k['r']}, margin {k['margin']} over {k['runner_up']}, "
             f"profiles agree {k['profiles_agree']}, {int(round((k['windows_agree'] or 0) * 100))} % of 30-s windows agree; tuning {k['tuning_cents']} cents. {k['notes']}")
    L.append(f"- **Loudness:** {lo['integrated_lufs']} LUFS integrated, LRA {lo['lra_lu']} LU, true peak {lo['true_peak_dbtp']} dBTP; drive level "
             f"{lo['drive_level_lufs']} LUFS (75th percentile of bars), peak level {lo['peak_level_lufs']} (95th).")
    tb = tr["timbre"]
    L.append(f"- **Timbre and arrangement (bars within 3 LU of the drive):** low < 120 Hz share {tb['low_share_drive']}, sub < 60 Hz {tb['sub_share_drive']}, "
             f"air > 5 kHz {tb['air_share_drive']}, centroid {tb['centroid_drive_hz']} Hz, percussive share {tb['perc_share_drive']}, "
             f"{tb['perc_onsets_per_beat_drive']} strong percussive onsets a beat, width {tb['width_db_drive']} dB side/mid. {tb['notes']}")
    L.append(f"- **Ending:** {e.get('type')}. Last strong onset {e.get('t_last_strong_onset')} s, sound until {e.get('t_last_sound')} s; "
             f"decay {e.get('decay_after_last_onset_lu_per_s')} LU/s; level 4 s before the final hit {e.get('level_4s_before_final_hit_lufs')} LUFS. {e.get('notes', '')}")
    L.append("")
    L.append("**Sections** (on downbeats; labels reviewed by looking, rule label in brackets when changed):")
    L.append("")
    rows = []
    for s in tr["sections"]:
        lab = s["label"] + (f" ({s['label_rule']})" if s["label"] != s["label_rule"] else "")
        rows.append([f"{mmss(s['start_s'])}-{mmss(s['end_s'])}", f"{s['bar_start']}-{s['bar_end']}", lab, s["lufs"],
                     f"{s['st_min']}..{s['st_max']}", s["step_in_lu"], s["perc_share"], s["perc_onsets_per_beat"], s["low_share"],
                     s["centroid_hz"], s["camelot"]])
    L.append(md_table(["Time", "Bars", "Section", "LUFS", "Short-term range", "Step in, LU", "Perc. share", "Onsets/beat",
                       "Low share", "Centroid, Hz", "Key"], rows))
    L.append("")
    L.append("**Cue windows** (start and end on downbeats or the music's own change points; best first; [I] heuristics, numbers measured):")
    L.append("")
    rows = []
    for s in SCENES:
        for i, w in enumerate(tr["cue_windows"].get(s, [])):
            rows.append([SCENE_NAMES[s] if i == 0 else "", i + 1, f"{mmss(w['start_s'])}-{mmss(w['end_s'])}",
                         f"{w['start_bar']}-{w['end_bar']}", w["length_s"], w["lufs"], w["score"], w["why"]])
        if s in tr["cue_windows"].get("none", {}):
            rows.append([SCENE_NAMES[s], "-", "none", "", "", "", "", tr["cue_windows"]["none"][s]])
    L.append(md_table(["Scene", "#", "Time", "Bars", "Length, s", "LUFS", "Score", "Why it fits"], rows))
    L.append("")
    L.append("**Transition points** (where a cue can enter or leave cleanly):")
    L.append("")
    rows = []
    for p in tr["transition_points"]:
        rows.append([mmss(p["t"]), p.get("bar"), p.get("beat_of_bar", ""), ", ".join(p["kinds"]), p.get("step_lu", ""),
                     f"{p.get('before_lufs', '')} -> {p.get('after_lufs', '')}" if p.get("before_lufs") is not None else "",
                     p.get("onset", ""), p.get("pre_dip_lu", ""), p["entry"], p["exit"]])
    L.append(md_table(["Time", "Bar", "Beat", "Kind", "Step, LU", "LUFS 2 bars before -> after", "Onset (p99=1)", "Dip before, LU",
                       "Entering here", "Leaving here"], rows))
    L.append("")
    if tr["strips"]:
        L.append("**What the strips show:** " + tr["strips"])
        L.append("")

L.append("## 3. Compatibility for cue-to-cue transitions")
L.append("")
L.append(G.get("compat_intro", ""))
L.append("")
names = list(tracks)
lab = {n: tracks[n]["label"] for n in names}
P = {(p["from"], p["to"]): p for p in pairs}
L.append("**Tempo ratio (to / from) and the simple ratio it sits on (within 0.3 %; 'about' within 1.5 %; else none):**")
L.append("")
rows = []
for a in names:
    row = [f"{lab[a]} {tracks[a]['tempo']['bpm']:.2f}"]
    for b in names:
        if a == b:
            row.append("-"); continue
        pr = P[(a, b)]; er = abs(pr["ratio_error_pct"])
        row.append(f"{pr['tempo_ratio']:.3f} (" + (pr["nearest_simple"] if er < 0.3 else f"about {pr['nearest_simple']}, {pr['ratio_error_pct']:+.1f} %" if er < 1.5 else "none") + ")")
    rows.append(row)
L.append(md_table(["from \\ to"] + [lab[b] for b in names], rows))
L.append("")
L.append("**Keys on the Camelot wheel (relation, grade):**")
L.append("")
rows = []
for a in names:
    row = [f"{lab[a]} {tracks[a]['key']['camelot']}"]
    for b in names:
        row.append("-" if a == b else f"{P[(a, b)]['key_relation']} ({P[(a, b)]['key_grade']})")
    rows.append(row)
L.append(md_table(["from \\ to"] + [lab[b] for b in names], rows))
L.append("")
L.append("**Drive-level gap, LU (to minus from), and timbre gaps at the drive (centroid in octaves, low-end share, percussive share):**")
L.append("")
rows = []
for a in names:
    row = [lab[a]]
    for b in names:
        p = P.get((a, b))
        row.append("-" if a == b else f"{p['drive_gap_lu']:+.1f}; {p['centroid_ratio_octaves']:+.2f} oct; low {p['low_share_gap']:+.2f}; perc {p['perc_share_gap']:+.2f}")
    rows.append(row)
L.append(md_table(["from \\ to"] + [lab[b] for b in names], rows))
L.append("")
L.append(G.get("compat_notes", ""))
L.append("")
L.append("## 4. The best windows per scene, across all nine tracks")
L.append("")
L.append(G.get("ranking_intro", ""))
L.append("")
rows = []
for s in SCENES:
    rk = ranking[s]
    rows.append([SCENE_NAMES[s]] + [f"{w['label']} {mmss(w['start_s'])}-{mmss(w['end_s'])} ({w['score']})" for w in rk[:5]])
L.append(md_table(["Scene", "1st", "2nd", "3rd", "4th", "5th"], rows))
L.append("")
L.append(G.get("ranking_notes", ""))
L.append("")
L.append("## 5. Files")
L.append("")
L.append(G.get("files", ""))
L.append("")
open(f"{W}/MUSIC_MAP.md", "w").write("\n".join(L))
print("MUSIC_MAP.md", os.path.getsize(f"{W}/MUSIC_MAP.md"), "bytes")
