"""A cut's sound-effect cue list: the film's cues (tools/audio/cues.json) moved onto the cut's own timeline.

The film's list is exported from video/src/film/timeline.ts by video/scripts/export-cues.ts. A cut file
(docs/film-cuts/<name>.json, schema pebble-film-cut/1) lists the film's frame ranges in playing order. This script
writes tools/audio/cues.<name>.json in cues.json's own format, which tools/audio/mix_master.py reads.
The rules are the x30 plan's (lane prep-x30, map_cues.py):
  - a cue plays in the cut when its picture frame lies inside a range [first, end). It moves to the cut frame
    newFrom + (frame - first), and its peak keeps its distance from the picture frame (+1 frame; the riser's end: 0);
  - the riser (align "end") may sit on a range's end. It then ends where that range ends in the cut;
  - the cut file's "sfx" block covers the rest: "drop" removes the cues of a source frame; "replace" swaps them for
    other takes of the kit (peak one frame after the picture frame); "add" places extra effects at cut frames. A new
    effect takes its role's gain and alignment from tools/audio/sfx_kit.json;
  - everything else stays as in cues.json: takes, gains, pans, ducks and events. Each cue also records source_frame,
    the film frame it comes from.
  - the mix automation (entries with no "file": gap, hold, tail; ENERGY_SPEC §8.3) maps span by span, each span
    clipped to every range it overlaps: a span that starts before a range starts on the range's first cut frame (the
    x30's hold, film f891, starts on the joint at cut 324), and one that runs past a range's end stops at the joint.
    A hold's release (to_frame -> release_frame) maps on as its own span: when it follows its hold in the same range,
    the two stay one entry; otherwise the hold ends on its clipped edge with no release (noted). The params are the
    film's. Each entry records source_frame and source_to_frame. Automation never counts as an effect.
Checks:
  - every cue lies inside the cut;
  - at most three effects sound at once, measured as export-cues.ts does when the kit's WAVs are on disk;
  - notes for an effect that starts before its range or rings past its range's end (it then sounds over a joint), and
    for an automation span clipped at a joint.
Usage, from the repo root, with any Python 3.9+ (standard library only):
  python3 -I tools/audio/cut_cues.py docs/film-cuts/x30.json            writes tools/audio/cues.x30.json
  python3 -I tools/audio/cut_cues.py docs/film-cuts/x30.json --check    exit 1 if the file on disk is not current
"""
import argparse
import json
import os
import struct
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))

ap = argparse.ArgumentParser()
ap.add_argument("cut", help="a cut file, e.g. docs/film-cuts/x30.json")
ap.add_argument("--cues", default=os.path.join(HERE, "cues.json"), help="the film's cue list")
ap.add_argument("--kit", default=os.path.join(HERE, "sfx_kit.json"))
ap.add_argument("--out", help="default: tools/audio/cues.<cut name>.json")
ap.add_argument("--check", action="store_true", help="write nothing; exit 1 if the file on disk is not current")
a = ap.parse_args()

cut = json.load(open(a.cut, encoding="utf-8"))
film = json.load(open(a.cues, encoding="utf-8"))
kit = json.load(open(a.kit, encoding="utf-8"))
name = cut["name"]
FPS = cut.get("fps", 30)
out_path = a.out or os.path.join(HERE, f"cues.{name}.json")
rel = lambda p: os.path.relpath(p, REPO)  # noqa: E731
problems, notes = [], []

ranges = [tuple(r) if isinstance(r, list) else (r["from"], r["to"]) for r in cut["ranges"]]
starts, at = [], 0
for first, end in ranges:
    starts.append(at)
    at += end - first
TOTAL = at
if cut.get("frames") not in (None, TOTAL):
    problems.append(f"the cut file says {cut['frames']} frames; its ranges add up to {TOTAL}")


def place(frame, end_aligned):
    """(cut frame, range index) of a film frame, or (None, None) when the cut leaves it out."""
    for i, ((first, end), s) in enumerate(zip(ranges, starts)):
        if first <= frame < end or (end_aligned and frame == end):
            return s + frame - first, i
    return None, None


r4 = lambda v: round(v, 4)  # noqa: E731
sfx = cut.get("sfx", {})
replace = {r["frame"]: r["with"] for r in sfx.get("replace", [])}
drop = {d["frame"] for d in sfx.get("drop", [])}


