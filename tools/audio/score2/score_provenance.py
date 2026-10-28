"""score2 lane: write SCORE_PROVENANCE.json for the built score (no audio is read; files are only hashed).

It records every source file's SHA-256 (the nine audition tracks, the maps, the cue sheet and its plans, the layer
sheets, the kit and every take used), every cue's in and out points (source seconds and 48 kHz samples, film seconds,
60 fps frames and film samples), every layer and duck, the masters' measurements before and after AAC, the cue-change
checks (loudness, spectral, chroma and key, the grid, clicks), the classifier's verdicts, the previews' own facts, the
licences and credits, every Mixkit file the masters use (for the person's hand download, OVERRIDES §55 CR-13), and the
code that made it.

  python3 -I tools/audio/score2/score_provenance.py .work/score2
"""
import datetime
import hashlib
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
LABELS = {"Starfire": "A1", "Convergence": "A2", "Aphelion": "A3", "BornOfTheSky": "A4", "Wildflowers": "A5",
          "MaskingTheMasters": "B1", "YourBreath": "B2", "AtomsInPeace": "B3", "TechnoFestVibes": "B4"}


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def rel(p):
    p = os.path.abspath(p)
    return os.path.relpath(p, REPO) if p.startswith(REPO) else "~/" + os.path.relpath(p, os.path.expanduser("~"))


def entry(p):
    return {"file": rel(p), "sha256": sha256(p), "bytes": os.path.getsize(p)}


