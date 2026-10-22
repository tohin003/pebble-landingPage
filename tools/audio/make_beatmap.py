"""Write a film beat map (tools/audio/beatmap.json and the alternates in tools/audio/beatmaps/) in frames.

The film timeline imports the map: every cut and layout change sits on a downbeat or beat frame from it, the reveal on
reveal.frame, and the film lasts total_frames. Frames are computed from the absolute beat index, never accumulated:
frame(beat k) = first_downbeat_frame + k * frames_per_beat, which is exact because frames_per_beat is a whole number.

Two sources:
  --score SCORE.json   a composed bed (tools/audio/compose_score.py): its form, chords and cue bars
  --edl EDL.json       a stock track fitted by tools/audio/fit_music.py (bpm after the stretch, head/splice/tail)
Usage: python -I make_beatmap.py OUT.json --bed REPO_RELATIVE_WAV (--score S.json | --edl E.json) --id ID --title T
       [--fps 30] [--reveal-bar N] [--music-json '{...}'] [--validation V.json]
"""
import argparse
import json
import math

ap = argparse.ArgumentParser()
ap.add_argument("out")
ap.add_argument("--bed", required=True, help="the bed's path relative to the repository root (never absolute)")
ap.add_argument("--score")
ap.add_argument("--edl")
ap.add_argument("--id", required=True)
ap.add_argument("--title", required=True)
ap.add_argument("--fps", type=int, default=30)
ap.add_argument("--reveal-bar", type=int)
ap.add_argument("--music-json", default="{}", help="extra source/licence fields, as JSON")
ap.add_argument("--validation")
a = ap.parse_args()
fps = a.fps
assert not a.bed.startswith("/"), "--bed must be repository-relative"

if a.score:
    s = json.load(open(a.score))
    bpm, n_bars = float(s["bpm"]), int(s["bars"])
    first_s = 0.0
    sections = [(x["name"], x["first_bar"], x["last_bar"]) for x in s["sections"]]
    reveal_bar = a.reveal_bar or next(x["first_bar"] for x in s["sections"] if x["name"] == "reveal")
    extra = {"chords_by_bar": s.get("chords"), "motif": s.get("motif"), "key": s.get("key")}
else:
    e = json.load(open(a.edl))
    bpm, n_bars = float(e["bpm"]), int(e["film_bars"])
    first_s = float(e["film_first_downbeat_s"])
    sections = [(x["name"], x["first_bar"], x["last_bar"]) for x in e.get("sections", [])]
    reveal_bar = a.reveal_bar or int(e["film_reveal_bar"])
    extra = {k: e[k] for k in ("source", "stretch_pct", "track_bpm", "edit", "track_drop_s", "track_end_s", "ringout_s") if k in e}

fpb_exact = fps * 60.0 / bpm
fpb = int(round(fpb_exact))
assert abs(fpb_exact - fpb) < 1e-6, f"{bpm} BPM is not a whole number of frames per beat at {fps} fps ({fpb_exact})"
first_frame = first_s * fps
assert abs(first_frame - round(first_frame)) < 1e-6, f"first downbeat {first_s}s is not on a frame"
first_frame = int(round(first_frame))
bar_frames = 4 * fpb
total_frames = first_frame + n_bars * bar_frames
downbeats = [first_frame + b * bar_frames for b in range(n_bars)]
beats = [first_frame + k * fpb for k in range(n_bars * 4)]


def bar_frame(bar, beat=1.0):
    return first_frame + (bar - 1) * bar_frames + int(round((beat - 1) * fpb))


bm = {
    "schema": "pebble-beatmap/1",
    "id": a.id,
    "title": a.title,
    "music": json.loads(a.music_json),
    "bed_wav": a.bed,
    "fps": fps,
    "bpm": bpm,
    "beats_per_bar": 4,
    "frames_per_beat": fpb,
    "bar_frames": bar_frames,
    "total_bars": n_bars,
    "total_frames": total_frames,
    "duration_s": round(total_frames / fps, 6),
    "first_downbeat_frame": first_frame,
    "reveal": {"bar": reveal_bar, "frame": bar_frame(reveal_bar), "s": round(bar_frame(reveal_bar) / fps, 6)},
    "sections": [{"name": n, "first_bar": b0, "last_bar": b1, "start_frame": bar_frame(b0),
                  "end_frame": bar_frame(b1 + 1) if b1 < n_bars else total_frames} for n, b0, b1 in sections],
    "downbeat_frames": downbeats,
    "beat_frames": beats,
    "how_to_use": ("Cut and change layouts on downbeat_frames, smaller moves on beat_frames; put the reveal on reveal.frame; "
                   "each sound effect peaks at its picture event + 1 frame (tools/audio/cues.json). Frame of beat k (0-based) = "
                   "first_downbeat_frame + k * frames_per_beat."),
}
names = {x[0] for x in sections}
cues = {}
if a.score and {"build", "final"} <= names:
    build = next(x for x in sections if x[0] == "build")
    cues["breath_frame"] = bar_frame(build[2], 4.0)                      # the empty last beat before the reveal
    cues["riser_bars"] = [build[1], build[2]]
    cues["riser_end_frame"] = bar_frame(reveal_bar)
    final = next(x for x in sections if x[0] == "final")
    cues["final_chord_frame"] = bar_frame(final[1])
    cues["final_chord_ring_frames"] = total_frames - bar_frame(final[1])
    cues["motif_bars"] = [1, reveal_bar] + [x[1] for x in sections if x[0] in ("payoff", "endcard")]
if not a.score and "film_final_chord_bar" in json.load(open(a.edl)):
    fb = json.load(open(a.edl))["film_final_chord_bar"]
    cues["final_chord_frame"] = bar_frame(fb)
    cues["final_chord_ring_frames"] = total_frames - bar_frame(fb)
bm["cues"] = cues
bm.update({k: v for k, v in extra.items() if v is not None})
if a.validation:
    v = json.load(open(a.validation))
    bm["validation"] = {k: v[k] for k in ("median_offset_ms", "median_abs_offset_ms", "max_abs_offset_ms", "within_1_frame_pct",
                                          "downbeats_measured", "downbeats_total", "reveal", "gates", "pass") if k in v}
json.dump(bm, open(a.out, "w"), indent=1)
print(json.dumps({k: bm[k] for k in ("id", "bpm", "frames_per_beat", "bar_frames", "total_bars", "total_frames", "duration_s",
                                     "reveal", "cues")}, indent=1))
