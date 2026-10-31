"""reel music lane: build the Pebble 2.0 launch reel's score from reel_plan.py, master it, check it, and write its beat
map, the 15-second style test and a build record.

Editing only (the person's rule: never synthesise music in code): each segment is an excerpt of a human-made track,
laid at a whole-sample offset (no time-stretch, no pitch change), with fades, gain and equal-power pre-roll crossfades
that end on the incoming downbeat; the rival beat is true digital silence. The masters are one gain and pedalboard's
true-peak brickwall limiter (score2/score_build.py's master(), reused unchanged), iterated onto the target loudness,
then checked after an AAC encode with FFmpeg's native encoder without PNS ('-aac_pns 0') at the delivery bitrates: the
ceiling is lowered by any excess until the decoded true peak is at or under the gate.

  scripts/heavy.sh reel-score /usr/sbin/taskpolicy -c utility \
      .work/tools-eval/tools-tests/audio-venv/bin/python -I tools/audio/reel/reel_score.py .work/reel/music

Writes (OUT_DIR): reel-score.wav (the social master, -14 LUFS), reel-score.web.wav (-16 LUFS), reel.beatmap.json,
style-test.wav (reel 3.0-18.0 from the social master), style-test.beatmap.json and reel-score.build.json. WAVs are
48 kHz 24-bit stereo, working files in .work only: never committed.
"""
import datetime
import json
import os
import subprocess
import sys
import tempfile

import numpy as np
import soundfile as sf
import soxr

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
sys.path.insert(0, HERE)
sys.path.insert(1, os.path.join(REPO, "tools", "audio", "score2"))
import reel_plan as P  # noqa: E402
import score_build as sb  # noqa: E402  the score lane's loudness, true-peak, limiter, master and AAC helpers

SR = sb.SR  # 48 kHz
FFMPEG = sb.FFMPEG
r = sb.r


def path(p):
    return os.path.join(REPO, p)


def decode(name):
    t = P.TRACKS[name]
    y, sr = sf.read(path(t["file"]), dtype="float32", always_2d=True)
    y = sb.stereo(y)
    if sr != SR:
        y = soxr.resample(y, sr, SR, quality="HQ").astype(np.float32)
    return y, {"file": t["file"], "sha256": sb.sha256(path(t["file"])), "sr_in": sr, "seconds": r(len(y) / SR, 3)}


def fade(t, w, rising):
    """Gain over reel times t for a fade window w = [a, b, shape]: 0 -> 1 when rising, 1 -> 0 when falling."""
    a, b, shape = w
    x = np.clip((t - a) / max(b - a, 1e-9), 0.0, 1.0)
    if not rising:
        x = 1.0 - x
    if shape == "eqp":
        return np.sin(0.5 * np.pi * x)
    return 0.5 - 0.5 * np.cos(np.pi * x)


def find_attack(y, t_grid, before=0.06, after=0.03):
    """The first sample of a hit near t_grid (source seconds): the 1 ms RMS envelope's steepest rise within
    [t_grid - before, t_grid + after], walked back to where it starts rising (10 % of the jump)."""
    a, b = int((t_grid - before) * SR), int((t_grid + after) * SR)
    x = np.abs(y[a:b]).max(1).astype(np.float64)
    w = int(0.001 * SR)
    env = np.sqrt(np.convolve(x ** 2, np.ones(w) / w, mode="same"))
    d = np.diff(env)
    k = int(np.argmax(np.convolve(d, np.ones(w), mode="same")))
    lo = env[max(0, k - 5 * w):k].min() if k > 0 else env[0]
    hi = env[k:k + 5 * w].max()
    thr = lo + 0.1 * (hi - lo)
    j = k
    while j > 0 and env[j] > thr:
        j -= 1
    return (a + j) / SR, {"pre_level_db": r(20 * np.log10(lo + 1e-12)), "post_level_db": r(20 * np.log10(hi + 1e-12))}


def nearest(xs, t):
    xs = np.asarray(xs)
    return float(xs[int(np.argmin(np.abs(xs - t)))])