def from_kit(w, frame, src=None):
    """A cue for a take of the kit, its picture event on cut frame `frame` (peak one frame later, as export-cues.ts)."""
    role = kit["roles"].get(w["role"])
    if role is None:
        problems.append(f"sfx_kit.json has no role {w['role']!r}")
        return None
    if f"{w['take']}.wav" not in role["takes"]:
        problems.append(f"take {w['take']!r} is not one of the kit's {w['role']} takes")
    peak = frame if role["align"] == "end" else frame + 1
    c = {"file": f"{kit['dir']}{w['take']}.wav", "t": r4(peak / FPS), "align": role["align"], "gain_db": role["gain_db"],
         "pan": w.get("pan", role["pan"] if isinstance(role["pan"], (int, float)) else 0), "duck_db": w.get("duckDb", 0),
         "event": w.get("event", ""), "frame": frame, "peak_frame": peak, "role": w["role"], "take": w["take"]}
    if src is not None:
        c["source_frame"] = src
    return c


film_auto = [c for c in film if "file" not in c]            # the mix automation: mapped span by span, below
out, replaced = [], set()
for c in (c for c in film if "file" in c):
    nf, ri = place(c["frame"], c["align"] == "end")
    if nf is None or c["frame"] in drop:
        continue
    if c["frame"] in replace:
        if c["frame"] not in replaced:
            replaced.add(c["frame"])
            out += [x for x in (from_kit(w, nf, c["frame"]) for w in replace[c["frame"]]) if x]
        continue
    d = dict(c)
    d["source_frame"] = c["frame"]
    d["frame"], d["peak_frame"] = nf, nf + (c["peak_frame"] - c["frame"])
    d["t"] = r4(d["peak_frame"] / FPS)
    out.append(d)
for w in sfx.get("add", []):
    x = from_kit(w, w["frame"])
    if x:
        out.append(x)
out.sort(key=lambda c: c["frame"])          # stable: cues on one frame keep the film's order
for c in out:
    if not (0 <= c["frame"] < TOTAL or (c["align"] == "end" and c["frame"] == TOTAL)):
        problems.append(f"{c['role']} {c['take']} at cut frame {c['frame']} lies outside the cut's {TOTAL} frames")
for src in replace:
    if src not in replaced:
        problems.append(f"sfx.replace names film frame {src}, which has no cue inside the cut")


def clip(f0, f1):
    """Where film frames [f0, f1) play in the cut: [(cut0, cut1, film0, film1, range index)], in playing order."""
    spans = []
    for i, ((first, end), s) in enumerate(zip(ranges, starts)):
        o0, o1 = max(f0, first), min(f1, end)
        if o1 > o0:
            spans.append((s + o0 - first, s + o1 - first, o0, o1, i))
    return spans


SPAN_KEYS = {"role", "frame", "to_frame", "release_frame", "t", "t_end", "t_release", "event", "source_frame",
             "source_to_frame", "source_release_frame"}
auto = []
for c in film_auto:
    params = {k: v for k, v in c.items() if k not in SPAN_KEYS}
    has_release = c.get("release_frame") is not None
    body = clip(c["frame"], c["to_frame"])
    release = clip(c["to_frame"], c["release_frame"]) if has_release else []
    used = set()

    def entry(c0, c1, f0, f1, rspan=None, **extra):
        e = {"role": c["role"], "frame": c0, "to_frame": c1}
        if rspan is not None:
            e["release_frame"] = rspan[1]
        e["t"], e["t_end"] = r4(c0 / FPS), r4(c1 / FPS)
        if rspan is not None:
            e["t_release"] = r4(rspan[1] / FPS)
        e["event"] = c.get("event", "")
        e.update(params)
        e.update(extra)
        e["source_frame"], e["source_to_frame"] = f0, f1
        if rspan is not None:
            e["source_release_frame"] = rspan[3]
        return e

    for c0, c1, f0, f1, ri in body:
        follow = next((r for r in release if r[0] == c1 and r[4] == ri), None)   # its release follows it in the cut
        if follow is not None:
            used.add(follow)
            auto.append(entry(c0, c1, f0, f1, follow))
        elif has_release:                                     # the release is not in the cut: none, on the edge
            auto.append(entry(c0, c1, f0, f1, (c1, c1, f1, f1)))
            notes.append(f"{c['role']} film f{f0}-{f1} ends on a joint at cut f{c1} with no release")
        else:
            auto.append(entry(c0, c1, f0, f1))
        if (f0, f1) != (c["frame"], c["to_frame"]):
            notes.append(f"{c['role']} film f{c['frame']}-{c['to_frame']} is clipped to its range: film f{f0}-{f1} "
                         f"plays at cut f{c0}-{c1}")
    for r in release:                                         # a release in the cut without its hold before it
        if r not in used:
            auto.append(entry(r[0], r[0], r[2], r[2], r, crossfade_ms=0, drive_ms=0))
            notes.append(f"{c['role']} film f{r[2]}-{r[3]}: only its release plays, at cut f{r[0]}-{r[1]}")