def main():
    W = os.path.abspath(sys.argv[1])
    M = os.path.join(W, "master")
    cs = json.load(open(os.path.join(W, "CUE_SHEET.json")))
    mm = json.load(open(os.path.join(W, "MUSIC_MAP.json")))
    kit = {t["id"]: t for t in json.load(open(os.path.join(REPO, ".work", "sfx2", "KIT.json")))["files"]}
    out = {
        "title": "Ripples: the score's provenance (the main film and the 40-second cut)",
        "made": datetime.datetime.now().astimezone().isoformat(timespec="seconds"),
        "lane": "score2: assemble and master the score from the cue sheet; the score preview videos",
        "revision": "the Return revision (CUE_SHEET.md revision 2, 27-28 Oct 2026; OVERRIDES §61)",
        "binding": ["OVERRIDES §48-§64 (§51: the person's music direction and the Mixkit licence limits; §55 CR-13: no "
                    "scripted Mixkit access, the person downloads by hand; §60: the audio venv and the kit; §61: the "
                    "Return at the end only, 35 readable features, the person hears only finished work)",
                    "TREATMENT §3.4, §3.5, §3.8-§3.9, §3.12, §4, §5.5", "MUSIC_RESEARCH §3",
                    "TOOLS_AUDIO and TOOLS_TESTS: pre-roll crossfades that end on the incoming downbeat; no time-stretch",
                    "CUE_SHEET.json (the cue plan) and KIT.json (the sound-effect kit)"],
        "nobody_has_listened": "Every join, level and layer here is measured and looked at, not heard (OVERRIDES §61: "
                               "every ears check is decided by measurement). The person's ears are the first.",
    }
    try:
        commit = subprocess.run(["/usr/bin/git", "-C", REPO, "rev-parse", "HEAD"], capture_output=True, text=True).stdout.strip()
        branch = subprocess.run(["/usr/bin/git", "-C", REPO, "branch", "--show-current"], capture_output=True, text=True).stdout.strip()
    except Exception:  # noqa: BLE001
        commit, branch = None, None
    out["code"] = {"branch": branch, "head": commit, "pushed": False,
                   "files": [entry(os.path.join(HERE, f)) for f in ("score_layers.py", "score_build.py", "score_strips.py",
                                                                     "score_preview.py", "score_readme.py",
                                                                     "score_provenance.py", "score_common.py",
                                                                     "cue_plan.py", "revise_measure.py")]}
    # ---------------------------------------------------------------- inputs
    aud = os.path.join(REPO, ".work", "music-audition")
    used = {}
    films = {}
    for film in ("main", "x40"):
        bpath = os.path.join(M, f"{film}.build.json")
        if not os.path.exists(bpath):
            continue
        b = json.load(open(bpath))
        films[film] = b
        for tr in b["tracks"]:
            used.setdefault(tr, []).append(film)
    meta = mm.get("tracks", {}) if isinstance(mm.get("tracks"), dict) else {}
    music = []
    for name in sorted(LABELS, key=lambda k: LABELS[k]):
        p = os.path.join(aud, name + ".mp3")
        if not os.path.exists(p):
            continue
        e = entry(p)
        fam = "A" if LABELS[name].startswith("A") else "B"
        e.update(label=LABELS[name], track=name, used_in=used.get(name, []),
                 licence="CC BY 4.0 (Scott Buckley)" if fam == "A" else "Mixkit Stock Music Free License",
                 credit_required=fam == "A")
        lm = os.path.join(aud, name + ".loudmap.txt")
        if os.path.exists(lm):
            e["loudmap"] = entry(lm)
        mp = os.path.join(W, "maps", name + ".map.json")
        if os.path.exists(mp):
            e["map"] = entry(mp)
        if name in meta:
            e["title"] = meta[name].get("title")
            e["artist"] = meta[name].get("artist")
            e["sha256_matches_music_map"] = e["sha256"] == meta[name].get("sha256")
        music.append(e)
    out["inputs"] = {
        "cue_sheet": [entry(os.path.join(W, f)) for f in ("CUE_SHEET.json", "CUE_SHEET.md", "BEAT_SHEET.json",
                                                           "MUSIC_MAP.json", "cuesheet/plan_main.json",
                                                           "cuesheet/plan_x40.json", "cuesheet/main.metrics.json",
                                                           "cuesheet/x40.metrics.json")],
        "layer_sheets": [entry(os.path.join(M, f)) for f in ("layers_main.json", "layers_x40.json", "beat_offsets.json")],
        "music": music,
        "sfx_kit": {"manifest": [entry(os.path.join(REPO, ".work", "sfx2", f)) for f in ("KIT.json", "kit_plan.json")],
                    "takes": []},
    }
    takes = {}
    for film, b in films.items():
        for L in b["layers"]:
            key = L.get("take") or L.get("designed") or L.get("swell")
            if L.get("designed"):  # one recipe, several tunings: each tuning is its own entry
                key = f"{L['designed']} {json.dumps(L.get('params'), sort_keys=True)}"
            if L.get("tail_swell"):  # a take's room tail made into a swell is not the take itself
                key = f"{L['take']} (reverse swell from its room tail, {L['tail_swell']['tuned_semitones']:+g} st)"
            key = key if isinstance(key, str) else json.dumps(key, sort_keys=True)
            t = takes.setdefault(key, {"take": key, "used_by": []})
            t["used_by"].append(f"{film}:{L['id']}")
            if L.get("take"):
                k = kit[L["take"]]
                src = k["source"]
                t.update(file=L["file"], sha256=L["sha256"], licence=k["licence"], status=k["status"],
                         final_allowed=k["final_allowed"], source_page=src.get("source_page") or
                         (src.get("from_source") or {}).get("source_page"),
                         source_title=src.get("title"), mixkit_item_id=src.get("item_id"),
                         source_file=src.get("file") or src.get("key") or (src.get("from_source") or {}).get("file"),
                         made_as=("a reverse swell from its room tail" if L.get("tail_swell") else None))
            else:
                t.update(licence=L.get("licence"), status=L.get("status"), final_allowed=L.get("final_allowed"),
                         made=L.get("params") or L.get("swell"))
    out["inputs"]["sfx_kit"]["takes"] = list(takes.values())
    # ---------------------------------------------------------------- films
    out["films"] = {}
    for film, b in films.items():
        f = cs["main_film"] if film == "main" else cs["cut_40s"]
        plan = json.load(open(os.path.join(W, "cuesheet", f"plan_{film}.json")))
        cues = []
        for c in plan["cues"]:
            csc = next(x for x in f["cues"] if x["id"] == c["id"])
            lay = b["cues"][c["id"]]
            cues.append({
                "id": c["id"], "name": c["name"], "track": f"{LABELS[c['track']]} {csc['track']['title']}",
                "artist": csc["track"]["artist"], "licence": csc["track"]["licence"],
                "source_in_s_cue_sheet": c["src_in"], "source_out_s_cue_sheet": c["src_out"],
                "source_time_correction_s": lay["src_correction_s"],
                "source_in_s_as_built": lay["src_in_s"], "source_out_s_as_built": lay["src_out_s"],
                "source_in_sample_48k_as_built": lay["src_in_sample_48k"],
                "source_in_nearest_measured_downbeat_ms": csc["source"]["in_nearest_measured_downbeat_ms"],
                "source_out_nearest_measured_downbeat_ms": csc["source"]["out_nearest_measured_downbeat_ms"],
                "film_in_s": c["film_in"], "film_in_frame_60fps": round(c["film_in"] * 60),
                "film_in_sample": lay["film_in_sample"], "film_out_s": csc["film"]["out_s"],
                "film_out_frame_60fps": csc["film"]["out_frame"], "audio_film_samples": lay["film_samples"],
                "audio_film_s": lay["film_s"], "offset_samples_film_minus_source": lay["offset_samples_film_minus_src"],
                "head": c["head"], "tail": c["tail"], "gain_db_points_film_s": c["gain_db"],
                "eq": b["eq"].get(c["id"], []), "time_stretch": "none"})
        out["films"][film] = {
            "length_s": b["film_length_s"], "samples": b["samples"], "sample_rate": b["sr"],
            "plan": {"file": b["plan"], "sha256": b["plan_sha256"]},
            "layers_sheet": {"file": b["layers"], "sha256": b["layers_sha256"]},
            "cues": cues,
            "seams": b["seams"],
            "layers": b["layers"], "ducks": b["ducks"],
            "bed": b["bed"], "blocks_web": b["blocks_web"],
            "masters": {k: {kk: v for kk, v in m.items() if kk != "iterations"} | {"iterations": m["iterations"]}
                        for k, m in b["masters"].items()},
            "translation": b["translation"],
            "edges": {k: v for k, v in b["edges"].items() if k != "all"},
            "onsets_vs_beats": b["onsets_vs_beats"],
            "classifier": {k: {kk: v for kk, v in c.items() if kk != "timeline_main"} for k, c in b["classifier"].items()},
            "pictures": [rel(os.path.join(M, f"{film}{s}")) for s in ("-overview.png", "-seams.png")],
            "build": {"secs": b["secs"], "peak_rss_mb": b["peak_rss_mb"], "versions": b["versions"],
                      "record": rel(os.path.join(M, f"{film}.build.json"))},
        }
        chk = os.path.join(M, f"{film}.preview.json")
        if os.path.exists(chk):
            out["films"][film]["preview"] = json.load(open(chk))
            out["films"][film]["preview"]["out"] = rel(out["films"][film]["preview"]["out"])
    readme = os.path.join(W, "preview", "README.txt")
    if os.path.exists(readme):
        out["readme"] = entry(readme)
    # ---------------------------------------------------------------- licences and credits
    def spans(film, track):
        """Each cue's audio of one track in source seconds (its film extent less the cue's whole-sample offset)."""
        bb = films.get(film)
        if not bb:
            return []
        f = cs["main_film"] if film == "main" else cs["cut_40s"]
        res = []
        for c in f["cues"]:
            lay = bb["cues"].get(c["id"])
            if lay is None or c["track"]["file"].split("/")[-1] != track + ".mp3":
                continue
            i0, i1 = lay["film_samples"]
            k = lay["offset_samples_film_minus_src"]
            res.append({"cue": c["id"], "source_s": [round((i0 - k) / bb["sr"], 4), round((i1 - k) / bb["sr"], 4)],
                        "film_s": lay["film_s"]})
        return res
    mix_music = {}
    for name in ("YourBreath", "TechnoFestVibes"):
        mix_music[name] = {film: spans(film, name) for film in films}
    order_ok = {}
    for name, per in mix_music.items():
        for film, sp in per.items():
            src = sorted(x["source_s"] for x in sp)
            film_order = [x["source_s"] for x in sorted(sp, key=lambda x: x["film_s"][0])]
            order_ok[f"{film}:{name}"] = {
                "in_the_track's_own_order": film_order == src,
                "overlapping_in_source": any(src[i][1] > src[i + 1][0] + 1e-6 for i in range(len(src) - 1))}
    checks = {c["check"]: c for c in cs.get("checks", [])}
    overl = [c["detail"] for k, c in checks.items() if "overlaps other music" in k]
    out["licences"] = {
        "scott_buckley": {"licence": "CC BY 4.0", "url": "https://creativecommons.org/licenses/by/4.0/",
                          "tracks": ["A4 Born Of The Sky (M1, M6a, M6b)", "A1 Starfire (M4)"],
                          "edits": "excerpts with gain; M6a's dip; F4's splice inside the held IV chord; the reverse "
                                   "swell made from its own title chord (all edits: the credit says '(edited)')",
                          "credit_lines": cs["credits"]["main"],
                          "rules": ["credit in every video description, the end card's credits page and the captions",
                                    "never submit to Content ID or any fingerprinting service"]},
        "mixkit_music": {"licence": "Mixkit Stock Music Free License", "url": "https://mixkit.co/license/modal/musicFree/",
                         "licence_snapshot": ".work/audio/web/req2-license_modal_musicFree.html (OVERRIDES §60)",
                         "tracks": ["B2 Your Breath (M2a, M2b, M5; X1, X2)", "B4 Techno Fest Vibes (M3a, M3b; X3)"],
                         "excerpts_as_built": mix_music, "order_checks": order_ok,
                         "overlap_with_other_music": overl,
                         "rules_kept": ["each cue is an edited excerpt in its own order: trimmed, faded, shortened at bar lines",
                                        "never re-arranged: every B2 and B4 excerpt plays in the track's own order and "
                                        "none overlaps another in source time (order_checks)",
                                        "layered with other music only inside a short, standard cue transition (60 ms "
                                        "pre-rolls, J4's 1.0 s crossfade, B4's ring-out under the Dusk pad's fade-in)",
                                        "the masters contain Mixkit music, so they stay in .work/score2/master as "
                                        "working files for muxing; no music-only file is delivered; the score previews "
                                        "are VIDEO with cue labels",
                                        "never registered with Content ID; not for broadcast"],
                         "credit": "none needed"},
        "mixkit_sfx": {"licence": "Mixkit Sound Effects Free License", "url": "https://mixkit.co/license/modal/sfxFree/",
                       "note": "the temp hits, the stand-in plunk and the whooshes; never redistributed on their own, "
                               "never Pebble's sonic logo; the three grand hits' finals are Sonniss or the person's "
                               "recordings (TREATMENT §4.6), not Mixkit"},
        "kenney": {"licence": "CC0 1.0", "note": "the UI ticks, the name's soft hit, the stone tap (stand-in), the "
                                                 "title's temp hit and the 40-s cut's XJ2 swell (from a take's room tail)"},
        "designed": {"licence": "made here from code (sub glides, room tone)"},
        "tools": {"pedalboard": "GPL-3.0, run as a tool (limiter, reverb, pitch), never shipped",
                  "pyloudnorm": "MIT", "soxr": "LGPL-2.1", "librosa": "ISC", "ffmpeg": "LGPL/GPL build (Homebrew)",
                  "Pillow": "MIT-CMU", "Apple SoundAnalysis (sound_tags)": "the system's classifier, read only"},
    }
    # every Mixkit file the masters use, for the person's hand download before the final masters (§55 CR-13)
    hand = []
    for e in music:
        if e["label"] in ("B2", "B4") and e["used_in"]:
            hand.append({"kind": "music", "label": e["label"], "title": e.get("title"), "artist": e.get("artist"),
                         "audition_copy": e["file"], "audition_sha256": e["sha256"], "used_in": e["used_in"],
                         "licence": "Mixkit Stock Music Free License"})
    for t in out["inputs"]["sfx_kit"]["takes"]:
        if str(t.get("licence", "")).startswith("mixkit"):
            hand.append({"kind": "sound effect", "take": t["take"], "mixkit_item_id": t.get("mixkit_item_id"),
                         "title": t.get("source_title"), "listed_on": t.get("source_page"), "kit_file": t.get("file"),
                         "kit_sha256": t.get("sha256"), "status": t.get("status"), "final_allowed": t.get("final_allowed"),
                         "used_by": t["used_by"]})
    out["mixkit_files_for_hand_download"] = {
        "why": "OVERRIDES §55 CR-13 and §60: every Mixkit file here was fetched by script on 26 Oct, and Mixkit's User "
               "Terms §9 forbid scripts or bots; the person downloads each one the final masters use by hand from its "
               "own page (the lead prepares the list). Nothing here was downloaded by this lane.",
        "files": hand,
        "then": "put each hand-downloaded file beside its script-fetched copy and compare SHA-256. Where every hash "
                "matches, the working masters stand bit for bit; otherwise rebuild with the same commands "
                "(score_layers.py, score_build.py, then the strips, previews and this file) and compare the records."}
    out["working_masters"] = {
        "status": "WORKING masters: built from the audition copies (the script-fetched Mixkit music of 26 Oct 18:29 "
                  "and the kit's script-fetched Mixkit takes), for muxing and the previews only; the final masters wait "
                  "for the person's hand downloads (mixkit_files_for_hand_download) and the final hits (Sonniss or the "
                  "person's recordings, P9)",
        "files": {film: [m["file"] for m in b["masters"].values()] for film, b in films.items()},
        "never": "a music-only file delivered; any copy outside .work/score2; any upload"}
    out["credits"] = {"main": cs["credits"]["main"], "x40": cs["credits"]["x40"],
                      "sound_effects": "Sound effects are the film's; Pebble plays none of them."}
    cl = os.path.join(M, "cleanup.json")
    if os.path.exists(cl):
        out["cleanup"] = json.load(open(cl))
    json.dump(out, open(os.path.join(W, "SCORE_PROVENANCE.json"), "w"), indent=1, ensure_ascii=False)
    print("ok", rel(os.path.join(W, "SCORE_PROVENANCE.json")))


if __name__ == "__main__":
    main()