def attack_offsets(y, beats, spans):
    """Where a track's audible attacks sit against its map's beats (score2/beat_offsets.py's method, on the spans the
    reel uses): the strongest spectral-flux peak within +-60 ms of each beat, skipping beats with no clear attack. A
    correction (the median) is applied only when the evidence is tight: 16 beats or more, an interquartile range of
    one 60 fps frame or less, and a median of 5 ms or more."""
    mono = y.mean(1).astype(np.float64)
    beats = np.asarray(beats)
    f = []
    for a, b in spans:
        sel = beats[(beats >= a) & (beats <= b)]
        i0, i1 = max(0, int((a - 1.5) * SR)), min(len(mono), int((b + 1.5) * SR))
        tt, on = sb.onset_env(mono[i0:i1].astype(np.float32))
        tt = tt + i0 / SR
        for bt in sel:
            w, ctx = np.abs(tt - bt) <= 0.060, np.abs(tt - bt) <= 0.25
            if w.sum() < 5 or on[w].max() < 2 * np.median(on[ctx]):
                continue
            f.append(float(tt[w][np.argmax(on[w])] - bt) * 1000)
    f = np.array(f)
    out = {"spans_source_s": spans, "beats_with_clear_attack": int(len(f))}
    if len(f):
        q1, med, q3 = np.percentile(f, [25, 50, 75])
        # the score lane's rule asks for an IQR of 6 ms; the reel's picture is cut on 60 fps frames (16.7 ms), so an
        # IQR under one frame is tight enough here (the drop section's drums: 22 clear beats, IQR -44 to -32 ms)
        tight = len(f) >= 16 and (q3 - q1) <= 1000.0 / P.FPS and abs(med) >= 5.0
        out.update(flux_median_ms=r(med, 1), flux_iqr_ms=[r(q1, 1), r(q3, 1)],
                   correction_s=round(float(med) / 1000, 4) if tight else 0.0, applied=bool(tight))
    return out


def build_bed(maps, audio):
    # measured where the drums are clear (V1: bars 37-46); V2's peak is sustained orchestra with few clear attacks, on
    # the same constant grid, so it takes V1's correction; V3 is placed by its own measured attack
    corrections = {"Vanguard": attack_offsets(audio["Vanguard"], maps["Vanguard"]["beats_s"], [(67.2, 84.35)])}
    build_bed.corrections = corrections
    n = int(round(P.END * SR))
    bed = np.zeros((n, 2), dtype=np.float32)
    recs, spans = [], {}
    for s in P.SEGMENTS:
        s = dict(s)
        y = audio[s["track"]]
        anchor = s["anchor"]
        rec = {"id": s["id"], "track": s["track"], "why": s["why"]}
        if s.get("anchor_snap") == "downbeat":
            snapped = nearest(maps[s["track"]]["downbeats_s"], anchor)
            delta = snapped - anchor
            rec["anchor_snapped_by_s"] = r(delta, 4)
            anchor = snapped
            if s["src_from"] is not None:
                s["src_from"] += delta
            s["src_to"] += delta
        corr = 0.0 if s["in"] == "attack" else corrections.get(s["track"], {}).get("correction_s", 0.0)
        if s["in"] == "attack":  # the slam: its measured first sample lands on the grid time 'at'
            att, info = find_attack(y, anchor)
            rec["attack"] = {"source_s": r(att, 4), "map_downbeat_s": anchor, "vs_map_ms": r((att - anchor) * 1000, 1),
                             **info}
            rec["attack_correction_s"] = round(att - anchor, 4)  # the beat map maps the tag's beats by its attack
            anchor = att
            s["src_from"] = att - 0.008
        if corr:  # the track's audible attacks sit corr s from its map's beats: move the source, keep the reel times
            anchor += corr
            if s["src_from"] is not None:
                s["src_from"] += corr
            s["src_to"] += corr
            rec["attack_correction_s"] = corr
        rec["map_anchor_s"] = round(anchor - corr - (rec.get("attack_correction_s", 0.0) if s["in"] == "attack" else 0),
                                    4)  # the map's own beat that lands on 'at' (corrections move the audio, not this)
        k = int(round((s["at"] - anchor) * SR))  # reel sample = source sample + k
        if s["in"] == "attack":
            fin = [s["src_from"] + k / SR, s["src_from"] + k / SR + 0.002, "cos"]
            rec["attack"]["reel_s"] = r(rec["attack"]["source_s"] + k / SR, 4)
        else:
            fin = s["in"]
        i0 = max(0, int(round(s["src_from"] * SR)) + k)
        i1 = min(n, int(round(s["src_to"] * SR)) + k)
        idx = np.arange(i0, i1)
        t = idx / SR
        g = fade(t, fin, True) * fade(t, s["out"], False) * 10 ** (s["gain_db"] / 20)
        bed[i0:i1] += y[idx - k] * g[:, None].astype(np.float32)
        spans[s["id"]] = (i0, i1)
        rec.update({"anchor_source_s": r(anchor, 4), "anchor_reel_s": s["at"],
                    "offset_samples_reel_minus_source": k, "source_s": [r((i0 - k) / SR, 4), r((i1 - k) / SR, 4)],
                    "reel_s": [r(i0 / SR, 4), r(i1 / SR, 4)], "gain_db": s["gain_db"],
                    "fade_in": [r(fin[0], 4), r(fin[1], 4), fin[2]], "fade_out": s["out"]})
        recs.append(rec)
    # the rival beat: true zeros between V2's end and V3's start
    a = int(round(P.SILENCE["from"] * SR))
    b = spans["V3"][0]
    bed[a:b] = 0.0
    sil = {"from_s": r(a / SR, 4), "to_s": r(b / SR, 4), "samples": int(b - a), "seconds": r((b - a) / SR, 4)}
    return bed, recs, sil