auto.sort(key=lambda e: e["frame"])
for e in auto:
    if not (0 <= e["frame"] <= e["to_frame"] <= e.get("release_frame", e["to_frame"]) <= TOTAL):
        problems.append(f"automation {e['role']} at cut frame {e['frame']} lies outside the cut's {TOTAL} frames")


def wav_seconds(path):
    """Seconds of a PCM or float WAV, from its RIFF header (as export-cues.ts reads it)."""
    try:
        with open(path, "rb") as f:
            b = f.read(1 << 16)
    except OSError:
        return None
    i, rate, bpf = 12, 0, 0
    while i + 8 <= len(b):
        cid, size = b[i:i + 4], struct.unpack("<I", b[i + 4:i + 8])[0]
        if cid == b"fmt ":
            ch, rate = struct.unpack("<HI", b[i + 10:i + 16])
            bpf = ch * struct.unpack("<H", b[i + 22:i + 24])[0] // 8
        if cid == b"data" and rate and bpf:
            return size / bpf / rate
        i += 8 + size + (size % 2)
    return None


# at most three at once, as export-cues.ts measures it: a peak-aligned effect sounds from t - 0.1 s for its whole
# length (its peak is unknown here), the riser from t - length to t
sfx_dir = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(a.kit)), kit["dir"]))
overlap = "kit WAVs not on disk: overlap check skipped"
if os.path.isdir(sfx_dir):
    spans = []
    for c in out:
        n = wav_seconds(os.path.join(sfx_dir, f"{c['take']}.wav")) or 0.5
        spans.append((c, c["t"] - n, c["t"]) if c["align"] == "end" else (c, c["t"] - 0.1, c["t"] - 0.1 + n))
    worst = 0
    for c, s0, s1 in spans:
        k = sum(1 for _, o0, o1 in spans if o0 <= s0 < o1)
        worst = max(worst, k)
        if k > 3:
            problems.append(f"more than three effects at once around {c['t']:.2f} s ({c['event']})")
        # an effect that sounds outside its own range plays over a joint: a note for the listen, not an error
        _, ri = place(c.get("source_frame", -1), c["align"] == "end")
        if ri is not None:
            r0, r1 = starts[ri] / FPS, (starts[ri] + ranges[ri][1] - ranges[ri][0]) / FPS
            if s0 < r0 - 1e-6 and r0 > 0:
                notes.append(f"{c['take']} ({c['event']}) starts {1000 * (r0 - s0):.0f} ms before its range (cut {r0:.2f} s)")
            if s1 > r1 + 1e-6 and r1 < TOTAL / FPS:
                notes.append(f"{c['take']} ({c['event']}) rings up to {1000 * (s1 - r1):.0f} ms past the joint at "
                             f"cut {r1:.2f} s (as the file runs; most of it is its tail)")
    overlap = f"at most {worst} effects at once"

if problems:
    print(f"cut_cues: {rel(a.cut)}: problems:\n  " + "\n  ".join(problems), file=sys.stderr)
    sys.exit(1)
text = json.dumps(out + auto, indent=1, ensure_ascii=False) + "\n"
summary = f"{len(out)} effects and {len(auto)} automation spans on {TOTAL} frames ({TOTAL / FPS:.2f} s); {overlap}"
if a.check:
    current = open(out_path, encoding="utf-8").read() if os.path.exists(out_path) else ""
    if current != text:
        print(f"cut_cues: {rel(out_path)} is out of date; run python3 -I tools/audio/cut_cues.py {rel(a.cut)}",
              file=sys.stderr)
        sys.exit(1)
    print(f"cut_cues: {rel(out_path)} is current ({summary})")
else:
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(text)
    print(f"cut_cues: wrote {rel(out_path)} ({summary})")
    for c in out:
        print(f"  film f{c.get('source_frame', '-'):>4} -> cut f{c['frame']:>3}  {c['role']:<7} {c['take']:<10} "
              f"t={c['t']:<7} gain={c['gain_db']} duck={c['duck_db']}  {c['event']}")
    for e in auto:
        tail = f", release to f{e['release_frame']}" if "release_frame" in e else ""
        print(f"  film f{e['source_frame']:>4}-{e['source_to_frame']:<4} -> cut f{e['frame']:>3}-{e['to_frame']:<3}{tail}  "
              f"{e['role']:<5} {e['event']}")
for n in notes:
    print(f"  note: {n}")
