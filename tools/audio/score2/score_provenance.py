"""score2 lane: write SCORE_PROVENANCE.json for the built score (no audio is read; files are only hashed).

It records every source file's SHA-256 (the nine audition tracks, the maps, the cue sheet and its plans, the layer
sheets, the kit and every take used), every cue's in and out points (source seconds and 48 kHz samples, film seconds,
60 fps frames and film samples), every layer and duck, the masters' measurements before and after AAC, the cue-change
checks, the classifier's verdicts, the previews' own facts, the licences and credits, and the code that made it.

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
        "binding": ["OVERRIDES §48-§52 (§51: the person's music direction and the Mixkit licence limits)",
                    "TREATMENT §3.4, §3.5, §3.8-§3.9, §3.12, §4, §5.5", "MUSIC_RESEARCH §3",
                    "TOOLS_AUDIO and TOOLS_TESTS: pre-roll crossfades that end on the incoming downbeat; no time-stretch",
                    "CUE_SHEET.json (the cue plan) and KIT.json (the sound-effect kit)"],
        "nobody_has_listened": "Every join, level and layer here is measured and looked at, not heard. The person's ears "
                               "decide.",
    }
    try:
        commit = subprocess.run(["/usr/bin/git", "-C", REPO, "rev-parse", "HEAD"], capture_output=True, text=True).stdout.strip()
        branch = subprocess.run(["/usr/bin/git", "-C", REPO, "branch", "--show-current"], capture_output=True, text=True).stdout.strip()
    except Exception:  # noqa: BLE001
        commit, branch = None, None
    out["code"] = {"branch": branch, "head": commit, "pushed": False,
                   "files": [entry(os.path.join(HERE, f)) for f in ("score_build.py", "score_strips.py", "score_preview.py",
                                                                     "score_provenance.py", "cue_plan.py")]}
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
        "cue_sheet": [entry(os.path.join(W, f)) for f in ("CUE_SHEET.json", "CUE_SHEET.md", "MUSIC_MAP.json",
                                                           "cuesheet/plan_main.json", "cuesheet/plan_x40.json")],
        "layer_sheets": [entry(os.path.join(M, f)) for f in ("layers_main.json", "layers_x40.json")],
        "music": music,
        "sfx_kit": {"manifest": [entry(os.path.join(REPO, ".work", "sfx2", f)) for f in ("KIT.json", "kit_plan.json")],
                    "takes": []},
    }
    takes = {}
    for film, b in films.items():
        for L in b["layers"]:
            key = L.get("take") or L.get("designed") or L.get("swell")
            t = takes.setdefault(key, {"take": key, "used_by": []})
            t["used_by"].append(f"{film}:{L['id']}")
            if L.get("take"):
                k = kit[L["take"]]
                t.update(file=L["file"], sha256=L["sha256"], licence=k["licence"], status=k["status"],
                         final_allowed=k["final_allowed"], source_page=k["source"].get("source_page"),
                         source_file=k["source"].get("file") or k["source"].get("key"))
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
                "source_in_s": c["src_in"], "source_out_s": c["src_out"],
                "source_in_sample_48k": lay["src_in_sample_48k"],
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
            "onsets_vs_mapped_beats": b["onsets_vs_mapped_beats"],
            "classifier": {k: {kk: v for kk, v in c.items() if kk != "timeline_main"} for k, c in b["classifier"].items()},
            "pictures": [rel(os.path.join(M, f"{film}{s}")) for s in ("-overview.png", "-seams.png")],
            "build": {"secs": b["secs"], "peak_rss_mb": b["peak_rss_mb"], "versions": b["versions"],
                      "record": rel(os.path.join(M, f"{film}.build.json"))},
        }
        chk = os.path.join(M, f"{film}.preview.json")
        if os.path.exists(chk):
            out["films"][film]["preview"] = json.load(open(chk))
            out["films"][film]["preview"]["out"] = rel(out["films"][film]["preview"]["out"])
    readme = os.path.expanduser("~/Desktop/Pebble 2.0 film/score-preview/README.txt")
    if os.path.exists(readme):
        out["readme"] = entry(readme)
    # ---------------------------------------------------------------- licences and credits
    out["licences"] = {
        "scott_buckley": {"licence": "CC BY 4.0", "url": "https://creativecommons.org/licenses/by/4.0/",
                          "tracks": ["A4 Born Of The Sky (M1, M6)", "A1 Starfire (M4)"],
                          "edits": "plain excerpts with gain; M6's reverse swell is made from its own title chord",
                          "credit_lines": cs["credits"]["main"],
                          "rules": ["credit in every video description, the end card's small print and the captions",
                                    "never submit to Content ID or any fingerprinting service"]},
        "mixkit_music": {"licence": "Mixkit Stock Music Free License", "url": "https://mixkit.co/license/modal/musicFree/",
                         "tracks": ["B2 Your Breath (M2, M5, X1, X2)", "B4 Techno Fest Vibes (M3, X3)"],
                         "rules_kept": ["each cue is an edited excerpt in its own order: trimmed, faded, shortened at bar lines",
                                        "M2 (0:15.47-0:57.53) and M5 (1:23.53-1:36.53) are two excerpts of B2 in its own order, never overlapping",
                                        "X1 into X2 is one forward splice at bar lines (0:31.53 to 1:28.53): 'shortened at bar lines'",
                                        "layered with other music only inside a short, standard transition: 60 ms pre-rolls, the 1.0 s J4 crossfade, the 1.57 s ring-out under J3's pad",
                                        "the masters contain Mixkit music, so they stay in .work/score2/master as working files for muxing; no music-only file is delivered",
                                        "the score previews are VIDEO with cue labels",
                                        "never registered with Content ID; not for broadcast"],
                         "credit": "none needed"},
        "mixkit_sfx": {"licence": "Mixkit Sound Effects Free License", "url": "https://mixkit.co/license/modal/sfxFree/",
                       "note": "the temp hits, stand-in plunk and whooshes; never redistributed on their own, never Pebble's sonic logo"},
        "kenney": {"licence": "CC0 1.0", "note": "UI ticks and the soft name hit's body"},
        "designed": {"licence": "made here from code (sub glides, shimmer, room tone)"},
        "tools": {"pedalboard": "GPL-3.0, run as a tool (limiter, reverb, pitch), never shipped",
                  "pyloudnorm": "MIT", "soxr": "LGPL-2.1", "ffmpeg": "LGPL/GPL build (Homebrew)", "Pillow": "MIT-CMU"},
    }
    out["credits"] = {"main": cs["credits"]["main"], "x40": cs["credits"]["x40"],
                      "sound_effects": "Sound effects are the film's; Pebble plays none of them."}
    cl = os.path.join(M, "cleanup.json")
    if os.path.exists(cl):
        out["cleanup"] = json.load(open(cl))
    json.dump(out, open(os.path.join(W, "SCORE_PROVENANCE.json"), "w"), indent=1, ensure_ascii=False)
    print("ok", rel(os.path.join(W, "SCORE_PROVENANCE.json")))


if __name__ == "__main__":
    main()