# ------------------------------------------------------------------------------------------------ the beat map
def frame(t):
    return int(round(t * P.FPS))


def beatmap(maps, recs, sil, attack_reel):
    """Every beat and downbeat the reel's music plays, from each track's own measured grid mapped through its segment's
    offset; the silent bar's beats continue the grid (flagged silent); the hits, the drop, the splices and the
    silence's edges; the named sections."""
    seg = {x["id"]: x for x in recs}
    beats = []

    def add(track, sid, lo, hi, kind):
        m = maps[track]
        at, ma = seg[sid]["anchor_reel_s"], seg[sid]["map_anchor_s"]  # exact: the audio is placed so that the map's
        dbs = set(round(x, 4) for x in m["downbeats_s"])                # beat ma (its audible attack) sounds at 'at'
        for bt in m["beats_s"]:
            rt = at + (bt - ma)
            if lo - 0.001 <= rt < hi - 0.001:
                beats.append({"t": r(rt, 4), "track": track, "source_s": r(bt, 4),
                              "downbeat": round(bt, 4) in dbs, "kind": kind})

    add("Starfire", "T1", 0.0, P.VAN_IN, "pad (weak pulse, 80 bpm)")
    add("Vanguard", "V1", P.VAN_IN, P.SPLICE, "driving")
    add("Vanguard", "V2", P.SPLICE, P.STOP, "driving")
    t = P.STOP
    while t < P.SLAM - 1e-6:  # the silent bar keeps the grid
        beats.append({"t": r(t, 4), "track": None, "source_s": None, "downbeat": abs(t - P.STOP) < 1e-6,
                      "kind": "silent (grid continues)"})
        t += P.BEAT
    add("Vanguard", "V3", P.SLAM, P.LOGO + P.BEAT, "driving (the tag's swell)")
    add("Vanguard", "V3", P.LOGO + P.BEAT, P.TEASE, "ring-out (no pulse)")
    add("BornOfTheSky", "Z1", P.TEASE, P.END, "pad (weak pulse, 120 bpm)")
    beats.sort(key=lambda b: b["t"])
    bar, pos = 0, 0
    for b in beats:
        if b["downbeat"]:
            bar += 1
            pos = 1
        else:
            pos += 1
        b["bar"], b["beat_in_bar"], b["frame"] = bar, pos, frame(b["t"])
    downs = [b for b in beats if b["downbeat"]]
    bars = []
    for i, d in enumerate(downs):
        end = downs[i + 1]["t"] if i + 1 < len(downs) else P.END
        bars.append({"bar": d["bar"], "from_s": d["t"], "to_s": r(end, 4), "from_frame": d["frame"],
                     "to_frame": frame(end), "beats": sum(1 for b in beats if d["t"] <= b["t"] < end - 1e-6),
                     "track": d["track"], "kind": d["kind"]})
    hits = [
        {"name": "vanguard_in", "t": P.VAN_IN, "what": "Vanguard's build enters (bar 37), Starfire gone"},
        {"name": "suck_back", "t": P.VAN_IN + 4 * P.BEAT, "what": "bar 38: the music sucks back (filter-down, "
         "quietest at about 8.0 s)"},
        {"name": "pickup", "t": P.DROP - 2 * P.BEAT, "what": "the 2-beat pickup into the drop"},
        {"name": "DROP", "t": P.DROP, "what": "the drop: the reveal (B major, +9 LU)"},
        {"name": "splice_lift", "t": P.SPLICE, "what": "the montage lifts into the peak (+2 LU), seamless"},
        {"name": "music_stops", "t": sil["from_s"], "what": "the music stops dead: the rival beat"},
        {"name": "anyway_window", "t": r(P.STOP + 2 * P.BEAT, 4), "what": "'Anyway.' fits beats 3-4 of the silent "
         "bar (36.9-37.7)"},
        {"name": "SLAM", "t": attack_reel, "what": "the slam back in (the tag's first hit), on the downbeat"},
        {"name": "LOGO", "t": P.LOGO, "what": "the final chord: the logo"},
        {"name": "tease_in", "t": P.TEASE, "what": "the tease: a soft B-major pad under the ring-out"},
        {"name": "end", "t": P.END, "what": "the score ends (silence from about 49.95)"},
    ]
    for h in hits:
        h["t"] = r(h["t"], 4)
        h["frame"] = frame(h["t"])
    sections = [{"name": n, "from_s": r(a, 4), "to_s": r(b, 4), "from_frame": frame(a), "to_frame": frame(b)}
                for n, a, b in P.SECTIONS]
    return {"beats": beats, "downbeats": [{k: d[k] for k in ("t", "frame", "bar", "track")} for d in downs],
            "bars": bars, "hits": hits, "sections": sections,
            "silence": {**sil, "from_frame": frame(sil["from_s"]), "to_frame": frame(sil["to_s"]),
                        "note": "true digital silence in the masters (all-zero samples)"}}


def excerpt_map(bm, a, b, name):
    """The beat map of the excerpt [a, b) of the reel, in excerpt seconds and frames (reel times kept beside them)."""
    def sh(x):
        return {**x, "reel_t": x["t"], "t": r(x["t"] - a, 4), "frame": frame(x["t"] - a), "reel_frame": x["frame"]}
    out = {"beats": [sh(x) for x in bm["beats"] if a <= x["t"] < b],
           "downbeats": [sh(x) for x in bm["downbeats"] if a <= x["t"] < b],
           "hits": [sh(x) for x in bm["hits"] if a <= x["t"] < b]}
    out["bars"] = [{**x, "reel_from_s": x["from_s"], "from_s": r(max(x["from_s"], a) - a, 4),
                    "to_s": r(min(x["to_s"], b) - a, 4), "from_frame": frame(max(x["from_s"], a) - a),
                    "to_frame": frame(min(x["to_s"], b) - a), "partial": x["from_s"] < a or x["to_s"] > b}
                   for x in bm["bars"] if x["to_s"] > a and x["from_s"] < b]
    out["sections"] = [{"name": x["name"], "from_s": r(max(x["from_s"], a) - a, 4), "to_s": r(min(x["to_s"], b) - a, 4),
                        "from_frame": frame(max(x["from_s"], a) - a), "to_frame": frame(min(x["to_s"], b) - a)}
                       for x in bm["sections"] if x["to_s"] > a and x["from_s"] < b]
    return out


# ------------------------------------------------------------------------------------------------ checks
def onset_check(y, times):
    """For each planned beat time, the strongest spectral-flux peak (score_build.onset_env) within +-60 ms, kept only
    where the beat has a clear attack (a peak at least twice the median of the 0.5 s around it): how far the audible
    attacks in the master sit from the beat map (ms; negative = before). Pads and sustained chords give none."""
    tt, on = sb.onset_env(y.mean(1).astype(np.float32))
    out = []
    for t in times:
        w, ctx = np.abs(tt - t) <= 0.060, np.abs(tt - t) <= 0.25
        if w.sum() < 5 or on[w].max() < 2 * np.median(on[ctx]):
            continue
        out.append(float(tt[w][np.argmax(on[w])] - t) * 1000)
    out = np.array(out)
    q1, med, q3 = np.percentile(out, [25, 50, 75]) if len(out) else (None, None, None)
    return {"beats": len(times), "clear_attacks": int(len(out)), "median_ms": r(med, 1),
            "iqr_ms": [r(q1, 1), r(q3, 1)]}


def hit_at(y, t):
    """The first sample of the hit nearest t in the master (find_attack's method), in reel seconds."""
    att, info = find_attack(y, t, before=0.08, after=0.06)
    return {"planned_s": t, "attack_s": r(att, 4), "vs_plan_ms": r((att - t) * 1000, 1), **info}


def st_curve(y, step=0.5):
    """Short-term loudness (3 s windows) every step seconds: a coarse arc for the record."""
    out = []
    for t in np.arange(0.0, len(y) / SR, step):
        a, b = max(0.0, t - 1.5), min(len(y) / SR, t + 1.5)
        out.append([r(t, 1), r(sb.lufs_seg(y, a, b), 1)])
    return out


def aac_tp(wav, kbps):
    args = ["-c:a", "aac", "-aac_pns", "0"]
    m = sb.aac_meter(sb.aac_encode(wav, args, kbps))
    return {"encoder": " ".join(args) + f" -b:a {kbps}k", **m}


def master_one(bed, spec, out_wav, tmp):
    ceiling = spec["ceiling_dbtp"]
    tries = []
    for _ in range(6):
        y, rec, _gr = sb.master(bed, spec["target_lufs"], ceiling, 100.0)
        y[np.all(bed == 0, axis=1)] = 0.0  # keep the rival beat's true zeros exactly zero (the limiter keeps them)
        t = os.path.join(tmp, "m.wav")
        sf.write(t, y, SR, subtype="PCM_24")
        a = aac_tp(t, spec["aac_kbps"])
        tries.append({"ceiling_dbtp": ceiling, "integrated_lufs": r(sb.integrated_lufs(y), 2),
                      "true_peak_dbtp": r(sb.true_peak_db(y), 2), "aac": a})
        if a["true_peak_dbtp"] <= spec["gate_dbtp"] and abs(a["integrated_lufs"] - spec["target_lufs"]) <= 0.5:
            break
        ceiling = round(ceiling - max(0.2, a["true_peak_dbtp"] - spec["gate_dbtp"] + 0.1), 2)
    sf.write(out_wav, y, SR, subtype="PCM_24")
    return y, {"file": sb.rel(out_wav), **spec, "final_ceiling_dbtp": ceiling, "tries": tries, "master": rec,
               "pass": tries[-1]["aac"]["true_peak_dbtp"] <= spec["gate_dbtp"]}


def main():
    out_dir = path(sys.argv[1]) if len(sys.argv) > 1 else path(".work/reel/music")
    os.makedirs(out_dir, exist_ok=True)
    maps = {k: json.load(open(path(v["map"]))) for k, v in P.TRACKS.items()}
    audio, inputs = {}, {}
    for k in P.TRACKS:
        audio[k], inputs[k] = decode(k)
    bed, recs, sil = build_bed(maps, audio)
    att = next(x for x in recs if x["id"] == "V3")["attack"]["reel_s"]
    record = {"made": datetime.datetime.now().astimezone().isoformat(timespec="seconds"),
              "what": "the Pebble 2.0 launch reel's score: edited from three Scott Buckley tracks (CC BY 4.0), no "
                      "synthesis, no time-stretch, no added effects", "inputs": inputs, "segments": recs,
              "attack_corrections": build_bed.corrections, "silence": sil, "bed": {"integrated_lufs": r(sb.integrated_lufs(bed), 2),
                                      "true_peak_dbtp": r(sb.true_peak_db(bed), 2)}}
    with tempfile.TemporaryDirectory() as tmp:
        social, record["social"] = master_one(bed, P.MASTERS["social"], os.path.join(out_dir, "reel-score.wav"), tmp)
        _web, record["web"] = master_one(bed, P.MASTERS["web"], os.path.join(out_dir, "reel-score.web.wav"), tmp)
        bm = beatmap(maps, recs, sil, att)
        drive = [b["t"] for b in bm["beats"] if b["kind"].startswith("driving")]
        record["checks"] = {
            "duration_s": r(len(social) / SR, 4),
            "silence_is_true_zero": bool(np.all(social[int(round(sil["from_s"] * SR)) + 1:
                                                       int(round(sil["to_s"] * SR))] == 0)),
            "attacks_vs_beat_map": onset_check(social, drive),
            "hits": {"drop": hit_at(social, P.DROP), "splice": hit_at(social, P.SPLICE), "slam": hit_at(social, P.SLAM),
                     "logo": hit_at(social, P.LOGO)},
            "drop_step_lu": r(sb.lufs_seg(social, P.DROP, P.DROP + 0.4) - sb.lufs_seg(social, P.DROP - 1.2,
                                                                                         P.DROP - 0.8), 1),
            "splice_step_lu_3s": r(sb.lufs_seg(social, P.SPLICE, P.SPLICE + 3) - sb.lufs_seg(social, P.SPLICE - 3,
                                                                                          P.SPLICE), 1),
            "short_term_arc": st_curve(social),
        }
        # the style test: an excerpt of the social master with short fades at its edges
        st = P.STYLE_TEST
        a, b = int(st["from"] * SR), int(st["to"] * SR)
        ex = social[a:b].copy()
        tt = np.arange(len(ex)) / SR
        ex *= (fade(tt, [0.0, st["fade_in"], "cos"], True) *
               fade(tt, [len(ex) / SR - st["fade_out"], len(ex) / SR, "cos"], False))[:, None].astype(np.float32)
        sw = os.path.join(out_dir, "style-test.wav")
        sf.write(sw, ex, SR, subtype="PCM_24")
        record["style_test"] = {"file": sb.rel(sw), **st, "integrated_lufs": r(sb.integrated_lufs(ex), 2),
                                "true_peak_dbtp": r(sb.true_peak_db(ex), 2), "aac": aac_tp(sw, 192)}
    head = {"fps": P.FPS, "tempo_bpm": round(60 / P.BEAT, 3), "beat_s": P.BEAT, "beat_frames": P.BEAT * P.FPS,
            "made": record["made"], "tracks": {k: {"title": v["title"], "artist": "Scott Buckley",
                                                   "licence": "CC BY 4.0"} for k, v in P.TRACKS.items()},
            "notes": ["Vanguard plays from 4.05 s to the end and is the grid: 133.33 bpm, a beat every 0.45 s = 27 "
                      "frames at 60 fps; every Vanguard beat lands on a whole frame.",
                      "The montage (9.0-36.0 s) is driving throughout: cuts can land on every beat (27 frames) or "
                      "every half beat (13.5 frames).",
                      "Before 4.5 s Starfire's pad has a weak 80 bpm pulse; after the logo the ring-out has none.",
                      "Times are the audio's; a picture cut on frame f lands on time f/60."]}
    reel_map = {**head, "file": "reel-score.wav", "duration_s": P.END, "duration_frames": frame(P.END), **bm}
    with open(os.path.join(out_dir, "reel.beatmap.json"), "w") as fh:
        json.dump(reel_map, fh, indent=1)
    ex_map = {**head, "file": "style-test.wav", "excerpt_of_reel_s": [st["from"], st["to"]],
              "duration_s": r(st["to"] - st["from"], 4), "duration_frames": frame(st["to"] - st["from"]),
              "why": st["why"], **excerpt_map(bm, st["from"], st["to"], "style-test")}
    with open(os.path.join(out_dir, "style-test.beatmap.json"), "w") as fh:
        json.dump(ex_map, fh, indent=1)
    with open(os.path.join(out_dir, "reel-score.build.json"), "w") as fh:
        json.dump(record, fh, indent=1)
    print(json.dumps({k: record[k] for k in ("silence", "bed")}, indent=None))
    for m in ("social", "web"):
        print(m, json.dumps(record[m]["tries"][-1]), "pass", record[m]["pass"])
    print("checks", json.dumps({k: v for k, v in record["checks"].items() if k != "short_term_arc"}))
    print("style test", json.dumps(record["style_test"]))
    print("corrections", json.dumps(build_bed.corrections))
    print("V3 attack", json.dumps(next(x for x in recs if x["id"] == "V3")["attack"]))


if __name__ == "__main__":
    main()
